'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, WordToken, PartOfSpeech } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
    showFurigana: true,
    hideCommonFurigana: true,
    showPitchAccent: false,
    hideParticles: false,
    karaokeMode: true,
    fontSize: 'medium',
    fontFamily: 'serif',
    theme: 'light',
    ttsProvider: 'native',
    nativeVoiceURI: '',
    voicevoxSpeakerId: 3, // 3: Zundamon Normal
    voicevoxUrl: 'http://localhost:50021',
    playbackSpeed: 1.0,
    dictionaryProvider: 'jisho',
    activeColorPOS: [PartOfSpeech.VERB, PartOfSpeech.ADJECTIVE, PartOfSpeech.PARTICLE, PartOfSpeech.AUXILIARY, PartOfSpeech.ADVERB, PartOfSpeech.NOUN], // Default: Include nouns for full color
    colorTheme: 'google_dark',
    showTranslation: true,

    // Kana Instrument Defaults
    showRomaji: false,
    kanaCharType: 'hiragana',
};

interface AppState {
    // Content
    appMode: 'reader' | 'kana';
    setAppMode: (mode: 'reader' | 'kana') => void;
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

    // Layout
    layout: {
        leftSidebarWidth: number;
        rightSidebarWidth: number;
        leftInputHeight: number; // Height of the bottom input area in left sidebar
        rightBottomHeight: number; // Height of the bottom panel (History) in right sidebar
    };
    setLayout: (layout: {
        leftSidebarWidth: number;
        rightSidebarWidth: number;
        leftInputHeight: number;
        rightBottomHeight: number;
    }) => void;

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
    currentSentenceIndex: number;
    setPlaylist: (sentences: TTSSentence[]) => void;
    playPlaylist: (sentences: TTSSentence[], startIndex?: number) => void;
    playNextSentence: () => void;
    playPrevSentence: () => void;
    stopTTS: () => void;

    // Mobile UI state
    isMobileDrawerOpen: boolean;
    setIsMobileDrawerOpen: (open: boolean) => void;
    isMobileSheetOpen: boolean;
    setIsMobileSheetOpen: (open: boolean) => void;
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

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            appMode: 'reader', // 'reader' | 'kana'
            setAppMode: (mode) => set({ appMode: mode }),
            inputText: '私は日本語を勉強しています。この文章を分析して、単語ごとに分解してください。',
            setInputText: (text) => set({ inputText: text }),

            isAnalyzing: false,
            setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),

            settings: DEFAULT_SETTINGS,

            updateSettings: (updates) => set((state) => ({
                settings: { ...state.settings, ...updates }
            })),

            toggleSetting: (key) => set((state) => ({
                settings: {
                    ...state.settings,
                    [key]: typeof state.settings[key] === 'boolean'
                        ? !state.settings[key]
                        : state.settings[key]
                }
            })),

            selectedToken: null,
            history: [],
            setSelectedToken: (token) => set((state) => {
                if (!token) return { selectedToken: null };

                // Add to history (prepend, unique, limit 50)
                const newHistory = [token, ...state.history.filter(t => t.id !== token.id)].slice(0, 50);

                return {
                    selectedToken: token,
                    history: newHistory
                };
            }),

            layout: {
                leftSidebarWidth: 360, // ~25% of 1440px
                rightSidebarWidth: 360, // ~25% of 1440px
                leftInputHeight: 240, // symmetrical height
                rightBottomHeight: 240, // symmetrical height
            },
            setLayout: (layout) => set({ layout }),

            currentSentence: '',
            setCurrentSentence: (sentence) => set({ currentSentence: sentence }),

            isSpeaking: false,
            setIsSpeaking: (speaking) => set({ isSpeaking: speaking, isPaused: false }),
            isPaused: false,
            setIsPaused: (paused) => set({ isPaused: paused }),
            speakingTokenId: null,
            setSpeakingTokenId: (id) => set({ speakingTokenId: id }),

            playlist: [],
            currentSentenceIndex: 0,
            setPlaylist: (playlist) => set({ playlist, currentSentenceIndex: 0, speakingTokenId: null }),
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
                // Optional: clear playlist or keep it? Keeping it allows re-play.
            }),

            isMobileDrawerOpen: false,
            setIsMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),
            isMobileSheetOpen: false,
            setIsMobileSheetOpen: (open) => set({ isMobileSheetOpen: open }),
        }),
        {
            name: 'yomi-app-store-v4', // Bump version to force reset
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
