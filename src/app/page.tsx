
'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Eraser,
  Settings2,
  BookMarked,
  PlayCircle,
  PauseCircle,
  StopCircle,
  ImagePlus
} from 'lucide-react';

import { VoiceInput } from '@/components/InputMethods';
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

const KanaGrid = dynamic(() => import('@/components/KanaGrid'), {
  loading: () => <div className="h-96 flex items-center justify-center text-gray-400">Loading Grid...</div>,
});

export default function Home() {
  const {
    appMode, setAppMode,
    inputText, setInputText,
    isSpeaking, setIsSpeaking,
    isPaused, setIsPaused,
    setSpeakingTokenId
  } = useAppStore();
  const { vocabList } = useVocabStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showVocab, setShowVocab] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stop TTS on page load/refresh
  useEffect(() => {
    ttsManager.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingTokenId(null);
  }, [setIsSpeaking, setIsPaused, setSpeakingTokenId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isInputFocused) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 400) + 'px';
    }
  }, [inputText, isInputFocused]);

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsInputFocused(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = '80px';
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle paste for images (OCR)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            await processImage(blob);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Image preprocessing for better OCR
  const preprocessImage = (file: File | Blob): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(URL.createObjectURL(file));
          return;
        }

        // 1. Scale up (2x usually improves OCR for small text)
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // 2. High quality scaling settings
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 3. Image processing (Grayscale + Binarization)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Simple binarization threshold
        const threshold = 160;

        for (let i = 0; i < data.length; i += 4) {
          // Grayscale (Start rec 601 luma)
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          // Binarize
          const value = avg > threshold ? 255 : 0;

          data[i] = value;     // R
          data[i + 1] = value; // G
          data[i + 2] = value; // B
          // Alpha remains unchanged
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Optimized OCR processing function
  const processImage = async (file: File | Blob) => {
    try {
      setInputText('OCR解析中...'); // Feedback

      // Preprocess image
      const processedImageUrl = await preprocessImage(file);

      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('jpn', 1);

      // Page Segmentation Mode 6: Assume a single uniform block of text
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
      });

      const { data: { text } } = await worker.recognize(processedImageUrl);
      await worker.terminate();

      if (text.trim()) {
        const cleanedText = cleanJapaneseOCRText(text);
        setInputText(cleanedText);
      } else {
        setInputText('テキストを検出できませんでした。');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setInputText('OCRエラーが発生しました。');
    }
  };

  // Clean OCR output for Japanese text
  const cleanJapaneseOCRText = (text: string): string => {
    let cleaned = text.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');
    cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');
    cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');
    cleaned = cleaned.replace(/\s+([。、！？」』）])/g, '$1');
    cleaned = cleaned.replace(/([「『（])\s+/g, '$1');
    return cleaned.trim();
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

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

  return (
    <main className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              読み | YOMI
            </h1>
            <div className="flex bg-gray-100 rounded-lg p-1 ml-6 shadow-inner">
              <button
                onClick={() => setAppMode('reader')}
                className={clsx(
                  "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200",
                  appMode === 'reader' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                文 Reader
              </button>
              <button
                onClick={() => setAppMode('kana')}
                className={clsx(
                  "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200",
                  appMode === 'kana' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                あ Kana
              </button>
            </div>
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



      {
        appMode === 'reader' ? (
          <main className="max-w-4xl mx-auto px-4 mt-6">
            {/* Unified Input Area */}
            <div
              ref={containerRef}
              className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-8 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
            >
              <textarea
                ref={textareaRef}
                className="w-full p-4 rounded-lg resize-none outline-none text-base text-gray-700 placeholder-gray-300 bg-transparent transition-all"
                style={{ height: isInputFocused ? 'auto' : '80px', minHeight: '80px' }}
                placeholder="日本語テキストを入力、または画像を貼り付け (Ctrl+V)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
              />

              {/* Bottom bar with buttons */}
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="text-xs text-gray-300 font-mono">
                  {inputText.length} 文字
                </div>
                <div className="flex gap-1 items-center">
                  {/* Upload Image Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
                    title="画像をアップロード"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  {/* Voice Input */}
                  <VoiceInput onResult={(text) => setInputText(inputText + text)} />
                  {/* Clear Button */}
                  <button
                    onClick={handleClear}
                    className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
                    title="クリア"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Reading View */}
            {inputText.trim() && (
              <div className="min-h-[40vh] relative">
                {/* Play all button - left edge tab style, above sentence 1 */}
                <div className="pt-2 pl-6 md:pl-8 mb-4">
                  <div className="relative flex items-center gap-2 h-6">
                    <button
                      onClick={handlePlayAll}
                      className={clsx(
                        "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                        isSpeaking && !isPaused
                          ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                          : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
                      )}
                    >
                      {isSpeaking && !isPaused ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          一時停止
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          {isPaused ? '再開' : '全文再生'}
                        </>
                      )}
                    </button>
                    {/* Stop button - inline pill style */}
                    {isSpeaking && (
                      <button
                        onClick={handleStop}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 transition-colors"
                      >
                        <StopCircle className="w-3 h-3" />
                        停止
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Analyzer - auto-triggered */}
                <TextAnalyzer key={inputText} text={inputText} />
              </div>
            )}

            {!inputText.trim() && (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-lg mb-2">日本語テキストを入力してください</p>
                <p className="text-sm text-gray-300">
                  テキストを入力すると自動的に分析されます
                </p>
              </div>
            )}

            <div className="h-20" /> {/* Spacer for bottom panel */}
          </main>
        ) : (
          <KanaGrid />
        )
      }

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <VocabExport isOpen={showVocab} onClose={() => setShowVocab(false)} />
    </main >
  );
}
