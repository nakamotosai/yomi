'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Settings,
  BookMarked,
  PlayCircle,
  PauseCircle,
  StopCircle,
  GraduationCap,
  BookOpen,
  X,
  PenLine,
  Languages,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';

import { useSearchParams } from 'next/navigation';
import { useAppStore, DEFAULT_INPUT_TEXT } from '@/store/useAppStore';

import { useVocabStore } from '@/store/useVocabStore';
import { useGrammarStore } from '@/store/useGrammarStore';
import { ttsManager } from '@/lib/tts/manager';
import { translateText } from '@/lib/translate'; // Import translation function
import { useGeminiStore } from '@/store/useGeminiStore';
import { yomitanLoader } from '@/lib/dictionary/yomitanLoader';
import { prefetchGrammar } from '@/lib/grammar/grammarLoader';
import { richGrammarLoader } from '@/lib/grammar/RichGrammarLoader';
import LoadingProgress from '@/components/LoadingProgress';
import AIChatView from '@/components/AIChatView';
import SettingsModal from '@/components/SettingsModal';
import AIHeroInput from '@/components/AIHeroInput';
import RefactoredInput from '@/components/RefactoredInput';
import InfoPanel from '@/components/InfoPanel';


import HistoryPanel from '@/components/HistoryPanel';

import VocabListView from '@/components/VocabListView';
import GrammarListView from '@/components/GrammarListView';
import ResizableLayout from '@/components/ResizableLayout';
import ResizableVerticalSection from '@/components/ResizableVerticalSection';

import MobileNavigator from '@/components/MobileNavigator';
import ReaderHeader from '@/components/ReaderHeader'; // Import ReaderHeader
import { Collapsible } from '@/components/Collapsible';
import { useI18n } from '@/lib/i18n';

import { useKanaProgressStore } from '@/store/useKanaProgressStore'; // Add Import

// Dynamic imports

const TextAnalyzer = dynamic(() => import('@/components/TextAnalyzer'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent-primary)' }} />
      <p className="text-sm">読み込み中...</p>
    </div>
  ),
});

const GlobalAudioPlayer = dynamic(() => import('@/components/GlobalAudioPlayer'), { ssr: false });
const KanaCourseView = dynamic(() => import('@/components/kana/KanaCourseView'), {
  loading: () => <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>Loading Course...</div>,
});

// const KanaSidePanel = dynamic(() => import('@/components/kana/KanaSidePanel'), { ssr: false });


const CenterColumn = ({ onPlayAll, onStop }: { onPlayAll: () => void, onStop: () => void }) => {
  const {
    appMode,
    inputText,
    setInputText,
    analyzedText,
    isSpeaking,
    isPaused,
    centerViewMode,
    isFromExtension,
    setIsFromExtension,
    setAnalyzedText,
    // Dropdown States
    isInputOpen,
    setIsInputOpen, // Destructure setter
    toggleInput,
    showTranslation,
    toggleTranslation,
    hasAutoClosedTranslation,
    setHasAutoClosedTranslation,
    setShowTranslation,
    isSettingsOpen
  } = useAppStore();

  const [isMounted, setIsMounted] = useState(false);

  // Translation State - Moved to Store
  const fullTranslation = useAppStore(s => s.fullTranslation);
  // setHasAutoClosedTranslation is already destructured above
  const [isTranslating, setIsTranslating] = useState(false);

  // Reset auto-closed state on mount to ensure 5s timer runs on first load
  useEffect(() => {
    setHasAutoClosedTranslation(false);
    setShowTranslation(true);
  }, [setHasAutoClosedTranslation, setShowTranslation]);

  // Auto-collapse logic for translation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showTranslation && !hasAutoClosedTranslation) {
      // If open and hasn't been auto-closed yet, set timer
      timer = setTimeout(() => {
        setShowTranslation(false);
        setHasAutoClosedTranslation(true);
        console.log('[AutoCollapse] Closing translation panel after 5s');
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [showTranslation, hasAutoClosedTranslation, setShowTranslation, setHasAutoClosedTranslation]);


  // Auto-expand translation when imported from browser extension
  useEffect(() => {
    if (isFromExtension && inputText.trim()) {
      // Immediately reset to prevent re-triggering on inputText changes
      setIsFromExtension(false);

      if (!showTranslation) {
        setShowTranslation(true);
        setIsInputOpen(false); // Ensure input is closed
      }

      setAnalyzedText(inputText);
      setIsTranslating(true);
      // Translation triggered by TextAnalyzer effect, just ensure UI shows loading if needed
      // Actually TextAnalyzer might not be mounted yet if we are switching modes?
      // Since centerViewMode is 'reader' by default, TextAnalyzer should handle the translation sync.
      // We just expand the panel here.
    }
    // Only trigger when isFromExtension becomes true or inputText changes while it is true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFromExtension, inputText, setIsFromExtension, showTranslation, setAnalyzedText]);

  // Handle toggling input (Mutually exclusive)
  const handleToggleInput = () => {
    if (!isInputOpen) {
      // We are opening input, close translation
      setShowTranslation(false);
    }
    toggleInput();
  };

  // Handle toggling translation (Manual toggle by user)
  const handleToggleTranslation = async () => {
    if (showTranslation) {
      toggleTranslation(); // This sets hasAutoClosedTranslation=true inside store
    } else {
      // We are opening translation, close input
      setIsInputOpen(false);
      toggleTranslation();
      // Translation handled by TextAnalyzer sync
      if (!fullTranslation && analyzedText.trim()) {
        setIsTranslating(true);
        // Rely on TextAnalyzer to update store
        setTimeout(() => setIsTranslating(false), 2000); // Fallback timeout for loading state
      }
    }
  };

  // Effect to clear legacy local translation logic - now handled by TextAnalyzer
  useEffect(() => {
    if (!analyzedText.trim()) {
      // Clear global translation if text is empty? Maybe not needed, TextAnalyzer handles it.
    }
  }, [analyzedText]);

  // Scrollbar Visibility Logic
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isProximity, setIsProximity] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const el = scrollRef.current;
    if (!el) return;

    let t: NodeJS.Timeout;

    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setIsScrolling(false), 1000);
    };

    const onMouseMove = (e: MouseEvent) => {
      // Fix: Don't trigger proximity when settings or other overlays are open
      const isModalActive = document.querySelector('[role="dialog"]') || isSettingsOpen;
      if (isModalActive) {
        setIsProximity(false);
        return;
      }

      const rect = el.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const dist = rect.right - e.clientX;
        const isNear = dist < 40 && dist >= -10;
        setIsProximity(isNear);
      } else {
        setIsProximity(false);
      }
    };

    el.addEventListener('scroll', onScroll);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      clearTimeout(t);
    };
  }, []);

  const isVisible = isScrolling || isProximity;

  return (
    <div
      className="h-full flex flex-col w-full"
      style={{
        background: 'transparent',
      }}
    >
      {analyzedText.trim() && appMode === 'reader' && centerViewMode === 'reader' && (
        <div className="w-full z-10 pt-0 pb-4">
          <div className="flex flex-col relative transition-all duration-300 ease-spring">
            {/* Header Section (Refactored to ReaderHeader) */}
            <ReaderHeader
              isInputOpen={isInputOpen}
              onToggleInput={handleToggleInput}
              isTranslationVisible={showTranslation}
              onToggleTranslation={handleToggleTranslation}
              isLoadingTranslation={isTranslating}

              isSpeaking={isSpeaking}
              isPaused={isPaused}
              onPlay={onPlayAll}
              onStop={onStop}
            />

            {/* Input Dropdown Section */}
            <Collapsible isOpen={isInputOpen} variant="default">
              <div className="overflow-hidden px-0 pb-0 mt-0 mb-[15px]">
                <div
                  className="overflow-hidden flex flex-col"
                  style={{ height: '50vh', maxHeight: '50vh', background: 'transparent' }}
                >
                  <RefactoredInput
                    inputText={inputText}
                    setInputText={setInputText}
                    onClear={() => setInputText('')}
                    compact={true}
                  />
                </div>
              </div>
            </Collapsible>

            {/* Translation Dropdown Section */}
            <Collapsible isOpen={showTranslation} variant="default">
              <div className="overflow-hidden px-0 pb-1 mt-0">
                <div
                  className="overflow-hidden flex flex-col"
                  style={{ maxHeight: '50vh', background: 'transparent' }}
                >
                  <div className="overflow-y-auto custom-scrollbar p-4 h-full">
                    {isTranslating ? (
                      <div className="flex flex-col gap-2 animate-pulse">
                        <div className="h-4 bg-black/5 dark:bg-white/10 rounded w-3/4"></div>
                        <div className="h-4 bg-black/5 dark:bg-white/10 rounded w-1/2"></div>
                      </div>
                    ) : fullTranslation ? (
                      <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-bold opacity-70 mr-1 select-none">全文翻译：</span>{fullTranslation}
                      </p>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 opacity-50 gap-2">
                        <p className="text-xs">ボタンを押して翻訳を開始</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Collapsible>

          </div>
        </div>
      )}

      {/* AI Chat View - Full takeover */}
      {
        centerViewMode === 'ai' && (
          <div className="h-full flex flex-col pt-0">
            <AIChatView hideHeader={false} />
          </div>
        )
      }

      {/* Vocab List View - Full takeover */}
      {
        centerViewMode === 'vocab' && (
          <VocabListView />
        )
      }

      {/* Grammar List View - Full takeover */}
      {
        centerViewMode === 'grammar' && (
          <GrammarListView />
        )
      }

      {/* Content Scroll Area - Only for reader mode */}
      {
        centerViewMode === 'reader' && (
          <div
            ref={scrollRef}
            data-visible={isMounted ? (isVisible ? "true" : "false") : undefined}
            className="flex-1 overflow-y-auto overflow-x-hidden pt-0 pb-4 pl-0 pr-0 floating-scrollbar scroll-smooth overscroll-y-none relative z-0"
          >
            <div className="min-h-full">
              {appMode === 'reader' ? (
                analyzedText.trim() ? (
                  <TextAnalyzer key={analyzedText} text={analyzedText} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center select-none pb-20" style={{ color: 'var(--text-faint)' }}>
                    <div
                      className="w-24 h-24 border-4 border-dashed rounded-full flex items-center justify-center mb-4"
                      style={{ borderColor: 'var(--border-default)' }}
                    >
                      <PlayCircle className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
                    </div>
                    <p className="text-lg font-medium" style={{ color: 'var(--text-muted)' }}>テキストを入力してください</p>
                    <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
                      分析ボタンをクリックして解析を開始します
                    </p>
                  </div>
                )
              ) : (
                <KanaCourseView />
              )}


              <div className="h-20" /> {/* Bottom spacer */}
            </div>

          </div>
        )
      }
    </div >
  );
};

function HomeContent() {    // Optimized selectors to prevent re-renders
  const appMode = useAppStore(s => s.appMode);
  const setAppMode = useAppStore(s => s.setAppMode);
  const inputText = useAppStore(s => s.inputText);
  const setInputText = useAppStore(s => s.setInputText);
  const analyzedText = useAppStore(s => s.analyzedText);
  const setAnalyzedText = useAppStore(s => s.setAnalyzedText);
  const isSpeaking = useAppStore(s => s.isSpeaking);
  const setIsSpeaking = useAppStore(s => s.setIsSpeaking);
  const isPaused = useAppStore(s => s.isPaused);
  const setIsPaused = useAppStore(s => s.setIsPaused);
  const setSpeakingTokenId = useAppStore(s => s.setSpeakingTokenId);
  const layout = useAppStore(s => s.layout);
  const setLayout = useAppStore(s => s.setLayout);
  const setIsMobileDrawerOpen = useAppStore(s => s.setIsMobileDrawerOpen);
  const setCenterViewMode = useAppStore(s => s.setCenterViewMode);
  // Input Modal is removed
  // const isInputModalOpen = useAppStore(s => s.isInputModalOpen);
  // const setIsInputModalOpen = useAppStore(s => s.setIsInputModalOpen);
  const centerViewMode = useAppStore(s => s.centerViewMode);
  const settings = useAppStore(s => s.settings);
  const uiLanguage = useAppStore(s => s.uiLanguage);
  const setUiLanguage = useAppStore(s => s.setUiLanguage);
  const isSettingsOpen = useAppStore(s => s.isSettingsOpen);
  const setIsSettingsOpen = useAppStore(s => s.setIsSettingsOpen);

  const { t } = useI18n();

  const { vocabList } = useVocabStore();
  const { grammarList } = useGrammarStore();
  // Subscribe to isChatOpen to trigger re-renders when chat opens/closes
  const { isChatOpen } = useGeminiStore();
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync settings modal state to global store
  useEffect(() => {
    setIsSettingsOpen(showSettings);
  }, [showSettings, setIsSettingsOpen]);

  // Removed InputModal sync logic as it is now inline
  /*
  useEffect(() => {
    if (isInputModalOpen) {
      const currentAnalyzed = useAppStore.getState().analyzedText;
      if (currentAnalyzed && currentAnalyzed !== inputText) {
        setInputText(currentAnalyzed);
      }
    }
  }, [isInputModalOpen]);
  */

  const isDark = mounted && settings.theme === 'dark';
  // const isMonochrome = settings.colorScheme === 'monochrome';

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-color-scheme', settings.colorScheme);
  }, [settings.theme, settings.colorScheme]);

  // Stop TTS on page load/refresh
  useEffect(() => {
    ttsManager.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingTokenId(null);
  }, [setIsSpeaking, setIsPaused, setSpeakingTokenId]);

  // Handle URL query parameters (e.g. ?text=...&source=extension)
  const searchParams = useSearchParams();
  const setIsFromExtension = useAppStore(s => s.setIsFromExtension);

  useEffect(() => {
    const textParam = searchParams.get('text');
    const sourceParam = searchParams.get('source');

    if (textParam) {
      // Check if this is from browser extension
      const isFromExt = sourceParam === 'extension';
      if (isFromExt) {
        setIsFromExtension(true);
      }

      // Detect if text contains Japanese characters (Hiragana, Katakana, or Kanji)
      const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(textParam);

      if (hasJapanese) {
        // Japanese text - use directly
        setInputText(textParam);
        setAnalyzedText(textParam);
      } else {
        // Non-Japanese text - translate to Japanese first
        translateText(textParam, 'ja', 'auto').then(japaneseText => {
          if (japaneseText && japaneseText.trim()) {
            setInputText(japaneseText);
            setAnalyzedText(japaneseText);
          } else {
            // Fallback to original text if translation fails
            setInputText(textParam);
            setAnalyzedText(textParam);
          }
        }).catch(() => {
          setInputText(textParam);
          setAnalyzedText(textParam);
        });
      }

      // Remove the query parameters from the URL without reloading
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('text');
      newUrl.searchParams.delete('source');
      window.history.replaceState({}, '', newUrl.toString());
    } else {
      // If no URL param, check if current text is empty. If so, restore default guidance.
      const currentText = useAppStore.getState().inputText;
      if (!currentText || !currentText.trim()) {
        setInputText(DEFAULT_INPUT_TEXT);
        setAnalyzedText(DEFAULT_INPUT_TEXT);
      }
    }
  }, [searchParams, setInputText, setIsFromExtension, setAnalyzedText]);

  // Background Dictionary Prefetching
  useEffect(() => {
    // Delay background loading to prioritize initial UI render and static resources
    const timer = setTimeout(() => {
      console.log('[App] Starting background dictionary prefetching...');
      yomitanLoader.prefetch();
      prefetchGrammar();
      richGrammarLoader.prefetch();
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, []);

  const handlePlayAll = () => {
    // Logic: If current playlist is partial (e.g. single sentence), 
    // Play All should RESET to full playlist
    const store = useAppStore.getState();
    const isPartial = store.playlist.length !== store.fullPlaylist.length;

    if (isPartial) {
      // Reset to full playlist and start
      store.setPlaylist(store.fullPlaylist);
      store.setIsSpeaking(true);
      store.setIsPaused(false);
      return;
    }

    // Normal Toggle
    if (isSpeaking) {
      if (isPaused) {
        ttsManager.resume();
        setIsPaused(false);
      } else {
        ttsManager.pause();
        setIsPaused(true);
      }
    } else {
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    ttsManager.stop();
    useAppStore.getState().stopTTS(); // Use store's stopTTS to reset all state including currentSentenceIndex
  };

  /*
  const handleClear = () => {
    setInputText('');
    setAnalyzedText('');
    handleStop();
  };
  */

  // const isCompact = layout.leftSidebarWidth < 300;

  // Scrollbar Visibility Logic
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isProximity, setIsProximity] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let t: NodeJS.Timeout;

    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setIsScrolling(false), 1000);
    };

    const onMouseMove = (e: MouseEvent) => {
      // Fix: Don't trigger proximity when settings or other overlays are open
      const isModalActive = document.querySelector('[role="dialog"]') || isSettingsOpen;
      if (isModalActive) {
        setIsProximity(false);
        return;
      }

      const rect = el.getBoundingClientRect();
      // Check if mouse is inside the vertical range of container
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        // Check distance to right edge
        const dist = rect.right - e.clientX;
        // 40px threshold for easy grabbing, but only if inside horizontal bounds too (approx)
        const isNear = dist < 40 && dist >= -10; // -10 allows for slight overshoot
        setIsProximity(isNear);
      } else {
        setIsProximity(false);
      }
    };

    el.addEventListener('scroll', onScroll);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      clearTimeout(t);
    };
  }, []);

  const CenterContent = (
    <div
      className="h-full flex flex-col w-full"
      style={{
        background: 'transparent', // Transparent to show the main background
      }}
    >
      {analyzedText.trim() && appMode === 'reader' && (
        /* Toolbar */
        <div
          className="h-14 flex items-center px-4 md:px-6 sticky top-0 z-10 justify-between shrink-0"
          style={{
            borderBottom: `1px solid var(--border-muted)`,
            background: isDark ? 'var(--glass-bg)' : 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <h2 className="font-bold hidden md:block" style={{ color: 'var(--text-muted)' }}>{t('nav.reader_mode')}</h2>
          <div className="md:hidden" /> {/* Spacer for mobile */}

          {/* Playback Controls (Mobile Toolbar) - Kept mostly same but can also leverage Header components if desired */}
          {/* For now, keeping mobile toolbar as is for consistency with previous mobile logic unless user requested global change */}
          {/* wait, user requested web change. Mobile might share this component? */}
          {/* CenterContent is used for Mobile too. Mobile Header logic needs to be checked. */}
          {/* Ah, CenterColumn is the Desktop Component. CenterContent (variable below) is PASSED to MobileNavigator. */}
          {/* So this part is Mobile Only View essentially. */}

          <div className="flex items-center gap-2">
            {/* Input Button (Mobile) */}
            <button
              // Reuse store toggle logic if valid for mobile? 
              // Mobile usually uses Modal or separate screen. 
              // Keeping original modal logic for mobile for now to avoid breaking mobile UX unless requested.
              // User specifically mentioned "Web end". So I will touch CenterColumn (Desktop) mainly.
              // But let's check if Mobile uses CenterColumn. No, Mobile uses CenterContent variable.
              // `CenterContent` (variable) still has the old hardcoded toolbar and doesn't integrate ReaderHeader.
              // Since the user asked for "Web End" (网页端), I focused on CenterColumn. Mobile users might still use the old toolbar unless we update CenterContent too.
              // Given constraints, I'm modifying CenterColumn (Desktop) and leaving Mobile as is effectively.
              onClick={() => useAppStore.getState().setIsInputModalOpen(true)}
              className={clsx(
                "flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95",
                isDark ? "bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border-none" : "bg-white text-[var(--text-muted)] border border-[var(--border-muted)] shadow-sm"
              )}
            >
              <PenLine className="w-4 h-4" />
              <span>入力</span>
            </button>

            <button
              onClick={handlePlayAll}
              className={clsx(
                "flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95",
                isDark && isSpeaking && !isPaused && "rainbow-highlight"
              )}
              style={{
                background: isSpeaking && !isPaused
                  ? (isDark ? 'rgba(251, 191, 36, 0.15)' : 'var(--bg-elevated)')
                  : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'white'),
                color: isSpeaking && !isPaused
                  ? (isDark ? '#fbbf24' : 'var(--text-muted)')
                  : (isDark ? 'var(--text-muted)' : 'var(--text-muted)'),
                border: isDark && isSpeaking && !isPaused
                  ? 'none' /* Handled by rainbow-highlight */
                  : (isDark
                    ? 'none'
                    : `1px solid ${isSpeaking && !isPaused ? 'var(--border-default)' : 'var(--border-muted)'}`),
                boxShadow: !isDark && isSpeaking && !isPaused ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {isSpeaking && !isPaused ? (
                <PauseCircle className="w-4 h-4" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {isSpeaking && !isPaused ? '一時停止' : (isPaused ? '再開' : '全文再生')}
            </button>

            {isSpeaking && (
              <button
                onClick={handleStop}
                className="p-1.5 rounded-full transition-colors"
                style={{
                  background: isDark ? 'var(--bg-subtle)' : 'rgb(229, 231, 235)',
                  color: 'var(--text-secondary)'
                }}
                title="停止"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Scroll Area */}
      <div
        ref={scrollRef}
        data-visible={isScrolling || isProximity}
        className="flex-1 overflow-y-auto p-4 floating-scrollbar"
      >
        <div className="max-w-3xl mx-auto min-h-full">
          {appMode === 'reader' ? (
            analyzedText.trim() ? (
              <TextAnalyzer key={analyzedText} text={analyzedText} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center select-none pb-20" style={{ color: 'var(--text-faint)' }}>
                <div
                  className="w-24 h-24 border-4 border-dashed rounded-full flex items-center justify-center mb-4"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <PlayCircle className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
                </div>
                <p className="text-lg font-medium" style={{ color: 'var(--text-muted)' }}>テキストを入力してください</p>
                <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
                  分析ボタンをクリックして解析を開始します
                </p>
              </div>
            )
          ) : (
            <KanaCourseView />
          )}
          <div className="h-20" /> {/* Bottom spacer */}
        </div>

      </div>
    </div>
  );


  return (
    <main
      className="h-screen w-full overflow-hidden font-sans flex flex-col"
      style={{
        background: 'var(--bg-base)',
        color: 'var(--text-primary)'
      }}
    >


      {/* Mobile Header Removed - Replaced by MobileNavigator/BottomBar */}


      {/* Desktop Layout (> 768px) */}
      <div className="hidden md:block h-full w-full">
        <ResizableLayout
          leftContent={
            <div className="h-full pt-4 pl-4 pb-4 pr-2"> {/* Padding for floating effect */}
              {/* Unified Stream Layout Container */}
              <div className="h-full flex flex-col rounded-2xl bg-transparent backdrop-blur-xl border border-[var(--border-muted)] shadow-sm overflow-hidden relative">
                {/* Background Pattern for Card */}
                <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none"
                  style={{
                    backgroundImage: isDark
                      ? 'radial-gradient(circle at 10% 10%, rgba(255,255,255,0.03) 1px, transparent 1px)'
                      : 'radial-gradient(circle at 10% 10%, rgba(0,0,0,0.03) 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />

                {/* Logo Area - Compact */}
                <div
                  className="h-14 hidden md:flex items-center pl-6 pr-2 shrink-0 bg-transparent border-none z-20"
                >
                  <div className="relative w-8 h-8 mr-3">
                    <Image src="/logo.png" alt="Logo" fill className="object-contain dark:brightness-[0.7]" unoptimized />
                  </div>
                  <h1 className="text-[16px] font-bold tracking-tight" style={{ color: 'var(--accent-primary)' }}>
                    読み | YOMI
                  </h1>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => setUiLanguage(uiLanguage === 'zh' ? 'ja' : 'zh')}
                      className="w-10 h-10 flex items-center justify-center rounded-xl transition-all bg-[var(--bg-muted)] text-[var(--accent-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 cursor-pointer"
                      title={t('header.title_switch_lang')}
                    >
                      <span className="text-[14px] font-bold opacity-90">{uiLanguage === 'zh' ? '日' : '中'}</span>
                    </button>
                    <button
                      onClick={() => { setShowSettings(true); setIsMobileDrawerOpen(false); }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl transition-all bg-[var(--bg-muted)] text-[var(--accent-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 cursor-pointer"
                      title="设定"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0 w-full relative custom-scrollbar">

                  {/* Navigation Grid Section - Flowing First */}
                  <div className="flex flex-col gap-4 px-2 pb-6">

                    {/* Navigation Buttons Grid - Expanded */}
                    <div className="p-1">
                      {/* Row 1: Reading Mode (Full Width) */}
                      <div className="p-1 pt-0 pb-4">
                        <button
                          key="nav-btn-reader"
                          onClick={() => {
                            console.log('Switching to Reader Mode');
                            setAppMode('reader');
                            setCenterViewMode('reader');
                            setIsMobileDrawerOpen(false);
                            useGeminiStore.getState().setChatOpen(false);
                          }}

                          className={clsx(
                            "w-full flex flex-col items-center justify-center p-4 rounded-xl transition-all group relative",
                            appMode === 'reader' && centerViewMode === 'reader'
                              ? "rainbow-highlight"
                              : "hover:bg-[var(--bg-elevated)]/50 bg-[var(--bg-elevated)]/30 shadow-sm border border-[var(--border-muted)] interactive-tag"
                          )}
                        >
                          <BookOpen
                            className={clsx(
                              "w-6 h-6 mb-2 transition-colors",
                              appMode === 'reader' && centerViewMode === 'reader' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                            )}
                          />
                          <span className={clsx(
                            "font-bold text-[14px]",
                            appMode === 'reader' && centerViewMode === 'reader' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                          )}>
                            {t('nav.reader_mode')}
                          </span>
                        </button>
                      </div>

                      {/* Row 2: AI Chat (Full Width) */}
                      <div className="p-1 pb-4">
                        <button
                          onClick={() => {
                            // Ensure mutual exclusivity by exiting kana mode
                            setAppMode('reader');
                            setCenterViewMode('ai');
                            setIsMobileDrawerOpen(false);
                            useGeminiStore.getState().setChatOpen(true);
                          }}
                          className={clsx(
                            "w-full flex flex-col items-center justify-center p-4 rounded-xl transition-all group relative",
                            appMode === 'reader' && centerViewMode === 'ai'
                              ? "rainbow-highlight"
                              : "hover:bg-[var(--bg-elevated)]/50 bg-[var(--bg-elevated)]/30 shadow-sm border border-[var(--border-muted)] interactive-tag"
                          )}
                        >

                          <Sparkles
                            className={clsx(
                              "w-6 h-6 mb-2 transition-colors",
                              appMode === 'reader' && centerViewMode === 'ai' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                            )}
                          />
                          <span className={clsx(
                            "font-bold text-[14px]",
                            appMode === 'reader' && centerViewMode === 'ai' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                          )}>
                            {t('nav.ai_chat')}
                          </span>
                        </button>
                      </div>

                      {/* Row 3: Beginners Mode (Full Width) */}
                      <div className="p-1 pb-4">
                        <button
                          key="nav-btn-kana"
                          onClick={() => {
                            console.log('Switching to Kana Mode');
                            setAppMode('kana');
                            setCenterViewMode('reader'); // Ensure center view renders the container where KanaCourseView lives
                            useKanaProgressStore.getState().setCurrentLesson(null); // Reset to Menu
                            setIsMobileDrawerOpen(false);
                            useGeminiStore.getState().setChatOpen(false);
                          }}
                          className={clsx(
                            "w-full flex flex-col items-center justify-center p-4 rounded-xl transition-all group relative",
                            appMode === 'kana'
                              ? "rainbow-highlight"
                              : "hover:bg-[var(--bg-elevated)]/50 bg-[var(--bg-elevated)]/30 shadow-sm border border-[var(--border-muted)] interactive-tag"
                          )}
                        >
                          <GraduationCap
                            className={clsx(
                              "w-6 h-6 mb-2 transition-colors",
                              appMode === 'kana' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                            )}
                          />
                          <span className={clsx(
                            "font-bold text-[14px]",
                            appMode === 'kana' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                          )}>
                            初学者模式
                          </span>
                        </button>
                      </div>

                      {/* Lists Row 2 */}
                      <div className="grid grid-cols-2 gap-4 overflow-visible p-1">
                        <button
                          onClick={() => {
                            setAppMode('reader'); // Ensure we are in reader mode context
                            setCenterViewMode('vocab');
                            setIsMobileDrawerOpen(false);
                            useGeminiStore.getState().setChatOpen(false);
                          }}
                          className={clsx(
                            "flex flex-col items-center justify-center p-4 rounded-xl transition-all group relative",
                            appMode === 'reader' && centerViewMode === 'vocab'
                              ? "rainbow-highlight"
                              : "hover:bg-[var(--bg-elevated)]/50 bg-[var(--bg-elevated)]/30 shadow-sm border border-[var(--border-muted)] interactive-tag"
                          )}
                        >
                          <BookMarked
                            className={clsx(
                              "w-6 h-6 mb-2 transition-colors",
                              appMode === 'reader' && centerViewMode === 'vocab' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                            )}
                          />
                          <span className={clsx(
                            "font-bold text-[14px]",
                            appMode === 'reader' && centerViewMode === 'vocab' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                          )}>
                            {t('nav.vocab_list')}
                            <span className="ml-1 text-xs opacity-60 font-normal">{vocabList.length}</span>
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setAppMode('reader'); // Ensure we are in reader mode context
                            setCenterViewMode('grammar');
                            setIsMobileDrawerOpen(false);
                            useGeminiStore.getState().setChatOpen(false);
                          }}
                          className={clsx(
                            "flex flex-col items-center justify-center p-4 rounded-xl transition-all group relative",
                            appMode === 'reader' && centerViewMode === 'grammar'
                              ? "rainbow-highlight"
                              : "hover:bg-[var(--bg-elevated)]/50 bg-[var(--bg-elevated)]/30 shadow-sm border border-[var(--border-muted)] interactive-tag"
                          )}
                        >
                          <PenLine
                            className={clsx(
                              "w-6 h-6 mb-2 transition-colors",
                              appMode === 'reader' && centerViewMode === 'grammar' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                            )}
                          />
                          <span className={clsx(
                            "font-bold text-[14px]",
                            appMode === 'reader' && centerViewMode === 'grammar' ? "text-[var(--accent-primary)]" : "text-[var(--accent-primary)] opacity-60"
                          )}>
                            {t('nav.grammar_list')}
                            <span className="ml-1 text-xs opacity-60 font-normal">{grammarList.length}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* AI Hero Input Section - Pinned to Bottom with Divider */}
                <div className="w-full relative px-2 py-3 shrink-0 z-20 border-t border-black/5 dark:border-white/5">
                  <AIHeroInput />
                </div>
              </div>
            </div>
          }
          centerContent={
            <div className="h-full py-4 px-2"> {/* Floating wrapper */}
              <div
                className="h-full w-full bg-transparent backdrop-blur-xl rounded-2xl overflow-hidden relative"
              >
                <CenterColumn
                  onPlayAll={handlePlayAll}
                  onStop={handleStop}
                />
              </div>
            </div>
          }
          rightContent={
            <div className="h-full pt-4 pr-4 pb-4 pl-2">
              <ResizableVerticalSection
                mode="bottom-fixed"
                initialBottomHeight={120} // Just enough for 1-2 lines
                onBottomHeightChange={(_h: number) => { /* Optional persists */ }}
                gap={16}
                topContent={
                  <div className="h-full rounded-2xl bg-transparent backdrop-blur-xl border border-[var(--border-muted)] shadow-sm overflow-hidden">
                    <InfoPanel />
                  </div>
                }
                bottomContent={
                  <div className="h-full rounded-2xl bg-transparent backdrop-blur-xl border border-[var(--border-muted)] shadow-sm overflow-hidden">
                    <HistoryPanel />
                  </div>
                }
              />
            </div>
          }
        />
      </div>

      {/* Input Modal Removed - Replaced by drop-down in CenterColumn */}
      {/* Kept Mobile Input Modal if we decide to use it, but for now we rely on CenterColumn's new dropdown? */}
      {/* Actually Mobile View uses `MobileNavigator` which renders `CenterContent` (variable). */}
      {/* `CenterContent` (variable) still has the old hardcoded toolbar and doesn't integrate ReaderHeader. */}
      {/* Since the user asked for "Web End" (网页端), I focused on CenterColumn. Mobile users might still use the old toolbar unless we update CenterContent too. */}
      {/* Given constraints, I'm modifying CenterColumn (Desktop) and leaving Mobile as is effectively. */}

      {/* Mobile Layout (< 768px) */}
      <div className="md:hidden h-full relative overflow-hidden">
        <MobileNavigator
          mainContent={CenterContent}
          infoContent={
            <div className="h-full flex flex-col bg-[var(--bg-base)]">
              <div className="flex-1 overflow-y-auto floating-scrollbar p-2">
                <InfoPanel />
              </div>
            </div>
          }
          aiContent={
            <div className="h-full flex flex-col bg-[var(--bg-base)]">
              <AIChatView hideHeader={true} />
            </div>
          }
          vocabContent={
            <div className="h-full flex flex-col bg-[var(--bg-base)]">
              <div className="flex-1 overflow-y-auto floating-scrollbar p-2">
                <VocabListView />
              </div>
            </div>
          }
          grammarContent={
            <div className="h-full flex flex-col bg-[var(--bg-base)]">
              <div className="flex-1 overflow-y-auto floating-scrollbar p-2">
                <GrammarListView />
              </div>
            </div>
          }
          menuContent={
            <div className="flex flex-col h-full bg-[var(--bg-base)]">
              {/* Menu Header with Logo */}
              <div className="h-14 flex items-center px-5 shrink-0 border-b border-[var(--border-default)]">
                <div className="relative w-6 h-6 mr-2">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain" unoptimized />
                </div>
                <h1 className="text-base font-bold text-[var(--text-secondary)]">
                  YOMI | 菜单
                </h1>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="ml-auto p-2 -mr-2 text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-widest pl-1 mb-2">主菜单</div>

                {/* 1. Reader Mode */}
                <button
                  onClick={() => { setAppMode('reader'); setCenterViewMode('reader'); setIsMobileDrawerOpen(false); }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border",
                    appMode === 'reader' && centerViewMode === 'reader'
                      ? "bg-[var(--bg-elevated)] border-[var(--border-default)] shadow-sm"
                      : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    appMode === 'reader' && centerViewMode === 'reader' ? "bg-[var(--scheme-primary-bg)] text-[var(--scheme-primary)]" : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  )}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className={clsx("font-bold text-sm", appMode === 'reader' && centerViewMode === 'reader' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{t('nav.reader_mode')}</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate">{t('nav.reader_desc')}</span>
                  </div>
                </button>

                {/* 2. AI Chat */}
                <button
                  onClick={() => { setCenterViewMode('ai'); setIsMobileDrawerOpen(false); useGeminiStore.getState().setChatOpen(true); }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border",
                    centerViewMode === 'ai'
                      ? "bg-[var(--bg-elevated)] border-[var(--border-default)] shadow-sm"
                      : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    centerViewMode === 'ai' ? "bg-[var(--scheme-accent-bg)] text-[var(--scheme-accent)]" : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  )}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className={clsx("font-bold text-sm", centerViewMode === 'ai' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{t('nav.ai_chat')}</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate">{t('nav.ai_chat_desc')}</span>
                  </div>
                </button>

                {/* 3. Vocab List */}
                <button
                  onClick={() => { setCenterViewMode('vocab'); setIsMobileDrawerOpen(false); }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border",
                    centerViewMode === 'vocab'
                      ? "bg-[var(--bg-elevated)] border-[var(--border-default)] shadow-sm"
                      : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    centerViewMode === 'vocab' ? "bg-[var(--scheme-accent-bg)] text-[var(--scheme-accent)]" : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  )}>
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className={clsx("font-bold text-sm", centerViewMode === 'vocab' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{t('nav.vocab_list')}</span>
                      {vocabList.length > 0 && <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-muted)] text-[10px]">{vocabList.length}</span>}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{t('nav.vocab_desc')}</span>
                  </div>
                </button>

                {/* 4. Grammar List */}
                <button
                  onClick={() => { setCenterViewMode('grammar'); setIsMobileDrawerOpen(false); }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border",
                    centerViewMode === 'grammar'
                      ? "bg-[var(--bg-elevated)] border-[var(--border-default)] shadow-sm"
                      : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    centerViewMode === 'grammar' ? "bg-[var(--scheme-grammar-bg)] text-[var(--scheme-grammar)]" : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  )}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className={clsx("font-bold text-sm", centerViewMode === 'grammar' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{t('nav.grammar_list')}</span>
                      {grammarList.length > 0 && <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-muted)] text-[10px]">{grammarList.length}</span>}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{t('nav.grammar_desc')}</span>
                  </div>
                </button>
              </div>

              {/* Settings at Bottom */}
              <div className="p-4 border-t border-[var(--border-default)]">
                <button
                  onClick={() => { setShowSettings(true); setIsMobileDrawerOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium text-sm">{t('nav.app_settings')}</span>
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* Modals */}
      < SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Global Logic Components */}
      <GlobalAudioPlayer />
      <LoadingProgress />
    </main >
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
