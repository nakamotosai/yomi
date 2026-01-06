import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Yomitan Dictionary API
 * 
 * 搜索本地 Yomitan 格式词典（明鏡日汉双解辞典）
 * GET /api/dictionary/yomitan?keyword=xxx
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

// 缓存已加载的词典数据
let cachedTermBanks: unknown[][] | null = null;
let cacheLoadTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 分钟缓存

// 加载所有 term_bank 文件
async function loadTermBanks(): Promise<unknown[][]> {
    const now = Date.now();

    // 使用缓存
    if (cachedTermBanks && (now - cacheLoadTime) < CACHE_DURATION) {
        return cachedTermBanks;
    }

    const yomitanDir = path.join(process.cwd(), 'public', 'yomitan');
    const files = await fs.readdir(yomitanDir);
    const termBankFiles = files.filter(f => f.startsWith('term_bank_') && f.endsWith('.json'));

    const banks: unknown[][] = [];

    for (const file of termBankFiles) {
        const filePath = path.join(yomitanDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        banks.push(data);
    }

    cachedTermBanks = banks;
    cacheLoadTime = now;

    console.log(`[Yomitan] Loaded ${banks.length} term banks with ${banks.reduce((sum, b) => sum + b.length, 0)} entries`);

    return banks;
}

// 解析 Yomitan 条目
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

// 格式化定义
function formatDefinition(def: string): string {
    return def
        .replace(/▾/g, '')
        .replace(/⟨([^⟩]+)⟩/g, '【$1】')
        .trim();
}

// 推断词性
function inferPartOfSpeech(rules: string, def: string): string {
    if (rules.includes('v5')) return '五段动词';
    if (rules.includes('v1')) return '一段动词';
    if (rules.includes('vs')) return 'サ变动词';
    if (rules.includes('vk')) return 'カ变动词';
    if (rules.includes('adj-i')) return 'い形容词';
    if (rules.includes('adj-na')) return 'な形容词';

    // 从定义中提取词性
    const posMatch = def.match(/【([^】]+)】/);
    if (posMatch) {
        const pos = posMatch[1];
        if (pos.includes('名')) return '名词';
        if (pos.includes('動') || pos.includes('动')) return '动词';
        if (pos.includes('形')) return '形容词';
        if (pos.includes('副')) return '副词';
        if (pos.includes('感')) return '感叹词';
        if (pos.includes('接')) return '接续词';
        return pos;
    }

    return '';
}

// 转换为结果格式
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
        const termBanks = await loadTermBanks();
        const results: DictionaryResult[] = [];

        for (const bank of termBanks) {
            for (const rawEntry of bank) {
                const entry = parseEntry(rawEntry as unknown[]);

                // 精确匹配 term 或 reading
                if (entry.term === keyword || entry.reading === keyword) {
                    results.push(convertToResult(entry));
                }
            }
        }

        // 去重（相同 term 和 reading 的合并）
        const uniqueResults = results.reduce((acc, curr) => {
            const key = `${curr.term}-${curr.reading}`;
            if (!acc.has(key)) {
                acc.set(key, curr);
            } else {
                // 合并定义
                const existing = acc.get(key)!;
                existing.definitions = [...existing.definitions, ...curr.definitions];
            }
            return acc;
        }, new Map<string, DictionaryResult>());

        return NextResponse.json({
            success: true,
            keyword,
            results: Array.from(uniqueResults.values()),
            source: '明鏡日汉双解辞典'
        });

    } catch (error) {
        console.error('[Yomitan API] Error:', error);
        return NextResponse.json({ error: 'Failed to search dictionary' }, { status: 500 });
    }
}
