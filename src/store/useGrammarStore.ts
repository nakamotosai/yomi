'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GrammarEntry } from '@/types/grammar';

export interface SavedGrammar extends GrammarEntry {
    savedAt: number;
}

interface GrammarState {
    grammarList: SavedGrammar[];
    addGrammar: (item: GrammarEntry) => void;
    removeGrammar: (id: string) => void;
    clearGrammar: () => void;
    isGrammarSaved: (id: string) => boolean;
}

export const useGrammarStore = create<GrammarState>()(
    persist(
        (set, get) => ({
            grammarList: [],

            addGrammar: (item) => set((state) => {
                // Check if already exists
                const exists = state.grammarList.some(g => g.id === item.id);
                if (exists) return state;

                const newItem: SavedGrammar = {
                    ...item,
                    savedAt: Date.now(),
                };
                return { grammarList: [...state.grammarList, newItem] };
            }),

            removeGrammar: (id) => set((state) => ({
                grammarList: state.grammarList.filter(g => g.id !== id)
            })),

            clearGrammar: () => set({ grammarList: [] }),

            isGrammarSaved: (id) => {
                return get().grammarList.some(g => g.id === id);
            },
        }),
        {
            name: 'yomi-grammar-store',
        }
    )
);
