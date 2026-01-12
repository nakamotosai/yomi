'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import {
  Settings2,
  BookMarked,
  PlayCircle,
  PauseCircle,
  StopCircle,
  GraduationCap,
  BookOpen,
  X
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
import AIChatInput from '@/components/AIChatInput';
import LoadingProgress from '@/components/LoadingProgress';
import AIChatView from '@/components/AIChatView';
import SettingsModal from '@/components/SettingsModal';
import RefactoredInput from '@/components/RefactoredInput';
import InfoPanel from '@/components/InfoPanel';
import HistoryPanel from '@/components/HistoryPanel';
import VocabListView from '@/components/VocabListView';
import GrammarListView from '@/components/GrammarListView';
import ResizableLayout from '@/components/ResizableLayout';
import ResizableVerticalSection from '@/components/ResizableVerticalSection';
import ResizableThreeSection from '@/components/ResizableThreeSection';
import { MobileHeader, MobileDrawer, MobileBottomSheet } from '@/components/MobileComponents';
import MobileNavigator from '@/components/MobileNavigator';
import ReaderHeader from '@/components/ReaderHeader'; // Import ReaderHeader
import { Collapsible } from '@/components/Collapsible';
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


const KanaModeView = dynamic(() => import('@/components/KanaModeView'), {
  loading: () => <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>Loading Kana Mode...</div>,
});

const KanaSidePanel = dynamic(() => import('@/components/kana/KanaSidePanel'), { ssr: false });

const CenterColumn = ({ onPlayAll, onStop }: { onPlayAll: () => void, onStop: () => void }) => {
  const { appMode, inputText, analyzedText, isSpeaking, isPaused, settings, centerViewMode, isFromExtension, setIsFromExtension, setAnalyzedText } = useAppStore();
  const [isMounted, setIsMounted] = useState(false);
  const isDark = isMounted && settings.theme === 'dark';

  // Translation State
  const [showTranslation, setShowTranslation] = useState(true);
  const [fullTranslation, setFullTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Auto-expand translation when imported from browser extension
  useEffect(() => {
    if (isFromExtension && inputText.trim()) {
      // Immediately reset to prevent re-triggering on inputText changes
      setIsFromExtension(false);

      if (!showTranslation) setShowTranslation(true);

      // Trigger analysis and translation
      setAnalyzedText(inputText);
      setIsTranslating(true);
      translateText(inputText).then(text => {
        setFullTranslation(text);
      }).catch(e => {
        console.error("Translation failed", e);
      }).finally(() => {
        setIsTranslating(false);
      });
    }
    // Only trigger when isFromExtension becomes true or inputText changes while it is true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFromExtension, inputText]);

  // Handle toggling translation
  const handleToggleTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
    } else {
      setShowTranslation(true);
      if (!fullTranslation && analyzedText.trim()) {
        setIsTranslating(true);
        try {
          const text = await translateText(analyzedText);
          setFullTranslation(text);
        } catch (e) {
          console.error("Translation failed", e);
        } finally {
          setIsTranslating(false);
        }
      }
    }
  };

  // Effect to auto-update translation when analyzed text changes
  useEffect(() => {
    // If panel is closed, clear stale translation so next open fetches fresh
    if (!showTranslation) {
      if (fullTranslation) setFullTranslation(null);
      return;
    }

    if (!analyzedText.trim()) {
      setFullTranslation(null);
      return;
    }

    setIsTranslating(true);
    // Directly translate analyzed text when it changes
    translateText(analyzedText).then(text => {
      setFullTranslation(text);
    }).catch(e => {
      console.error("Auto-translation failed", e);
    }).finally(() => {
      setIsTranslating(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzedText, showTranslation]);

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
      className="h-full flex flex-col w-full max-w-3xl mx-auto"
      style={{
        background: 'transparent',
      }}
    >
      {analyzedText.trim() && appMode === 'reader' && centerViewMode === 'reader' && (
        <div className="shrink-0 z-10 pl-2 pr-5 pt-2 pb-1">
          <div
            className="flex flex-col relative transition-all duration-300 ease-spring"
          >
            {/* Header Section (Refactored to ReaderHeader) */}
            <ReaderHeader
              isTranslationVisible={showTranslation}
              onToggleTranslation={handleToggleTranslation}
              isLoadingTranslation={isTranslating}

              isSpeaking={isSpeaking}
              isPaused={isPaused}
              onPlay={onPlayAll}
              onStop={onStop}
            />

            {/* Content Section (Animated Grid) */}
            <Collapsible isOpen={showTranslation} variant="default">
              <div className="overflow-hidden px-0 pb-1 mt-1">
                <div
                  className="px-2 py-0"
                  style={{
                    background: 'transparent'
                  }}
                >
                  <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
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
            className="flex-1 overflow-y-auto pt-2 pb-4 pl-2 pr-1 floating-scrollbar"
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
                <KanaModeView />
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
  const centerViewMode = useAppStore(s => s.centerViewMode);
  const settings = useAppStore(s => s.settings);

  const { vocabList } = useVocabStore();
  const { grammarList } = useGrammarStore();
  // Subscribe to isChatOpen to trigger re-renders when chat opens/closes
  const { isChatOpen } = useGeminiStore();
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && settings.theme === 'dark';
  const isMonochrome = settings.colorScheme === 'monochrome';

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
  }, [searchParams, setInputText, setIsFromExtension]);

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

  const handleClear = () => {
    setInputText('');
    setAnalyzedText('');
    handleStop();
  };

  const isCompact = layout.leftSidebarWidth < 300;

  const LeftColumnContent = (
    <div className="h-full flex flex-col">
      {/* Logo Area (Desktop only) */}
      <div
        className="h-16 hidden lg:flex items-center px-4 shrink-0 bg-transparent border-none"
      >
        <div className="relative w-8 h-8 mr-3">
          <Image src="/logo.png" alt="Logo" fill className="object-contain" unoptimized />
        </div>
        {!isCompact && (
          <h1 className="text-[16px] font-bold tracking-tight" style={{ color: settings.colorScheme === 'wafu' ? '#3c3633' : 'var(--text-secondary)' }}>
            読み | YOMI
          </h1>
        )}
        <button
          onClick={() => { setShowSettings(true); setIsMobileDrawerOpen(false); }}
          className="ml-auto p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="設定"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation & Tools */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Main Functions */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-faint)' }}>機能</h3>
          <button
            onClick={() => { setAppMode('reader'); setCenterViewMode('reader'); setIsMobileDrawerOpen(false); }}
            className={clsx(
              "w-full text-left px-3 py-2 rounded-lg text-[16px] font-medium transition-all flex items-center gap-2",
              appMode === 'reader' && centerViewMode === 'reader' && isDark && "rainbow-highlight",
              appMode === 'reader' && centerViewMode === 'reader' && !isDark && "shadow-sm"
            )}
            style={{
              background: appMode === 'reader' && centerViewMode === 'reader'
                ? (isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-elevated)')
                : 'transparent',
              border: appMode === 'reader' && centerViewMode === 'reader' && !isDark
                ? '1px solid var(--border-default)'
                : '1px solid transparent',
              color: appMode === 'reader' && centerViewMode === 'reader' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: appMode === 'reader' ? (isDark ? '#34d399' : 'var(--text-primary)') : 'var(--text-faint)' }}
            />
            文 Reader
          </button>
          <button
            onClick={() => { setAppMode('kana'); setCenterViewMode('reader'); setIsMobileDrawerOpen(false); }}
            className={clsx(
              "w-full text-left px-3 py-2 rounded-lg text-[16px] font-medium transition-all flex items-center gap-2",
              appMode === 'kana' && isDark && "rainbow-highlight",
              appMode === 'kana' && !isDark && "shadow-sm"
            )}
            style={{
              background: appMode === 'kana'
                ? (isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-elevated)')
                : 'transparent',
              border: appMode === 'kana' && !isDark
                ? '1px solid var(--border-default)'
                : '1px solid transparent',
              color: appMode === 'kana' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: appMode === 'kana' ? (isDark ? '#34d399' : 'var(--text-primary)') : 'var(--text-faint)' }}
            />
            あ Kana
          </button>
        </div>

        {/* Collection/Library */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-faint)' }}>学習</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setCenterViewMode('vocab'); setIsMobileDrawerOpen(false); }}
              className={clsx(
                "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative glass-card",
                centerViewMode === 'vocab' && (isDark ? "rainbow-highlight" : "ring-2 ring-emerald-500/20 bg-emerald-50/30")
              )}
              style={{
                background: isDark ? 'var(--bg-muted)' : 'white',
                border: `1px solid var(--border-default)`
              }}
            >
              <BookMarked className="w-5 h-5 mb-1 transition-colors" style={{ color: 'var(--scheme-primary)' }} />
              <span className="font-medium text-slate-500 text-[16px]">単語帳{vocabList.length > 0 ? `(${vocabList.length})` : ''}</span>
            </button>
            <button
              onClick={() => { setCenterViewMode('grammar'); setIsMobileDrawerOpen(false); }}
              className={clsx(
                "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative glass-card",
                centerViewMode === 'grammar' && (isDark ? "rainbow-highlight" : "ring-2 ring-blue-500/20 bg-blue-50/30")
              )}
              style={{
                background: isDark ? 'var(--bg-muted)' : 'white',
                border: `1px solid var(--border-default)`
              }}
            >
              <GraduationCap className="w-5 h-5 mb-1" style={{ color: 'var(--scheme-grammar)' }} />
              <span className="font-medium text-slate-500 text-[16px]">文法帳{grammarList.length > 0 ? `(${grammarList.length})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Input Area (Inside Drawer) */}
      <div
        className="lg:hidden p-3"
        style={{
          borderTop: `1px solid var(--border-default)`,
          background: isDark ? 'var(--bg-muted)' : 'rgba(249, 250, 251, 0.5)'
        }}
      >
        {appMode === 'reader' && (
          <RefactoredInput
            inputText={inputText}
            setInputText={setInputText}
            onClear={handleClear}
            compact
          />
        )}
      </div>
    </div>
  );

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
          <h2 className="font-bold hidden md:block" style={{ color: 'var(--text-muted)' }}>読解モード</h2>
          <div className="md:hidden" /> {/* Spacer for mobile */}

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
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
            <KanaModeView />
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

      {/* Desktop Layout (> 1024px) */}
      <div className="hidden lg:block h-full w-full">
        <ResizableLayout
          leftContent={
            <div className="h-full pt-4 pl-4 pb-4 pr-2"> {/* Padding for floating effect */}
              {/* Refactored to 2 separate resize sections (Nav vs InputGroup) to keep AIChatInput fixed */}
              <ResizableVerticalSection
                mode="top-fixed"
                initialTopHeight={layout.leftTopHeight}
                onTopHeightChange={(h) => setLayout({ ...layout, leftTopHeight: h })}
                minTopHeight={250}
                gap={16}

                topContent={
                  /* Card 1: Logo + Navigation + Learning */
                  <div className="h-full flex flex-col rounded-2xl bg-transparent backdrop-blur-xl border border-[var(--border-muted)] shadow-sm overflow-hidden">
                    {/* Logo Area */}
                    <div
                      className="h-14 hidden lg:flex items-center px-4 shrink-0 bg-transparent border-none"
                    >
                      <div className="relative w-8 h-8 mr-3">
                        <Image src="/logo.png" alt="Logo" fill className="object-contain dark:brightness-[0.7]" unoptimized />
                      </div>
                      <h1 className="text-[16px] font-bold tracking-tight" style={{ color: settings.colorScheme === 'wafu' ? '#3c3633' : 'var(--text-secondary)' }}>
                        読み | YOMI
                      </h1>
                      <button
                        onClick={() => { setShowSettings(true); setIsMobileDrawerOpen(false); }}
                        className="ml-auto p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: 'var(--text-muted)' }}
                        title="設定"
                      >
                        <Settings2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Navigation - 機能 & Learning */}
                    <div className="flex-1 p-4 bg-transparent overflow-y-auto space-y-3">

                      {/* Functions */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setAppMode('reader');
                              setCenterViewMode('reader');
                              setIsMobileDrawerOpen(false);
                              useGeminiStore.getState().setChatOpen(false);
                            }}
                            className={clsx(
                              "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative border border-transparent dark:border-white/10",
                              !isChatOpen && appMode === 'reader' && centerViewMode === 'reader'
                                ? "bg-transparent border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                                : "hover:scale-[1.02] shadow-sm hover:shadow-md bg-transparent"
                            )}
                          >
                            <BookOpen
                              className="w-5 h-5 mb-1 transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                            />
                            <span className="font-medium text-[16px] truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
                              {isCompact ? "読解" : "読解モード"}
                            </span>
                          </button>
                          <button
                            disabled
                            onClick={() => {
                              setAppMode('kana');
                              setCenterViewMode('reader');
                              setIsMobileDrawerOpen(false);
                              useGeminiStore.getState().setChatOpen(false);
                            }}
                            className={clsx(
                              "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative border border-transparent dark:border-white/10",
                              "opacity-40 cursor-not-allowed grayscale filter blur-[1px] hover:blur-0 transition-all",
                              !isChatOpen && centerViewMode === 'reader' && appMode === 'kana'
                                ? "bg-transparent border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                                : "bg-transparent"
                            )}
                          >
                            <span
                              className="w-5 h-5 mb-1 transition-colors flex items-center justify-center font-serif font-bold text-xl leading-none"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              あ
                            </span>
                            <span className="font-medium text-[16px] truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
                              {isCompact ? "仮名" : "仮名练习(锁)"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Collection/Library */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setCenterViewMode('vocab');
                              setIsMobileDrawerOpen(false);
                              useGeminiStore.getState().setChatOpen(false);
                            }}
                            className={clsx(
                              "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative border border-transparent dark:border-white/10",
                              !isChatOpen && centerViewMode === 'vocab'
                                ? "bg-transparent border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                                : "hover:scale-[1.02] shadow-sm hover:shadow-md bg-transparent"
                            )}
                          >
                            <BookMarked className="w-5 h-5 mb-1 transition-colors" style={{ color: 'var(--text-muted)' }} />
                            <span className="font-medium text-[16px] truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
                              {isCompact ? "単語" : `単語帳${vocabList.length > 0 ? `(${vocabList.length})` : ''}`}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setCenterViewMode('grammar');
                              setIsMobileDrawerOpen(false);
                              useGeminiStore.getState().setChatOpen(false);
                            }}
                            className={clsx(
                              "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative border border-transparent dark:border-white/10",
                              !isChatOpen && centerViewMode === 'grammar'
                                ? "bg-transparent border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                                : "hover:scale-[1.02] shadow-sm hover:shadow-md bg-transparent"
                            )}
                          >
                            <GraduationCap className="w-5 h-5 mb-1 transition-colors" style={{ color: 'var(--text-muted)' }} />
                            <span className="font-medium text-[16px] truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
                              {isCompact ? "文法" : `文法帳${grammarList.length > 0 ? `(${grammarList.length})` : ''}`}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }

                bottomContent={
                  <div className="h-full flex flex-col gap-4">
                    {/* Fixed Height Middle Section: AI Chat Input */}
                    <div className="shrink-0 h-auto">
                      <AIChatInput />
                    </div>

                    <div className="flex-1 min-h-0 rounded-2xl bg-transparent backdrop-blur-xl border border-[var(--border-muted)] shadow-sm overflow-hidden flex flex-col">
                      <RefactoredInput
                        inputText={inputText}
                        setInputText={(text) => {
                          setInputText(text);
                          if (text.trim().length > 0) {
                            useGeminiStore.getState().setChatOpen(false);
                            if (centerViewMode !== 'reader') setCenterViewMode('reader');
                          }
                        }}
                        onClear={handleClear}
                        compact={false}
                      />
                    </div>
                  </div>
                }
              />
            </div>
          }
          centerContent={
            <div className="h-full py-4 px-2"> {/* Minimal padding for center content */}
              <div className="h-full w-full bg-transparent backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-[-1] opacity-50 pointer-events-none"
                  style={{
                    backgroundImage: isDark
                      ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 1px, transparent 1px)'
                      : 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.03) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                  }}
                />

                {useGeminiStore.getState().isChatOpen ? (
                  <AIChatView />
                ) : (
                  <CenterColumn onPlayAll={handlePlayAll} onStop={handleStop} />
                )}
              </div>
            </div>
          }
          rightContent={
            <div className="h-full pt-4 pr-4 pb-4 pl-2">
              <ResizableVerticalSection
                mode="bottom-fixed"
                initialBottomHeight={120} // Just enough for 1-2 lines
                onBottomHeightChange={(h) => { /* Optional persists */ }}
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

      {/* Mobile Layout (< 1024px) */}
      <div className="lg:hidden h-full relative overflow-hidden">
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
                      : "bg-transparent border-transparent text-[var(--text-secondary)]"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    appMode === 'reader' && centerViewMode === 'reader' ? "bg-[var(--scheme-primary-bg)] text-[var(--scheme-primary)]" : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  )}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className={clsx("font-bold text-sm", appMode === 'reader' && centerViewMode === 'reader' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>读解模式</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate">分析日文文章与句子</span>
                  </div>
                </button>

                {/* 2. Kana Practice */}
                <button
                  disabled
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border bg-transparent border-transparent opacity-40 grayscale"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-muted)] text-[var(--text-muted)] flex items-center justify-center shrink-0">
                    <span className="text-lg font-serif font-bold">あ</span>
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="font-bold text-sm text-[var(--text-secondary)]">假名练习</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate">基础五十音学习(即将开放)</span>
                  </div>
                </button>

                {/* 3. Vocab List */}
                <button
                  onClick={() => { setCenterViewMode('vocab'); setIsMobileDrawerOpen(false); }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border",
                    centerViewMode === 'vocab'
                      ? "bg-[var(--bg-elevated)] border-[var(--border-default)] shadow-sm"
                      : "bg-transparent border-transparent text-[var(--text-secondary)]"
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
                      <span className={clsx("font-bold text-sm", centerViewMode === 'vocab' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>单词本</span>
                      {vocabList.length > 0 && <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-muted)] text-[10px]">{vocabList.length}</span>}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">查看已保存的生词</span>
                  </div>
                </button>

                {/* 4. Grammar List */}
                <button
                  onClick={() => { setCenterViewMode('grammar'); setIsMobileDrawerOpen(false); }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all border",
                    centerViewMode === 'grammar'
                      ? "bg-[var(--bg-elevated)] border-[var(--border-default)] shadow-sm"
                      : "bg-transparent border-transparent text-[var(--text-secondary)]"
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
                      <span className={clsx("font-bold text-sm", centerViewMode === 'grammar' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>语法本</span>
                      {grammarList.length > 0 && <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-muted)] text-[10px]">{grammarList.length}</span>}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">掌握深度语法知识</span>
                  </div>
                </button>
              </div>

              {/* Settings at Bottom */}
              <div className="p-4 border-t border-[var(--border-default)]">
                <button
                  onClick={() => { setShowSettings(true); setIsMobileDrawerOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors"
                >
                  <Settings2 className="w-5 h-5" />
                  <span className="font-medium text-sm">应用设置</span>
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
