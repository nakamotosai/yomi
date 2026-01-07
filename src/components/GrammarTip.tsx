'use client';

import React, { useState, useEffect } from 'react';
import { GrammarMatch } from '@/types/grammar';
import { matchGrammar } from '@/lib/grammar/grammarMatcher';
import { useAppStore } from '@/store/useAppStore';
import clsx from 'clsx';

interface GrammarTipProps {
    sentence: string;
}

export default function GrammarTip({ sentence }: GrammarTipProps) {
    const [matches, setMatches] = useState<GrammarMatch[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { settings } = useAppStore();
    const isDark = settings.theme === 'dark';

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            try {
                const results = await matchGrammar(sentence, 3);
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
        <div className="mt-2">
            {/* Header row */}
            <div
                className="flex items-center gap-2 flex-wrap cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className={clsx(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-colors",
                    "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] shadow-sm"
                )}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    文法
                </span>

                {matches.map((match, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] shadow-sm text-[var(--text-secondary)] text-xs border border-[var(--border-default)]">
                        {match.entry.title}
                    </span>
                ))}

                <svg className={clsx("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Expanded cards - auto-sizing */}
            {isExpanded && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {matches.map((match, idx) => (
                        <div
                            key={idx}
                            className="bg-[var(--bg-elevated)] shadow-sm rounded-lg px-3 py-2 border border-[var(--border-default)] hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            {/* Grammar title */}
                            <div className="font-bold text-[var(--text-primary)] text-sm">{match.entry.title}</div>

                            {/* Meaning - full display */}
                            {match.entry.meaning && (
                                <div className={clsx("text-xs mt-1", isDark ? "text-blue-300" : "text-blue-600")}>{match.entry.meaning}</div>
                            )}

                            {/* Example - full display */}
                            {match.entry.example && (
                                <div className="text-[var(--text-muted)] text-xs mt-1">
                                    <span className="text-[var(--text-faint)]">例：</span>{match.entry.example}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
