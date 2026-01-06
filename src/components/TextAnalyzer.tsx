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

    // Track currently highlighted tokens locally to support multiple highlighting (e.g. "6日")
    const [highlightedTokenIds, setHighlightedTokenIds] = useState<Set<string>>(new Set());

    // Track current sentence index for sequential playback
    const currentSentenceIndexRef = useRef(0);
    const isPlayingRef = useRef(false);

    // Calculate start offsets for all sentences once when result changes
    const sentenceOffsetsRef = useRef<number[]>([]);
    useEffect(() => {
        if (!result) return;
        let offset = 0;
        sentenceOffsetsRef.current = result.sentences.map(s => {
            const current = offset;
            offset += s.original.length;
            // Add +1 or +length of separation logic if original text had separators?
            // Analyzer splits by [。！？\n]+ and keeps them in specific logic?
            // Wait, analyzer.ts: split(/([。！？\n]+)/).
            // It pushes parts.
            // TextAnalyzer just renders result.sentences.
            // We assume result.sentences covers the text accurately or we need to respect potential gaps?
            // Let's rely on tokenMap's coverage. 
            // Better strategy: Use tokenMap to find the start of the first token of the sentence?
            // But sentences might not have tokens?
            return current;
        });
    }, [result]);

    const playSentence = useCallback((index: number) => {
        if (!result || !isSpeaking || index >= result.sentences.length || !isPlayingRef.current) {
            setIsSpeaking(false);
            setSpeakingTokenId(null);
            setHighlightedTokenIds(new Set());
            ttsInitiatedRef.current = false;
            isPlayingRef.current = false;
            return;
        }

        const sentence = result.sentences[index];
        // Analyzer might produce empty sentences if just newline?
        // IMPORTANT: Do NOT trim textToSpeak, otherwise charIndex will be off by the number of leading spaces!
        const textToSpeak = sentence.original;

        if (!textToSpeak.trim()) {
            playSentence(index + 1);
            return;
        }

        // Calculate global offset using the first token's actual position in the text
        // Anchor: Find where the first token of the sentence is in the global text, 
        // then subtract its relative position in the sentence.
        let sentenceStartOffset = sentenceOffsetsRef.current[index] || 0;

        const firstToken = sentence.tokens[0];
        if (firstToken) {
            const tokenEntry = tokenMapRef.current.find(t => t.id === firstToken.id);
            if (tokenEntry) {
                // relativeStart checks where the token appears in the sentence string
                // e.g. sentence="  Hello", token="Hello" -> relativeStart=2
                const relativeStart = sentence.original.indexOf(firstToken.surface);
                if (relativeStart !== -1) {
                    sentenceStartOffset = tokenEntry.start - relativeStart;
                } else {
                    // Safe fallback: assume it is at the start if indexOf fails (unlikely)
                    sentenceStartOffset = tokenEntry.start;
                }
            }
        }

        ttsManager.speak(
            textToSpeak,
            settings,
            {
                onStart: () => {
                    // Optional: Scroll to sentence?
                },
                onEnd: () => {
                    // Clean up for this sentence
                    setHighlightedTokenIds(new Set());
                    // Play next
                    currentSentenceIndexRef.current = index + 1;
                    playSentence(index + 1);
                },
                onBoundary: (charIndex, charLength = 1) => {
                    // Explicit clear signal
                    if (charIndex === -1) {
                        setHighlightedTokenIds(new Set());
                        return;
                    }

                    // Adjust charIndex to global scope
                    const globalIndex = sentenceStartOffset + charIndex;

                    // Find tokens overlapping with [globalIndex, globalIndex + charLength)
                    const boundaryEnd = globalIndex + charLength;

                    const matchedTokens = tokenMapRef.current.filter(t => {
                        return t.start < boundaryEnd && t.end > globalIndex;
                    });

                    if (matchedTokens.length > 0) {
                        const newSet = new Set(matchedTokens.map(t => t.id));
                        setHighlightedTokenIds(newSet);
                        setSpeakingTokenId(matchedTokens[0].id);
                    } else {
                        // Fallback logic
                        let match = tokenMapRef.current.find(t => globalIndex >= t.start && globalIndex < t.end);
                        if (!match) match = tokenMapRef.current.find(t => t.start >= globalIndex);

                        if (match) {
                            setHighlightedTokenIds(new Set([match.id]));
                            setSpeakingTokenId(match.id);
                        }
                    }
                }
            }
        );
    }, [result, isSpeaking, settings, setIsSpeaking, setSpeakingTokenId]); // Dependencies

    // Handle TTS playback when isSpeaking changes
    useEffect(() => {
        // Start Playback
        if (isSpeaking && result && !ttsInitiatedRef.current) {
            ttsInitiatedRef.current = true;
            isPlayingRef.current = true;
            currentSentenceIndexRef.current = 0; // Reset to start or continue? For now start.

            console.log('[Karaoke] Starting Sequential TTS');
            playSentence(0);
        }

        // Stop Playback
        if (!isSpeaking && ttsInitiatedRef.current) {
            console.log('[Karaoke] Stopping TTS');
            ttsInitiatedRef.current = false;
            isPlayingRef.current = false;
            ttsManager.stop();
            setSpeakingTokenId(null);
            setHighlightedTokenIds(new Set());
        }
    }, [isSpeaking, result, playSentence]); // Simplified dependency list


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
        <div onClick={handleContainerClick} className={clsx("pt-2 pb-6 px-6 md:px-8 font-japanese", fontSizeClass)}>
            {/* Sentences */}
            <div className="divide-y divide-gray-100">
                {result.sentences.map((sentence, sentenceIndex) => {
                    // Filter out space-only tokens
                    const filteredTokens = sentence.tokens.filter(token =>
                        token.surface.trim().length > 0
                    );

                    // Skip empty sentences
                    if (filteredTokens.length === 0) return null;

                    return (
                        <div key={sentence.id} className="py-4 first:pt-0 relative">
                            {/* Sentence number - flush left edge of card */}
                            <div
                                className="absolute -left-6 md:-left-8 top-2 bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-r-lg border border-l-0 border-gray-200"
                                style={{ minWidth: '24px', textAlign: 'center' }}
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
                                        isSpeaking={highlightedTokenIds.has(token.id)}
                                    />
                                ))}
                            </div>

                            {/* 2. Original Japanese sentence with play button - inline */}
                            <div className="flex items-center gap-1 mt-2">
                                <span className="text-sm text-gray-600 leading-relaxed">
                                    {sentence.original.trim()}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        ttsManager.speak(sentence.original, settings, {
                                            onStart: () => { },
                                            onEnd: () => { }
                                        });
                                    }}
                                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                    title="朗读此句"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                </button>
                            </div>

                            {/* 3. Chinese translation */}
                            {settings.showTranslation !== false && (
                                <div className="text-sm text-gray-400 mt-1">
                                    {translations.get(sentence.id) || (
                                        <span className="text-gray-300 animate-pulse">翻译中...</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Info Panel */}
            <InfoPanel token={selectedToken} onClose={handleClosePanel} />
        </div>
    );
}
