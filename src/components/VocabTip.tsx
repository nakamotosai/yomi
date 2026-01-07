'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WordToken, PartOfSpeech } from '@/types';
import { useAppStore } from '@/store/useAppStore';
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
        worthy.push(token);
    }

    return worthy.slice(0, 5);
}

// 从词典定义中提取中文释义
// 格式是: "日文释义。/中文释义" - 中文在 。/ 之后
function extractChineseMeaning(definitions: string[]): string {
    for (const def of definitions) {
        const lines = def.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();

            // 跳过空行
            if (!trimmed) continue;
            // 跳过词头行（如【見込み】）
            if (/^【.*?】$/.test(trimmed)) continue;
            // 跳过读音行（如 "みこみ [見込み]"）
            if (/^[ぁ-んァ-ン・ー\s-]+\[/.test(trimmed)) continue;

            // 查找 "。/" 格式，取后面的中文部分
            if (trimmed.includes('。/')) {
                const parts = trimmed.split('。/');
                if (parts.length > 1) {
                    // 取 。/ 之后的中文部分
                    let meaning = parts.slice(1).join('。/').trim();
                    // 去掉编号
                    meaning = meaning.replace(/^[①-⑩◯\d.、]+/, '').trim();
                    if (meaning.length > 30) meaning = meaning.slice(0, 30) + '…';
                    if (meaning.length > 0) return meaning;
                }
            }
        }
    }
    return '暂无释义';
}

async function fetchShortMeaning(word: string): Promise<string> {
    try {
        const res = await fetch(`/api/dictionary/yomitan?keyword=${encodeURIComponent(word)}`);
        const data = await res.json();

        if (data.success && data.results.length > 0) {
            return extractChineseMeaning(data.results[0].definitions);
        }
        return '暂无释义';
    } catch {
        return '暂无释义';
    }
}

export default function VocabTip({ tokens }: VocabTipProps) {
    const [vocabEntries, setVocabEntries] = useState<VocabEntry[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { setSelectedToken, setCurrentSentence } = useAppStore();

    const worthyTokens = useMemo(() => filterWorthyVocab(tokens), [tokens]);

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

    if (isLoading || vocabEntries.length === 0) return null;

    const handleWordClick = (token: WordToken, e: React.MouseEvent) => {
        e.stopPropagation();
        const sentenceOriginal = tokens.map(t => t.surface).join('');
        setCurrentSentence(sentenceOriginal);
        setSelectedToken(token);
    };

    return (
        <div className="mt-2">
            {/* Header row */}
            <div
                className="flex items-center gap-2 flex-wrap cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-medium border border-amber-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    生词
                </span>

                {vocabEntries.map((entry, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs border border-slate-200">
                        {entry.token.surface}
                    </span>
                ))}

                <svg className={clsx("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Expanded cards */}
            {isExpanded && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {vocabEntries.map((entry, idx) => (
                        <div
                            key={idx}
                            className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-colors cursor-pointer"
                            onClick={(e) => handleWordClick(entry.token, e)}
                        >
                            {/* Line 1: Word + Reading */}
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-slate-800 text-sm">{entry.token.surface}</span>
                                {entry.token.reading && entry.token.reading !== entry.token.surface && (
                                    <span className="text-xs text-rose-400">{entry.token.reading}</span>
                                )}
                            </div>
                            {/* Line 2: Chinese meaning */}
                            <div className="text-slate-600 text-xs mt-0.5">{entry.shortMeaning}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
