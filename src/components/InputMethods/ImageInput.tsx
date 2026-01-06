'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';

interface ImageInputProps {
    onTextExtracted: (text: string) => void;
    className?: string;
}

export default function ImageInput({ onTextExtracted, className }: ImageInputProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const processImage = async (file: File | Blob) => {
        setIsProcessing(true);
        setProgress(0);
        setProgressStatus('準備中...');

        // Create preview
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);

        try {
            // Use Japanese language for OCR
            const worker = await createWorker('jpn', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                        setProgressStatus('文字認識中...');
                    } else {
                        setProgressStatus(m.status);
                    }
                }
            });

            // Set parameters to improve Japanese OCR
            // preserve_interword_spaces=0 removes extra spaces for CJK languages
            await worker.setParameters({
                preserve_interword_spaces: '0',
            });

            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            if (text.trim()) {
                // Post-process: Remove spaces between CJK characters
                const cleanedText = cleanJapaneseOCRText(text);
                onTextExtracted(cleanedText);
            }
        } catch (err) {
            console.error('OCR Error:', err);
            alert('文字認識に失敗しました。もう一度お試しください。');
        } finally {
            setIsProcessing(false);
        }
    };

    // Clean OCR output for Japanese text
    // Removes extra spaces that Tesseract inserts between CJK characters
    const cleanJapaneseOCRText = (text: string): string => {
        // 1. Replace multiple spaces/newlines with single space
        let cleaned = text.replace(/\s+/g, ' ');

        // 2. Remove spaces between CJK characters (Japanese/Chinese)
        // CJK Unicode ranges: \u3000-\u9FFF covers most Japanese/Chinese characters
        // This regex removes spaces between two CJK characters
        cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');

        // Apply multiple times to catch all cases
        cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');
        cleaned = cleaned.replace(/([\u3000-\u9FFF\uFF00-\uFFEF])[\s]+([\u3000-\u9FFF\uFF00-\uFFEF])/g, '$1$2');

        // 3. Remove spaces before Japanese punctuation
        cleaned = cleaned.replace(/\s+([。、！？」』）])/g, '$1');

        // 4. Remove spaces after opening brackets
        cleaned = cleaned.replace(/([「『（])\s+/g, '$1');

        // 5. Trim and return
        return cleaned.trim();
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            processImage(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.gif']
        },
        multiple: false
    });

    // Handle paste events
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        processImage(blob);
                        e.preventDefault(); // Prevent default paste behavior
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const clearImage = (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent dropzone click
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        setProgress(0);
        setIsProcessing(false);
    };

    return (
        <div className={clsx("w-full transition-all duration-300", className)}>
            {!imagePreview ? (
                <div
                    {...getRootProps()}
                    className={clsx(
                        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 min-h-[160px]",
                        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-700">画像をクリック または ドラッグ＆ドロップ</p>
                        <p className="text-sm text-gray-400 mt-1">または Ctrl+V で画像を貼り付け</p>
                    </div>
                </div>
            ) : (
                <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                    <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-contain bg-pattern-checker"
                    />

                    {/* Overlay for processing */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p className="font-medium mb-2">{progressStatus}</p>
                            <div className="w-full max-w-xs bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Clear button */}
                    {!isProcessing && (
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            title="画像を削除"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
