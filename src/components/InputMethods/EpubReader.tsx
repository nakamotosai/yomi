'use client';

import React, { useState } from 'react';
import { ReactReader } from 'react-reader';
import { BookOpen, Download } from 'lucide-react';
import clsx from 'clsx';
import type { Rendition } from 'epubjs';

interface EpubReaderProps {
    onTextExtracted: (text: string) => void;
    className?: string;
}

export default function EpubReader({ onTextExtracted, className }: EpubReaderProps) {
    const [location, setLocation] = useState<string | number>(0);
    const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
    const [rendition, setRendition] = useState<Rendition | null>(null);
    const [showReader, setShowReader] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setFileContent(e.target.result as ArrayBuffer);
                    setShowReader(true);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const extractCurrentChapter = async () => {
        if (!rendition) return;

        try {
            // Try to get current view from manager
            // @ts-expect-error - manager is internal API
            const currentView = rendition.manager?.current?.();

            if (currentView?.document?.body?.innerText) {
                onTextExtracted(currentView.document.body.innerText);
                return;
            }

            // Fallback: try to access via spine
            const currentLocation = rendition.currentLocation();
            // @ts-expect-error - currentLocation typing is complex
            if (currentLocation?.start) {
                // @ts-expect-error - start.index access
                const item = rendition.book.spine.get(currentLocation.start.index);
                if (item) {
                    await item.load(rendition.book.load.bind(rendition.book));
                    const text = item.document?.body?.innerText || "";
                    item.unload(); // Cleanup
                    onTextExtracted(text);
                }
            }
        } catch (err) {
            console.error('Failed to extract text:', err);
            alert('テキストの抽出に失敗しました。');
        }
    };

    return (
        <div className={clsx("w-full transition-all duration-300", className)}>
            {!showReader ? (
                <div className="border-2 border-dashed border-[var(--border-default)] rounded-xl p-8 text-center hover:border-blue-400 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer relative min-h-[160px] flex flex-col items-center justify-center gap-3">
                    <input
                        type="file"
                        accept=".epub"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full text-orange-600 dark:text-orange-400">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)]">EPUBファイルを選択</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">クリックして電子書籍を読み込み</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-[var(--bg-subtle)] p-3 rounded-lg border border-[var(--border-default)]">
                        <span className="text-sm font-medium text-[var(--text-secondary)]">
                            電子書籍リーダー
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={extractCurrentChapter}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" />
                                現在のページを分析
                            </button>
                            <button
                                onClick={() => {
                                    setShowReader(false);
                                    setFileContent(null);
                                }}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>

                    <div className="h-[60vh] border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--bg-elevated)] shadow-inner relative">
                        <ReactReader
                            url={fileContent as ArrayBuffer}
                            location={location}
                            locationChanged={(loc: string) => setLocation(loc)}
                            getRendition={(r: Rendition) => setRendition(r)}
                            title="読み | YOMI"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
