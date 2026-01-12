import React, { useEffect, useState } from 'react';
import { useDictionaryStore } from '@/store/useDictionaryStore';
import { useAppStore } from '@/store/useAppStore';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
// Assuming framer-motion is used, if not we should use div. 
// Given the error was just about variables, I'll attempt to use standard div to be safe and avoid "module not found".
// If the user wants animation, they can ask. 
// But wait, the existing code had motion.div. I'll stick to div for safety unless I see framer-motion in package.json.
// Actually, I'll just use a simple div with transition classes which are already there.
// But wait, transition classes are on the inner bar. The outer container has motion props.
// I'll genericize it to div to ensure it builds.

export default function LoadingProgress() {
    // Destructure all needed values
    const { loadedUnits, totalUnits, totalDownloadedUnits, isAllLoaded, totalDownloadedBytes, totalBytesToDownload } = useDictionaryStore();
    const settings = useAppStore(s => s.settings);
    const isDark = settings.theme === 'dark';

    const [isVisible, setIsVisible] = useState(true);

    // Auto-hide logic
    useEffect(() => {
        if (isAllLoaded) {
            const timer = setTimeout(() => setIsVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isAllLoaded]);

    if (!isVisible) return null;

    const progress = totalUnits > 0 ? Math.min(100, Math.round((loadedUnits / totalUnits) * 100)) : 0;
    const isDownloading = totalDownloadedUnits > 0 && !isAllLoaded;

    // Safely handle potentially undefined bytes
    const downloadSizeMB = totalDownloadedBytes ? (totalDownloadedBytes / (1024 * 1024)).toFixed(1) : '0.0';
    const totalSizeMB = totalBytesToDownload ? (totalBytesToDownload / (1024 * 1024)).toFixed(1) : '0.0';

    return (
        <div
            className="flex flex-col gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
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
                <div
                    className={clsx(
                        "h-full transition-all duration-500 ease-out",
                        isAllLoaded ? "bg-emerald-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
