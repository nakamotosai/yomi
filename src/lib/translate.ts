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
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, targetLang, sourceLang }),
        });

        if (!response.ok) {
            throw new Error('Translation request failed');
        }

        const data = await response.json();
        const translation = data.translation || '';

        // Cache the result
        translationCache[cacheKey] = translation;

        return translation;
    } catch (error) {
        console.error('Translation error:', error);
        return ''; // Return empty string on error
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
