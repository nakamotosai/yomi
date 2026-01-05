'use client';

import React, { useState, useCallback } from 'react';
import { AnalysisResult, WordToken } from '@/types';
import { ttsManager } from '@/lib/tts/manager';
import { analyzeJapaneseText } from '@/lib/nlp/analyzer';
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
    const { selectedToken, setSelectedToken, setCurrentSentence, settings, isSpeaking, setIsSpeaking, setSpeakingTokenId, speakingTokenId } = useAppStore();

    const analyze = useCallback(async () => {
        if (!text.trim()) return;

        setIsLoading(true);
        setError(null);
        setSelectedToken(null);
        setSpeakingTokenId(null);

        try {
            const analysis = await analyzeJapaneseText(text);
            setResult(analysis);
        } catch (err: any) {
            console.error('Analysis error:', err);
            setError(err.message || '分析中にエラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    }, [text, setSelectedToken, setSpeakingTokenId]);

    // Sync audio with PlayAll button in parent
    React.useEffect(() => {
        if (isSpeaking && result) {
            // Calculate token offsets for matching
            // This is a simplified approach. A more robust way would be to store start/end indices during analysis.
            // Here we assume linear progression.
            let charCount = 0;
            const tokenMap: { start: number, end: number, id: string }[] = [];

            result.sentences.forEach(s => {
                s.tokens.forEach(t => {
                    const len = t.surface.length;
                    tokenMap.push({ start: charCount, end: charCount + len, id: t.id });
                    charCount += len;
                });
                // Add sentence punctuation/spacing if needed, but analyzeJapaneseText splits by punctuation
                // and includes them as tokens or separate parts.
                // Our analyzer puts punctuation in tokens usually if they are separate.
                // Actually, split by `([。！？\n]+)` might result in some gaps if not careful,
                // but `analyzeSentence` logic handles the parts.
                // Let's rely on the fact that `tokens` cover the sentence.
            });

            ttsManager.speak(
                text,
                settings, // Pass current settings
                {
                    onStart: () => setIsSpeaking(true),
                    onEnd: () => {
                        setIsSpeaking(false);
                        setSpeakingTokenId(null);
                    },
                    onBoundary: (charIndex) => {
                        // Find token at this char index
                        const match = tokenMap.find(t => charIndex >= t.start && charIndex < t.end);
                        if (match) {
                            setSpeakingTokenId(match.id);
                        }
                    }
                }
            );
        } else {
            // If stopped externally or initially
            ttsManager.stop();
            setSpeakingTokenId(null);
        }
    }, [isSpeaking, result, setIsSpeaking, setSpeakingTokenId, text, settings]);

    // Auto-analyze on mount
    React.useEffect(() => {
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

    return (
        <div onClick={handleContainerClick}>
            {/* Reading View */}
            <div className={clsx(
                "bg-white rounded-xl shadow-sm border border-gray-100 min-h-[40vh] p-6 md:p-8 font-japanese",
                settings.fontSize === 'sm' && 'text-sm',
                settings.fontSize === 'lg' && 'text-xl'
            )}>
                {/* Sentences */}
                <div className="space-y-8 leading-relaxed">
                    {result.sentences.map((sentence) => (
                        <div
                            key={sentence.id}
                            className="flex flex-wrap items-end gap-y-4 pt-4"
                        >
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
                    ))}
                </div>
            </div>

            {/* Info Panel */}
            <InfoPanel token={selectedToken} onClose={handleClosePanel} />
        </div>
    );
}
