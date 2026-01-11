'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, WordToken, PartOfSpeech } from '@/types';
import { GrammarEntry } from '@/types/grammar';

const DEFAULT_SETTINGS: AppSettings = {
    showFurigana: true,
    hideCommonFurigana: false, // Default: Do not hide common furigana
    showPitchAccent: false,
    hideParticles: false,
    karaokeMode: true,
    karaokeStyle: 'glow-only', // Default: Glow only
    fontSize: 'medium',
    fontFamily: 'sans', // Default: Sans-serif (Hei-ti)
    theme: 'light', // Auto-detection would require 'system' option, sticking to light for stability
    ttsProvider: 'native',
    nativeVoiceURI: '',
    voicevoxSpeakerId: 3, // 3: Zundamon Normal
    voicevoxUrl: 'http://localhost:50021',
    playbackSpeed: 1.0,
    dictionaryProvider: 'jisho',
    activeColorPOS: Object.values(PartOfSpeech), // Default: All POS colors enabled
    colorTheme: 'standard', // Default: Block style
    colorScheme: 'morandi',
    showTranslation: true,
    autoReadOnClick: true,

    // Kana Instrument Defaults
    showRomaji: false,
    kanaCharType: 'hiragana',
};

interface AppState {
    // Content
    appMode: 'reader' | 'kana';
    setAppMode: (mode: 'reader' | 'kana') => void;
    centerViewMode: 'reader' | 'vocab' | 'grammar';
    setCenterViewMode: (mode: 'reader' | 'vocab' | 'grammar') => void;
    inputText: string;
    setInputText: (text: string) => void;

    // Analysis state
    isAnalyzing: boolean;
    setIsAnalyzing: (analyzing: boolean) => void;

    // Settings
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;
    toggleSetting: (key: keyof AppSettings) => void;

    // Interaction
    selectedToken: WordToken | null;
    setSelectedToken: (token: WordToken | null) => void;
    history: WordToken[]; // Word click history
    clearHistory: () => void; // Clear history action

    // Grammar selection
    selectedGrammar: GrammarEntry | null;
    setSelectedGrammar: (grammar: GrammarEntry | null) => void;

    // Layout
    layout: {
        leftSidebarWidth: number;
        rightSidebarWidth: number;
        leftTopHeight: number; // Height of the top card (Logo + 機能) in left sidebar
        leftInputHeight: number; // Height of the bottom input area in left sidebar
        rightBottomHeight: number; // Height of the bottom panel (History) in right sidebar
    };
    setLayout: (layout: Partial<{
        leftSidebarWidth: number;
        rightSidebarWidth: number;
        leftTopHeight: number;
        leftInputHeight: number;
        rightBottomHeight: number;
    }>) => void;

    // Current sentence context for vocab saving
    currentSentence: string;
    setCurrentSentence: (sentence: string) => void;

    // Audio state
    isSpeaking: boolean;
    setIsSpeaking: (speaking: boolean) => void;
    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;
    speakingTokenId: string | null;
    setSpeakingTokenId: (id: string | null) => void;

    // Global Playlist
    playlist: TTSSentence[];
    fullPlaylist: TTSSentence[]; // Store the complete article playlist
    currentSentenceIndex: number;
    setPlaylist: (sentences: TTSSentence[]) => void;
    setFullPlaylist: (sentences: TTSSentence[]) => void;
    playPlaylist: (sentences: TTSSentence[], startIndex?: number) => void;
    playNextSentence: () => void;
    playPrevSentence: () => void;
    stopTTS: () => void;

    // Mobile UI state
    isMobileDrawerOpen: boolean;
    setIsMobileDrawerOpen: (open: boolean) => void;
    isMobileSheetOpen: boolean;
    setIsMobileSheetOpen: (open: boolean) => void;

    // Extension source flag (auto-triggers translation expansion)
    isFromExtension: boolean;
    setIsFromExtension: (fromExtension: boolean) => void;
}

export interface TTSTokenMap {
    start: number;
    end: number;
    id: string;
}

export interface TTSSentence {
    id: string;
    text: string;
    tokenMap: TTSTokenMap[];
}

export const DEFAULT_INPUT_TEXT = `ようこそ、ここでは日本語の文章を入力して、詳細な読み方や意味を解析することができます。
単語をクリックすると右側に詳しい辞書情報が表示され、学習の履歴も自動で保存されます。
左のメニューから「単語帳」や「仮名練習」モードに切り替えて、様々な方法で日本語を学びましょう。`;

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            appMode: 'reader', // 'reader' | 'kana'
            setAppMode: (mode) => set({ appMode: mode }),
            centerViewMode: 'reader', // 'reader' | 'vocab' | 'grammar'
            setCenterViewMode: (mode) => set({ centerViewMode: mode }),
            inputText: DEFAULT_INPUT_TEXT,
            setInputText: (text) => set({ inputText: text }),

            isAnalyzing: false,
            setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),

            settings: DEFAULT_SETTINGS,

            updateSettings: (updates) => set((state) => ({
                settings: { ...state.settings, ...updates }
            })),

            toggleSetting: (key) => set((state) => ({
                settings: { ...state.settings, [key]: !state.settings[key] }
            })),

            selectedToken: null,
            history: [],
            clearHistory: () => set({ history: [] }),
            setSelectedToken: (token) => set((state) => {
                if (!token) return { selectedToken: null };

                // Deduplicate: Compare surface, reading, and pos
                const filteredHistory = state.history.filter(t =>
                    !(t.surface === token.surface && t.reading === token.reading && t.pos === token.pos)
                );

                // Add to front (max 100 items for sanity)
                const newHistory = [token, ...filteredHistory].slice(0, 100);

                return {
                    selectedToken: token,
                    history: newHistory
                };
            }),

            selectedGrammar: null,
            setSelectedGrammar: (grammar) => set({ selectedGrammar: grammar, selectedToken: null }),

            layout: {
                leftSidebarWidth: 360, // ~25% of 1440px
                rightSidebarWidth: 360, // ~25% of 1440px
                leftTopHeight: 250, // Height of top card
                leftInputHeight: 180, // Height of input card
                rightBottomHeight: 240, // symmetrical height
            },
            setLayout: (newLayout) => set((state) => ({
                layout: { ...state.layout, ...newLayout }
            })),

            currentSentence: '',
            setCurrentSentence: (sentence) => set({ currentSentence: sentence }),

            isSpeaking: false,
            setIsSpeaking: (speaking) => set({ isSpeaking: speaking, isPaused: false }),
            isPaused: false,
            setIsPaused: (paused) => set({ isPaused: paused }),
            speakingTokenId: null,
            setSpeakingTokenId: (id) => set({ speakingTokenId: id }),

            playlist: [],
            fullPlaylist: [],
            currentSentenceIndex: 0,
            setPlaylist: (playlist) => set({ playlist, currentSentenceIndex: 0, speakingTokenId: null }),
            setFullPlaylist: (playlist) => set({ fullPlaylist: playlist }),
            playPlaylist: (newPlaylist, startIndex = 0) => set((state) => {
                // Smart Check: If playlist is effectively the same, don't update Reference
                // This prevents GlobalAudioPlayer from restarting playback if TextAnalyzer re-generates same list
                const isSame =
                    state.playlist.length === newPlaylist.length &&
                    state.playlist.length > 0 &&
                    state.playlist[0].id === newPlaylist[0].id &&
                    state.playlist[state.playlist.length - 1].id === newPlaylist[newPlaylist.length - 1].id;

                if (isSame) {
                    // Reuse existing playlist, just ensure playing
                    return {
                        currentSentenceIndex: startIndex,
                        isSpeaking: true,
                        isPaused: false,
                        speakingTokenId: null
                    };
                }

                return {
                    playlist: newPlaylist,
                    currentSentenceIndex: startIndex,
                    isSpeaking: true,
                    isPaused: false,
                    speakingTokenId: null
                };
            }),
            playNextSentence: () => set((state) => {
                const nextIndex = state.currentSentenceIndex + 1;
                if (nextIndex >= state.playlist.length) {
                    return { isSpeaking: false, speakingTokenId: null };
                }
                return { currentSentenceIndex: nextIndex, speakingTokenId: null };
            }),
            playPrevSentence: () => set((state) => {
                const prevIndex = Math.max(0, state.currentSentenceIndex - 1);
                return { currentSentenceIndex: prevIndex, speakingTokenId: null };
            }),
            stopTTS: () => set({
                isSpeaking: false,
                isPaused: false,
                speakingTokenId: null,
                currentSentenceIndex: 0, // Reset to beginning
            }),

            isMobileDrawerOpen: false,
            setIsMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),
            isMobileSheetOpen: false,
            setIsMobileSheetOpen: (open) => set({ isMobileSheetOpen: open }),

            isFromExtension: false,
            setIsFromExtension: (fromExtension) => set({ isFromExtension: fromExtension }),
        }),
        {
            name: 'yomi-app-store-v7', // Bump version to force reset
            partialize: (state) => ({
                settings: state.settings,
                inputText: state.inputText,
                history: state.history,
                layout: state.layout,
            }),
            merge: (persistedState: unknown, currentState: AppState) => ({
                ...currentState,
                ...(persistedState as Partial<AppState>),
                settings: {
                    ...DEFAULT_SETTINGS,
                    ...((persistedState as Partial<AppState>).settings || {}),
                }
            }),
        }
    )
);
