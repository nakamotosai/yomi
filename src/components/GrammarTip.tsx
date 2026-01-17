'use client';

import React, { useState, useEffect } from 'react';
import { GrammarMatch } from '@/types/grammar';
import { matchGrammar } from '@/lib/grammar/grammarMatcher';
import { useAppStore } from '@/store/useAppStore';
import { ttsManager } from '@/lib/tts/manager';
import { useI18n } from '@/lib/i18n';

interface GrammarTipProps {
    sentence: string;
    tokens?: import('@/types').WordToken[];
}

export default function GrammarTip({ sentence, tokens }: GrammarTipProps) {
    const [matches, setMatches] = useState<GrammarMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const setSelectedGrammar = useAppStore(s => s.setSelectedGrammar);
    const settings = useAppStore(s => s.settings);
    const isSpeaking = useAppStore(s => s.isSpeaking);
    const { t } = useI18n();

    // Dynamic Grammar Color Logic:
    const isMorandi = settings.colorScheme === 'morandi' || !settings.colorScheme;
    const grammarBarColor = isMorandi ? '#2D6D8B' : 'var(--scheme-grammar)';

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            try {
                // Strict limit based on comma count as requested by user
                // 0 commas -> 1 grammar point
                // 1 comma -> 2 grammar points
                // 2 commas -> 3 grammar points
                // etc.
                const commaCount = (sentence.match(/[、,，]/g) || []).length;
                const limit = Math.max(1, commaCount + 1);

                const results = await matchGrammar(sentence, limit, tokens);
                if (!cancelled) setMatches(results);
            } catch (error) {
                console.error('Grammar matching error:', error);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [sentence, tokens]);

    if (isLoading || matches.length === 0) return null;

    return (
        <div className="py-1">
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-12 flex items-center mt-0.5 select-none">
                    <span className="w-[3px] h-3 rounded-sm mr-2 block" style={{ backgroundColor: grammarBarColor }}></span>
                    <h3 className="text-base font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {t('info.grammar_tag')}
                    </h3>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Grammar Chips - Clickable */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                        {matches.map((match, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setSelectedGrammar(match.entry);
                                    // Speak with ttsManager
                                    // Nuclear option: Truncate at the first sign of metadata (brackets, numbers)
                                    if (isSpeaking) return;
                                    let cleanTitle = match.entry.reading || match.entry.term;
                                    cleanTitle = cleanTitle.split(/[（(【\[〔①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/)[0];
                                    cleanTitle = cleanTitle.replace(/[~～]/g, '');
                                    ttsManager.speak(cleanTitle.trim(), settings, {});
                                }}
                                className="inline-flex items-center px-2 py-0.5 rounded text-base font-medium transition-all duration-200 border cursor-pointer hover:scale-105 hover:brightness-110 hover:shadow-sm active:scale-95 bg-[var(--scheme-grammar)]/10 border-[var(--scheme-grammar)]/20 text-[var(--scheme-grammar)]"
                            >
                                {match.entry.title.replace(/[（(][^）)]*[）)]/g, '').replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g, '').trim()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
