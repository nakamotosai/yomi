'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { WordToken, PartOfSpeech } from '@/types';
import { COLOR_THEMES } from '@/lib/colorThemes';
import { Clock } from 'lucide-react';

export default function HistoryPanel() {
    const history = useAppStore(state => state.history) || [];
    const setSelectedToken = useAppStore(state => state.setSelectedToken);
    const settings = useAppStore(state => state.settings);
    const isDark = settings.theme === 'dark';

    if (history.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full p-8"
                style={{
                    color: 'var(--text-faint)',
                    background: 'var(--bg-muted)'
                }}
            >
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">履歴はまだありません</p>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col h-full"
            style={{ background: 'var(--bg-elevated)' }}
        >
            <div
                className="px-4 py-2"
                style={{
                    borderBottom: `1px solid var(--border-default)`,
                    background: 'var(--bg-muted)'
                }}
            >
                <h3 className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3" />
                    閲覧履歴
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                <div className="hidden">
                    {/* Hack to ensure Tailwind classes for all POS colors are generated */}
                    <span className="text-rose-600 bg-rose-50 border-rose-100"></span>
                    <span className="text-blue-600 bg-blue-50 border-blue-100"></span>
                    <span className="text-emerald-600 bg-emerald-50 border-emerald-100"></span>
                    <span className="text-amber-600 bg-amber-50 border-amber-100"></span>
                    <span className="text-purple-600 bg-purple-50 border-purple-100"></span>
                    <span className="text-gray-600 bg-gray-50 border-gray-100"></span>
                </div>
                <div className="space-y-1">
                    {history.map((token: WordToken, index: number) => {
                        const activeTheme = COLOR_THEMES[settings.colorTheme || 'standard'];
                        const colorScheme = activeTheme.colors[token.pos as PartOfSpeech] || activeTheme.colors[PartOfSpeech.OTHER];

                        return (
                            <button
                                key={`${token.id}-${index}`}
                                onClick={() => setSelectedToken(token)}
                                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group"
                                style={{
                                    border: `1px solid transparent`,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--hover-bg)';
                                    e.currentTarget.style.borderColor = 'var(--border-default)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className={`text-xs px-1.5 py-0.5 rounded border ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border}`}>
                                        {token.pos}
                                    </span>
                                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {token.surface}
                                    </span>
                                </div>
                                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                    {token.reading}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
