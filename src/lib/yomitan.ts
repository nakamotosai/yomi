/**
 * Yomitan Dictionary Service
 * 
 * 加载和搜索本地 Yomitan 格式词典（明鏡日汉双解辞典）
 * 词典位于 public/yomitan/ 目录
 */

// Yomitan term_bank 条目格式:
// [term, reading, defTags, rules, score, definitions[], sequence, termTags]
export interface YomitanEntry {
    term: string;           // 词条
    reading: string;        // 读音
    defTags: string;        // 定义标签
    rules: string;          // 规则 (如 v5, v1, adj-i 等)
    score: number;          // 优先级分数
    definitions: string[];  // 定义数组
    sequence: number;       // 序列号
    termTags: string;       // 词条标签
}

export interface DictionaryResult {
    term: string;
    reading: string;
    partOfSpeech: string;
    definitions: string[];
    source: string;
}

// 解析 Yomitan 条目
function parseYomitanEntry(entry: unknown[]): YomitanEntry {
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

// 格式化定义文本，提取关键信息
function formatDefinition(def: string): string {
    // 移除一些内部标记，保留核心内容
    const formatted = def
        .replace(/▾/g, '')  // 移除折叠标记
        .replace(/⟨([^⟩]+)⟩/g, '[$1]')  // 转换词性标记格式
        .replace(/\s+/g, ' ')  // 规范化空白
        .trim();

    return formatted;
}

// 从规则推断词性
function inferPartOfSpeech(rules: string, defTags: string): string {
    if (rules.includes('v5')) return '五段动词';
    if (rules.includes('v1')) return '一段动词';
    if (rules.includes('vs')) return 'サ变动词';
    if (rules.includes('vk')) return 'カ变动词';
    if (rules.includes('adj-i')) return 'い形容词';
    if (rules.includes('adj-na')) return 'な形容词';
    if (defTags.includes('n')) return '名词';
    if (defTags.includes('adv')) return '副词';
    return '';
}

// 将 YomitanEntry 转换为统一的 DictionaryResult
export function convertToResult(entry: YomitanEntry): DictionaryResult {
    return {
        term: entry.term,
        reading: entry.reading || entry.term,
        partOfSpeech: inferPartOfSpeech(entry.rules, entry.defTags),
        definitions: entry.definitions.map(formatDefinition),
        source: '明鏡日汉双解辞典'
    };
}

// 在服务端搜索词典的函数（被 API 调用）
export async function searchYomitanDictionary(
    keyword: string,
    termBanks: unknown[][]
): Promise<DictionaryResult[]> {
    const results: DictionaryResult[] = [];

    for (const bank of termBanks) {
        for (const rawEntry of bank) {
            const entry = parseYomitanEntry(rawEntry as unknown[]);

            // 精确匹配 term 或 reading
            if (entry.term === keyword || entry.reading === keyword) {
                results.push(convertToResult(entry));
            }
        }
    }

    // 按 score 排序（高分优先）
    results.sort((a, b) => {
        // 精确匹配优先
        const aExact = a.term === keyword ? 1 : 0;
        const bExact = b.term === keyword ? 1 : 0;
        return bExact - aExact;
    });

    return results;
}
