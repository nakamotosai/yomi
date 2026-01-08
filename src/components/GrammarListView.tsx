'use client';

import React from 'react';
import { GraduationCap, X, Trash2, Star, ArrowLeft } from 'lucide-react';
import { useGrammarStore, SavedGrammar } from '@/store/useGrammarStore';
import { useAppStore } from '@/store/useAppStore';

export default function GrammarListView() {
    const { grammarList, removeGrammar, clearGrammar } = useGrammarStore();
    const setCenterViewMode = useAppStore(s => s.setCenterViewMode);
    const setSelectedGrammar = useAppStore(s => s.setSelectedGrammar);
    const settings = useAppStore(s => s.settings);
    const isDark = settings.theme === 'dark';

    const handleGrammarClick = (grammar: SavedGrammar) => {
        setSelectedGrammar(grammar);
    };

    return (
        <div className="h-full flex flex-col w-full" style={{ background: 'transparent' }}>
            {/* Header Wrapper */}
            <div className="shrink-0 z-10 px-2 pt-4 pb-2">
                <div
                    className="h-14 flex items-center px-4 justify-between rounded-2xl glass-panel transition-all"
                    style={{
                        border: `1px solid var(--border-default)`,
                        background: isDark ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.65)',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCenterViewMode('reader')}
                            className="p-1.5 -ml-2 mr-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="戻る"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <GraduationCap className="w-5 h-5" style={{ color: '#5F7387' }} />
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">文法帳</h2>
                        <span className="text-sm text-[var(--text-muted)]">({grammarList.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {grammarList.length > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm('全ての文法を削除しますか？')) {
                                        clearGrammar();
                                    }
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-500 dark:text-[#D4A5A5] hover:bg-rose-50 dark:hover:bg-[#AA5555]/10 rounded transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                全削除
                            </button>
                        )}
                        <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
                        <button
                            onClick={() => setCenterViewMode('reader')}
                            className="p-1.5 hover:bg-[var(--hover-bg)] rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Wrapper */}
            <div className="flex-1 overflow-y-auto pt-2 pb-4 px-2 floating-scrollbar">
                <div className="min-h-full">
                    {grammarList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center pb-20" style={{ color: 'var(--text-faint)' }}>
                            <GraduationCap className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium">文法帳は空です</p>
                            <p className="text-xs mt-1">文法をクリックして ⭐ を押すと保存されます</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 auto-rows-fr">
                            {grammarList.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleGrammarClick(item)}
                                    className="group relative px-4 py-3 rounded-xl border transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 justify-between h-full bg-[#5F7387]/10 dark:bg-[#5F7387]/15 border-[#5F7387]/20 dark:border-[#5F7387]/20"
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="text-lg font-bold pr-6 leading-tight text-[#5F7387] dark:text-[#AABCCD]">
                                            {item.title.replace(/[（(][^）)]*[）)]/g, '').trim()}
                                        </div>
                                        <div className="text-sm line-clamp-2 text-[#5F7387]/80 dark:text-[#AABCCD]/70">
                                            {item.meaning}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeGrammar(item.id);
                                        }}
                                        className="absolute top-2 right-2 w-6 h-6 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20 transition-all hover:bg-amber-500/20 hover:scale-105 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                        title="取消收藏"
                                    >
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
