'use client';

import React, { useState } from 'react';
import { ChevronDown, RefreshCw, Volume2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import clsx from 'clsx';
import { ttsManager } from '@/lib/tts/manager';
import { Collapsible } from './Collapsible';

interface TranslationTipProps {
    original: string;
    translation: string | undefined;
}

export default function TranslationTip({ original, translation }: TranslationTipProps) {
    const { settings, isSpeaking } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    // Dynamic Verb Color Logic:
    // Standard (Morandi) uses specific Orange (#C8733A).
    // Wafu/Monochrome use var(--color-verb) which are properly mapped in globals.css.
    const isMorandi = settings.colorScheme === 'morandi' || !settings.colorScheme;
    const verbColor = isMorandi ? '#C8733A' : 'var(--color-verb)';
    const displayTranslation = translation || '翻译中...';
    const isLoading = !translation;

    const handleToggle = () => {
        const newState = !isExpanded;
        setIsExpanded(newState);
        if (newState && !isSpeaking) {
            ttsManager.speak(original, settings, {});
        }
    };

    return (
        <div className="py-1">
            <div
                className="flex flex-col cursor-pointer group"
                onClick={handleToggle}
            >
                {/* Row 1: Translation */}
                <div className="flex items-start gap-3">
                    <div className="shrink-0 w-12 flex items-center mt-1 select-none">
                        <span className="w-[3px] h-3 rounded-sm mr-2 block" style={{ backgroundColor: verbColor }}></span>
                        <h3 className="text-base font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            翻译
                        </h3>
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* 中文翻译 - 始终全显 */}
                        <div className={clsx(
                            "text-[15px] leading-relaxed font-medium transition-colors",
                            isLoading && "animate-pulse opacity-50"
                        )} style={{ color: 'var(--text-muted)' }}>
                            {displayTranslation}
                        </div>
                    </div>

                    {/* Arrow - Always visible */}
                    <svg
                        className={clsx(
                            "w-4 h-4 transition-transform mt-1 shrink-0",
                            isExpanded && "rotate-180"
                        )}
                        style={{ color: 'var(--text-muted)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {/* Row 2: Original (Expanded) */}
                <Collapsible isOpen={isExpanded} variant="default">
                    <div className="mt-2 flex items-start gap-3">
                        <div className="shrink-0 w-12 flex items-center mt-1 select-none">
                            <span className="w-[3px] h-3 rounded-sm mr-2 block" style={{ backgroundColor: verbColor }}></span>
                            <h3 className="text-base font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                原文
                            </h3>
                        </div>
                        <div className="flex-1 text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {original}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    ttsManager.speak(original, settings, {
                                        onStart: () => { },
                                        onEnd: () => { }
                                    });
                                }}
                                className="inline-flex w-5 h-5 items-center justify-center rounded-full transition-colors hover:bg-[var(--hover-bg)] ml-2 align-middle transform -translate-y-0.5"
                                style={{ color: 'var(--text-muted)' }}
                                title="朗读此句"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </Collapsible>
            </div>
        </div>
    );
}
