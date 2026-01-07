'use client';

import React, { useState } from 'react';
import { ttsManager } from '@/lib/tts/manager';
import { useAppStore } from '@/store/useAppStore';
import clsx from 'clsx';

interface TranslationTipProps {
    original: string;
    translation: string | undefined;
}

export default function TranslationTip({ original, translation }: TranslationTipProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { settings } = useAppStore();

    const displayTranslation = translation || '翻译中...';
    const isLoading = !translation;

    return (
        <div className="mt-2">
            {/* Header row - default shows Chinese translation */}
            <div
                className="flex items-center gap-2 flex-wrap cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* 释义胶囊标签 */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    释义
                </span>

                {/* Chinese translation inline */}
                <span className={clsx(
                    "text-sm",
                    isLoading ? "text-gray-300 animate-pulse" : "text-gray-500"
                )}>
                    {displayTranslation}
                </span>

                {/* 展开/收起箭头 */}
                <svg
                    className={clsx(
                        "w-4 h-4 text-slate-400 transition-transform",
                        isExpanded && "rotate-180"
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Expanded: Japanese original with play button */}
            {isExpanded && (
                <div className="mt-2 flex items-center gap-2 pl-2 border-l-2 border-blue-200">
                    <span className="text-sm text-gray-600 leading-relaxed">
                        {original.trim()}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            ttsManager.speak(original, settings, {
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
            )}
        </div>
    );
}
