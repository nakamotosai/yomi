'use client';

import { create } from 'zustand';

interface DictionaryState {
    totalUnits: number;
    loadedUnits: number;
    isAllLoaded: boolean;
    setTotalUnits: (total: number) => void;
    incrementLoadedUnits: () => void;
    resetProgress: (total: number) => void;
}

export const useDictionaryStore = create<DictionaryState>((set) => ({
    totalUnits: 23, // Default total (18 yomitan + 4 grammar + 1 rich)
    loadedUnits: 0,
    isAllLoaded: false,
    setTotalUnits: (total) => set({ totalUnits: total }),
    incrementLoadedUnits: () => set((state) => {
        const nextLoaded = state.loadedUnits + 1;
        return {
            loadedUnits: nextLoaded,
            isAllLoaded: nextLoaded >= state.totalUnits
        };
    }),
    resetProgress: (total) => set({ totalUnits: total, loadedUnits: 0, isAllLoaded: false }),
}));
