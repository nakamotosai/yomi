'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisResult, WordToken } from '@/types';
import { analyzeJapaneseText } from '@/lib/nlp/analyzer';
import { translateText } from '@/lib/translate';
import { Volume2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import WordTokenComponent from './WordToken';
import VocabTip from './VocabTip';
import GrammarTip from './GrammarTip';
import TranslationTip from './TranslationTip';
import clsx from 'clsx';
import { useI18n } from '@/lib/i18n';

interface TextAnalyzerProps {
    text: string;
}

export default function TextAnalyzer({ text }: TextAnalyzerProps) {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [translations, setTranslations] = useState<Map<string, string>>(new Map());
    const { selectedToken, setSelectedToken, setCurrentSentence, settings, isSpeaking, setIsSpeaking, setSpeakingTokenId, speakingTokenId, setIsMobileSheetOpen, setPlaylist, playlist, currentSentenceIndex, setFullTranslation, fullTranslation, cacheTranslation, translationCache } = useAppStore();
    const { t } = useI18n();
    const isDark = settings.theme === 'dark';

    // No debounce needed as input is manually triggered via "Analyze" button


    // Store token map for boundary events
    const tokenMapRef = useRef<{ start: number, end: number, id: string }[]>([]);

    // Track mount status
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const analyze = useCallback(async () => {
        if (!text.trim()) return;

        setIsLoading(true);
        setError(null);
        setSelectedToken(null);
        setSpeakingTokenId(null);
        // Do not clear translations here, handled in text effect
        setResult(null);

        try {
            const analysis = await analyzeJapaneseText(text);
            if (!isMountedRef.current) return;

            setResult(analysis);
            setIsLoading(false);
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            console.error('Analysis error:', err);
            const errorMessage = err instanceof Error ? err.message : t('common.analyze_error');
            setError(errorMessage);
            setIsLoading(false);
        }
    }, [text, setSelectedToken, setSpeakingTokenId, t]);

    // Manual Full Translation Trigger
    const handleFullTranslation = async () => {
        if (!result || result.sentences.length === 0) return;

        const sentences = result.sentences;
        const fullText = sentences.map(s => s.original).join('\n');

        try {
            const translatedText = await translateText(fullText);

            if (isMountedRef.current && translatedText) {
                const translatedSentences = translatedText.split('\n');
                const newMap = new Map<string, string>();
                sentences.forEach((s, idx) => {
                    const trans = translatedSentences[idx] || '';
                    newMap.set(s.id, trans);
                });
                setTranslations(newMap);
                setFullTranslation(translatedText);
            }
        } catch (e) {
            console.warn('Bulk translation failed', e);
        }
    };

    // Per-sentence translation trigger
    const handleSentenceTranslation = async (sentenceId: string, text: string) => {
        if (!text) return;

        try {
            const translated = await translateText(text);
            if (isMountedRef.current && translated) {
                setTranslations(prev => {
                    const newMap = new Map(prev);
                    newMap.set(sentenceId, translated);
                    return newMap;
                });
            }
        } catch (e) {
            console.error("Sentence translation failed", e);
        }
    };

    // Build token map when result changes
    useEffect(() => {
        if (!result) {
            tokenMapRef.current = [];
            return;
        }

        let cursor = 0;
        const tokenMap: { start: number, end: number, id: string }[] = [];

        result.sentences.forEach(s => {
            s.tokens.forEach(t => {
                const start = text.indexOf(t.surface, cursor);
                if (start !== -1) {
                    const len = t.surface.length;
                    tokenMap.push({ start, end: start + len, id: t.id });
                    cursor = start + len;
                } else {
                    cursor += t.surface.length;
                }
            });
        });

        tokenMapRef.current = tokenMap;
    }, [result, text]);

    // Track currently highlighted tokens via store - derived from speakingTokenId
    // const speakingTokenId is already from store

    // Effect to trigger playlist generation when isSpeaking becomes true (controlled by page header)
    // Note: page.tsx header toggle sets isSpeaking=true.
    // If we are NOT playing yet, we should generate playlist and start.
    // BUT, isSpeaking is shared status.
    // Better Approach: The Header Button should probably call a function handled here?
    // OR: page.tsx handles "Play All" using store?
    // Challenge: page.tsx doesn't know the Analysis Result content.
    // Solution: When `result` is ready, TextAnalyzer can sync the playlist to the store?
    // Or simpler: We listen to `isSpeaking` turning true. If playlist is empty or we force restart?

    // Let's look at page.tsx's handlePlayAll:
    // It calls setIsSpeaking(true).
    // TextAnalyzer sees isSpeaking=true.
    // If playlist is not set, we set it.

    // Sync playlist to store whenever result changes
    // This ensures GlobalAudioPlayer has data ready BEFORE 'Play' is clicked.
    useEffect(() => {
        if (result && result.sentences.length > 0) {
            console.log('[TextAnalyzer] Syncing playlist to store...');

            // transform sentences to playlist
            const newPlaylist = result.sentences.map(s => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _tokens = s.tokens.filter(t => t.surface.trim().length > 0);

                // Generate local token map for this sentence
                let cursor = 0;
                const map: { start: number, end: number, id: string }[] = [];

                s.tokens.forEach(t => {
                    const start = s.original.indexOf(t.surface, cursor);
                    if (start !== -1) {
                        const len = t.surface.length;
                        map.push({ start, end: start + len, id: t.id });
                        cursor = start + len;
                    } else {
                        // Fallback: use cursor position even if exact match not found
                        // This handles cases where tokenization differs from original text
                        const len = t.surface.length;
                        map.push({ start: cursor, end: cursor + len, id: t.id });
                        cursor += len;
                    }
                });

                return {
                    id: s.id,
                    text: s.original,
                    tokenMap: map
                };
            });

            // Use setPlaylist (which resets index) instead of playPlaylist
            // We do NOT want to auto-start, just prep the data.
            // Note: playPlaylist from store handles "Smart Check", setPlaylist does not.
            // But since IDs are deterministic now, even if we reset, it's consistent.
            // We can use the exposed setter from store
            setPlaylist(newPlaylist);
            useAppStore.getState().setFullPlaylist(newPlaylist);
        }
    }, [result, setPlaylist]);

    // Unified full translation trigger (Immediate)
    useEffect(() => {
        if (!text.trim() || !result || result.sentences.length === 0) return;
        if (!isMountedRef.current) return;

        // 0. Check Cache First (Synchronous)
        const currentCache = useAppStore.getState().translationCache;
        const cachedParams = currentCache[text];

        if (cachedParams) {
            console.log(`[TextAnalyzer] Cache HIT for translation: Immediate apply.`);
            const translatedLines = cachedParams.split('\n');
            const idMap = new Map<string, string>();
            result.sentences.forEach((s, idx) => {
                const trans = translatedLines[idx] || '';
                idMap.set(s.id, trans);
            });
            const timeout = window.setTimeout(() => {
                setTranslations(idMap);
                setFullTranslation(cachedParams);
            }, 0);
            return () => window.clearTimeout(timeout);
        }

        // Cache Miss: Fetch Immediately (User manually triggered analysis)
        console.log(`[TextAnalyzer] Fetching single full translation for entire text...`);

        const fetchTranslation = async () => {
            if (!isMountedRef.current) return;
            try {
                // Single request strategy with enforced line breaks for alignment
                // 1. Join all sentences with newlines to force the API to maintain structure
                const fullTextToTranslate = result.sentences.map(s => s.original).join('\n');

                // 2. Single API Call
                const translatedBlock = await translateText(fullTextToTranslate);

                if (isMountedRef.current && translatedBlock) {
                    // 3. Align & Split
                    const translatedLines = translatedBlock.split('\n');

                    const idMap = new Map<string, string>();
                    const validParts: string[] = [];

                    result.sentences.forEach((s, idx) => {
                        const trans = translatedLines[idx] || '';
                        idMap.set(s.id, trans);
                        validParts.push(trans);
                    });

                    // 4. Update Cards
                    setTranslations(idMap);

                    // 5. Update Full Translation Panel & Cache
                    const finalBlock = validParts.join('\n');

                    cacheTranslation(text, finalBlock);
                    setFullTranslation(finalBlock);
                }
            } catch (e) {
                console.warn('Full text translation failed', e);
            }
        };

        fetchTranslation();

    }, [text, result, setFullTranslation, cacheTranslation]);

    // Analyze text immediately (Input is manually committed)
    useEffect(() => {
        if (text.trim()) {
            const timeout = window.setTimeout(() => {
                void analyze();
            }, 0);
            return () => window.clearTimeout(timeout);
        }
    }, [text, analyze]);

    const handleTokenSelect = (token: WordToken, sentenceOriginal?: string) => {
        setSelectedToken(token);
        if (sentenceOriginal) {
            setCurrentSentence(sentenceOriginal);
        }
        setIsMobileSheetOpen(true);
    };


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
                <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent-primary)' }} />
                <p className="text-sm">{t('common.loading')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{t('common.please_wait')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 px-4">
                <div className="rounded-lg p-4 inline-block" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <p className="font-medium">{t('common.error')}</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
                <button
                    onClick={analyze}
                    className="mt-4 px-4 py-2 rounded-lg text-sm transition-colors"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                    {t('common.retry')}
                </button>
            </div>
        );
    }

    if (!result) {
        return null;
    }

    // Map fontSize setting to CSS class
    const fontSizeClass = {
        'small': 'text-sm',
        'medium': 'text-base',
        'large': 'text-xl'
    }[settings.fontSize] || 'text-base';

    return (
        <div className={clsx("pb-20 font-japanese", fontSizeClass)}>
            {/* Sentences */}
            <div className="space-y-4">

                {result.sentences.map((sentence, sentenceIndex) => {
                    // Filter out space-only tokens
                    const filteredTokens = sentence.tokens.filter(token =>
                        token.surface.trim().length > 0
                    );

                    // Skip empty sentences
                    if (filteredTokens.length === 0) return null;

                    return (
                        <div
                            key={sentence.id}
                            className="rounded-xl shadow-sm relative transition-shadow border border-[var(--border-muted)] backdrop-blur-xl overflow-hidden"
                            style={{
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            {/* Zone 1: Reading Area */}
                            <div className="p-5 relative bg-white/20 dark:bg-black/20">
                                {/* Sentence number (Watermark style) */}
                                <div
                                    className="absolute bottom-0 right-4 text-5xl font-black italic tracking-tighter leading-none select-none pointer-events-none"
                                    style={{
                                        color: 'var(--text-primary)',
                                        opacity: isDark ? 0.08 : 0.04,
                                        zIndex: 0
                                    }}
                                >
                                    {sentenceIndex + 1}
                                </div>

                                {/* Interlinear tokens */}
                                <div className={clsx(
                                    "flex flex-wrap items-end relative z-10",
                                    settings.showPitchAccent ? "gap-y-4" : "gap-y-1"
                                )}>
                                    {filteredTokens.map((token) => {
                                        // Calculate skyDropReveal logic
                                        // 1. Identify active sentence (contains speakingTokenId?)
                                        // Since TextAnalyzer renders multiple sentences, we need to know if speakingTokenId belongs to THIS sentence.

                                        // Find index of speaking token in this sentence
                                        const speakingTokenIndex = sentence.tokens.findIndex(t => t.id === speakingTokenId);
                                        const isSentenceActive = speakingTokenIndex !== -1;

                                        // Find index of current token
                                        const currentTokenIndex = sentence.tokens.findIndex(t => t.id === token.id);

                                        let skyDropReveal = true; // Default visible

                                        if (settings.karaokeMode && settings.karaokeStyle === 'sky-drop') {
                                            let isVisible = true;

                                            // Use currentSentenceIndex from store as the source of truth for "Past/Current/Future"
                                            // This persists even during audio loading gaps when speakingTokenId might be null or stale
                                            if (isSpeaking) {
                                                isVisible = false; // Default hidden unless proven otherwise

                                                if (sentenceIndex < currentSentenceIndex) {
                                                    // Past Sentence -> Always Visible
                                                    isVisible = true;
                                                } else if (sentenceIndex === currentSentenceIndex) {
                                                    // Current Sentence -> Check Token Progress
                                                    if (isSentenceActive) { // isSentenceActive means speakingTokenId is in THIS sentence
                                                        if (currentTokenIndex <= speakingTokenIndex) {
                                                            isVisible = true;
                                                        }
                                                    } else {
                                                        // Active Sentence but no valid token match in it yet
                                                        // (Beginning of sentence or loading) -> Remain Hidden
                                                    }
                                                } else {
                                                    // Future Sentence -> Hidden
                                                    isVisible = false;
                                                }
                                            } else {
                                                // Not Speaking (Stopped) -> Visible
                                                isVisible = true;
                                            }

                                            skyDropReveal = isVisible;
                                        }

                                        // Memoization optimization:
                                        // 1. Pass 'sentenceText' so WordToken can pass it back to callback (avoiding closure)
                                        // 2. Pass 'handleTokenSelect' directly (stable reference)
                                        return (
                                            <WordTokenComponent
                                                key={token.id}
                                                token={token}
                                                // Function now correctly typed in WordToken props
                                                onSelect={handleTokenSelect}
                                                sentenceText={sentence.original}
                                                isSelected={selectedToken?.id === token.id}
                                                isSpeaking={speakingTokenId === token.id}
                                                skyDropReveal={skyDropReveal}
                                            />
                                        );
                                    })}
                                    {/* Single sentence play button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Toggle logic
                                            if (isSpeaking && playlist.length === 1 && playlist[0].id === sentence.id) {
                                                setIsSpeaking(false);
                                                return;
                                            }

                                            // Build playlist for just this sentence
                                            let cursor = 0;
                                            const map: { start: number, end: number, id: string }[] = [];
                                            sentence.tokens.forEach(t => {
                                                const start = sentence.original.indexOf(t.surface, cursor);
                                                if (start !== -1) {
                                                    const len = t.surface.length;
                                                    map.push({ start, end: start + len, id: t.id });
                                                    cursor = start + len;
                                                }
                                            });
                                            const singlePlaylist = [{
                                                id: sentence.id,
                                                text: sentence.original,
                                                tokenMap: map
                                            }];
                                            // Use playPlaylist from store
                                            useAppStore.getState().setPlaylist(singlePlaylist);
                                            useAppStore.getState().setIsSpeaking(true);
                                        }}
                                        className={clsx(
                                            "ml-2 p-1.5 flex items-center justify-center rounded-xl transition-all self-end mb-1",
                                            "bg-[var(--bg-muted)] text-slate-500",
                                            "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95",
                                            isSpeaking && playlist.length === 1 && playlist[0].id === sentence.id && "animate-pulse ring-2 ring-[var(--accent-primary)] ring-opacity-50"
                                        )}
                                        title={t('common.play_sentence')}
                                    >
                                        <Volume2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Zone 2: Learning Panel */}
                            <div
                                className="px-5 py-4 border-t border-black/5 dark:border-white/5 bg-transparent"
                            >
                                <div className="space-y-4">
                                    {/* Translation */}
                                    {settings.showTranslation !== false && (
                                        <TranslationTip
                                            original={sentence.original}
                                            translation={translations.get(sentence.id)}
                                            onTranslate={() => handleSentenceTranslation(sentence.id, sentence.original)}
                                        />
                                    )}

                                    {/* Vocabulary */}
                                    <VocabTip tokens={sentence.tokens} />

                                    {/* Grammar */}
                                    {/* Grammar */}
                                    <GrammarTip sentence={sentence.original} tokens={sentence.tokens} />

                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
