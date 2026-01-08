'use client';

import React, { useState, useEffect } from 'react';
import { GrammarMatch } from '@/types/grammar';
import { matchGrammar } from '@/lib/grammar/grammarMatcher';
import { useAppStore } from '@/store/useAppStore';

interface GrammarTipProps {
    sentence: string;
}

export default function GrammarTip({ sentence }: GrammarTipProps) {
    const [matches, setMatches] = useState<GrammarMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const setSelectedGrammar = useAppStore(s => s.setSelectedGrammar);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            try {
                // 根据句子长度动态调整文法数量
                let limit = 4;
                if (sentence.length < 15) limit = 1;
                else if (sentence.length < 30) limit = 2;
                else if (sentence.length < 50) limit = 3;

                const results = await matchGrammar(sentence, limit);
                if (!cancelled) setMatches(results);
            } catch (error) {
                console.error('Grammar matching error:', error);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [sentence]);

    if (isLoading || matches.length === 0) return null;

    return (
        <div className="py-1">
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-12 flex items-center mt-0.5 select-none">
                    <span className="w-[3px] h-3 rounded-sm mr-2 block" style={{ backgroundColor: '#5F7387' }}></span>
                    <h3 className="text-base font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        文法
                    </h3>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Grammar Chips - Clickable */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                        {matches.map((match, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedGrammar(match.entry)}
                                className="inline-flex items-center px-2 py-0.5 rounded text-base transition-all border cursor-pointer hover:scale-105 hover:brightness-95 bg-[#5F7387]/10 dark:bg-[#5F7387]/15 border-[#5F7387]/20 dark:border-[#5F7387]/20 text-[#5F7387] dark:text-[#AABCCD]"
                            >
                                {match.entry.title.replace(/[（(][^）)]*[）)]/g, '').trim()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

