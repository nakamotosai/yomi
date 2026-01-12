'use client';

import { create } from 'zustand';

interface DictionaryState {
    totalUnits: number;
    loadedUnits: number;
    totalDownloadedUnits: number;
    totalDownloadedBytes: number; // Added to interface
    totalBytesToDownload: number; // Added to interface
    isAllLoaded: boolean;
    setTotalUnits: (total: number) => void;
    incrementLoadedUnits: () => void;
    incrementDownloadedUnits: () => void;
    addDownloadedBytes: (bytes: number) => void;
    setTotalBytesToDownload: (bytes: number) => void;
    setAllLoaded: (loaded: boolean) => void;
    resetProgress: (total: number) => void;
}

export const useDictionaryStore = create<DictionaryState>((set) => ({
    totalUnits: 23, // Default total (18 yomitan + 4 grammar + 1 rich)
    loadedUnits: 1, // Start at 1 for rich grammar
    totalDownloadedUnits: 0,
    totalDownloadedBytes: 0, // Added
    totalBytesToDownload: 42 * 1024 * 1024, // 默认预估 42MB (根据实际下载情况调整)
    isAllLoaded: false,

    setTotalUnits: (total) => set({ totalUnits: total }),
    setTotalBytesToDownload: (bytes) => set({ totalBytesToDownload: bytes }),
    incrementLoadedUnits: () => set((state) => ({
        loadedUnits: state.loadedUnits + 1,
        isAllLoaded: state.loadedUnits + 1 >= state.totalUnits
    })),
    incrementDownloadedUnits: () => set((state) => ({
        totalDownloadedUnits: state.totalDownloadedUnits + 1
    })),
    addDownloadedBytes: (bytes: number) => set((state) => ({ // Added
        totalDownloadedBytes: state.totalDownloadedBytes + bytes
    })),
    setAllLoaded: (loaded) => set({ isAllLoaded: loaded }), // Added
    resetProgress: (total) => set({ totalUnits: total, loadedUnits: 0, totalDownloadedUnits: 0, totalDownloadedBytes: 0, totalBytesToDownload: 25 * 1024 * 1024, isAllLoaded: false }), // Modified
}));
