
import { useDictionaryStore } from '@/store/useDictionaryStore';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

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

// Define the DB Schema
interface YomiDictionaryDB extends DBSchema {
    entries: {
        key: number;
        value: DictionaryResult;
        indexes: { 'term': string; 'reading': string };
    };
    meta: {
        key: string;
        value: number; // For storing loaded count or version
    };
}

class YomitanLoader {
    private dbPromise: Promise<IDBPDatabase<YomiDictionaryDB>> | null = null;
    private isLoaded = false;
    private loadingPromise: Promise<void> | null = null;
    private loadedBanks: Set<number> = new Set();
    private readonly DB_NAME = 'yomi-dictionary-db';
    private readonly DB_VERSION = 1;

    constructor() {
        // Initialize DB connection immediately if in browser
        if (typeof window !== 'undefined') {
            this.dbPromise = openDB<YomiDictionaryDB>(this.DB_NAME, this.DB_VERSION, {
                upgrade(db) {
                    // Create object store for entries
                    const store = db.createObjectStore('entries', { autoIncrement: true });
                    store.createIndex('term', 'term', { unique: false });
                    store.createIndex('reading', 'reading', { unique: false });

                    // Create object store for metadata
                    db.createObjectStore('meta');
                },
            });
        }
    }

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
        return {
            term: entry.term,
            reading: entry.reading || entry.term,
            partOfSpeech: this.inferPartOfSpeech(entry.rules, entry.definitions[0] || ''),
            definitions: entry.definitions.map(d => this.formatDefinition(d)),
            source: '明鏡日汉双解辞典'
        };
    }

    // Load a specific bank and store into DB
    public async loadBank(index: number): Promise<void> {
        if (this.loadedBanks.has(index)) return;

        // Skip if DB is already fully populated (checked in init)
        if (this.isLoaded) return;

        const url = `/yomitan/term_bank_${index}.json`;

        try {
            console.log(`[Dictionary] Downloading bank ${index}...`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            // Update store progress
            useDictionaryStore.getState().addDownloadedBytes(blob.size);
            useDictionaryStore.getState().incrementDownloadedUnits();

            const data = JSON.parse(await blob.text());
            if (!Array.isArray(data)) return;

            // Prepare batch for DB
            const entriesToStore: DictionaryResult[] = [];
            for (const rawEntry of data) {
                const entry = this.parseEntry(rawEntry as unknown[]);
                const result = this.convertToResult(entry);
                entriesToStore.push(result);
            }

            // Bulk add to DB
            if (this.dbPromise) {
                const db = await this.dbPromise;
                const tx = db.transaction('entries', 'readwrite');
                const store = tx.objectStore('entries');

                // Use Promise.all for parallel adds (or simple loop awaiting)
                // Using Promise.all with store.add is faster generally
                await Promise.all(entriesToStore.map(item => store.add(item)));

                // Commit transaction implicit
                await tx.done;
                console.log(`[Dictionary] Bank ${index} stored in DB (${entriesToStore.length} entries).`);
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
        const banksToLoad = Array.from({ length: TOTAL_BANKS }, (_, i) => i);

        for (const i of banksToLoad) {
            // Check if already in DB (optimization could be added here to check 'meta' store for last loaded bank)
            // For now, relies on isLoaded check in init()
            if (this.isLoaded) break;

            await this.loadBank(i);
            // Wait a bit to yield main thread
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // After all loaded, mark DB as fully loaded
        if (this.dbPromise) {
            const db = await this.dbPromise;
            // Count total to verify? Optionally set a flag
            const count = await db.count('entries');
            console.log(`[Dictionary] Loading complete. Total DB entries: ${count}`);
            await db.put('meta', count, 'total_entries');
            await db.put('meta', Date.now(), 'last_updated');
        }

        this.isLoaded = true;
    }

    // Initial load logic
    public async init(): Promise<void> {
        if (this.isLoaded) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            if (!this.dbPromise) return;
            const db = await this.dbPromise;

            // Check if DB is already populated
            const count = await db.count('entries');
            console.log(`[Dictionary] Existing DB entries: ${count}`);

            // Threshold for "loaded" (approx 200k entries expected total, but >1000 means at least something is there)
            // Let's say if we have > 50000 entries, we assume it's usable instantiation.
            // Or better: Check if we completed the last bank? 
            // For now, simple count check. 
            if (count > 50000) {
                console.log('[Dictionary] DB already populated. Skipping download.');
                this.isLoaded = true;

                // Update UI state to "Done"
                const store = useDictionaryStore.getState();
                const totalBytesGuess = 42 * 1024 * 1024; // ~42MB (根据实际情况调整)

                store.addDownloadedBytes(totalBytesGuess);
                store.setTotalBytesToDownload(totalBytesGuess);

                // Force visually complete state
                store.setAllLoaded(true);
                // Hack to ensure progress bar fills: manually set loadedUnits to total
                // Since we don't have setLoadedUnits, we loop increment
                for (let i = 0; i < 23; i++) store.incrementLoadedUnits();

                return;
            }

            console.log('[Dictionary] DB empty or partial. Starting download...');

            // Load Bank 0 immediately (priority)
            await this.loadBank(0);

            // Load rest in background
            this.loadAllBanksSequentially().catch(err => {
                console.error('[Dictionary] Background loading failed:', err);
            });
        })();

        return this.loadingPromise;
    }

    public async prefetch(): Promise<void> {
        return this.init();
    }

    public async search(keyword: string): Promise<DictionaryResult[] | null> {
        if (!this.dbPromise) return null;

        // If not loaded yet, check if we have results in DB anyway (e.g. from partial load)
        // If DB is completely empty (first run, bank 0 not done), we prefer returning null to fallback to API.
        // But IndexedDB is fast. We can just query it.
        // API fallback is mainly for when the client has NOTHING.

        const db = await this.dbPromise;

        // Search by Term
        const resultsByTerm = await db.getAllFromIndex('entries', 'term', keyword);
        // Search by Reading
        const resultsByReading = await db.getAllFromIndex('entries', 'reading', keyword);

        // Merge and Deduplicate
        const combined = [...resultsByTerm, ...resultsByReading];
        const unique = new Map<string, DictionaryResult>();

        for (const item of combined) {
            const key = `${item.term}-${item.reading}-${item.definitions[0]}`;
            if (!unique.has(key)) {
                unique.set(key, item);
            }
        }

        const finalResults = Array.from(unique.values());

        // If we found nothing AND we are not fully loaded, return null to allow API fallback
        // Rationale: User might search for a word that is in Bank 10, but we only loaded Bank 0.
        // If we return [], UI says "No definition".
        // If we return null, UI falls back to API, which definitely has it.
        if (finalResults.length === 0 && !this.isLoaded) {
            return null;
        }

        return finalResults;
    }
}

export const yomitanLoader = new YomitanLoader();
