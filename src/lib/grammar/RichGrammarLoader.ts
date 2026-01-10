export class RichGrammarLoader {
    private static instance: RichGrammarLoader;
    private dictionary: Record<string, string> | null = null;
    private isOnDemandLoading = false;

    private constructor() { }

    static getInstance(): RichGrammarLoader {
        if (!RichGrammarLoader.instance) {
            RichGrammarLoader.instance = new RichGrammarLoader();
        }
        return RichGrammarLoader.instance;
    }

    async loadDictionary() {
        if (this.dictionary || this.isOnDemandLoading) return;

        try {
            this.isOnDemandLoading = true;
            const res = await fetch('/data/grammar_dict_zh.json');
            if (res.ok) {
                this.dictionary = await res.json();
            } else {
                console.warn('Failed to load grammar_dict_zh.json');
            }
        } catch (e) {
            console.error('Error loading rich grammar dict', e);
        } finally {
            this.isOnDemandLoading = false;
        }
    }

    getExplanation(term: string, reading?: string): string | null {
        if (!this.dictionary) return null;

        // Normalize term (remove dots, parens, tildes)
        const normalize = (s: string) => s.replace(/[（(][^）)]*[）)]/g, '')
            .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')
            .replace(/[~～〜]/g, '')
            .trim();

        const cleanTerm = normalize(term);

        // 1. Exact match (Original)
        if (this.dictionary[term]) return this.dictionary[term];

        // 2. Exact match (Normalized)
        if (this.dictionary[cleanTerm]) return this.dictionary[cleanTerm];

        // 2b. Composite Title Split (Systemic Fix)
        // Handle cases like "〜を中心に・〜を中心にして・〜を中心として"
        // If full title missing, try splitting by '・' and looking up each part.
        if (term.includes('・')) {
            const parts = term.split('・');
            for (const part of parts) {
                const cleanPart = normalize(part);
                if (this.dictionary[part]) return this.dictionary[part];
                if (this.dictionary[cleanPart]) return this.dictionary[cleanPart];

                // Also try removing ~ specifically from parts even if normalize() didn't catch weird unicode
                const partNoTilde = part.replace(/[~～〜]/g, '').trim();
                if (this.dictionary[partNoTilde]) return this.dictionary[partNoTilde];
            }
        }

        // 3. Check READING (if provided) - Critical for Kanji inputs like '代わりに' -> 'かわりに'
        if (reading) {
            const cleanReading = normalize(reading);
            if (this.dictionary[reading]) return this.dictionary[reading];
            if (this.dictionary[cleanReading]) return this.dictionary[cleanReading];

            // 3b. Loose match for READING
            // Iterate keys to find if any normalized key matches the normalized reading
            const matchedReadingKey = Object.keys(this.dictionary).find(k => {
                return normalize(k) === cleanReading;
            });
            if (matchedReadingKey) return this.dictionary[matchedReadingKey];
        }

        // 4. Try to find key in dictionary that is "equivalent" after strict normalization
        // This handles cases where dictionary key has tilde but search term doesn't, or vice versa
        // We only check keys that loosely resemble the term (optimization)
        const matchedKey = Object.keys(this.dictionary).find(k => {
            // Strict check: normalized key MUST equal normalized term
            return normalize(k) === cleanTerm;
        });

        if (matchedKey) return this.dictionary[matchedKey];

        // 5. Safe partial match
        // We iterate keys to find one that is contained in the term
        // BUT strict constraint: Key must be longer than 1 character to avoid finding 'da' in 'kudasai'
        const partialKey = Object.keys(this.dictionary).find(k => {
            const cleanKey = normalize(k);
            if (cleanKey.length <= 1) return false; // Skip single chars like 'da', 'ni', 'ga'
            return cleanTerm.includes(cleanKey);
        });

        if (partialKey) return this.dictionary[partialKey];

        return null;
    }
}

export const richGrammarLoader = RichGrammarLoader.getInstance();
