// Translation service for Japanese to Chinese

interface TranslationCache {
    [key: string]: string;
}

const translationCache: TranslationCache = {};

export async function translateText(text: string, targetLang: string = 'zh-CN', sourceLang: string = 'ja'): Promise<string> {
    // Check cache first
    const cacheKey = `${text}:${sourceLang}:${targetLang}`;
    if (translationCache[cacheKey]) {
        return translationCache[cacheKey];
    }

    try {
        const MAX_RETRIES = 3;
        let delay = 1000;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text, targetLang, sourceLang }),
                    signal: AbortSignal.timeout(10000) // 10s timeout per attempt
                });

                if (response.status === 429 || response.status >= 500) {
                    // Server error or rate limit, throw to trigger retry
                    throw new Error(`Server error: ${response.status}`);
                }

                if (!response.ok) {
                    // Client error (400, 401, etc), do not retry
                    throw new Error('Translation request failed');
                }

                const data = await response.json();
                const translation = data.translation || '';

                // Cache the result
                translationCache[cacheKey] = translation;
                return translation;

            } catch (error) {
                console.warn(`Translation attempt ${i + 1} failed:`, error);
                if (i === MAX_RETRIES - 1) return ''; // Give up

                // Wait with exponential backoff
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
            }
        }
        return ''; // Should not be reached


    } catch (error) {
        console.error('Translation error:', error);
        return '';
    }
}

// Batch translate multiple sentences
export async function translateSentences(sentences: string[], targetLang: string = 'zh-CN'): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Filter out already cached translations
    const uncached = sentences.filter(s => !translationCache[`${s}:${targetLang}`]);

    // Add cached results to map
    sentences.forEach(s => {
        const cached = translationCache[`${s}:${targetLang}`];
        if (cached) {
            results.set(s, cached);
        }
    });

    // Translate uncached sentences in parallel (with limit)
    const BATCH_SIZE = 5;
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
        const batch = uncached.slice(i, i + BATCH_SIZE);
        const translations = await Promise.all(
            batch.map(text => translateText(text, targetLang))
        );
        batch.forEach((text, idx) => {
            results.set(text, translations[idx]);
        });
    }

    return results;
}
