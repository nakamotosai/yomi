'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VocabItem } from '@/types';

interface VocabState {
    vocabList: VocabItem[];
    addVocab: (item: Omit<VocabItem, 'id' | 'createdAt'>) => void;
    removeVocab: (id: string) => void;
    clearVocab: () => void;
    isWordSaved: (word: string, reading: string) => boolean;
}

export const useVocabStore = create<VocabState>()(
    persist(
        (set, get) => ({
            vocabList: [],

            addVocab: (item) => set((state) => {
                // Check if already exists
                const exists = state.vocabList.some(
                    v => v.word === item.word && v.reading === item.reading
                );
                if (exists) return state;

                const newItem: VocabItem = {
                    ...item,
                    id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: Date.now(),
                };
                return { vocabList: [...state.vocabList, newItem] };
            }),

            removeVocab: (id) => set((state) => ({
                vocabList: state.vocabList.filter(v => v.id !== id)
            })),

            clearVocab: () => set({ vocabList: [] }),

            isWordSaved: (word, reading) => {
                return get().vocabList.some(v => v.word === word && v.reading === reading);
            },
        }),
        {
            name: 'yomi-vocab-store',
        }
    )
);

// Export utilities for Anki/CSV export
export function exportToCSV(vocabList: VocabItem[]): string {
    const header = 'Word,Reading,BaseForm,Meaning,POS,Context,CreatedAt\n';
    const rows = vocabList.map(v =>
        `"${v.word}","${v.reading}","${v.baseForm}","${v.meaning}","${v.pos}","${v.context}","${new Date(v.createdAt).toISOString()}"`
    ).join('\n');
    return header + rows;
}

export function exportToAnkiTSV(vocabList: VocabItem[]): string {
    // Anki format: Front\tBack (tab-separated)
    return vocabList.map(v => {
        const front = `${v.word}<br><small>${v.reading}</small>`;
        const back = `${v.meaning}<br><small>${v.pos}</small><br><small style="color:#888">${v.context}</small>`;
        return `${front}\t${back}`;
    }).join('\n');
}
