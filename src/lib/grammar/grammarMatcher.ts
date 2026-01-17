
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


// 权重计算逻辑 (泛化评分引擎)
function calculateWeight(entry: import('@/types/grammar').GrammarEntry, matchedText: string): number {
    let score = 0;

    // 1. 标题提取与清理 (处理 〜A〜B 型标题)
    // 移除引导符和后缀括注
    let cleanTitle = entry.title.replace(/[〜~]/g, '').split(/[｜|（(]/)[0].trim();
    // 进一步清理多重结构点，只留核心模式词 (针对 AならB 型)
    if (cleanTitle.includes('なら')) cleanTitle = 'なら';

    // 2. 精准度计分
    if (cleanTitle === matchedText) {
        score += 300; // 完全匹配
    } else if (cleanTitle.includes(matchedText)) {
        score += 50;
    }

    // 3. 剧烈长度差异惩罚 (核心防御：防止 "が" 匹配长语法)
    if (matchedText.length === 1) {
        const allowedLowLen = ['ず', 'ぬ', 'て', 'た', 'る'];
        if (cleanTitle.length > 1 && !allowedLowLen.includes(matchedText)) {
            return -1000; // 绝对禁止误匹配
        }
    } else {
        // 对于多字符匹配，如果标题比匹配词长得多，也应大幅扣分
        const lenDiff = cleanTitle.length - matchedText.length;
        if (lenDiff > 0) score -= lenDiff * 50;
    }

    // 4. JLPT 等级加成 (保持现状，作为细微排序依据)
    const levelMatch = entry.title.match(/N([1-5])/i);
    if (levelMatch) {
        const level = parseInt(levelMatch[1]);
        score += (6 - level) * 10;
    }

    // 6. 词性/白名单加成 (白名单)
    const highValue = ['ず', 'ぬ', 'ざる', 'まい', 'べき', 'まじき', 'がたき', 'おらず'];
    const garbageParticles = ['の', 'は', 'が', 'を', 'に', 'へ', 'と', 'で', 'も'];

    if (garbageParticles.includes(matchedText)) {
        return -2000; // 严禁展示此类极其基础的格助词
    }

    if (highValue.includes(matchedText)) {
        score += 100;
    }

    return score;
}

// 常用活用形归一化
function normalizeGrammarTerm(term: string): string[] {
    const variants = [term];

    if (term.endsWith('ます')) variants.push(term.replace(/ます$/, 'る'));
    if (term.endsWith('ました')) variants.push(term.replace(/ました$/, 'た'));
    if (term.endsWith('ません')) variants.push(term.replace(/ません$/, 'ない'));

    // 强化否定与连用形归约
    if (term === 'おらず') {
        variants.push('ず');
        variants.push('おる');
    } else if (term.endsWith('おらず')) {
        variants.push('ず');
    }

    if (term === 'ず') variants.push('ず');
    if (term.endsWith('ず')) variants.push('ず');
    if (term.endsWith('ぬ')) variants.push('ぬ');

    return Array.from(new Set(variants));
}

// 辅助函数：从候选条目中选择最合适的一个
function pickBestEntry(entries: import('@/types/grammar').GrammarEntry[], matchedText: string): import('@/types/grammar').GrammarEntry {
    if (entries.length === 1) return entries[0];

    // 按权重降序排序，取最高者
    const sorted = [...entries].sort((a, b) => {
        return calculateWeight(b, matchedText) - calculateWeight(a, matchedText);
    });

    return sorted[0];
}

// 对匹配结果排序
function sortMatches(matches: GrammarMatch[]): GrammarMatch[] {
    return matches.sort((a, b) => {
        // 1. 优先级：权重 (Score) 第一
        const weightA = calculateWeight(a.entry, a.matchedText);
        const weightB = calculateWeight(b.entry, b.matchedText);
        if (weightB !== weightA) return weightB - weightA;

        // 2. 次要优先级：更长的匹配词
        const lenDiff = b.matchedText.length - a.matchedText.length;
        if (lenDiff !== 0) return lenDiff;

        // 3. 第三优先级：位置更靠前
        return a.position - b.position;
    });
}

// 去重与质量过滤：同一个语法标题只保留一个，并剔除低分项目
function deduplicateMatches(matches: GrammarMatch[]): GrammarMatch[] {
    const seen = new Set<string>();
    return matches.filter(m => {
        // 精准计分过滤：如果得分为负，说明属于误匹配的噪音
        const score = calculateWeight(m.entry, m.matchedText);
        if (score < 0) return false;

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

    // 策略 A: 基于 Token 的滑动窗口与归一化匹配
    // 解决多 Token 语法点 (如 "に比べて" = "に" + "比べて") 和 Kanji/Kana 差异
    if (tokens && tokens.length > 0) {
        const MAX_WINDOW_SIZE = 6; // 增加窗口大小以覆盖更长的语法

        for (let i = 0; i < tokens.length; i++) {
            const currentToken = tokens[i];

            // --- 词内后缀搜索 (加强版) ---
            // 解决保守分词模式下，语法后缀被合并到动词/形容词内部的问题 (如 "食べている" 里的 "ている")
            if (currentToken.surface.length >= 1) {
                const highValueSuffixes = ['ず', 'ぬ', 'て', 'た', 'る'];
                // 从后往前尝试匹配后缀
                for (let len = currentToken.surface.length; len >= 1; len--) {
                    const suffix = currentToken.surface.substring(currentToken.surface.length - len);

                    // 【重要限制】如果匹配的是 1 个字符，且该字符不是核心语法后缀，则跳过
                    // 这能有效防止 "が" "を" "に" 等格助词误触发长语法模式
                    if (len === 1 && !highValueSuffixes.includes(suffix)) continue;

                    const queryTerms = normalizeGrammarTerm(suffix);

                    for (const q of queryTerms) {
                        const entries = index.get(q);
                        if (entries && entries.length > 0) {
                            const entry = pickBestEntry(entries, q);
                            // 计算该后缀在整个句子中的绝对位置
                            // 先找到 token 在句中的位置，再加上后缀在该 token 里的偏移
                            const tokenPos = sentence.indexOf(currentToken.surface); // 注意：这里可能有重复词问题，但 tokens 顺序可信
                            if (tokenPos !== -1) {
                                addMatch(entry, suffix, tokenPos + (currentToken.surface.length - len));
                                break; // 如果匹配到了，就跳出当前 queryTerms 循环，避免重复添加或匹配更短的后缀
                            }
                        }
                    }
                }
            }
            // --------------------------------------------------

            let combinedSurface = "";
            let combinedReading = "";

            // Try increasing window sizes
            for (let j = 0; j < MAX_WINDOW_SIZE && i + j < tokens.length; j++) {
                const token = tokens[i + j];
                combinedSurface += token.surface;
                combinedReading += getReading(token);

                // 尝试原始和归一化形式
                const termsToTry = [combinedSurface, combinedReading, ...normalizeGrammarTerm(combinedSurface)];

                for (const term of termsToTry) {
                    const entries = index.get(term);
                    if (entries && entries.length > 0) {
                        const entry = pickBestEntry(entries, term);
                        // Highlight the *Surface* text corresponding to this reading
                        const pos = sentence.indexOf(combinedSurface);
                        if (pos !== -1) {
                            addMatch(entry, combinedSurface, pos);
                            break; // 如果匹配到了，就跳出当前 termsToTry 循环
                        }
                    }
                }
            }
        }
    }

    // 策略 B: 传统的字符串模式匹配 (用于补充)
    if (matches.length < maxResults) {
        // 1. 预定义模式匹配
        for (const pattern of GRAMMAR_PATTERNS) {
            if (matches.some(m => m.matchedText.includes(pattern))) continue;

            const pos = sentence.indexOf(pattern);
            if (pos !== -1) {
                const entries = index.get(pattern);
                if (entries && entries.length > 0) {
                    const entry = pickBestEntry(entries, pattern);
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
                    if (entries && entries.length > 0) {
                        const entry = pickBestEntry(entries, term);
                        addMatch(entry, term, pos);
                    }
                }
            }
        }
    }

    // --- 移除策略 C (保底逻辑)：允许空结果，不再强制推荐基础助词 ---

    // 4. 先去重并进行质量过滤 (关键修复)
    const filtered = deduplicateMatches(matches);

    // 5. 排序后再裁剪
    const sorted = sortMatches(filtered);

    return sorted.slice(0, maxResults);
}
