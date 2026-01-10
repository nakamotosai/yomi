'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WordToken, PartOfSpeech } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { ttsManager } from '@/lib/tts/manager';
import { Star } from 'lucide-react';
import { COLOR_THEMES } from '@/lib/colorThemes';
import clsx from 'clsx';

interface VocabTipProps {
    tokens: WordToken[];
}

interface VocabEntry {
    token: WordToken;
    shortMeaning: string;
}

const SKIP_WORDS = new Set([
    'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'へ', 'より', 'も', 'の',
    'です', 'ます', 'だ', 'ない', 'ある', 'いる', 'する', 'なる',
    'て', 'た', 'ている', 'てある', 'ておく',
    '。', '、', '！', '？', '（', '）', '「', '」', '・',
    'この', 'その', 'あの', 'こと', 'もの', 'ところ',
    'という', 'といった', 'とか', 'など',
]);

function filterWorthyVocab(tokens: WordToken[]): WordToken[] {
    const seen = new Set<string>();
    const worthy: WordToken[] = [];

    for (const token of tokens) {
        if (SKIP_WORDS.has(token.surface) || SKIP_WORDS.has(token.baseForm)) continue;
        if (token.pos === PartOfSpeech.SYMBOL || token.pos === PartOfSpeech.PARTICLE) continue;
        if (token.surface.length < 2) continue;
        if (seen.has(token.surface)) continue;
        seen.add(token.surface);
        if (/^[ぁ-ん]+$/.test(token.surface) && token.surface.length <= 2) continue;

        // 跳过纯英文/ASCII词汇（如 iPhone, SNS 等）
        if (/^[a-zA-Z0-9\s]+$/.test(token.surface)) continue;

        // 跳过数字、日期、时间相关 (e.g., 11月, 14日, 2023年, 3回, 1つ)
        if (/^[\d０-９一二三四五六七八九十百千万億兆]+(月|日|年|回|度|つ|個|本|枚|冊|台|歳|人|時間|分|秒|円|万|億)?$/.test(token.surface)) continue;

        // 跳过纯数字
        if (/^[\d０-９]+$/.test(token.surface)) continue;

        // 跳过常见的非实词或过于基础的词 (可扩展)
        if (['今回', '前回', '今日', '明日', '昨日', '去年', '今年', '来年'].includes(token.surface)) continue;

        worthy.push(token);
    }

    // 优先级排序：动词/形容词 > 名词 > 其他
    worthy.sort((a, b) => {
        const priority = (pos: PartOfSpeech) => {
            if (pos === PartOfSpeech.VERB) return 0;
            if (pos === PartOfSpeech.ADJECTIVE) return 1;
            if (pos === PartOfSpeech.NOUN) return 2;
            return 3;
        };
        return priority(a.pos) - priority(b.pos);
    });

    // 根据句子长度动态调整生词数量
    const totalLength = tokens.reduce((sum, t) => sum + t.surface.length, 0);
    let limit = 6;
    if (totalLength < 15) limit = 2;
    else if (totalLength < 30) limit = 3;
    else if (totalLength < 50) limit = 4;

    return worthy.slice(0, limit);
}

// 从词典定义中提取中文释义
function extractChineseMeaning(definitions: string[]): string {
    for (const def of definitions) {
        const lines = def.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) continue;
            if (/^【.*?】$/.test(trimmed)) continue;
            if (/^[ぁ-んァ-ン・ー\s-]+\[/.test(trimmed)) continue;

            if (trimmed.includes('。/')) {
                const parts = trimmed.split('。/');
                if (parts.length > 1) {
                    let meaning = parts.slice(1).join('。/').trim();
                    meaning = meaning.replace(/^[①-⑩◯\d.、]+/, '').trim();
                    if (meaning.length > 30) meaning = meaning.slice(0, 30) + '…';
                    if (meaning.length > 0) return meaning;
                }
            }
        }
    }
    return '';
}

async function fetchShortMeaning(word: string): Promise<string> {
    try {
        const res = await fetch(`/api/dictionary/yomitan?keyword=${encodeURIComponent(word)}`);
        const data = await res.json();

        if (data.success && data.results.length > 0) {
            const meaning = extractChineseMeaning(data.results[0].definitions);
            if (meaning) return meaning;
        }

        // Fallback: Google Translate
        const translateRes = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: word, targetLang: 'zh-CN', sourceLang: 'ja' }),
        });
        const translateData = await translateRes.json();
        if (translateData.translation) {
            return translateData.translation;
        }

        return '暂无释义';
    } catch {
        return '暂无释义';
    }
}

export default function VocabTip({ tokens }: VocabTipProps) {
    const [vocabEntries, setVocabEntries] = useState<VocabEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [speakingWord, setSpeakingWord] = useState<string | null>(null);
    const { setSelectedToken, setCurrentSentence, settings, selectedToken, selectedGrammar, isSpeaking } = useAppStore();
    const { vocabList, addVocab, removeVocab, isWordSaved } = useVocabStore();

    const worthyTokens = useMemo(() => filterWorthyVocab(tokens), [tokens]);

    // 组件加载时获取释义
    useEffect(() => {
        let cancelled = false;

        async function loadMeanings() {
            if (worthyTokens.length === 0) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            const promises = worthyTokens.map(async (token) => {
                const shortMeaning = await fetchShortMeaning(token.baseForm || token.surface);
                return { token, shortMeaning };
            });

            const results = await Promise.all(promises);

            if (!cancelled) {
                setVocabEntries(results);
                setIsLoading(false);
            }
        }

        loadMeanings();
        return () => { cancelled = true; };
    }, [worthyTokens]);

    // 自动选中第一个生词（当 InfoPanel 为空时）
    useEffect(() => {
        if (!isLoading && vocabEntries.length >= 3 && !selectedToken && !selectedGrammar) {
            const firstEntry = vocabEntries[0];
            if (firstEntry) {
                const sentenceOriginal = tokens.map(t => t.surface).join('');
                setCurrentSentence(sentenceOriginal);
                setSelectedToken(firstEntry.token);
            }
        }
    }, [isLoading, vocabEntries, selectedToken, selectedGrammar, tokens, setCurrentSentence, setSelectedToken]);

    // 生词最少3个才显示
    if (isLoading || vocabEntries.length < 3) return null;

    const handleWordClick = (token: WordToken, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(true); // User request: Always expand panel when clicking a word
        const sentenceOriginal = tokens.map(t => t.surface).join('');
        setCurrentSentence(sentenceOriginal);
        setSelectedToken(token);

        if (settings.autoReadOnClick && !isSpeaking) {
            ttsManager.speak(token.surface, settings, {});
        }
    };

    return (
        <div className="py-1">
            <div
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="shrink-0 w-12 flex items-center mt-0.5 select-none">
                    <span className="w-[3px] h-3 bg-[var(--scheme-primary)] rounded-sm mr-2 block"></span>
                    <h3 className="text-base font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        生词
                    </h3>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Preview Chips (Always visible) */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                        {worthyTokens.map((token, idx) => {
                            // Resolve theme colors
                            const currentTheme = COLOR_THEMES[settings.colorTheme || 'standard'] || COLOR_THEMES.standard;
                            const themeColors = currentTheme.colors[token.pos] || currentTheme.colors[PartOfSpeech.OTHER];
                            const isColorEnabled = (settings.activeColorPOS || []).includes(token.pos);
                            const isWafu = settings.colorScheme === 'wafu';

                            // Determine style classes
                            const bgClass = isColorEnabled ? themeColors.bg : 'bg-[var(--bg-elevated)]';
                            const textClass = isColorEnabled ? themeColors.text : 'text-[var(--text-secondary)]';
                            const borderClass = isColorEnabled
                                ? (themeColors.border || 'border-transparent')
                                : 'border-[var(--border-muted)]';

                            // Wafu/Monochrome Override
                            const wafuStyle = (() => {
                                const isMonochrome = settings.colorScheme === 'monochrome';
                                if ((!isWafu && !isMonochrome) || !isColorEnabled) return {};

                                const posKeyMap: Record<string, string> = {
                                    [PartOfSpeech.NOUN]: 'noun', [PartOfSpeech.PRONOUN]: 'noun', [PartOfSpeech.PROPER_NOUN]: 'noun',
                                    [PartOfSpeech.VERB]: 'verb', [PartOfSpeech.ADJECTIVE]: 'adjective', [PartOfSpeech.PARTICLE]: 'particle',
                                    [PartOfSpeech.AUXILIARY]: 'auxiliary', [PartOfSpeech.ADVERB]: 'adverb',
                                    [PartOfSpeech.CONJUNCTION]: 'conjunction', [PartOfSpeech.INTERJECTION]: 'conjunction',
                                    [PartOfSpeech.PREFIX]: 'noun', [PartOfSpeech.SUFFIX]: 'noun',
                                };
                                const key = posKeyMap[token.pos] || 'other';
                                return {
                                    backgroundColor: `var(--wafu-${key}-bg)`,
                                    color: `var(--wafu-${key}-text)`,
                                    borderColor: `var(--wafu-${key}-border)`
                                };
                            })();

                            return (
                                <span
                                    key={idx}
                                    onClick={(e) => handleWordClick(token, e)}
                                    className={clsx(
                                        "inline-flex items-center px-1.5 py-0.5 rounded text-base font-normal transition-colors border cursor-pointer hover:brightness-110",
                                        // If Wafu or Monochrome is active, we disable standard classes
                                        // However, inline style always wins.
                                        (!isWafu && !settings.colorScheme?.includes('monochrome')) && bgClass,
                                        (!isWafu && !settings.colorScheme?.includes('monochrome')) && textClass,
                                        (!isWafu && !settings.colorScheme?.includes('monochrome')) && borderClass
                                    )}
                                    style={isWafu || settings.colorScheme === 'monochrome' ? wafuStyle : undefined}
                                >
                                    {token.surface}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Arrow - Always visible */}
                <svg
                    className={clsx(
                        "w-4 h-4 text-[var(--text-muted)] transition-transform mt-0.5 shrink-0 hover:text-[var(--text-secondary)]",
                        isExpanded && "rotate-180"
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* List Content (Visible when expanded) - Placed below header with indentation */}
            {isExpanded && (
                <div className="flex flex-col gap-1 mt-2 ml-[60px] border-l-2 border-[var(--border-muted)] pl-2">
                    {vocabEntries.map((entry, idx) => {
                        const currentTheme = COLOR_THEMES[settings.colorTheme || 'standard'] || COLOR_THEMES.standard;
                        const themeColors = currentTheme.colors[entry.token.pos] || currentTheme.colors[PartOfSpeech.OTHER];
                        const isColorEnabled = (settings.activeColorPOS || []).includes(entry.token.pos);
                        const textClass = isColorEnabled ? themeColors.text : 'text-[var(--text-primary)]';

                        // Logic for Saved State
                        const effectiveReading = entry.token.reading || entry.token.surface;
                        const isSaved = isWordSaved(entry.token.surface, effectiveReading);

                        const handleToggleSave = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (isSaved) {
                                const item = vocabList.find(v => v.word === entry.token.surface && v.reading === effectiveReading);
                                if (item) removeVocab(item.id);
                            } else {
                                const sentenceContext = tokens.map(t => t.surface).join('');
                                addVocab({
                                    word: entry.token.surface,
                                    reading: effectiveReading,
                                    baseForm: entry.token.baseForm, // Assuming baseForm is available on token
                                    meaning: entry.shortMeaning,
                                    pos: entry.token.pos,
                                    pitch: entry.token.pitch,
                                    context: sentenceContext,
                                });
                            }
                        };

                        return (
                            <div
                                key={idx}
                                className="flex items-baseline gap-2 py-1 border-b border-[var(--border-muted)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors px-2 -mx-2 rounded cursor-pointer group/row"
                                onClick={(e) => handleWordClick(entry.token, e)}
                            >
                                {/* Word + Reading */}
                                <div className="shrink-0 flex items-baseline gap-2 w-1/3 min-w-[100px]">
                                    {/* Star Button - Always visible, subtle by default */}
                                    <button
                                        onClick={handleToggleSave}
                                        className={clsx(
                                            "shrink-0 w-4 h-4 transition-all focus:outline-none flex items-center justify-center -ml-1 mr-1",
                                            isSaved
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-slate-300 hover:text-amber-400 hover:fill-amber-400" // Very subtle gray by default
                                        )}
                                        title={isSaved ? "保存済み（クリックして削除）" : "単語帳に保存"}
                                    >
                                        <Star className="w-3.5 h-3.5" strokeWidth={isSaved ? 2 : 1.5} />
                                    </button>

                                    <span className={clsx("font-bold text-base", textClass)}>
                                        {entry.token.surface}
                                    </span>

                                    {/* Speaker Button - Always visible, circular bg when speaking */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (speakingWord === entry.token.surface) {
                                                ttsManager.stop();
                                                setSpeakingWord(null);
                                                return;
                                            }

                                            if (isSpeaking) return;

                                            setSpeakingWord(entry.token.surface);
                                            ttsManager.speak(entry.token.surface, settings, {
                                                onStart: () => { },
                                                onEnd: () => setSpeakingWord(null),
                                                onError: () => setSpeakingWord(null)
                                            });
                                        }}
                                        className={clsx(
                                            "inline-flex items-center justify-center w-5 h-5 rounded-full transition-all ml-1",
                                            speakingWord === entry.token.surface
                                                ? "bg-emerald-100 text-emerald-600 scale-110" // Active state
                                                : "text-slate-300 hover:text-emerald-600 hover:bg-emerald-50" // Default subtle state
                                        )}
                                        title="朗读"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {speakingWord === entry.token.surface ? (
                                                // Active/Speaking Icon (Sound waves)
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            ) : (
                                                // Static Icon (Simple Speaker)
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            )}
                                        </svg>
                                    </button>
                                    {/* 纯英文不显示读音 */}
                                    {entry.token.reading &&
                                        entry.token.reading !== entry.token.surface &&
                                        !/^[a-zA-Z0-9\s]+$/.test(entry.token.surface) && (
                                            <span className="text-xs text-[var(--text-muted)] truncate">
                                                {entry.token.reading}
                                            </span>
                                        )}
                                </div>

                                {/* Separator */}
                                <div className="text-[var(--text-faint)] text-xs">·</div>

                                {/* Meaning */}
                                <div className="text-[var(--text-secondary)] text-sm truncate flex-1" title={entry.shortMeaning}>
                                    {entry.shortMeaning}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
