'use client';

import React from 'react';
import { GraduationCap, X, Trash2, Star, ArrowLeft } from 'lucide-react';
import { useGrammarStore, SavedGrammar } from '@/store/useGrammarStore';
import { useAppStore } from '@/store/useAppStore';
import { ttsManager } from '@/lib/tts/manager';
import { useI18n } from '@/lib/i18n';

export default function GrammarListView() {
    const { grammarList, removeGrammar, clearGrammar } = useGrammarStore();
    const setCenterViewMode = useAppStore(s => s.setCenterViewMode);
    const setSelectedGrammar = useAppStore(s => s.setSelectedGrammar);
    const settings = useAppStore(s => s.settings);
    const { t } = useI18n();
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
                        background: (settings.colorScheme === 'wafu') ? 'transparent' : (isDark ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.65)'),
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCenterViewMode('reader')}
                            className="p-1.5 -ml-2 mr-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title={t('common.back')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <GraduationCap className="w-5 h-5" style={{ color: 'var(--scheme-grammar)' }} />
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('lists.grammar_title')}</h2>
                        <span className="text-sm text-[var(--text-muted)]">({grammarList.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {grammarList.length > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm(t('lists.clear_confirm'))) {
                                        clearGrammar();
                                    }
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--scheme-grammar)] hover:bg-[var(--scheme-grammar)]/10 rounded transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                {t('common.clear_all')}
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2 pb-4 px-2 floating-scrollbar overscroll-y-none">
                <div className="min-h-full">
                    {grammarList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center pb-20" style={{ color: 'var(--text-faint)' }}>
                            <GraduationCap className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium">{t('lists.grammar_empty')}</p>
                            <p className="text-xs mt-1">{t('lists.grammar_hint')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 auto-rows-fr">
                            {grammarList.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        handleGrammarClick(item);
                                        // Speak title using ttsManager
                                        const cleanTitle = item.title.replace(/[~～]/g, '');
                                        ttsManager.speak(cleanTitle, settings);
                                    }}
                                    className="group relative px-4 py-3 rounded-xl border transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 justify-between h-full bg-[var(--scheme-grammar)]/10 border-[var(--scheme-grammar)]/20"
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="text-lg font-bold pr-6 leading-tight text-[var(--scheme-grammar)]">
                                            {item.title.replace(/[（(][^）)]*[）)]/g, '').replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g, '').trim()}
                                        </div>
                                        <div className="text-sm line-clamp-2 text-[var(--scheme-grammar)]/80">
                                            {item.meaning}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeGrammar(item.id);
                                        }}
                                        className="absolute top-2 right-2 w-6 h-6 bg-[var(--scheme-accent-bg)] text-[var(--scheme-accent)] rounded-md border border-[var(--scheme-accent)]/10 transition-all hover:bg-[var(--scheme-accent-bg)]/80 hover:scale-105 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                        title={t('lists.unstar')}
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
