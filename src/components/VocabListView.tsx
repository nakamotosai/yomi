'use client';

import React from 'react';
import { BookMarked, X, Trash2, Star, ArrowLeft } from 'lucide-react';
import { useVocabStore } from '@/store/useVocabStore';
import { useAppStore } from '@/store/useAppStore';
import { COLOR_THEMES } from '@/lib/colorThemes';
import { ttsManager } from '@/lib/tts/manager';

import { PartOfSpeech, WordToken, VocabItem } from '@/types';

export default function VocabListView() {
    const { vocabList, removeVocab, clearVocab } = useVocabStore();
    const setCenterViewMode = useAppStore(s => s.setCenterViewMode);
    const setSelectedToken = useAppStore(s => s.setSelectedToken);
    const setIsMobileSheetOpen = useAppStore(s => s.setIsMobileSheetOpen);
    const settings = useAppStore(s => s.settings);
    const isDark = settings.theme === 'dark';

    // ... exports functions ...

    const handleVocabClick = (item: VocabItem) => {
        const token: WordToken = {
            id: item.id,
            surface: item.word,
            reading: item.reading,
            baseForm: item.baseForm,
            // Safe cast or fallback if pos is just a string
            pos: item.pos as PartOfSpeech,
            romaji: '', // Placeholder
            pitch: item.pitch,
            isCommon: false
        };
        setSelectedToken(token);
        setIsMobileSheetOpen(true);

        if (settings.autoReadOnClick) {
            ttsManager.speak(token.surface, settings);
        }
    };

    // Export functions
    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportCSV = () => {
        // Dynamic import to avoid SSR issues if needed, but functions are pure utils
        import('@/store/useVocabStore').then(({ exportToCSV }) => {
            const csv = exportToCSV(vocabList);
            downloadFile(csv, 'yomi-vocab.csv', 'text/csv');
        });
    };

    const handleExportAnki = () => {
        import('@/store/useVocabStore').then(({ exportToAnkiTSV }) => {
            const tsv = exportToAnkiTSV(vocabList);
            downloadFile(tsv, 'yomi-vocab-anki.txt', 'text/plain');
        });
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
                        <BookMarked className="w-5 h-5" style={{ color: '#437E6F' }} />
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">単語帳</h2>
                        <span className="text-sm text-[var(--text-muted)]">({vocabList.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {vocabList.length > 0 && (
                            <>
                                <button
                                    onClick={handleExportCSV}
                                    className="px-3 py-1.5 text-xs font-bold tracking-wide bg-white dark:bg-[#437E6F]/15 text-[#437E6F] dark:text-[#84A69D] hover:bg-emerald-50 dark:hover:bg-[#437E6F]/25 rounded-lg transition-colors border border-[#437E6F]/20 dark:border-[#437E6F]/30"
                                >
                                    CSV
                                </button>
                                <button
                                    onClick={handleExportAnki}
                                    className="px-3 py-1.5 text-xs font-bold tracking-wide bg-white dark:bg-[#5F7387]/15 text-[#5F7387] dark:text-[#AABCCD] hover:bg-blue-50 dark:hover:bg-[#5F7387]/25 rounded-lg transition-colors border border-[#5F7387]/20 dark:border-[#5F7387]/30"
                                >
                                    Anki
                                </button>
                                <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
                                <button
                                    onClick={() => {
                                        if (confirm('全ての単語を削除しますか？')) {
                                            clearVocab();
                                        }
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-500 dark:text-[#D4A5A5] hover:bg-rose-50 dark:hover:bg-[#AA5555]/10 rounded transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    全削除
                                </button>
                            </>
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
                    {vocabList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center pb-20" style={{ color: 'var(--text-faint)' }}>
                            <BookMarked className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium">単語帳は空です</p>
                            <p className="text-xs mt-1">単語をクリックして ⭐ を押すと保存されます</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8 pb-10">
                            {(() => {
                                // Define groups and their mapping
                                const groups = [
                                    { id: 'noun', label: '名词 (Noun)', pos: [PartOfSpeech.NOUN, PartOfSpeech.PRONOUN, PartOfSpeech.PROPER_NOUN] },
                                    { id: 'verb', label: '动词 (Verb)', pos: [PartOfSpeech.VERB] },
                                    { id: 'adjective', label: '形容词 (Adjective)', pos: [PartOfSpeech.ADJECTIVE] },
                                    { id: 'adverb', label: '副词 (Adverb)', pos: [PartOfSpeech.ADVERB] },
                                    { id: 'particle', label: '助词・连词 (Particle/Conj)', pos: [PartOfSpeech.PARTICLE, PartOfSpeech.CONJUNCTION, PartOfSpeech.AUXILIARY] },
                                    { id: 'others', label: '其他 (Others)', pos: [] } // Catch-all
                                ];

                                // Group the vocab items
                                const groupedVocab: Record<string, VocabItem[]> = {
                                    noun: [],
                                    verb: [],
                                    adjective: [],
                                    adverb: [],
                                    particle: [],
                                    others: []
                                };

                                vocabList.forEach((item) => {
                                    let placed = false;
                                    // Map string pos back to enum if necessary, currently assuming strict match or string match
                                    const itemPos = item.pos as PartOfSpeech;

                                    for (const group of groups) {
                                        if (group.id !== 'others' && group.pos.includes(itemPos)) {
                                            groupedVocab[group.id].push(item);
                                            placed = true;
                                            break;
                                        }
                                    }
                                    if (!placed) {
                                        groupedVocab.others.push(item);
                                    }
                                });

                                return groups.map(group => {
                                    const items = groupedVocab[group.id];
                                    if (items.length === 0) return null;

                                    return (
                                        <div key={group.id} className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 px-1 border-b border-[var(--border-default)] pb-2 mb-1">
                                                <div className="h-4 w-1 rounded-full bg-[var(--text-muted)] opacity-30"></div>
                                                <h4 className="text-sm font-bold opacity-70 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                    {group.label}
                                                </h4>
                                                <span className="text-xs opacity-40 ml-auto font-mono bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">{items.length}</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {items.map((item) => {
                                                    // Force use STANDARD theme for colorful display
                                                    const activeTheme = COLOR_THEMES['standard'];
                                                    const colorScheme = activeTheme.colors[item.pos as PartOfSpeech] || activeTheme.colors[PartOfSpeech.OTHER];

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => handleVocabClick(item)}
                                                            className={`group relative px-4 py-3 rounded-xl border transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 ${colorScheme.bg} ${colorScheme.border}`}
                                                        >
                                                            <div className="flex items-baseline gap-2">
                                                                <span className={`text-lg font-bold ${colorScheme.text}`}>{item.word}</span>
                                                                <span className={`text-xs ${colorScheme.text} opacity-70`}>{item.reading}</span>
                                                            </div>

                                                            <div className={`text-sm opacity-80 line-clamp-2 ${colorScheme.text}`}>
                                                                {item.meaning}
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeVocab(item.id);
                                                                }}
                                                                className="absolute top-2 right-2 w-6 h-6 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20 transition-all hover:bg-amber-500/20 hover:scale-105 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                                title="取消收藏"
                                                            >
                                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
