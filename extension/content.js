let floatingIcon = null;

// Regex to detect Japanese characters (Hiragana, Katakana, Kanji, Punctuation)
const japaneseRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

// Helper to check if extension context is still valid
function isExtensionContextValid() {
    try {
        // This will throw if context is invalidated
        chrome.runtime.getURL('');
        return true;
    } catch (e) {
        return false;
    }
}

// Clean up function
function cleanup() {
    if (floatingIcon) {
        floatingIcon.remove();
        floatingIcon = null;
    }
}

document.addEventListener('mouseup', (event) => {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
        cleanup();
        return;
    }

    // Critical Fix: If clicking the icon itself, do NOT process this global mouseup.
    // This prevents the icon from being removed before the 'click' event triggers.
    if (floatingIcon && floatingIcon.contains(event.target)) {
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // Remove existing icon if any
    cleanup();

    if (selectedText && japaneseRegex.test(selectedText)) {
        try {
            // Create floating icon
            floatingIcon = document.createElement('div');
            floatingIcon.className = 'yomi-floating-icon';

            const img = document.createElement('img');
            img.src = chrome.runtime.getURL('icons/logo.png');
            floatingIcon.appendChild(img);

            // Position icon near the selection - prefer top-right corner
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Calculate position (top-right of selection, with fallback)
            let top, left;
            const iconSize = 32;
            const margin = 8;

            // Check if there's enough space above
            if (rect.top > iconSize + margin) {
                // Place above and to the right
                top = rect.top + window.scrollY - iconSize - margin;
                left = rect.right + window.scrollX + margin;
            } else {
                // Fallback: place to the right, vertically centered
                top = rect.top + window.scrollY + (rect.height / 2) - (iconSize / 2);
                left = rect.right + window.scrollX + margin;
            }

            // Ensure icon stays within viewport horizontally
            const maxLeft = window.innerWidth - iconSize - margin;
            if (left > maxLeft) {
                left = rect.left + window.scrollX - iconSize - margin;
            }

            floatingIcon.style.top = `${top}px`;
            floatingIcon.style.left = `${left}px`;

            // Add click event
            floatingIcon.addEventListener('click', (e) => {
                e.stopPropagation();

                // Check context again before sending message
                if (!isExtensionContextValid()) {
                    cleanup();
                    return;
                }

                // Visual feedback
                floatingIcon.style.opacity = '0.5';
                floatingIcon.style.transform = 'scale(0.9)';

                console.log("Yomi: Clicked");

                try {
                    chrome.runtime.sendMessage({
                        action: 'openYomi',
                        text: selectedText
                    }, (response) => {
                        // Check runtime error
                        if (chrome.runtime.lastError) {
                            console.warn("Yomi: Connection error -", chrome.runtime.lastError.message);
                            // Don't alert - just fail silently as extension might have been updated
                            return;
                        }

                        // Check response status
                        if (response) {
                            if (response.status === 'success') {
                                console.log("Yomi: Success");
                            } else {
                                console.warn("Yomi: Background error -", response.message);
                            }
                        }
                    });
                } catch (error) {
                    console.warn("Yomi: Script error -", error.message);
                }

                // Remove icon
                cleanup();
            });

            document.body.appendChild(floatingIcon);
        } catch (error) {
            // Extension context might have been invalidated during execution
            console.warn("Yomi: Failed to create icon -", error.message);
            cleanup();
        }
    }
});

document.addEventListener('mousedown', (event) => {
    // Click anywhere else to remove icon
    if (floatingIcon && !floatingIcon.contains(event.target)) {
        cleanup();
    }
});
