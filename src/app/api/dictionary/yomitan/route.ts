import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Yomitan Dictionary API
 * 
 * Modified for Edge Runtime: Fetches static JSON files via HTTP instead of file system.
 */

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

interface DictionaryResult {
    term: string;
    reading: string;
    partOfSpeech: string;
    definitions: string[];
    source: string;
}

// Format definition text
function formatDefinition(def: string): string {
    return def
        .replace(/▾/g, '')
        .replace(/⟨([^⟩]+)⟩/g, '【$1】')
        .trim();
}

// Parsed from raw array
function parseEntry(entry: unknown[]): YomitanEntry {
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

function inferPartOfSpeech(rules: string, def: string): string {
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

function convertToResult(entry: YomitanEntry): DictionaryResult {
    const firstDef = entry.definitions[0] || '';
    return {
        term: entry.term,
        reading: entry.reading || entry.term,
        partOfSpeech: inferPartOfSpeech(entry.rules, firstDef),
        definitions: entry.definitions.map(formatDefinition),
        source: '明鏡日汉双解辞典'
    };
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');

    if (!keyword) {
        return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    try {
        const origin = request.nextUrl.origin;
        const results: DictionaryResult[] = [];
        const seen = new Set<string>();

        // Optimization 1: Sequential batch fetching + Early exit
        // Instead of fetching all 17 at once, we fetch in batches or sequentially to avoid hitting subrequest limits.
        // Since we are looking for a specific keyword, we can stop AS SOON AS WE FIND IT.
        // Files are term_bank_1.json to term_bank_18.json (based on loader checks).
        const maxBanks = 20; // Safety limit

        // Optimistic Strategy: Check banks sequentially. 
        // Note: In a real production app without an index, this is still O(N) but better than 17 parallels crashing the worker.
        // We will do small batches of 3 to balance speed and stability.

        for (let i = 1; i <= maxBanks; i += 4) {
            const batch = [i, i + 1, i + 2, i + 3].filter(n => n <= maxBanks);
            const batchPromises = batch.map(async (bankIndex) => {
                try {
                    const res = await fetch(`${origin}/yomitan/term_bank_${bankIndex}.json`, {
                        // Add internal cache tag if available in CF
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        cf: { cacheTtl: 86400, cacheEverything: true }
                    } as any);
                    if (!res.ok) return null;
                    return await res.json() as unknown[];
                } catch {
                    return null;
                }
            });

            const bankDataList = await Promise.all(batchPromises);
            let foundInBatch = false;

            for (const bankData of bankDataList) {
                if (!bankData) continue;
                for (const rawEntry of bankData) {
                    const entry = parseEntry(rawEntry as unknown[]);
                    if (entry.term === keyword || entry.reading === keyword) {
                        const res = convertToResult(entry);
                        const key = `${res.term}-${res.reading}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            results.push(res);
                            foundInBatch = true;
                        }
                    }
                }
            }

            // Optimization 2: Early Exit
            // If we found the word, we stop looking. (Assuming exact match is redundant or we only need top results)
            // If search needs complete exhaustion, remove this break. But for "hover tip", first match is usually sufficient.
            if (foundInBatch && results.length >= 1) {
                break;
            }
        }

        return NextResponse.json({
            success: true,
            keyword,
            results: results,
            source: '明鏡日汉双解辞典 (Edge Optimized)'
        }, {
            headers: {
                // Optimization 3: Aggressive Caching
                // Cache this specific keyword result for 1 hour at CDN level
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
                'CDN-Cache-Control': 'max-age=3600'
            }
        });

    } catch (error) {
        console.error('[Yomitan API] Error:', error);
        return NextResponse.json({ error: 'Failed to search dictionary' }, { status: 500 });
    }
}
