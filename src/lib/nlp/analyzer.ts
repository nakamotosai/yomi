'use client';

import { AnalysisResult, SentenceAnalysis, PartOfSpeech, WordToken, PitchPattern, COMMON_WORDS } from '@/types';
import * as wanakana from 'wanakana';

// Dynamic imports for browser-only modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Kuroshiro: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let KuromojiAnalyzer: any = null;

// Kuromoji token interface
interface KuromojiToken {
    surface_form: string;
    reading?: string;
    pos: string;
    pos_detail_1: string;
    basic_form: string;
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
        // Wait for existing initialization
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
            // Dynamic imports for client-side only
            const kuroshiroModule = await import('kuroshiro');
            const analyzerModule = await import('kuroshiro-analyzer-kuromoji');

            Kuroshiro = kuroshiroModule.default;
            KuromojiAnalyzer = analyzerModule.default;

            const instance = new Kuroshiro() as KuroshiroInstance;

            // Initialize with dictionary path pointing to public folder
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

// Estimate pitch accent pattern (heuristic-based for MVP)
function estimatePitch(reading: string, pos: PartOfSpeech): { pattern: PitchPattern; accentMora: number } {
    if (!reading) return { pattern: [], accentMora: 0 };

    // Count morae (combining small kana with previous)
    const moras = reading.replace(/[ぁぃぅぇぉゃゅょゎっ]/g, '').length;
    if (moras === 0) return { pattern: [], accentMora: 0 };

    // Simple deterministic hash for consistent pitch in demo
    const hash = reading.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const type = hash % 4;

    let pattern: number[] = [];
    let accentMora = 0;

    if (type === 0) {
        // Heiban (平板): L H H H...
        pattern = [0, ...Array(moras - 1).fill(1)];
        accentMora = 0;
    } else if (type === 1) {
        // Atamadaka (頭高): H L L L...
        pattern = [1, ...Array(moras - 1).fill(0)];
        accentMora = 1;
    } else if (type === 2 && moras > 2) {
        // Nakadaka (中高): L H...H L L
        const peak = Math.floor(moras / 2);
        pattern = Array(moras).fill(0).map((_, i) => (i === 0 ? 0 : i <= peak ? 1 : 0));
        accentMora = peak + 1;
    } else {
        // Odaka (尾高): L H H H (drop after)
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

    // Fallback rules for common conjugations
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

// Main analysis function
export async function analyzeJapaneseText(text: string): Promise<AnalysisResult> {
    await initializeKuroshiro();

    if (!kuroshiroInstance) {
        throw new Error('Kuroshiro not initialized');
    }

    // Split into sentences
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

    // Handle remaining text without sentence ending
    if (currentStr.trim()) {
        const sentenceAnalysis = await analyzeSentence(currentStr.trim(), sentences.length);
        sentences.push(sentenceAnalysis);
    }

    return { sentences };
}

async function analyzeSentence(sentence: string, index: number): Promise<SentenceAnalysis> {
    // Get raw tokenization data from Kuroshiro's internal tokenizer
    if (!kuroshiroInstance) {
        throw new Error('Kuroshiro not initialized');
    }
    const rawTokens = await kuroshiroInstance._analyzer.parse(sentence);

    const tokens: WordToken[] = await Promise.all(
        rawTokens.map(async (t: KuromojiToken, idx: number) => {
            const surface = t.surface_form;
            const readingKatakana = t.reading || surface;
            const readingHiragana = wanakana.toHiragana(readingKatakana);
            const pos = mapPosToEnum(t.pos);

            const { pattern, accentMora } = estimatePitch(readingHiragana, pos);

            // Determine if reading is redundant (surface is already kana)
            const isKanaOnly = wanakana.isHiragana(surface) || wanakana.isKatakana(surface);
            const reading = isKanaOnly ? '' : readingHiragana;

            const baseForm = t.basic_form !== '*' ? t.basic_form : surface;

            // Deterministic ID generation to ensure stability across strict mode re-renders
            // Format: sentenceIndex-tokenIndex-hash(surface)
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
        })
    );

    // Post-process tokens to fix number + counter issues (e.g. 5日 -> itsuka)
    return {
        id: `sentence-${index}`,
        original: sentence,
        tokens: postProcessTokens(tokens, index),
    };
}

// Helper to convert number to simple kana reading (0-99)
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
    return normalized; // Fallback for >= 100
}

// Post-processing rules
function postProcessTokens(tokens: WordToken[], sentenceIndex: number): WordToken[] {
    const processed: WordToken[] = [];

    // Map of irregular date readings
    const DATE_READINGS: Record<string, string> = {
        '1日': 'ついたち',
        '2日': 'ふつか',
        '3日': 'みっか',
        '4日': 'よっか',
        '5日': 'いつか',
        '6日': 'むいか',
        '7日': 'なのか',
        '8日': 'ようか',
        '9日': 'ここのか',
        '10日': 'とおか',
        '14日': 'じゅうよっか',
        '20日': 'はつか',
        '24日': 'にじゅうよっか',
    };

    for (let i = 0; i < tokens.length; i++) {
        const curr = tokens[i];
        const next = tokens[i + 1];

        // Combined Number Logic
        if (next && /^[0-9０-９]+$/.test(curr.surface)) {
            let mergedSurface = '';
            let mergedReading = '';
            let mergedPosDetail = '助数詞結合';

            // 1. Specific Date Readings (Number + 日)
            if (next.surface === '日') {
                const combinedSurface = curr.surface + next.surface;
                const specificReading = DATE_READINGS[combinedSurface];
                if (specificReading) {
                    mergedSurface = combinedSurface;
                    mergedReading = specificReading;
                    mergedPosDetail = '日付';
                }
                // If not in map, might fall through to generic merge below if we added '日' to suffixes?
                // But for now, let's keep the specific map priority.
            }

            // 2. Month Readings
            // Make sure we didn't already merge (though 1日 and 1月 are mutually exclusive for next.surface)
            if (!mergedSurface) {
                const MONTH_READINGS: Record<string, string> = {
                    '1月': 'いちがつ', '2月': 'にがつ', '3月': 'さんがつ', '4月': 'しがつ',
                    '5月': 'ごがつ', '6月': 'ろくがつ', '7月': 'しちがつ', '8月': 'はちがつ',
                    '9月': 'くがつ', '10月': 'じゅうがつ', '11月': 'じゅういちがつ', '12月': 'じゅうにがつ'
                };
                if (next.surface === '月' && MONTH_READINGS[curr.surface + '月']) {
                    mergedSurface = curr.surface + '月';
                    mergedReading = MONTH_READINGS[mergedSurface];
                    mergedPosDetail = '日付';
                }
            }

            // 3. Hour Check (Specific because of 4, 7, 9 irregularities)
            if (!mergedSurface && next.surface === '時') {
                // Simple map for hours
                const HOUR_READINGS: Record<string, string> = {
                    '1': 'いち', '2': 'に', '3': 'さん', '4': 'よ', '5': 'ご',
                    '6': 'ろく', '7': 'しち', '8': 'はち', '9': 'く', '10': 'じゅう',
                    '11': 'じゅういち', '12': 'じゅうに',
                    '0': 'れい', '13': 'じゅうさん', '14': 'じゅうよ', '15': 'じゅうご',
                    '16': 'じゅうろく', '17': 'じゅうしち', '18': 'じゅうはち', '19': 'じゅうく',
                    '20': 'にじゅう', '21': 'にじゅういち', '22': 'にじゅうに', '23': 'にじゅうさん', '24': 'にじゅうよ'
                };
                // If number is in map, use it. Else default to generic calculation if we had one.
                // Currently curr.surface is the number string.
                if (HOUR_READINGS[curr.surface]) {
                    mergedSurface = curr.surface + '時';
                    mergedReading = HOUR_READINGS[curr.surface] + 'じ';
                    mergedPosDetail = '時間';
                }
            }

            // 4. Generic Suffixes
            if (!mergedSurface) {
                const MERGE_SUFFIXES = new Set(['分', '秒', '週間', '年', '回', '歳', '才', '円', '日', '番', '台', '階', '人']);

                if (MERGE_SUFFIXES.has(next.surface)) {
                    // Special case: Persons
                    if (next.surface === '人') {
                        if (curr.surface === '1') {
                            mergedSurface = '1人'; mergedReading = 'ひとり'; mergedPosDetail = '助数詞結合';
                        } else if (curr.surface === '2') {
                            mergedSurface = '2人'; mergedReading = 'ふたり'; mergedPosDetail = '助数詞結合';
                        }
                    }

                    if (!mergedSurface) {
                        mergedSurface = curr.surface + next.surface; // e.g. 20分

                        // Convert number to kana
                        const numReading = numberToKana(curr.surface);

                        // Suffix reading (fallback to surface if no reading)
                        let suffixReading = (next.reading && next.reading !== next.surface) ? next.reading : next.surface;

                        // 3階 -> sangai fix
                        if (next.surface === '階' && curr.surface === '3') {
                            suffixReading = 'がい';
                        }

                        mergedReading = numReading + suffixReading;
                    }
                }
            }

            if (mergedSurface && mergedReading) {
                const { pattern, accentMora } = estimatePitch(mergedReading, PartOfSpeech.NOUN);
                processed.push({
                    ...curr,
                    id: `${curr.id}-merged`,
                    surface: mergedSurface,
                    reading: mergedReading,
                    romaji: wanakana.toRomaji(mergedReading),
                    pos: PartOfSpeech.NOUN,
                    posDetail: mergedPosDetail,
                    pitch: pattern,
                    accentMora: accentMora,
                    baseForm: mergedSurface,
                });
                i++; // Skip next
                continue;
            }
        }
        processed.push(curr);
    }

    return processed;
}

// Text-to-Speech using Web Speech API
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

    // Try to use a Japanese voice
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
