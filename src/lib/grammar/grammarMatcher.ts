
import { GrammarMatch } from '@/types/grammar';
import { WordToken } from '@/types';
import { getGrammarIndex, loadGrammar, isGrammarLoaded } from './grammarLoader';

// 常见的语法模式关键词（优先匹配较长的）
const GRAMMAR_PATTERNS = [
    // N1级别复合语法
    'ようが', 'ようと', 'まいが', 'まいと', 'ならいざしらず', 'ともあろうものが',
    'を機に', 'に至る', 'まじき', 'ものと思われる', 'こともあって',
    // N2级别
    'おそれがある', 'ことになる', 'ことにする', 'ようにする', 'ようになる',
    'ために', 'ため', 'によって', 'において', 'に対して', 'について',
    'にとって', 'として', 'をはじめ', 'を中心に', 'に関して',
    'ばかり', 'だけ', 'しか', 'ほど', 'くらい', 'ぐらい',
    'わけ', 'はず', 'つもり', 'べき', 'ざるを得ない',
    // N3级别
    'てしまう', 'ておく', 'てある', 'ている', 'てみる', 'てくる', 'ていく',
    'ようとする', 'ことがある', 'ことができる',
    'たり', 'ながら', 'たびに', 'につれて', 'にしたがって',
    'らしい', 'ようだ', 'みたいだ', 'そうだ', 'だろう', 'でしょう',
    // 其他常见
    'という', 'といった', 'とか', 'など', 'なんか', 'なんて',
];

// 对匹配结果排序
function sortMatches(matches: GrammarMatch[]): GrammarMatch[] {
    return matches.sort((a, b) => {
        // 1. 更长的匹配词优先
        const lenDiff = b.matchedText.length - a.matchedText.length;
        if (lenDiff !== 0) return lenDiff;

        // 2. 位置更靠前的优先
        return a.position - b.position;
    });
}

// 去重：同一个语法标题只保留一个
function deduplicateMatches(matches: GrammarMatch[]): GrammarMatch[] {
    const seen = new Set<string>();
    return matches.filter(m => {
        if (seen.has(m.entry.title)) return false;
        seen.add(m.entry.title);
        return true;
    });
}

// Helper to get effective reading (Hiragana)
function getReading(token: WordToken): string {
    // WordToken.reading is Hiragana, but empty if surface is Kana-only.
    // So if reading is empty, use surface.
    return token.reading || token.surface;
}

/**
 * 在句子中匹配语法点
 * @param sentence 日语句子
 * @param maxResults 最多返回几条（默认3）
 * @param tokens (可选) 分词结果，用于更精确的读音匹配
 */
export async function matchGrammar(sentence: string, maxResults = 3, tokens?: WordToken[]): Promise<GrammarMatch[]> {
    // 确保语法库已加载
    if (!isGrammarLoaded()) {
        await loadGrammar();
    }

    const index = getGrammarIndex();
    const matches: GrammarMatch[] = [];
    const usedTitles = new Set<string>();

    const addMatch = (entry: import('@/types/grammar').GrammarEntry, matchedText: string, position: number) => {
        if (usedTitles.has(entry.title)) return;
        usedTitles.add(entry.title);
        matches.push({ entry, matchedText, position });
    };

    // 策略 A: 基于 Token 的滑动窗口匹配 (Sliding Window)
    // 解决多 Token 语法点 (如 "に比べて" = "に" + "比べて") 和 Kanji/Kana 差异
    if (tokens && tokens.length > 0) {
        const MAX_WINDOW_SIZE = 6; // 增加窗口大小以覆盖更长的语法

        for (let i = 0; i < tokens.length; i++) {
            let combinedSurface = "";
            let combinedReading = "";

            // Try increasing window sizes
            for (let j = 0; j < MAX_WINDOW_SIZE && i + j < tokens.length; j++) {
                const token = tokens[i + j];
                combinedSurface += token.surface;
                combinedReading += getReading(token);

                // 1. Check Surface (Kanji form)
                // e.g. "に比べて"
                const surfaceEntries = index.get(combinedSurface);
                if (surfaceEntries) {
                    const entry = surfaceEntries.find(e => e.meaning) || surfaceEntries[0];
                    // Strict position check
                    const pos = sentence.indexOf(combinedSurface);
                    if (pos !== -1) {
                        addMatch(entry, combinedSurface, pos);
                    }
                }

                // 2. Check Reading (Kana form)
                // e.g. "代わりに" (surface) -> "かわりに" (reading)
                // e.g. "に比べて" (surface) -> "にくらべて" (reading)
                if (combinedReading !== combinedSurface) {
                    const readingEntries = index.get(combinedReading);
                    if (readingEntries) {
                        const entry = readingEntries.find(e => e.meaning) || readingEntries[0];
                        // Highlight the *Surface* text corresponding to this reading
                        const pos = sentence.indexOf(combinedSurface);
                        if (pos !== -1) {
                            addMatch(entry, combinedSurface, pos);
                        }
                    }
                }
            }
        }
    }

    // 策略 B: 传统的字符串匹配 (用于补充，或当 Token 不可用时)
    // 依然保留，以捕获那些跨 Token 的短语 (如 "〜てしまう")
    if (matches.length < maxResults) {
        // 1. 预定义模式
        for (const pattern of GRAMMAR_PATTERNS) {
            if (matches.some(m => m.entry.title.includes(pattern))) continue;

            const pos = sentence.indexOf(pattern);
            if (pos !== -1) {
                const entries = index.get(pattern);
                if (entries && entries.length > 0) {
                    const entry = entries.find(e => e.meaning) || entries[0];
                    addMatch(entry, pattern, pos);
                }
            }
        }

        // 2. 遍历索引 (仅查找长词以避免性能问题和误判)
        // 降低优先级，最后执行
        if (matches.length < maxResults) {
            for (const [term, entries] of index) {
                if (usedTitles.has(entries[0].title)) continue;
                if (term.length < 2) continue;

                // 如果已有 Token 策略运行，这里只匹配较长的词，避免单字符/短词干扰
                if (tokens && term.length < 3) continue;

                const pos = sentence.indexOf(term);
                if (pos !== -1) {
                    const entry = entries.find(e => e.meaning) || entries[0];
                    addMatch(entry, term, pos);
                }
            }
        }
    }

    // 排序
    const sorted = sortMatches(matches);

    return sorted.slice(0, maxResults);
}
