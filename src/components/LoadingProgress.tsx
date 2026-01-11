'use client';

import React, { useEffect, useState } from 'react';
import { useDictionaryStore } from '@/store/useDictionaryStore';
import { useAppStore } from '@/store/useAppStore';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function LoadingProgress() {
    const { loadedUnits, totalUnits, totalDownloadedUnits, isAllLoaded } = useDictionaryStore();
    const settings = useAppStore(s => s.settings);
    const isDark = settings.theme === 'dark';
    const [isVisible, setIsVisible] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const progress = Math.min(Math.round((loadedUnits / totalUnits) * 100), 100);
    const isDownloading = totalDownloadedUnits > 0;
    const [isVisible, setIsVisible] = useState(true); // Changed initial state to true
    // const [isFadingOut, setIsFadingOut] = useState(false); // Removed as per new logic

    // 自动隐藏逻辑 (New visibility logic)
    useEffect(() => {
        if (isAllLoaded) {
            const timer = setTimeout(() => setIsVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isAllLoaded]);

    if (!isVisible) return null;

    const progress = Math.min(100, Math.round((loadedUnits / totalUnits) * 100)); // Changed Math.min arguments
    const isDownloading = totalDownloadedUnits > 0 && !isAllLoaded; // Changed logic for isDownloading
    const downloadSizeMB = (totalDownloadedBytes / (1024 * 1024)).toFixed(1); // Added downloadSizeMB
    const totalSizeMB = (totalBytesToDownload / (1024 * 1024)).toFixed(1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
        >
            <div className="flex items-center justify-between text-[13px] font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    {isAllLoaded ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    )}
                    <span>
                        {isAllLoaded
                            ? "辞典准备就绪"
                            : isDownloading
                                ? `正在下载数据 (${downloadSizeMB} / ${totalSizeMB} MB)`
                                : "正在初始化索引..."}
                    </span>
                </div>
                <span>{progress}%</span>
            </div>

            <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={clsx(
                        "h-full transition-all duration-500",
                        isAllLoaded ? "bg-emerald-500" : "bg-indigo-500"
                    )}
                />
            </div>
        </motion.div>
    );
}
