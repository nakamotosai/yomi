
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Eraser,
  Settings2,
  BookMarked,
  PlayCircle,
  StopCircle,
  Menu
} from 'lucide-react';
import FontManager from '@/components/FontManager';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { ttsManager } from '@/lib/tts/manager';
import SettingsModal from '@/components/SettingsModal';
import VocabExport from '@/components/VocabExport';
import clsx from 'clsx';

// Dynamic import for TextAnalyzer to avoid SSR issues with kuroshiro
const TextAnalyzer = dynamic(() => import('@/components/TextAnalyzer'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-sm">コンポーネントを読み込み中...</p>
    </div>
  ),
});

export default function Home() {
  const { inputText, setInputText, isAnalyzing, isSpeaking, setIsSpeaking } = useAppStore();
  const { vocabList } = useVocabStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showVocab, setShowVocab] = useState(false);
  const [analyzeKey, setAnalyzeKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAnalyze = () => {
    setAnalyzeKey(prev => prev + 1);
  };

  const handlePlayAll = () => {
    if (isSpeaking) {
      ttsManager.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      // Actual play is triggered by TextAnalyzer effect
    }
  };

  const handleClear = () => {
    setInputText('');
    setAnalyzeKey(prev => prev + 1);
  };

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen pb-20 md:pb-0">
      <FontManager />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-1.5 rounded-lg shadow-sm">
              <span className="font-bold text-white text-sm px-1">読</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              YOMI <span className="font-normal text-gray-400 text-sm">| Reader</span>
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowVocab(true)}
              className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="単語帳"
            >
              <BookMarked className="w-5 h-5" />
              {vocabList.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {vocabList.length > 99 ? '99+' : vocabList.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="設定"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* Input Area */}
        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-8 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            className="w-full h-32 p-4 rounded-lg resize-y outline-none text-base text-gray-700 placeholder-gray-300 bg-transparent"
            placeholder="日本語テキストをここに入力してください..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="text-xs text-gray-300 font-mono">
              {inputText.length} 文字
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
                title="クリア"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !inputText.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                分析
              </button>
            </div>
          </div>
        </div>

        {/* Reader View Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Reading View
          </h2>
          <button
            onClick={handlePlayAll}
            disabled={!inputText.trim()}
            className={clsx(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
              isSpeaking
                ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
              !inputText.trim() && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSpeaking ? (
              <>
                <StopCircle className="w-3.5 h-3.5" />
                停止
              </>
            ) : (
              <>
                <PlayCircle className="w-3.5 h-3.5" />
                再生
              </>
            )}
          </button>
        </div>

        {/* Text Analyzer */}
        {inputText.trim() && (
          <TextAnalyzer key={analyzeKey} text={inputText} />
        )}

        {!inputText.trim() && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            <p className="text-lg mb-2">日本語テキストを入力してください</p>
            <p className="text-sm text-gray-300">
              分析ボタンをクリックすると、単語ごとに分解されます
            </p>
          </div>
        )}

        <div className="h-20" /> {/* Spacer for bottom panel */}
      </main>

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <VocabExport isOpen={showVocab} onClose={() => setShowVocab(false)} />
    </main>
  );
}
