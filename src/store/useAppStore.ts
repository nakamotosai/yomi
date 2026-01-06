'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, WordToken, PartOfSpeech } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
    showFurigana: true,
    hideCommonFurigana: true,
    showPitchAccent: true,
    hideParticles: false,
    karaokeMode: true,
    fontSize: 'medium',
    fontFamily: 'sans',
    theme: 'light',
    ttsProvider: 'native',
    nativeVoiceURI: '',
    voicevoxSpeakerId: 3, // 3: Zundamon Normal
    voicevoxUrl: 'http://localhost:50021',
    playbackSpeed: 1.0,
    dictionaryProvider: 'jisho',
    activeColorPOS: Object.values(PartOfSpeech), // Default: all enabled
    colorTheme: 'standard',
    showTranslation: true,
};

interface AppState {
    // Content
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
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
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
            setSelectedToken: (token) => set({ selectedToken: token }),

            currentSentence: '',
            setCurrentSentence: (sentence) => set({ currentSentence: sentence }),

            isSpeaking: false,
            setIsSpeaking: (speaking) => set({ isSpeaking: speaking, isPaused: false }), // Reset pause when speaking state changes
            isPaused: false,
            setIsPaused: (paused) => set({ isPaused: paused }),
            speakingTokenId: null,
            setSpeakingTokenId: (id) => set({ speakingTokenId: id }),
        }),
        {
            name: 'yomi-app-store',
            partialize: (state) => ({
                settings: state.settings,
                inputText: state.inputText,
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
