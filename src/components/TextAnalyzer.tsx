'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisResult, WordToken } from '@/types';
import { ttsManager } from '@/lib/tts/manager';
import { analyzeJapaneseText } from '@/lib/nlp/analyzer';
import { translateText } from '@/lib/translate';
import { useAppStore } from '@/store/useAppStore';
import WordTokenComponent from './WordToken';
import InfoPanel from './InfoPanel';
import clsx from 'clsx';

interface TextAnalyzerProps {
    text: string;
}

export default function TextAnalyzer({ text }: TextAnalyzerProps) {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [translations, setTranslations] = useState<Map<string, string>>(new Map());
    const { selectedToken, setSelectedToken, setCurrentSentence, settings, isSpeaking, setIsSpeaking, setSpeakingTokenId, speakingTokenId } = useAppStore();

    // Track if we initiated the TTS to avoid double-triggering
    const ttsInitiatedRef = useRef(false);
    // Store token map for boundary events
    const tokenMapRef = useRef<{ start: number, end: number, id: string }[]>([]);

    const analyze = useCallback(async () => {
        if (!text.trim()) return;

        setIsLoading(true);
        setError(null);
        setSelectedToken(null);
        setSpeakingTokenId(null);
        setTranslations(new Map());

        try {
            const analysis = await analyzeJapaneseText(text);
            setResult(analysis);

            // Start translating sentences in background
            analysis.sentences.forEach(async (sentence) => {
                const translation = await translateText(sentence.original);
                setTranslations(prev => new Map(prev).set(sentence.id, translation));
            });
        } catch (err: unknown) {
            console.error('Analysis error:', err);
            const errorMessage = err instanceof Error ? err.message : '分析中にエラーが発生しました';
            setError(errorMessage);
        } finally {
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

    // Handle TTS playback when isSpeaking changes
    useEffect(() => {
        // If isSpeaking becomes true and we haven't initiated TTS yet
        if (isSpeaking && result && !ttsInitiatedRef.current) {
            ttsInitiatedRef.current = true;

            console.log('[Karaoke] Starting TTS, tokenMap size:', tokenMapRef.current.length);

            ttsManager.speak(
                text,
                settings,
                {
                    onStart: () => {
                        console.log('[Karaoke] TTS onStart');
                        // Don't call setIsSpeaking here as it's already true
                    },
                    onEnd: () => {
                        console.log('[Karaoke] TTS onEnd');
                        ttsInitiatedRef.current = false;
                        setIsSpeaking(false);
                        setSpeakingTokenId(null);
                    },
                    onBoundary: (charIndex) => {
                        // Find token at this char index
                        console.log('[Karaoke] onBoundary charIndex:', charIndex);
                        const match = tokenMapRef.current.find(t => charIndex >= t.start && charIndex < t.end);
                        if (match) {
                            console.log('[Karaoke] Highlighting token:', match.id);
                            setSpeakingTokenId(match.id);
                        }
                    }
                }
            );
        }

        // If isSpeaking becomes false, stop TTS
        if (!isSpeaking && ttsInitiatedRef.current) {
            console.log('[Karaoke] Stopping TTS');
            ttsInitiatedRef.current = false;
            ttsManager.stop();
            setSpeakingTokenId(null);
        }
    }, [isSpeaking, result, text, settings, setIsSpeaking, setSpeakingTokenId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (ttsInitiatedRef.current) {
                ttsManager.stop();
                ttsInitiatedRef.current = false;
            }
        };
    }, []);

    // Auto-analyze on mount
    useEffect(() => {
        analyze();
    }, [analyze]);

    const handleTokenSelect = (token: WordToken, sentenceOriginal: string) => {
        setSelectedToken(token);
        setCurrentSentence(sentenceOriginal);
    };

    const handleClosePanel = () => {
        setSelectedToken(null);
    };

    // Click outside to deselect
    const handleContainerClick = () => {
        if (selectedToken) {
            setSelectedToken(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-sm">辞書を読み込み中...</p>
                <p className="text-xs text-gray-300 mt-1">初回読み込みには数秒かかります</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 px-4">
                <div className="bg-red-50 text-red-600 rounded-lg p-4 inline-block">
                    <p className="font-medium">エラー</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
                <button
                    onClick={analyze}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
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
        <div onClick={handleContainerClick}>
            {/* Reading View */}
            <div className={clsx(
                "bg-white rounded-xl shadow-sm border border-gray-100 min-h-[40vh] p-6 md:p-8 font-japanese",
                fontSizeClass
            )}>
                {/* Sentences */}
                <div className="space-y-6 leading-relaxed">
                    {result.sentences.map((sentence) => (
                        <div key={sentence.id} className="space-y-2">
                            {/* Japanese tokens */}
                            <div className="flex flex-wrap items-end gap-y-4 pt-4">
                                {sentence.tokens.map((token) => (
                                    <WordTokenComponent
                                        key={token.id}
                                        token={token}
                                        onSelect={(t) => handleTokenSelect(t, sentence.original)}
                                        isSelected={selectedToken?.id === token.id}
                                        isSpeaking={speakingTokenId === token.id}
                                    />
                                ))}
                            </div>
                            {/* Chinese translation */}
                            {settings.showTranslation !== false && (
                                <div className="pl-1 text-sm text-gray-500 border-l-2 border-blue-200 ml-1">
                                    {translations.get(sentence.id) || (
                                        <span className="text-gray-300 animate-pulse">翻译中...</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Panel */}
            <InfoPanel token={selectedToken} onClose={handleClosePanel} />
        </div>
    );
}
