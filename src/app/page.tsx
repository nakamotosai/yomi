'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Settings2,
  BookMarked,
  PlayCircle,
  PauseCircle,
  StopCircle,
  GraduationCap
} from 'lucide-react';

import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { ttsManager } from '@/lib/tts/manager';
import SettingsModal from '@/components/SettingsModal';
import VocabExport from '@/components/VocabExport';
import RefactoredInput from '@/components/RefactoredInput';
import InfoPanel from '@/components/InfoPanel';
import HistoryPanel from '@/components/HistoryPanel';
import ResizableLayout from '@/components/ResizableLayout';
import ResizableVerticalSection from '@/components/ResizableVerticalSection';
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
  const settings = useAppStore(s => s.settings);

  const { vocabList } = useVocabStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showVocab, setShowVocab] = useState(false);

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
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingTokenId(null);
  };

  const handleClear = () => {
    setInputText('');
    handleStop();
  };

  const LeftColumnContent = (
    <div className="h-full flex flex-col">
      {/* Logo Area (Desktop only) */}
      <div
        className="h-16 hidden lg:flex items-center px-4 shrink-0"
        style={{
          borderBottom: `1px solid var(--border-default)`,
          background: isDark ? 'var(--glass-bg)' : 'rgba(255,255,255,0.8)'
        }}
      >
        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain mr-3" />
        <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
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
            onClick={() => { setAppMode('reader'); setIsMobileDrawerOpen(false); }}
            className={clsx(
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              appMode === 'reader' && isDark && "rainbow-highlight",
              appMode === 'reader' && !isDark && "shadow-sm"
            )}
            style={{
              background: appMode === 'reader'
                ? (isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-elevated)')
                : 'transparent',
              color: appMode === 'reader'
                ? (isDark ? 'var(--text-primary)' : 'var(--text-primary)')
                : 'var(--text-secondary)',
              border: appMode === 'reader' && !isDark
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
            onClick={() => { setAppMode('kana'); setIsMobileDrawerOpen(false); }}
            className={clsx(
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              appMode === 'kana' && isDark && "rainbow-highlight",
              appMode === 'kana' && !isDark && "shadow-sm"
            )}
            style={{
              background: appMode === 'kana'
                ? (isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-elevated)')
                : 'transparent',
              color: appMode === 'kana'
                ? (isDark ? 'var(--text-primary)' : 'var(--text-primary)')
                : 'var(--text-secondary)',
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
              onClick={() => { setShowVocab(true); setIsMobileDrawerOpen(false); }}
              className="flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative glass-card"
              style={{
                background: isDark ? 'var(--bg-muted)' : 'white',
                border: `1px solid var(--border-default)`
              }}
            >
              <BookMarked className="w-5 h-5 mb-1 transition-colors" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>単語帳</span>
              {vocabList.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>
            <button
              className="flex flex-col items-center justify-center p-3 rounded-xl cursor-not-allowed opacity-50"
              style={{
                background: isDark ? 'var(--bg-muted)' : 'white',
                border: `1px solid var(--border-default)`,
                color: 'var(--text-faint)'
              }}
              title="開発中"
            >
              <GraduationCap className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">文法(未)</span>
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

  const CenterContent = (
    <div
      className="h-full flex flex-col w-full"
      style={{
        background: isDark ? 'transparent' : 'rgba(255, 255, 255, 0.5)',
        backdropFilter: isDark ? 'none' : 'blur(20px)',
        WebkitBackdropFilter: isDark ? 'none' : 'blur(20px)'
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
          <h2 className="font-bold hidden md:block" style={{ color: 'var(--text-primary)' }}>読解モード</h2>
          <div className="md:hidden" /> {/* Spacer for mobile */}

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayAll}
              className={clsx(
                "flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95",
                isDark && "rainbow-highlight"
              )}
              style={{
                background: isSpeaking && !isPaused
                  ? (isDark ? 'rgba(251, 191, 36, 0.15)' : 'var(--bg-elevated)')
                  : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'white'),
                color: isSpeaking && !isPaused
                  ? (isDark ? '#fbbf24' : 'var(--text-primary)')
                  : (isDark ? 'var(--text-primary)' : 'var(--text-secondary)'),
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
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
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
            <div
              className="h-full z-20 glass-panel border-r border-[var(--border-muted)]"
              style={{
                background: isDark ? 'var(--glass-bg)' : 'rgba(255, 255, 255, 0.65)',
                boxShadow: isDark ? '4px 0 24px -12px rgba(0,0,0,0.5)' : '4px 0 24px -12px rgba(0,0,0,0.1)'
              }}
            >
              <ResizableVerticalSection
                mode="bottom-fixed"
                initialBottomHeight={layout.leftInputHeight}
                onBottomHeightChange={(h) => setLayout({ ...layout, leftInputHeight: h })}
                topContent={LeftColumnContent}
                bottomContent={
                  appMode === 'reader' && (
                    <div
                      className="h-full p-4 flex flex-col"
                      style={{
                        borderTop: `1px solid var(--border-default)`,
                        background: isDark ? 'var(--bg-muted)' : 'rgba(249, 250, 251, 0.5)'
                      }}
                    >
                      <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1 shrink-0" style={{ color: 'var(--text-faint)' }}>入力</h3>
                      <div className="flex-1 min-h-0">
                        <RefactoredInput
                          inputText={inputText}
                          setInputText={setInputText}
                          onClear={handleClear}
                        />
                      </div>
                    </div>
                  )
                }
              />
            </div>
          }
          centerContent={CenterContent}
          rightContent={
            <div
              className="h-full z-20 border-l border-[var(--border-muted)]"
              style={{
                background: isDark ? 'var(--glass-bg)' : 'white',
                boxShadow: isDark ? '-4px 0 24px -12px rgba(0,0,0,0.5)' : '-4px 0 24px -12px rgba(0,0,0,0.1)'
              }}
            >
              <ResizableVerticalSection
                mode="bottom-fixed"
                initialBottomHeight={layout.rightBottomHeight}
                onBottomHeightChange={(h) => setLayout({ ...layout, rightBottomHeight: h })}
                topContent={
                  <div className="h-full flex flex-col relative" style={{ background: 'transparent' }}>
                    <InfoPanel />
                  </div>
                }
                bottomContent={
                  <div
                    className="h-full flex flex-col"
                    style={{
                      background: isDark ? 'var(--bg-muted)' : 'rgb(249, 250, 251)',
                      borderTop: `1px solid var(--border-default)`
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
      <VocabExport isOpen={showVocab} onClose={() => setShowVocab(false)} />

      {/* Global Logic Components */}
      <GlobalAudioPlayer />
    </main>
  );
}
