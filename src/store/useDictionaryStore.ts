'use client';

import { create } from 'zustand';

export type DictionaryLoadPhase = 'idle' | 'first-install' | 'warming' | 'ready' | 'error';

interface DictionaryState {
    phase: DictionaryLoadPhase;
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
    startFirstInstall: (total?: number) => void;
    startSilentWarm: () => void;
    markReady: () => void;
    markError: () => void;
    resetProgress: (total: number) => void;
}

export const useDictionaryStore = create<DictionaryState>((set) => ({
    phase: 'idle',
    totalUnits: 23, // Default total (18 yomitan + 4 grammar + 1 rich)
    loadedUnits: 0,
    totalDownloadedUnits: 0,
    totalDownloadedBytes: 0, // Added
    totalBytesToDownload: 42 * 1024 * 1024, // 默认预估 42MB (根据实际下载情况调整)
    isAllLoaded: false,

    setTotalUnits: (total) => set({ totalUnits: total }),
    setTotalBytesToDownload: (bytes) => set({ totalBytesToDownload: bytes }),
    incrementLoadedUnits: () => set((state) => {
        const loadedUnits = Math.min(state.loadedUnits + 1, state.totalUnits);
        const isAllLoaded = loadedUnits >= state.totalUnits;

        return {
            loadedUnits,
            isAllLoaded,
            phase: isAllLoaded ? 'ready' : state.phase
        };
    }),
    incrementDownloadedUnits: () => set((state) => ({
        totalDownloadedUnits: state.totalDownloadedUnits + 1
    })),
    addDownloadedBytes: (bytes: number) => set((state) => ({ // Added
        totalDownloadedBytes: state.totalDownloadedBytes + bytes
    })),
    setAllLoaded: (loaded) => set((state) => ({
        isAllLoaded: loaded,
        loadedUnits: loaded ? state.totalUnits : state.loadedUnits,
        phase: loaded ? 'ready' : state.phase
    })), // Added
    startFirstInstall: (total = 23) => set({
        phase: 'first-install',
        totalUnits: total,
        loadedUnits: 0,
        totalDownloadedUnits: 0,
        totalDownloadedBytes: 0,
        totalBytesToDownload: 42 * 1024 * 1024,
        isAllLoaded: false
    }),
    startSilentWarm: () => set({ phase: 'warming', isAllLoaded: false }),
    markReady: () => set((state) => ({ phase: 'ready', isAllLoaded: true, loadedUnits: state.totalUnits })),
    markError: () => set({ phase: 'error', isAllLoaded: false }),
    resetProgress: (total) => set({ phase: 'first-install', totalUnits: total, loadedUnits: 0, totalDownloadedUnits: 0, totalDownloadedBytes: 0, totalBytesToDownload: 25 * 1024 * 1024, isAllLoaded: false }), // Modified
}));
