// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openYomi') {
        // Use async IIFE to handle async operations strictly
        (async () => {
            try {
                const text = encodeURIComponent(request.text);
                // Target base URLs to check
                const targets = ['http://localhost:3000', 'http://127.0.0.1:3000'];

                // Query ALL tabs and filter manually to avoid match pattern ambiguity
                const tabs = await chrome.tabs.query({});

                // Find a tab that starts with either target
                const yomiTab = tabs.find(tab =>
                    tab.url && targets.some(t => tab.url.startsWith(t))
                );

                if (yomiTab) {
                    // Found: Focus and Update
                    // Construct new URL properly
                    const baseUrl = new URL(yomiTab.url).origin;
                    const newUrl = `${baseUrl}/?text=${text}&source=extension`;

                    await chrome.tabs.update(yomiTab.id, { active: true, url: newUrl });

                    // Try to focus the window
                    // Catch error in case window focus is not allowed or window is gone
                    try {
                        await chrome.windows.update(yomiTab.windowId, { focused: true });
                    } catch (ignore) {
                        console.log("Could not focus window", ignore);
                    }
                } else {
                    // Not found: Create new
                    await chrome.tabs.create({ url: `http://localhost:3000/?text=${text}&source=extension` });
                }

                sendResponse({ status: 'success' });
            } catch (error) {
                console.error("Yomi Background Error:", error);
                sendResponse({ status: 'error', message: error.message });
            }
        })();

        // Return true to indicate we will sendResponse asynchronously
        return true;
    }
});
