'use client';

import React, { useState } from 'react';
import { ChevronDown, RefreshCw, Volume2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import clsx from 'clsx';
import { ttsManager } from '@/lib/tts/manager';
import { Collapsible } from './Collapsible';
import { useI18n } from '@/lib/i18n';

interface TranslationTipProps {
    original: string;
    translation: string | undefined;
    onTranslate?: () => void;
}

export default function TranslationTip({ original, translation, onTranslate }: TranslationTipProps) {
    const { settings, isSpeaking } = useAppStore();
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);
    // Dynamic Verb Color Logic:
    // Standard (Morandi) uses specific Orange (#C8733A).
    // Wafu/Monochrome use var(--color-verb) which are properly mapped in globals.css.
    const isMorandi = settings.colorScheme === 'morandi' || !settings.colorScheme;
    const verbColor = isMorandi ? '#C8733A' : 'var(--color-verb)';

    // Only show loading state if explicitly loading (but we don't have that prop yet, so disable fake loading)
    const isLoading = false;

    // Use explicit translation or fallback placeholder
    const displayTranslation = translation || `（${t('info.click_translate')}）`;

    const handleToggle = () => {
        // If no translation and collapsed, trigger translation on expand? 
        // Or simply if user clicks text.
        // If translation missing, treat click as "Translate"
        if (!translation && onTranslate) {
            onTranslate();
            // Don't expand yet? Or expand to show "Loading..."? 
            // Better: update displayTranslation to "Translating..." inside parent? 
            // Since we lack parent state passing, we just trigger it.
            return;
        }

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
                    <div className="shrink-0 w-12 flex items-center select-none">
                        <span className="w-[3px] h-3 rounded-sm mr-2 block" style={{ backgroundColor: verbColor }}></span>
                        <h3 className="text-base font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {t('info.translation')}
                        </h3>
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* 中文翻译 - 始终全显 */}
                        <div className={clsx(
                            "text-[15px] leading-relaxed font-medium transition-colors text-slate-500",
                            isLoading && "animate-pulse opacity-50"
                        )}>
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
                        <div className="shrink-0 w-12 flex items-center select-none">
                            <span className="w-[3px] h-3 rounded-sm mr-2 block" style={{ backgroundColor: verbColor }}></span>
                            <h3 className="text-base font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {t('info.original')}
                            </h3>
                        </div>
                        <div className="flex-1 text-[15px] leading-relaxed text-slate-500">
                            {original}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    ttsManager.speak(original, settings, {
                                        onStart: () => { },
                                        onEnd: () => { }
                                    });
                                }}
                                className="ml-2 inline-flex p-1.5 rounded-xl bg-[var(--bg-muted)] text-slate-500 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 transition-all align-middle transform -translate-y-0.5"
                                title="朗读此句"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </Collapsible>
            </div>
        </div>
    );
}
