'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Settings2,
  BookMarked,
  PlayCircle,
  PauseCircle,
  StopCircle,
  GraduationCap,
  BookOpen,
  Languages
} from 'lucide-react';

import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { useGrammarStore } from '@/store/useGrammarStore';
import { ttsManager } from '@/lib/tts/manager';
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
import clsx from 'clsx';

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

const KanaGrid = dynamic(() => import('@/components/KanaGrid'), {
  loading: () => <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>Loading Grid...</div>,
});

const CenterColumn = ({ onPlayAll, onStop }: { onPlayAll: () => void, onStop: () => void }) => {
  const { appMode, inputText, isSpeaking, isPaused, settings, centerViewMode } = useAppStore();
  const isDark = settings.theme === 'dark';

  // Scrollbar Visibility Logic
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isProximity, setIsProximity] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
      className="h-full flex flex-col w-full"
      style={{
        background: 'transparent',
      }}
    >
      {inputText.trim() && appMode === 'reader' && centerViewMode === 'reader' && (
        <div className="shrink-0 z-10 px-2 pt-4 pb-2"> {/* Wrapper for spacing */}
          <div
            className="h-14 flex items-center px-4 justify-between rounded-2xl glass-panel transition-all"
            style={{
              border: `1px solid var(--border-default)`,
              background: isDark ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.65)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h2 className="font-bold hidden md:block" style={{ color: 'var(--text-muted)' }}>読解モード</h2>
            <div className="md:hidden" />

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={onPlayAll}
                className={clsx(
                  "flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95",
                  isDark && "rainbow-highlight"
                )}
                style={{
                  background: isSpeaking && !isPaused
                    ? (isDark ? 'rgba(251, 191, 36, 0.15)' : 'var(--bg-elevated)')
                    : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'white'),
                  color: isSpeaking && !isPaused
                    ? (isDark ? '#fbbf24' : 'var(--text-muted)')
                    : (isDark ? 'var(--text-muted)' : 'var(--text-muted)'),
                  border: isDark
                    ? 'none'
                    : `1px solid ${isSpeaking && !isPaused ? 'var(--border-default)' : 'var(--border-muted)'}`,
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
                  onClick={onStop}
                  className="p-1.5 rounded-full transition-colors hover:bg-[#AA5555]/15"
                  style={{
                    background: isDark ? 'rgba(170, 85, 85, 0.1)' : 'rgba(170, 85, 85, 0.08)',
                    color: '#AA5555'
                  }}
                  title="停止"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vocab List View - Full takeover */}
      {centerViewMode === 'vocab' && (
        <VocabListView />
      )}

      {/* Grammar List View - Full takeover */}
      {centerViewMode === 'grammar' && (
        <GrammarListView />
      )}

      {/* Content Scroll Area - Only for reader mode */}
      {centerViewMode === 'reader' && (
        <div
          ref={scrollRef}
          data-visible={isMounted ? (isVisible ? "true" : "false") : undefined}
          className="flex-1 overflow-y-auto pt-2 pb-4 pl-2 pr-2 floating-scrollbar"
        >
          <div className="max-w-5xl mx-auto min-h-full">
            {appMode === 'reader' ? (
              inputText.trim() ? (
                <TextAnalyzer key={inputText} text={inputText} />
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
                    左下の入力欄に日本語を入力するか、画像を貼り付けてOCR解析を開始します
                  </p>
                </div>
              )
            ) : (
              <KanaGrid />
            )}
            <div className="h-20" /> {/* Bottom spacer */}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {    // Optimized selectors to prevent re-renders
  const appMode = useAppStore(s => s.appMode);
  const setAppMode = useAppStore(s => s.setAppMode);
  const inputText = useAppStore(s => s.inputText);
  const setInputText = useAppStore(s => s.setInputText);
  const isSpeaking = useAppStore(s => s.isSpeaking);
  const setIsSpeaking = useAppStore(s => s.setIsSpeaking);
  const isPaused = useAppStore(s => s.isPaused);
  const setIsPaused = useAppStore(s => s.setIsPaused);
  const setSpeakingTokenId = useAppStore(s => s.setSpeakingTokenId);
  const layout = useAppStore(s => s.layout);
  const setLayout = useAppStore(s => s.setLayout);
  const isMobileDrawerOpen = useAppStore(s => s.isMobileDrawerOpen);
  const setIsMobileDrawerOpen = useAppStore(s => s.setIsMobileDrawerOpen);
  const setCenterViewMode = useAppStore(s => s.setCenterViewMode);
  const centerViewMode = useAppStore(s => s.centerViewMode);
  const settings = useAppStore(s => s.settings);

  const { vocabList } = useVocabStore();
  const { grammarList } = useGrammarStore();
  const [showSettings, setShowSettings] = useState(false);

  const isDark = settings.theme === 'dark';

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Stop TTS on page load/refresh
  useEffect(() => {
    ttsManager.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingTokenId(null);
  }, [setIsSpeaking, setIsPaused, setSpeakingTokenId]);

  const handlePlayAll = () => {
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
    handleStop();
  };

  const LeftColumnContent = (
    <div className="h-full flex flex-col">
      {/* Logo Area (Desktop only) */}
      <div
        className="h-16 hidden lg:flex items-center px-4 shrink-0 bg-transparent border-none"
      >
        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain mr-3" />
        <h1 className="text-[16px] font-bold tracking-tight text-slate-500">
          読み | YOMI
        </h1>
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
              "w-full text-left px-3 py-2 rounded-lg text-[16px] font-medium transition-all flex items-center gap-2 text-slate-500",
              appMode === 'reader' && centerViewMode === 'reader' && isDark && "rainbow-highlight",
              appMode === 'reader' && centerViewMode === 'reader' && !isDark && "shadow-sm"
            )}
            style={{
              background: appMode === 'reader' && centerViewMode === 'reader'
                ? (isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-elevated)')
                : 'transparent',
              border: appMode === 'reader' && centerViewMode === 'reader' && !isDark
                ? '1px solid var(--border-default)'
                : '1px solid transparent'
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
              "w-full text-left px-3 py-2 rounded-lg text-[16px] font-medium transition-all flex items-center gap-2 text-slate-500",
              appMode === 'kana' && isDark && "rainbow-highlight",
              appMode === 'kana' && !isDark && "shadow-sm"
            )}
            style={{
              background: appMode === 'kana'
                ? (isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-elevated)')
                : 'transparent',
              border: appMode === 'kana' && !isDark
                ? '1px solid var(--border-default)'
                : '1px solid transparent'
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
              <BookMarked className="w-5 h-5 mb-1 transition-colors" style={{ color: '#437E6F' }} />
              <span className="font-medium text-slate-500 text-[16px]">単語帳</span>
              {vocabList.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              )}
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
              <GraduationCap className="w-5 h-5 mb-1" style={{ color: '#2B4C7E' }} />
              <span className="font-medium text-slate-500 text-[16px]">文法帳</span>
              {grammarList.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
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
      {inputText.trim() && appMode === 'reader' && (
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
            inputText.trim() ? (
              <TextAnalyzer key={inputText} text={inputText} />
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
                  左下の入力欄に日本語を入力するか、画像を貼り付けてOCR解析を開始します
                </p>
              </div>
            )
          ) : (
            <KanaGrid />
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

      {/* Mobile Header */}
      <MobileHeader />

      {/* Desktop Layout (> 1024px) */}
      <div className="hidden lg:block h-full w-full">
        <ResizableLayout
          leftContent={
            <div className="h-full pt-4 pl-4 pb-4 pr-2"> {/* Padding for floating effect */}
              <ResizableThreeSection
                initialTopHeight={layout.leftTopHeight ?? 200}
                initialBottomHeight={layout.leftInputHeight}
                onTopHeightChange={(h) => setLayout({ ...layout, leftTopHeight: h })}
                onBottomHeightChange={(h) => setLayout({ ...layout, leftInputHeight: h })}
                gap={16}
                topContent={
                  /* Card 1: Logo + 機能 */
                  <div className="h-full flex flex-col rounded-2xl glass-panel border border-[var(--border-muted)] shadow-sm">
                    {/* Logo Area */}
                    <div
                      className="h-14 hidden lg:flex items-center px-4 shrink-0 bg-transparent border-none"
                    >
                      <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain mr-3 dark:brightness-[0.7]" />
                      <h1 className="text-[16px] font-bold tracking-tight text-slate-500">
                        読み | YOMI
                      </h1>
                      <button
                        onClick={() => { setShowSettings(true); setIsMobileDrawerOpen(false); }}
                        className="ml-auto p-2 rounded-lg transition-colors hover:bg-[var(--bg-subtle)]"
                        style={{ color: 'var(--text-muted)' }}
                        title="設定"
                      >
                        <Settings2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Navigation - 機能 */}
                    <div className="flex-1 p-4 bg-[var(--bg-elevated)] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setAppMode('reader'); setCenterViewMode('reader'); setIsMobileDrawerOpen(false); }}
                          className={clsx(
                            "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative glass-card",
                            appMode === 'reader' && centerViewMode === 'reader'
                              ? (isDark ? "bg-white/10 shadow-md rainbow-highlight" : "bg-white shadow-md")
                              : "hover:translate-y-[-1px] hover:shadow-sm"
                          )}
                          style={{
                            border: appMode === 'reader' && centerViewMode === 'reader' && isDark
                              ? '1px solid transparent'
                              : '1px solid var(--border-default)'
                          }}
                        >
                          <BookOpen
                            className="w-5 h-5 mb-1 transition-colors"
                            style={{ color: '#AA5555' }}
                          />
                          <span className="font-medium text-[16px] text-slate-500">
                            読解モード
                          </span>
                        </button>
                        <button
                          onClick={() => { setAppMode('kana'); setCenterViewMode('reader'); setIsMobileDrawerOpen(false); }}
                          className={clsx(
                            "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative glass-card",
                            appMode === 'kana'
                              ? (isDark ? "bg-white/10 shadow-md rainbow-highlight" : "bg-white shadow-md")
                              : "hover:translate-y-[-1px] hover:shadow-sm"
                          )}
                          style={{
                            border: appMode === 'kana' && isDark
                              ? '1px solid transparent'
                              : '1px solid var(--border-default)'
                          }}
                        >
                          <Languages
                            className="w-5 h-5 mb-1 transition-colors"
                            style={{ color: '#A89BCA' }}
                          />
                          <span className="font-medium text-[16px] text-slate-500">
                            仮名モード
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                middleContent={
                  /* Card 2: 学習 */
                  <div className="h-full flex flex-col rounded-2xl glass-panel border border-[var(--border-muted)] shadow-sm">
                    <div className="flex-1 p-4 bg-[var(--bg-elevated)] overflow-y-auto">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => { setAppMode('reader'); setCenterViewMode('vocab'); }}
                            className={clsx(
                              "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative glass-card",
                              centerViewMode === 'vocab'
                                ? (isDark ? "bg-white/10 shadow-md rainbow-highlight" : "bg-white shadow-md")
                                : "hover:translate-y-[-1px] hover:shadow-sm"
                            )}
                            style={{
                              border: centerViewMode === 'vocab' && isDark
                                ? '1px solid transparent'
                                : '1px solid var(--border-default)'
                            }}
                          >
                            <BookMarked
                              className="w-5 h-5 mb-1 transition-colors"
                              style={{
                                color: '#437E6F'
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-[16px] text-slate-500">
                                単語帳
                              </span>
                              {vocabList.length > 0 && (
                                <span className="text-sm transition-colors text-slate-400">
                                  ({vocabList.length})
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => { setAppMode('reader'); setCenterViewMode('grammar'); }}
                            className={clsx(
                              "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative glass-card",
                              centerViewMode === 'grammar'
                                ? (isDark ? "bg-white/10 shadow-md rainbow-highlight" : "bg-white shadow-md")
                                : "hover:translate-y-[-1px] hover:shadow-sm"
                            )}
                            style={{
                              border: centerViewMode === 'grammar' && isDark
                                ? '1px solid transparent'
                                : '1px solid var(--border-default)'
                            }}
                          >
                            <GraduationCap
                              className="w-5 h-5 mb-1 transition-colors"
                              style={{
                                color: '#5F7387' // Morandi Blue
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-[16px] text-slate-500">
                                文法帳
                              </span>
                              {grammarList.length > 0 && (
                                <span className="text-sm transition-colors text-slate-400">
                                  ({grammarList.length})
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                bottomContent={
                  /* Card 3: Input Area */
                  appMode === 'reader' ? (
                    <div
                      className={clsx(
                        "h-full flex flex-col rounded-2xl shadow-sm",
                        isDark ? "rainbow-border-only" : "glass-panel"
                      )}
                      style={{
                        background: isDark ? undefined : 'var(--bg-elevated)',
                        border: isDark ? undefined : '1px solid var(--border-muted)'
                      }}
                    >
                      <div className="flex-1 min-h-0">
                        <RefactoredInput
                          inputText={inputText}
                          setInputText={setInputText}
                          onClear={handleClear}
                        />
                      </div>
                    </div>
                  ) : <div />
                }
              />
            </div>
          }
          centerContent={<CenterColumn onPlayAll={handlePlayAll} onStop={handleStop} />}
          rightContent={
            <div className="h-full pt-4 pr-4 pb-4 pl-2"> {/* Padding for floating effect */}
              <ResizableVerticalSection
                mode="bottom-fixed"
                initialBottomHeight={layout.rightBottomHeight}
                onBottomHeightChange={(h) => setLayout({ ...layout, rightBottomHeight: h })}
                gap={16} // GAP ADDED
                topContent={
                  <div className="h-full flex flex-col relative rounded-2xl glass-panel border border-[var(--border-muted)] shadow-sm">
                    <InfoPanel />
                  </div>
                }
                bottomContent={
                  <div
                    className="h-full flex flex-col rounded-2xl glass-panel border border-[var(--border-muted)] shadow-sm"
                    style={{
                      background: 'var(--bg-elevated)'
                    }}
                  >
                    <HistoryPanel />
                  </div>
                }
              />
            </div>
          }
        />
      </div>

      {/* Mobile Layout (< 1024px) */}
      <div className="lg:hidden flex-1 overflow-hidden relative">
        {CenterContent}

        <MobileDrawer>
          {LeftColumnContent}
        </MobileDrawer>

        <MobileBottomSheet>
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <InfoPanel />
            </div>
          </div>
        </MobileBottomSheet>
      </div>

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Global Logic Components */}
      <GlobalAudioPlayer />
    </main>
  );
}
