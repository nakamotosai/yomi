'use client';

import React, { useEffect, useState } from 'react';
import { useDictionaryStore } from '@/store/useDictionaryStore';
import { useAppStore } from '@/store/useAppStore';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function LoadingProgress() {
    const { loadedUnits, totalUnits, isAllLoaded } = useDictionaryStore();
    const settings = useAppStore(s => s.settings);
    const isDark = settings.theme === 'dark';
    const [isVisible, setIsVisible] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const progress = Math.min(Math.round((loadedUnits / totalUnits) * 100), 100);

    useEffect(() => {
        if (loadedUnits > 0 && !isAllLoaded) {
            setIsVisible(true);
            setIsFadingOut(false);
        } else if (isAllLoaded) {
            // Delay fade out to show completion status
            const timer = setTimeout(() => {
                setIsFadingOut(true);
                const hideTimer = setTimeout(() => setIsVisible(false), 500);
                return () => clearTimeout(hideTimer);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [loadedUnits, isAllLoaded]);

    if (!isVisible) return null;

    return (
        <div
            className={clsx(
                "px-4 py-2 mt-auto transition-all duration-500 ease-in-out border-t border-[var(--border-muted)] bg-transparent backdrop-blur-md",
                isFadingOut ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}
        >
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    {isAllLoaded ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--scheme-primary)' }} />
                    )}
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {isAllLoaded ? '辞書データ準備完了' : `辞書データ読込中...`}
                    </span>
                </div>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-faint)' }}>
                    {progress}%
                </span>
            </div>

            <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full transition-all duration-500 ease-out rounded-full"
                    style={{
                        width: `${progress}%`,
                        background: isAllLoaded
                            ? 'var(--scheme-primary)'
                            : 'linear-gradient(90deg, var(--scheme-primary) 0%, var(--scheme-grammar) 100%)',
                        boxShadow: '0 0 10px var(--scheme-primary-glow)'
                    }}
                />
            </div>
        </div>
    );
}
