'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, WordToken, PartOfSpeech } from '@/types';
import { GrammarEntry } from '@/types/grammar';

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
単語をクリックすると右側に詳しい辞书情報が表示され、学習の履歴も自动で保存されます。`;

const DEFAULT_SETTINGS: AppSettings = {
    showFurigana: true,
    hideCommonFurigana: false,
    showPitchAccent: false,
    hideParticles: false,
    karaokeMode: true,
    karaokeStyle: 'glow-only',
    fontSize: 'medium',
    fontFamily: 'sans',
    theme: 'light',
    ttsProvider: 'native',
    nativeVoiceURI: '',
    voicevoxSpeakerId: 3,
    voicevoxUrl: 'http://localhost:50021',
    playbackSpeed: 1.0,
    dictionaryProvider: 'jisho',
    activeColorPOS: Object.values(PartOfSpeech),
    colorTheme: 'standard',
    colorScheme: 'morandi',
    // showTranslation moved to top-level state
    // but kept in Settings type for backward compatibility / schema requirements
    // Re-added below to satisfy TypeScript
    showTranslation: true,
    autoReadOnClick: true,
    showRomaji: false,
    kanaCharType: 'hiragana',
};

interface AppState {
    appMode: 'reader' | 'kana';
    setAppMode: (mode: 'reader' | 'kana') => void;
    centerViewMode: 'reader' | 'vocab' | 'grammar' | 'ai';
    setCenterViewMode: (mode: 'reader' | 'vocab' | 'grammar' | 'ai') => void;
    inputText: string;
    setInputText: (text: string) => void;
    isAnalyzing: boolean;
    setIsAnalyzing: (analyzing: boolean) => void;
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;
    toggleSetting: (key: keyof AppSettings) => void;
    selectedToken: WordToken | null;
    setSelectedToken: (token: WordToken | null) => void;
    history: WordToken[];
    clearHistory: () => void;
    selectedGrammar: GrammarEntry | null;
    setSelectedGrammar: (grammar: GrammarEntry | null) => void;
    layout: {
        leftSidebarWidth: number;
        rightSidebarWidth: number;
        leftTopHeight: number;
        leftInputHeight: number;
        rightBottomHeight: number;
        isManualLayout: boolean;
    };
    setLayout: (layout: Partial<{
        leftSidebarWidth: number;
        rightSidebarWidth: number;
        leftTopHeight: number;
        leftInputHeight: number;
        rightBottomHeight: number;
        isManualLayout: boolean;
    }>) => void;
    currentSentence: string;
    setCurrentSentence: (sentence: string) => void;
    isSpeaking: boolean;
    setIsSpeaking: (speaking: boolean) => void;
    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;
    speakingTokenId: string | null;
    setSpeakingTokenId: (id: string | null) => void;
    playlist: TTSSentence[];
    fullPlaylist: TTSSentence[];
    currentSentenceIndex: number;
    setPlaylist: (sentences: TTSSentence[]) => void;
    setFullPlaylist: (sentences: TTSSentence[]) => void;
    playPlaylist: (sentences: TTSSentence[], startIndex?: number) => void;
    playNextSentence: () => void;
    playPrevSentence: () => void;
    stopTTS: () => void;
    isMobileDrawerOpen: boolean;
    setIsMobileDrawerOpen: (open: boolean) => void;
    isMobileSheetOpen: boolean;
    setIsMobileSheetOpen: (open: boolean) => void;
    isInputModalOpen: boolean;
    setIsInputModalOpen: (open: boolean) => void;
    isFromExtension: boolean;
    setIsFromExtension: (fromExtension: boolean) => void;
    analyzedText: string;
    setAnalyzedText: (text: string) => void;

    // New Dropdown States
    isInputOpen: boolean;
    toggleInput: () => void;
    setIsInputOpen: (open: boolean) => void;

    showTranslation: boolean;
    toggleTranslation: () => void;
    setShowTranslation: (show: boolean) => void;

    hasAutoClosedTranslation: boolean;
    setHasAutoClosedTranslation: (hasClosed: boolean) => void;

    fullTranslation: string | null;
    setFullTranslation: (text: string | null) => void;

    translationCache: Record<string, string>;
    cacheTranslation: (text: string, translation: string) => void;

    aiExplanationCache: Record<string, string>;
    cacheAIExplanation: (key: string, text: string) => void;

    uiLanguage: 'zh' | 'ja';
    setUiLanguage: (lang: 'zh' | 'ja') => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            appMode: 'reader',
            setAppMode: (mode) => set({ appMode: mode }),
            centerViewMode: 'reader',
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
                const filteredHistory = state.history.filter(t =>
                    !(t.surface === token.surface && t.reading === token.reading && t.pos === token.pos)
                );
                const newHistory = [token, ...filteredHistory].slice(0, 100);
                return {
                    selectedToken: token,
                    history: newHistory
                };
            }),
            selectedGrammar: null,
            setSelectedGrammar: (grammar) => set({ selectedGrammar: grammar, selectedToken: null }),
            layout: {
                leftSidebarWidth: 360,
                rightSidebarWidth: 360,
                leftTopHeight: 380,
                leftInputHeight: 180,
                rightBottomHeight: 240,
                isManualLayout: false,
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
                const isSame =
                    state.playlist.length === newPlaylist.length &&
                    state.playlist.length > 0 &&
                    state.playlist[0].id === newPlaylist[0].id &&
                    state.playlist[state.playlist.length - 1].id === newPlaylist[newPlaylist.length - 1].id;
                if (isSame) {
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
                currentSentenceIndex: 0,
            }),
            isMobileDrawerOpen: false,
            setIsMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),
            isMobileSheetOpen: false,
            setIsMobileSheetOpen: (open) => set({ isMobileSheetOpen: open }),
            isInputModalOpen: false,
            setIsInputModalOpen: (open) => set({ isInputModalOpen: open }),
            isFromExtension: false,
            setIsFromExtension: (fromExtension) => set({ isFromExtension: fromExtension }),
            analyzedText: DEFAULT_INPUT_TEXT,
            setAnalyzedText: (text) => set({ analyzedText: text }),

            // Dropdown Logic Implementation
            isInputOpen: false,
            toggleInput: () => set((state) => ({ isInputOpen: !state.isInputOpen })),
            setIsInputOpen: (open) => set({ isInputOpen: open }),

            showTranslation: true,
            toggleTranslation: () => set((state) => ({
                showTranslation: !state.showTranslation,
                hasAutoClosedTranslation: true
            })),
            setShowTranslation: (show) => set({ showTranslation: show }),

            hasAutoClosedTranslation: false,
            setHasAutoClosedTranslation: (hasClosed) => set({ hasAutoClosedTranslation: hasClosed }),

            fullTranslation: null,
            setFullTranslation: (text) => set({ fullTranslation: text }),

            // Translation Cache
            translationCache: {},
            cacheTranslation: (text, translation) => set((state) => ({
                translationCache: { ...state.translationCache, [text]: translation }
            })),

            // AI Explanation Cache
            aiExplanationCache: {},
            cacheAIExplanation: (key, text) => set((state) => ({
                aiExplanationCache: { ...state.aiExplanationCache, [key]: text }
            })),

            uiLanguage: 'zh',
            setUiLanguage: (lang) => set({ uiLanguage: lang })
        }),
        {
            name: 'yomi-app-store-v9',
            partialize: (state) => ({
                settings: state.settings,
                inputText: state.inputText,
                analyzedText: state.analyzedText,
                history: state.history,
                layout: state.layout,
                showTranslation: state.showTranslation,
                translationCache: state.translationCache,
                aiExplanationCache: state.aiExplanationCache,
                uiLanguage: state.uiLanguage,
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
