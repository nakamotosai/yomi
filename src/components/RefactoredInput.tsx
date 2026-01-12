import React, { useRef, useState, useEffect } from 'react';
import { Eraser, ImagePlus, Languages, Loader2, Search } from 'lucide-react';
import clsx from 'clsx';
import { createWorker, PSM } from 'tesseract.js';
import { translateText } from '@/lib/translate';
import { useAppStore } from '@/store/useAppStore';

interface RefactoredInputProps {
    inputText: string;
    setInputText: (text: string) => void;
    onClear: () => void;
    compact?: boolean;
}

export default function RefactoredInput({ inputText, setInputText, onClear }: RefactoredInputProps) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isInputFocused, setIsInputFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const { settings, setAnalyzedText, analyzedText } = useAppStore();
    const isDark = settings.theme === 'dark';

    // Detect if text is mostly non-Japanese (e.g. Chinese or English)
    const needsTranslation = React.useMemo(() => {
        if (!inputText.trim()) return false;
        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(inputText);
        const hasKanji = /[\u4E00-\u9FAF]/.test(inputText);
        const hasEnglish = /[a-zA-Z]/.test(inputText);
        return !hasKana && (hasKanji || hasEnglish);
    }, [inputText]);

    const handleTranslate = async () => {
        if (!inputText.trim() || isTranslating) return;
        try {
            setIsTranslating(true);
            const translated = await translateText(inputText, 'ja', 'auto');
            if (translated) {
                setInputText(translated);
            }
        } catch (error) {
            console.error("Translation failed", error);
            alert("翻訳に失敗しました");
        } finally {
            setIsTranslating(false);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [inputText]);

    // Handle paste for images (OCR)
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (!containerRef.current?.contains(document.activeElement)) return;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                const scale = 2;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const threshold = 160;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const value = avg > threshold ? 255 : 0;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = URL.createObjectURL(file);
        });
    };

    // Clean OCR output
    const cleanJapaneseOCRText = (text: string): string => {
        let cleaned = text.replace(/\s+/g, ' ');
        cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');
        cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');
        cleaned = cleaned.replace(/\s+([。、！？」』）])/g, '$1');
        cleaned = cleaned.replace(/([「『（])\s+/g, '$1');
        return cleaned.trim();
    };

    // OCR processing
    const processImage = async (file: File | Blob) => {
        try {
            const currentText = inputText;
            setInputText('OCR解析中...');
            const processedImageUrl = await preprocessImage(file);
            const worker = await createWorker('jpn', 1);
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
                setInputText(currentText);
                alert('テキストを検出できませんでした。');
            }
        } catch (err) {
            console.error('OCR Error:', err);
            setInputText(inputText);
            alert('OCRエラーが発生しました。');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processImage(file);
        }
    };

    return (
        <div
            ref={containerRef}
            className="group relative p-3 transition-all flex flex-col h-full bg-transparent border-none shadow-none"
        >
            <textarea
                ref={textareaRef}
                className="w-full flex-1 p-1 rounded-lg resize-none !outline-none text-sm bg-transparent custom-scrollbar !border-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!border-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!border-none appearance-none"
                style={{ color: 'var(--text-muted)' }}
                placeholder="Ctrl+V で画像貼り付け..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
            />

            {/* Bottom Tools */}
            <div
                className="flex items-center justify-between pt-2 mt-1"
                style={{ borderTop: `1px solid var(--border-muted)` }}
            >
                <div className="text-[10px] font-mono flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <span>{inputText.length}字</span>

                    {/* Translation Button */}
                    {needsTranslation && (
                        <button
                            onClick={handleTranslate}
                            disabled={isTranslating}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors disabled:opacity-50"
                            style={{
                                background: isDark ? 'rgba(100, 116, 139, 0.15)' : 'var(--bg-elevated)',
                                color: 'var(--text-muted)',
                                border: isDark ? 'none' : '1px solid var(--border-default)'
                            }}
                        >
                            {isTranslating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Languages className="w-3 h-3" />
                            )}
                            日本語に翻訳
                        </button>
                    )}
                </div>
                <div className="flex gap-3">
                    {/* Upload */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 rounded-xl transition-all bg-[var(--bg-muted)] border border-[var(--border-default)] shadow-sm active:scale-90"
                        style={{ color: 'var(--text-primary)' }}
                        title="画像OCR"
                    >
                        <ImagePlus className="w-6 h-6" />
                    </button>

                    {/* Clear */}
                    <button
                        onClick={onClear}
                        className="p-3 rounded-xl transition-all bg-[var(--bg-muted)] border border-[var(--border-default)] shadow-sm active:scale-90"
                        style={{ color: 'var(--text-primary)' }}
                        title="クリア"
                    >
                        <Eraser className="w-6 h-6" />
                    </button>

                    {/* Analyze Button */}
                    <button
                        onClick={() => setAnalyzedText(inputText)}
                        disabled={!inputText.trim() || inputText === analyzedText}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100",
                            inputText !== analyzedText && inputText.trim() ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-default)]"
                        )}
                        title="分析"
                    >
                        <Search className="w-5 h-5" />
                        <span className="font-bold text-sm">分析</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
