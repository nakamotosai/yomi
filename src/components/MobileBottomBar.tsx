'use client';

import React from 'react';
import { Menu, PenLine, Sparkles, BookOpen } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import clsx from 'clsx';
import { useGeminiStore } from '@/store/useGeminiStore';

interface MobileBottomBarProps {
    onMenuClick: () => void;
    onInputClick: () => void;
    onAIClick: () => void;
    currentView: 'main' | 'info' | 'ai' | 'vocab' | 'grammar';
}

export default function MobileBottomBar({ onMenuClick, onInputClick, onAIClick, currentView }: MobileBottomBarProps) {
    const { settings, appMode } = useAppStore();
    const isDark = settings.theme === 'dark';

    return (
        <div
            className="h-16 shrink-0 flex items-center justify-around px-2 z-50 fixed bottom-0 left-0 right-0 safe-area-pb"
            style={{
                background: isDark ? 'rgba(20, 20, 28, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)',
                borderTop: `1px solid var(--border-default)`
            }}
        >
            {/* Left: Menu / Mode */}
            <button
                onClick={onMenuClick}
                className="flex flex-col items-center justify-center p-2 rounded-xl gap-1 w-20 active:scale-95 transition-transform"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Menu className="w-6 h-6" />
                <span className="text-[10px] font-medium opacity-80">菜单</span>
            </button>

            {/* Center: Input */}
            <button
                onClick={onInputClick}
                className="flex flex-col items-center justify-center p-2 rounded-xl gap-1 w-20 active:scale-95 transition-transform"
                style={{ color: 'var(--text-secondary)' }}
            >
                <div className="relative">
                    <PenLine className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium opacity-80">输入</span>
            </button>

            {/* Right: AI */}
            <button
                onClick={onAIClick}
                className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-xl gap-1 w-20 active:scale-95 transition-transform",
                    currentView === 'ai' && "text-[var(--accent-primary)]"
                )}
                style={{ color: currentView === 'ai' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
            >
                <Sparkles className="w-6 h-6" />
                <span className="text-[10px] font-medium opacity-80">AI老师</span>
            </button>
        </div>
    );
}
