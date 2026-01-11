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
        // Assume files are term_bank_1.json to term_bank_17.json based on previous file listing
        // In a real optimized scenario, we would use an index. For now, we unfortunately have to fetch all or use a pre-built index.
        // Fetching 17 files on every request is SLOW. 
        // BETTER APPROACH: The user probably only searches for one word. 
        // Ideally, we should have a KV or D1 index. 
        // fallback: fetch just a few main banks or use the index.json if it exists.

        // Let's try to load index.json or just the first few banks for now to prove concept, 
        // or attempt to fetch concurrently. 
        // The previous listing showed 'term_bank_1.json' ... 'term_bank_17.json'.

        const origin = request.nextUrl.origin;
        const bankFiles = Array.from({ length: 17 }, (_, i) => `term_bank_${i + 1}.json`);

        // Parallel fetch - Cloudflare Edge is fast at this
        const fetchPromises = bankFiles.map(async (file) => {
            try {
                const res = await fetch(`${origin}/yomitan/${file}`);
                if (!res.ok) return [];
                return await res.json() as unknown[];
            } catch (e) {
                console.error(`Failed to fetch ${file}`, e);
                return [];
            }
        });

        const allBanks = await Promise.all(fetchPromises);
        const results: DictionaryResult[] = [];
        const seen = new Set<string>();

        for (const bank of allBanks) {
            for (const rawEntry of bank) {
                const entry = parseEntry(rawEntry as unknown[]);
                if (entry.term === keyword || entry.reading === keyword) {
                    const res = convertToResult(entry);
                    const key = `${res.term}-${res.reading}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        results.push(res);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            keyword,
            results: results,
            source: '明鏡日汉双解辞典 (Edge)'
        });

    } catch (error) {
        console.error('[Yomitan API] Error:', error);
        return NextResponse.json({ error: 'Failed to search dictionary' }, { status: 500 });
    }
}
