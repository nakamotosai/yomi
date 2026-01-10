'use client';

import { AnalysisResult, SentenceAnalysis, PartOfSpeech, WordToken, PitchPattern, COMMON_WORDS } from '@/types';
import * as wanakana from 'wanakana';

// Dynamic imports for browser-only modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Kuroshiro: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let KuromojiAnalyzer: any = null;

// Kuromoji token interface (原始分词结果)
interface KuromojiToken {
    surface_form: string;
    reading?: string;
    pos: string;           // 词性: 名詞, 動詞, 形容詞, 助動詞, 助詞, 接頭詞, 接尾辞 等
    pos_detail_1: string;  // 词性细节: 数, 接続助詞, 終助詞, 助数詞 等
    basic_form: string;    // 原形/辞書形
    conjugated_type?: string;
}

// Kuroshiro instance with analyzer
interface KuroshiroInstance {
    init: (analyzer: unknown) => Promise<void>;
    _analyzer: {
        parse: (text: string) => Promise<KuromojiToken[]>;
    };
}

let kuroshiroInstance: KuroshiroInstance | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Initialize Kuroshiro with Kuromoji analyzer
async function initializeKuroshiro(): Promise<void> {
    if (kuroshiroInstance) return;
    if (initPromise) return initPromise;

    if (isInitializing) {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (kuroshiroInstance) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    isInitializing = true;

    initPromise = (async () => {
        try {
            const kuroshiroModule = await import('kuroshiro');
            const analyzerModule = await import('kuroshiro-analyzer-kuromoji');

            Kuroshiro = kuroshiroModule.default;
            KuromojiAnalyzer = analyzerModule.default;

            const instance = new Kuroshiro() as KuroshiroInstance;

            await instance.init(new KuromojiAnalyzer({
                dictPath: '/dict'
            }));

            kuroshiroInstance = instance;

            console.log('Kuroshiro initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Kuroshiro:', error);
            isInitializing = false;
            initPromise = null;
            throw error;
        }
    })();

    return initPromise;
}

// Map Japanese POS to our enum
function mapPosToEnum(pos: string): PartOfSpeech {
    const posMap: Record<string, PartOfSpeech> = {
        '名詞': PartOfSpeech.NOUN,
        '動詞': PartOfSpeech.VERB,
        '形容詞': PartOfSpeech.ADJECTIVE,
        '形容動詞': PartOfSpeech.ADJECTIVE,
        '助詞': PartOfSpeech.PARTICLE,
        '助動詞': PartOfSpeech.AUXILIARY,
        '副詞': PartOfSpeech.ADVERB,
        '接続詞': PartOfSpeech.CONJUNCTION,
        '感動詞': PartOfSpeech.INTERJECTION,
        '接頭詞': PartOfSpeech.PREFIX,
        '接尾詞': PartOfSpeech.SUFFIX,
        '記号': PartOfSpeech.SYMBOL,
    };
    return posMap[pos] || PartOfSpeech.OTHER;
}

// Estimate pitch accent pattern (heuristic-based)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function estimatePitch(reading: string, _pos: PartOfSpeech): { pattern: PitchPattern; accentMora: number } {
    if (!reading) return { pattern: [], accentMora: 0 };

    const moras = reading.replace(/[ぁぃぅぇぉゃゅょゎっ]/g, '').length;
    if (moras === 0) return { pattern: [], accentMora: 0 };

    const hash = reading.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const type = hash % 4;

    let pattern: number[] = [];
    let accentMora = 0;

    if (type === 0) {
        pattern = [0, ...Array(moras - 1).fill(1)];
        accentMora = 0;
    } else if (type === 1) {
        pattern = [1, ...Array(moras - 1).fill(0)];
        accentMora = 1;
    } else if (type === 2 && moras > 2) {
        const peak = Math.floor(moras / 2);
        pattern = Array(moras).fill(0).map((_, i) => (i === 0 ? 0 : i <= peak ? 1 : 0));
        accentMora = peak + 1;
    } else {
        pattern = [0, ...Array(moras - 1).fill(1)];
        accentMora = moras;
    }

    return { pattern, accentMora };
}

// Get de-inflected (dictionary) form
export function getDeinflectedForm(token: WordToken): string {
    if (token.baseForm && token.baseForm !== token.surface && token.baseForm !== '*') {
        return token.baseForm;
    }

    const s = token.surface;
    if (token.pos === PartOfSpeech.VERB) {
        if (s.endsWith('ます')) return s.replace(/ます$/, 'る');
        if (s.endsWith('ました')) return s.replace(/ました$/, 'る');
        if (s.endsWith('ません')) return s.replace(/ません$/, 'る');
        if (s.endsWith('ない')) return s.replace(/ない$/, 'る');
        if (s.endsWith('たい')) return s.replace(/たい$/, 'る');
        if (s.endsWith('て')) return s.replace(/て$/, 'る');
        if (s.endsWith('た')) return s.replace(/た$/, 'る');
    }

    return token.surface;
}

// ============================================================================
// TOKEN MERGING SYSTEM (核心后处理逻辑)
// ============================================================================

/**
 * 不规则日期读音映射表
 */
const DATE_READINGS: Record<string, string> = {
    '1日': 'ついたち', '2日': 'ふつか', '3日': 'みっか', '4日': 'よっか',
    '5日': 'いつか', '6日': 'むいか', '7日': 'なのか', '8日': 'ようか',
    '9日': 'ここのか', '10日': 'とおか', '14日': 'じゅうよっか',
    '20日': 'はつか', '24日': 'にじゅうよっか',
};

/**
 * 不规则人数读音映射表
 */
const PERSON_READINGS: Record<string, string> = {
    '1人': 'ひとり', '2人': 'ふたり',
};

/**
 * 计数器读音映射表 (1つ〜10)
 */
const COUNTER_TSU_READINGS: Record<string, string> = {
    '1つ': 'ひとつ', '2つ': 'ふたつ', '3つ': 'みっつ', '4つ': 'よっつ',
    '5つ': 'いつつ', '6つ': 'むっつ', '7つ': 'ななつ', '8つ': 'やっつ',
    '9つ': 'ここのつ', '10': 'とお',
};

/**
 * 单 Token 读音修正表 (当分词器输出的单个token读音错误时)
 */
const SINGLE_TOKEN_CORRECTIONS: Record<string, string> = {
    ...DATE_READINGS,
    ...PERSON_READINGS,
    ...COUNTER_TSU_READINGS,
    // 月份特殊读音
    '4月': 'しがつ', '7月': 'しちがつ', '9月': 'くがつ',
};

/**
 * 数字转假名 (0-99)
 */
function numberToKana(numStr: string): string {
    const normalized = numStr.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    const num = parseInt(normalized, 10);
    if (isNaN(num)) return numStr;

    const DIGITS = ['ぜろ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう'];

    if (num <= 10) return DIGITS[num];
    if (num < 100) {
        const tens = Math.floor(num / 10);
        const ones = num % 10;
        const p1 = tens === 1 ? 'じゅう' : DIGITS[tens] + 'じゅう';
        const p2 = ones === 0 ? '' : DIGITS[ones];
        return p1 + p2;
    }
    return normalized;
}

/**
 * 合并 Kuromoji 原始 token 数组
 * 使用 while 循环手动控制索引，实现向后贪婪吞噬
 */
function mergeKuromojiTokens(tokens: KuromojiToken[]): KuromojiToken[] {
    const merged: KuromojiToken[] = [];
    let i = 0;

    while (i < tokens.length) {
        const curr = tokens[i];

        // ========================================
        // Rule C: 接头词合并 (优先级最高)
        // 如果当前词是 接頭詞，强制与下一个词合并
        // 例: お + 水 → お水
        // ========================================
        if (curr.pos === '接頭詞' && i + 1 < tokens.length) {
            const next = tokens[i + 1];
            merged.push({
                surface_form: curr.surface_form + next.surface_form,
                reading: (curr.reading || curr.surface_form) + (next.reading || next.surface_form),
                pos: next.pos,           // 使用后词的词性
                pos_detail_1: next.pos_detail_1,
                basic_form: curr.surface_form + (next.basic_form !== '*' ? next.basic_form : next.surface_form),
                conjugated_type: next.conjugated_type,
            });
            i += 2;
            continue;
        }

        // ========================================
        // Rule A: 数字与单位/助数词合并
        // 如果当前词是 名詞-数，且下一个词是 接尾辞 或 助数詞
        // 例: 2026 + 年 → 2026年
        // 例: 1 + つ → 1つ
        // ========================================
        if (curr.pos === '名詞' && curr.pos_detail_1 === '数' && i + 1 < tokens.length) {
            const next = tokens[i + 1];

            // 检查是否是 接尾辞 (包括助数詞)
            if (next.pos === '接尾辞' || next.pos_detail_1 === '助数詞' || next.pos === '名詞') {
                const combinedSurface = curr.surface_form + next.surface_form;

                // 查找特殊读音
                let combinedReading: string;
                if (SINGLE_TOKEN_CORRECTIONS[combinedSurface]) {
                    combinedReading = SINGLE_TOKEN_CORRECTIONS[combinedSurface];
                } else if (DATE_READINGS[combinedSurface]) {
                    combinedReading = DATE_READINGS[combinedSurface];
                } else if (PERSON_READINGS[combinedSurface]) {
                    combinedReading = PERSON_READINGS[combinedSurface];
                } else {
                    // 通用数字+单位读音
                    const numReading = numberToKana(curr.surface_form);
                    const suffixReading = next.reading || next.surface_form;
                    combinedReading = numReading + wanakana.toHiragana(suffixReading);
                }

                merged.push({
                    surface_form: combinedSurface,
                    reading: combinedReading,
                    pos: '名詞',
                    pos_detail_1: '数詞結合',
                    basic_form: combinedSurface,
                    conjugated_type: undefined,
                });
                i += 2;
                continue;
            }
        }

        // ========================================
        // Rule B: 动词/形容词的形态素链合并 (最重要)
        // 触发点: 当前词是 動詞 或 形容詞
        // 向后吞噬: 只要下一个词是可合并类型就持续合并
        // 例: 食べ + られ + ませ + ん → 食べられません
        // 例: 行か + なけれ + ば → 行かなければ
        // ========================================
        if (curr.pos === '動詞' || curr.pos === '形容詞') {
            let mergedSurface = curr.surface_form;
            let mergedReading = curr.reading || curr.surface_form;
            const baseForm = curr.basic_form !== '*' ? curr.basic_form : curr.surface_form;
            let j = i + 1;

            // 向后贪婪吞噬
            while (j < tokens.length) {
                const next = tokens[j];

                // 判断是否可以合并
                const canMerge = (
                    // 1. 助動詞: ます, ない, たい, れる, られる, た, だ 等
                    next.pos === '助動詞' ||

                    // 2. 接尾辞: さ (形容词名词化), み 等
                    next.pos === '接尾辞' ||

                    // 3. 接続助詞中的 て, で, ば (保持 食べて, 行けば 完整性)
                    (next.pos === '助詞' && next.pos_detail_1 === '接続助詞' &&
                        ['て', 'で', 'ば', 'たら', 'ても', 'ながら'].includes(next.surface_form)) ||

                    // 4. 終助詞: ね, よ, か, な, わ 等 (可选)
                    (next.pos === '助詞' && next.pos_detail_1 === '終助詞')
                );

                if (canMerge) {
                    mergedSurface += next.surface_form;
                    mergedReading += next.reading || next.surface_form;
                    j++;
                } else {
                    break;
                }
            }

            // 如果发生了合并 (j > i + 1)
            if (j > i + 1) {
                merged.push({
                    surface_form: mergedSurface,
                    reading: mergedReading,
                    pos: curr.pos,           // 保留原动词/形容词词性
                    pos_detail_1: '活用結合',
                    basic_form: baseForm,    // 保留原形
                    conjugated_type: curr.conjugated_type,
                });
                i = j;
                continue;
            }
        }

        // 无匹配规则，原样保留
        merged.push(curr);
        i++;
    }

    return merged;
}

/**
 * 对已转换的 WordToken 数组进行单 token 读音修正
 */
function correctSingleTokenReadings(tokens: WordToken[]): WordToken[] {
    return tokens.map(token => {
        const correctReading = SINGLE_TOKEN_CORRECTIONS[token.surface];
        if (correctReading && token.reading !== correctReading) {
            const hiraganaReading = wanakana.toHiragana(correctReading);
            const { pattern, accentMora } = estimatePitch(hiraganaReading, token.pos);
            return {
                ...token,
                reading: hiraganaReading,
                romaji: wanakana.toRomaji(hiraganaReading),
                pitch: pattern,
                accentMora,
            };
        }
        return token;
    });
}

// ============================================================================
// MAIN ANALYSIS FUNCTIONS
// ============================================================================

// Main analysis function
export async function analyzeJapaneseText(text: string): Promise<AnalysisResult> {
    await initializeKuroshiro();

    if (!kuroshiroInstance) {
        throw new Error('Kuroshiro not initialized');
    }

    const rawSentences = text.split(/([。！？\n]+)/).filter(Boolean);
    const sentences: SentenceAnalysis[] = [];
    let currentStr = '';

    for (const part of rawSentences) {
        if (/[。！？\n]+/.test(part)) {
            currentStr += part;

            if (currentStr.trim()) {
                const sentenceAnalysis = await analyzeSentence(currentStr.trim(), sentences.length);
                sentences.push(sentenceAnalysis);
            }
            currentStr = '';
        } else {
            currentStr += part;
        }
    }

    if (currentStr.trim()) {
        const sentenceAnalysis = await analyzeSentence(currentStr.trim(), sentences.length);
        sentences.push(sentenceAnalysis);
    }

    return { sentences };
}

async function analyzeSentence(sentence: string, index: number): Promise<SentenceAnalysis> {
    if (!kuroshiroInstance) {
        throw new Error('Kuroshiro not initialized');
    }

    // 1. 获取原始分词结果
    const rawTokens = await kuroshiroInstance._analyzer.parse(sentence);

    // 2. 在原始 token 层面进行合并 (关键步骤!)
    const mergedRawTokens = mergeKuromojiTokens(rawTokens);

    // 3. 将合并后的 token 转换为 WordToken
    const tokens: WordToken[] = mergedRawTokens.map((t: KuromojiToken, idx: number) => {
        const surface = t.surface_form;
        const readingKatakana = t.reading || surface;
        const readingHiragana = wanakana.toHiragana(readingKatakana);
        const pos = mapPosToEnum(t.pos);

        const { pattern, accentMora } = estimatePitch(readingHiragana, pos);

        const isKanaOnly = wanakana.isHiragana(surface) || wanakana.isKatakana(surface);
        const reading = isKanaOnly ? '' : readingHiragana;

        const baseForm = t.basic_form !== '*' ? t.basic_form : surface;

        const simpleHash = surface.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const stableId = `${index}-${idx}-${simpleHash}`;

        return {
            id: stableId,
            surface,
            reading,
            romaji: wanakana.toRomaji(readingHiragana),
            pos,
            posDetail: t.pos_detail_1,
            baseForm,
            pitch: pattern,
            accentMora,
            isCommon: COMMON_WORDS.has(baseForm) || COMMON_WORDS.has(surface),
            conjugation: t.conjugated_type !== '*' ? t.conjugated_type : undefined,
        };
    });

    // 4. 对单个 token 进行读音修正 (处理分词器未正确分割的情况)
    const correctedTokens = correctSingleTokenReadings(tokens);

    return {
        id: `sentence-${index}`,
        original: sentence,
        tokens: correctedTokens,
    };
}

// ============================================================================
// TEXT-TO-SPEECH (保持原有功能)
// ============================================================================

export function speakText(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onWord?: (charIndex: number) => void
): void {
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const japaneseVoice = voices.find(v => v.lang.startsWith('ja'));
    if (japaneseVoice) {
        utterance.voice = japaneseVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    if (onWord) {
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                onWord(event.charIndex);
            }
        };
    }

    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}
