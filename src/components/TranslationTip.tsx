'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import clsx from 'clsx';
import { ttsManager } from '@/lib/tts/manager';

interface TranslationTipProps {
    original: string;
    translation: string | undefined;
}

export default function TranslationTip({ original, translation }: TranslationTipProps) {
    const { settings } = useAppStore();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const displayTranslation = translation || '翻译中...';
    const isLoading = !translation;

    return (
        <div className="py-1">
            <div
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="shrink-0 w-12 flex items-center mt-0.5 select-none">
                    <span className="w-[3px] h-3 rounded-sm mr-2 block bg-[var(--scheme-accent)]"></span>
                    <h3 className="text-base font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        翻译
                    </h3>
                </div>

                <div className="flex-1 min-w-0">
                    {/* 中文翻译 - 始终全显 */}
                    <div className={clsx(
                        "text-base leading-relaxed text-[var(--text-primary)]",
                        isLoading && "animate-pulse text-[var(--text-faint)]"
                    )}>
                        {displayTranslation}
                    </div>

                    {/* 展开内容：日文原文 + 播放按钮 */}
                    {isExpanded && (
                        <div className="mt-2 pl-2 border-l-2 border-[var(--border-muted)] flex items-start gap-2">
                            <span className="text-base text-[var(--text-secondary)] leading-relaxed flex-1">
                                <span className="font-bold mr-1 text-[var(--scheme-accent)]">原文：</span>
                                {original}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    ttsManager.speak(original, settings, {
                                        onStart: () => { },
                                        onEnd: () => { }
                                    });
                                }}
                                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--scheme-accent)] hover:bg-[var(--scheme-accent)]/10 transition-colors mt-0.5"
                                title="朗读此句"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Arrow - Always visible */}
                <svg
                    className={clsx(
                        "w-4 h-4 text-[var(--text-muted)] transition-transform mt-0.5 shrink-0 hover:text-[var(--text-secondary)]",
                        isExpanded && "rotate-180"
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}
