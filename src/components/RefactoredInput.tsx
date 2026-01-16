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

export default function RefactoredInput({ inputText, setInputText, onClear, compact = false }: RefactoredInputProps) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isInputFocused, setIsInputFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const { settings, setAnalyzedText, analyzedText, setIsInputModalOpen, setIsInputOpen } = useAppStore();
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

    // Auto-resize removed to favor flex-1 in modal
    /*
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 500) + 'px';
        }
    }, [inputText]);
    */

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
            className="group relative p-0 transition-all flex flex-col h-full bg-transparent pb-0"
        >
            <textarea
                ref={textareaRef}
                className={clsx(
                    "w-full flex-1 rounded-xl resize-none !outline-none font-normal leading-relaxed bg-[var(--bg-muted)]/30 custom-scrollbar !border-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!border-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!border-none appearance-none",
                    compact ? "p-3 text-[15px]" : "p-4 text-[18px] md:text-2xl"
                )}
                style={{ color: 'var(--text-primary)' }}
                placeholder="在此输入新的日文内容或粘贴图片直接分析..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
            />

            {/* Bottom Tools */}
            <div
                className={clsx(
                    "flex items-center justify-between mt-1 px-1",
                    compact ? "pt-1.5" : "pt-2"
                )}
                style={{ borderTop: `1px solid var(--border-muted)` }}
            >
                <div className="text-[10px] font-mono flex items-center gap-2 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <span>{inputText.length}字</span>

                    {/* Translation Button */}
                    {needsTranslation && (
                        <button
                            onClick={handleTranslate}
                            disabled={isTranslating}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
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
                            翻訳
                        </button>
                    )}
                </div>

                <div className={clsx("flex", compact ? "gap-2" : "gap-3")}>
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
                        className={clsx(
                            "rounded-full transition-all hover:bg-[var(--bg-muted)] active:scale-90 flex items-center justify-center",
                            compact ? "p-1.5" : "p-3"
                        )}
                        style={{ color: 'var(--text-muted)' }}
                        title="画像OCR"
                    >
                        <ImagePlus className={clsx(compact ? "w-5 h-5" : "w-6 h-6")} />
                    </button>

                    {/* Clear */}
                    <button
                        onClick={onClear}
                        className={clsx(
                            "rounded-full transition-all hover:bg-[var(--bg-muted)] active:scale-90 flex items-center justify-center",
                            compact ? "p-1.5" : "p-3"
                        )}
                        style={{ color: 'var(--text-muted)' }}
                        title="クリア"
                    >
                        <Eraser className={clsx(compact ? "w-5 h-5" : "w-6 h-6")} />
                    </button>

                    {/* Analyze Button */}
                    <button
                        onClick={() => {
                            setAnalyzedText(inputText);
                            setIsInputModalOpen(false); // Legacy modal
                            setIsInputOpen(false); // New Dropdown
                        }}
                        disabled={!inputText.trim()}
                        className={clsx(
                            "flex items-center gap-2 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 border", // Standardized card style
                            compact ? "px-4 py-1.5 text-sm" : "px-8 py-3 text-lg",
                            inputText.trim()
                                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--bg-muted)]" // Standard card colors
                                : "bg-[var(--bg-muted)] text-[var(--text-primary)] border-[var(--border-default)]"
                        )}
                        title="分析"
                    >
                        <Search className={clsx(compact ? "w-4 h-4 opacity-70" : "w-6 h-6")} />
                        <span className="font-medium">分析</span> {/* font-bold -> font-medium for standard feel */}
                    </button>
                </div>
            </div>
        </div>
    );
}
