
import { useDictionaryStore } from '@/store/useDictionaryStore';

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

        const url = `/yomitan/term_bank_${index}.json`;
        const cacheName = 'yomi-dictionary-cache-v1';

        try {
            let response: Response | undefined;
            let cache: Cache | undefined;

            // Try to get from Cache API first
            if (typeof window !== 'undefined' && 'caches' in window) {
                cache = await caches.open(cacheName);
                response = await cache.match(url);
            }

            if (!response) {
                console.log(`[Dictionary] Downloading bank ${index}...`);
                useDictionaryStore.getState().incrementDownloadedUnits();
                response = await fetch(url);
                if (!response.ok) return;

                // Clone and put into cache for next time
                if (cache) {
                    await cache.put(url, response.clone());
                }
            } else {
                console.log(`[Dictionary] Loading bank ${index} from cache...`);
            }

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
            useDictionaryStore.getState().incrementLoadedUnits();
        } catch (error) {
            console.error(`Failed to load dictionary bank ${index}:`, error);
        }
    }

    // Load all banks sequentially in the background
    private async loadAllBanksSequentially(): Promise<void> {
        const TOTAL_BANKS = 18;
        const banksToLoad = Array.from({ length: TOTAL_BANKS }, (_, i) => i); // 0 to 17

        for (const i of banksToLoad) {
            if (this.loadedBanks.has(i)) continue;

            await this.loadBank(i);
            // Small delay between banks to avoid clogging the network
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        this.isLoaded = true;
        console.log(`[Dictionary] Background loading complete. Total entries: ${this.dictionaryIndex.size}`);
    }

    // Initial load: Just load the first bank immediately, the rest in background
    public async init(): Promise<void> {
        if (this.isLoaded) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            console.log('[Dictionary] Starting background loading...');

            // Load the first bank immediately (contains most common words)
            await this.loadBank(0);

            // Start loading the rest in the background without awaiting it here
            this.loadAllBanksSequentially().catch(err => {
                console.error('[Dictionary] Background loading failed:', err);
            });
        })();

        return this.loadingPromise;
    }

    // Explicit prefetch trigger (useful for global initialization)
    public async prefetch(): Promise<void> {
        return this.init();
    }

    public async search(keyword: string): Promise<DictionaryResult[]> {
        // Ensure at least the basics are loaded if someone searches immediately
        if (this.loadingPromise) {
            await this.loadingPromise;
        } else if (!this.isLoaded) {
            await this.init();
        }

        return this.dictionaryIndex.get(keyword) || [];
    }
}

export const yomitanLoader = new YomitanLoader();
