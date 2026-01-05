'use client';

import { AnalysisResult, SentenceAnalysis, PartOfSpeech, WordToken, PitchPattern, COMMON_WORDS } from '@/types';
import * as wanakana from 'wanakana';

// Dynamic imports for browser-only modules
let Kuroshiro: any = null;
let KuromojiAnalyzer: any = null;
let kuroshiroInstance: any = null;
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

            kuroshiroInstance = new Kuroshiro();

            // Initialize with dictionary path pointing to public folder
            await kuroshiroInstance.init(new KuromojiAnalyzer({
                dictPath: '/dict'
            }));

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
    const rawTokens = await kuroshiroInstance._analyzer.parse(sentence);

    const tokens: WordToken[] = await Promise.all(
        rawTokens.map(async (t: any, idx: number) => {
            const surface = t.surface_form;
            const readingKatakana = t.reading || surface;
            const readingHiragana = wanakana.toHiragana(readingKatakana);
            const pos = mapPosToEnum(t.pos);

            const { pattern, accentMora } = estimatePitch(readingHiragana, pos);

            // Determine if reading is redundant (surface is already kana)
            const isKanaOnly = wanakana.isHiragana(surface) || wanakana.isKatakana(surface);
            const reading = isKanaOnly ? '' : readingHiragana;

            const baseForm = t.basic_form !== '*' ? t.basic_form : surface;

            return {
                id: `${index}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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

        // Rule: Number + 日 (Nich) -> Date
        // Checks if current is number (numeric string) and next is "日"
        if (next && curr.pos === PartOfSpeech.OTHER && /^[0-9０-９]+$/.test(curr.surface) && next.surface === '日') {
            const combinedSurface = curr.surface + next.surface;
            let combinedReading = DATE_READINGS[combinedSurface];

            // If not in irregular map, perform rough heuristic (Number reading + nichi)
            if (!combinedReading) {
                // Very naive fallback, usually better to let dictionary handle via manual lookup
                // But since we are merging, we must provide a reading.
                // Ideally wanakana.toHiragana(curr) + 'にち', but numbers turn to digits.
                // For now, if > 31, risk is low. If <31 and not in map, standard Onyomi counts:
                // 11日 -> Juuichi nichi.
                // We will skip merging for non-irregular ones unless we implement full number converter? 
                // User specifically asked for "5日". 
                // Let's stick to the IRREGULAR map + simple suffix for others if confident?
                // Actually, "15日" (juugo nichi) is fine to be split? 
                // No, usually "15日" is treated as one noun. 
                // Let's only implement the ones in DATE_READINGS for safety, or generic n + nichi?
                // For the user request (5日), DATE_READINGS covers it.
                // Let's be conservative: Only merge if in DATE_READINGS or strictly number + 日.

                // If not in special list, use "nichi" suffix reading if possible?
                // Current tokenizer gave "5" and "nichi". 
                // If we merge "11" (juuichi) + "nichi", reading is valid.
                // But we don't have "11"'s reading easily available here if it was "OTHER" (numbers often parse as digit).
                // Kuromoji often gives 'nou' (Number) POS.
            }

            if (combinedReading) {
                const { pattern, accentMora } = estimatePitch(combinedReading, PartOfSpeech.NOUN);

                processed.push({
                    ...curr,
                    id: `${curr.id}-merged`,
                    surface: combinedSurface,
                    reading: combinedReading,
                    romaji: wanakana.toRomaji(combinedReading),
                    pos: PartOfSpeech.NOUN,
                    posDetail: '日付',
                    pitch: pattern,
                    accentMora: accentMora,
                    baseForm: combinedSurface,
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
