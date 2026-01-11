
interface YomitanEntry {
    term: string;
    reading: string;
    defTags: string;
    rules: string;
    score: number;
    definitions: string[];
    sequence: number;
    termTags: string;
}

export interface DictionaryResult {
    term: string;
    reading: string;
    partOfSpeech: string;
    definitions: string[];
    source: string;
}

class YomitanLoader {
    private dictionaryIndex: Map<string, DictionaryResult[]> = new Map();
    private isLoaded = false;
    private loadingPromise: Promise<void> | null = null;
    private loadedBanks: Set<number> = new Set();

    // Format definition text
    private formatDefinition(def: string): string {
        return def
            .replace(/▾/g, '')
            .replace(/⟨([^⟩]+)⟩/g, '【$1】')
            .trim();
    }

    private parseEntry(entry: unknown[]): YomitanEntry {
        return {
            term: entry[0] as string,
            reading: entry[1] as string,
            defTags: entry[2] as string,
            rules: entry[3] as string,
            score: entry[4] as number,
            definitions: entry[5] as string[],
            sequence: entry[6] as number,
            termTags: entry[7] as string
        };
    }

    private inferPartOfSpeech(rules: string, def: string): string {
        if (rules.includes('v5')) return '五段动词';
        if (rules.includes('v1')) return '一段动词';
        if (rules.includes('vs')) return 'サ变动词';
        if (rules.includes('vk')) return 'カ变动词';
        if (rules.includes('adj-i')) return 'い形容词';
        if (rules.includes('adj-na')) return 'な形容词';
        const posMatch = def.match(/【([^】]+)】/);
        if (posMatch) {
            const pos = posMatch[1];
            if (pos.includes('名')) return '名词';
            if (pos.includes('動') || pos.includes('动')) return '动词';
            if (pos.includes('形')) return '形容词';
            if (pos.includes('副')) return '副词';
            return pos;
        }
        return '';
    }

    private convertToResult(entry: YomitanEntry): DictionaryResult {
        const firstDef = entry.definitions[0] || '';
        return {
            term: entry.term,
            reading: entry.reading || entry.term,
            partOfSpeech: this.inferPartOfSpeech(entry.rules, firstDef),
            definitions: entry.definitions.map(this.formatDefinition),
            source: '明鏡日汉双解辞典'
        };
    }

    // Load a specific bank
    public async loadBank(index: number): Promise<void> {
        if (this.loadedBanks.has(index)) return;

        try {
            const response = await fetch(`/yomitan/term_bank_${index}.json`);
            if (!response.ok) return;

            const data = await response.json() as unknown[];
            if (!Array.isArray(data)) return;

            for (const rawEntry of data) {
                const entry = this.parseEntry(rawEntry as unknown[]);
                const result = this.convertToResult(entry);

                // Index by term
                const termResults = this.dictionaryIndex.get(result.term) || [];
                termResults.push(result);
                this.dictionaryIndex.set(result.term, termResults);

                // Index by reading
                if (result.reading !== result.term) {
                    const readingResults = this.dictionaryIndex.get(result.reading) || [];
                    if (!readingResults.some(r => r.term === result.term)) {
                        readingResults.push(result);
                        this.dictionaryIndex.set(result.reading, readingResults);
                    }
                }
            }
            this.loadedBanks.add(index);
        } catch (error) {
            console.error(`Failed to load dictionary bank ${index}:`, error);
        }
    }

    // Initial load: load first 2 banks for speed
    public async init(): Promise<void> {
        if (this.isLoaded) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            // Initially load first 12 banks (most common words)
            // 36MB total, let's load them in parallel
            const banksToLoad = Array.from({ length: 18 }, (_, i) => i);
            await Promise.all(banksToLoad.map(i => this.loadBank(i)));
            this.isLoaded = true;
            console.log(`[Dictionary] Loaded ${this.dictionaryIndex.size} entries mapping to ${this.loadedBanks.size} banks`);
        })();

        return this.loadingPromise;
    }

    public async search(keyword: string): Promise<DictionaryResult[]> {
        if (!this.isLoaded) {
            await this.init();
        }
        return this.dictionaryIndex.get(keyword) || [];
    }
}

export const yomitanLoader = new YomitanLoader();
