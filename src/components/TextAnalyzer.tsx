'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisResult, WordToken } from '@/types';
import { analyzeJapaneseText } from '@/lib/nlp/analyzer';
import { translateText } from '@/lib/translate';
import { useAppStore } from '@/store/useAppStore';
import WordTokenComponent from './WordToken';
import VocabTip from './VocabTip';
import GrammarTip from './GrammarTip';
import TranslationTip from './TranslationTip';
import clsx from 'clsx';

interface TextAnalyzerProps {
    text: string;
}

export default function TextAnalyzer({ text }: TextAnalyzerProps) {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [translations, setTranslations] = useState<Map<string, string>>(new Map());
    const { selectedToken, setSelectedToken, setCurrentSentence, settings, isSpeaking, setIsSpeaking, setSpeakingTokenId, speakingTokenId, setIsMobileSheetOpen, setPlaylist, playlist, currentSentenceIndex } = useAppStore();
    const isDark = settings.theme === 'dark';


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
        setTranslations(new Map());
        setResult(null); // Clear previous result

        try {
            const analysis = await analyzeJapaneseText(text);
            if (!isMountedRef.current) return;

            // Immediately show result - don't wait for translations
            setResult(analysis);
            setIsLoading(false); // Stop loading spinner as soon as analysis is ready

            // Start translating sentences in background (parallel, decoupled from display)
            analysis.sentences.forEach(async (sentence) => {
                try {
                    const translation = await translateText(sentence.original);
                    if (isMountedRef.current) {
                        setTranslations(prev => new Map(prev).set(sentence.id, translation));
                    }
                } catch (e) {
                    console.warn('Translation failed', e);
                }
            });
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            console.error('Analysis error:', err);
            const errorMessage = err instanceof Error ? err.message : '分析中にエラーが発生しました';
            setError(errorMessage);
            setIsLoading(false);
        }
    }, [text, setSelectedToken, setSpeakingTokenId]);

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

    // We don't need isSpeakingRef anymore or the effect listening to isSpeaking

    // Removed old TTS logic (playSentence, useEffects, etc.)
    // Cleanup of internal state not needed anymore as store handles it.


    // Auto-analyze on mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        analyze();
    }, [analyze]);

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
                <p className="text-sm">解析中...</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>少々お待ちください</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 px-4">
                <div className="rounded-lg p-4 inline-block" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <p className="font-medium">エラー</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
                <button
                    onClick={analyze}
                    className="mt-4 px-4 py-2 rounded-lg text-sm transition-colors"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                    再試行
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
                            className="rounded-xl shadow-sm relative transition-shadow glass-card overflow-hidden"
                            style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            {/* Zone 1: Reading Area */}
                            <div className="p-5 relative">
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
                                            "ml-2 w-7 h-7 flex items-center justify-center rounded-full transition-all self-end mb-1",
                                            isSpeaking && playlist.length === 1 && playlist[0].id === sentence.id
                                                ? "bg-emerald-100 text-emerald-600 scale-110 shadow-sm"
                                                : "text-slate-300 hover:text-emerald-600 hover:bg-emerald-50"
                                        )}
                                        title="この文を再生"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {isSpeaking && playlist.length === 1 && playlist[0].id === sentence.id ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Zone 2: Learning Panel */}
                            <div
                                className="px-5 py-4 border-t border-[var(--border-muted)] bg-gray-50/50 dark:bg-black/20"
                            >
                                <div className="space-y-4">
                                    {/* Translation */}
                                    {settings.showTranslation !== false && (
                                        <TranslationTip
                                            original={sentence.original}
                                            translation={translations.get(sentence.id)}
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
