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
    const { selectedToken, setSelectedToken, setCurrentSentence, settings, isSpeaking, setIsSpeaking, setSpeakingTokenId, speakingTokenId, setIsMobileSheetOpen, setPlaylist } = useAppStore();

    // Track if we initiated the TTS to avoid double-triggering
    const ttsInitiatedRef = useRef(false);
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

        try {
            const analysis = await analyzeJapaneseText(text);
            if (!isMountedRef.current) return;
            setResult(analysis);

            // Start translating sentences in background
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
        } finally {
            if (isMountedRef.current) setIsLoading(false);
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
                const tokens = s.tokens.filter(t => t.surface.trim().length > 0);

                // Generate local token map for this sentence
                let cursor = 0;
                const map: { start: number, end: number, id: string }[] = [];

                s.tokens.forEach(t => {
                    const start = s.original.indexOf(t.surface, cursor);
                    if (start !== -1) {
                        const len = t.surface.length;
                        map.push({ start, end: start + len, id: t.id });
                        cursor = start + len;
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
        }
    }, [result, setPlaylist]);

    // We don't need isSpeakingRef anymore or the effect listening to isSpeaking

    // Removed old TTS logic (playSentence, useEffects, etc.)
    // Cleanup of internal state not needed anymore as store handles it.


    // Auto-analyze on mount
    useEffect(() => {
        analyze();
    }, [analyze]);

    const handleTokenSelect = (token: WordToken, sentenceOriginal: string) => {
        setSelectedToken(token);
        setCurrentSentence(sentenceOriginal);
        setIsMobileSheetOpen(true);
    };

    // Click outside to deselect
    const handleContainerClick = () => {
        if (selectedToken) {
            // We do NOT deselect here because layout is split; 
            // user might click blank space in center panel but want to keep side panel info.
            // If we want to deselect when clicking completely empty space, we can.
            // setSelectedToken(null);
        }
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
                            className="rounded-xl shadow-sm p-4 relative transition-shadow glass-card"
                            style={{
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--border-default)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            {/* Sentence number */}
                            <div
                                className="absolute -left-3 top-4 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg shadow-sm"
                                style={{
                                    background: 'var(--bg-muted)',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border-default)',
                                    backdropFilter: 'blur(4px)'
                                }}
                            >
                                {sentenceIndex + 1}
                            </div>

                            {/* 1. Interlinear tokens */}
                            <div className={clsx(
                                "flex flex-wrap items-end",
                                settings.showPitchAccent ? "gap-y-4" : "gap-y-1"
                            )}>
                                {filteredTokens.map((token) => (
                                    <WordTokenComponent
                                        key={token.id}
                                        token={token}
                                        onSelect={(t) => handleTokenSelect(t, sentence.original)}
                                        isSelected={selectedToken?.id === token.id}
                                        isSpeaking={speakingTokenId === token.id}
                                    />
                                ))}
                            </div>

                            {/* 2. Translation tip (collapsible) */}
                            {settings.showTranslation !== false && (
                                <TranslationTip
                                    original={sentence.original}
                                    translation={translations.get(sentence.id)}
                                />
                            )}

                            {/* 4. Vocabulary tips */}
                            <VocabTip tokens={sentence.tokens} />

                            {/* 5. Grammar tips */}
                            <GrammarTip sentence={sentence.original} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
