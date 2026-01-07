import { GrammarEntry, GrammarMatch } from '@/types/grammar';
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

/**
 * 在句子中匹配语法点
 * @param sentence 日语句子
 * @param maxResults 最多返回几条（默认3）
 */
export async function matchGrammar(sentence: string, maxResults = 3): Promise<GrammarMatch[]> {
    // 确保语法库已加载
    if (!isGrammarLoaded()) {
        await loadGrammar();
    }

    const index = getGrammarIndex();
    const matches: GrammarMatch[] = [];

    // 1. 先用预定义模式匹配
    for (const pattern of GRAMMAR_PATTERNS) {
        const pos = sentence.indexOf(pattern);
        if (pos !== -1) {
            const entries = index.get(pattern);
            if (entries && entries.length > 0) {
                // 取第一个有meaning的entry
                const entry = entries.find(e => e.meaning) || entries[0];
                matches.push({
                    entry,
                    matchedText: pattern,
                    position: pos
                });
            }
        }
    }

    // 2. 遍历索引中的所有term进行匹配（作为补充）
    if (matches.length < maxResults) {
        for (const [term, entries] of index) {
            // 跳过已匹配的
            if (matches.some(m => m.matchedText === term)) continue;
            // 跳过太短的term（单字符）
            if (term.length < 2) continue;

            const pos = sentence.indexOf(term);
            if (pos !== -1) {
                const entry = entries.find(e => e.meaning) || entries[0];
                matches.push({
                    entry,
                    matchedText: term,
                    position: pos
                });
            }
        }
    }

    // 排序、去重、限制数量
    const sorted = sortMatches(matches);
    const unique = deduplicateMatches(sorted);

    return unique.slice(0, maxResults);
}
