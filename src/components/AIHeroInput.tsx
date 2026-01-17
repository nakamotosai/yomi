'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { useGeminiStore } from '@/store/useGeminiStore';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/lib/i18n';

export default function AIHeroInput() {
    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const { setChatOpen, sendMessage, isChatGenerating } = useGeminiStore();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { settings, setCenterViewMode } = useAppStore();
    const { t } = useI18n();
    const isWafu = settings.colorScheme === 'wafu';

    const isActive = inputText.trim() || isFocused;

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const text = inputText.trim();
        setInputText('');

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Open chat first
        setCenterViewMode('ai');
        setChatOpen(true);

        // Send message to AI
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="w-full relative px-2 pb-2 mt-auto">

            {/* Input Area - CLONE of InfoPanel Search Input */}
            <div
                className={clsx(
                    "w-full rounded-xl transition-all duration-300 relative flex items-end gap-2 p-1.5 pl-4 pr-1.5 min-h-[52px]",
                    "overflow-visible",
                    isActive
                        ? "rainbow-highlight bg-[var(--bg-base)]"
                        : "bg-[var(--bg-muted)] border border-[var(--border-muted)] hover:border-[var(--border-default)]"
                )}
                style={{
                    boxShadow: isActive ? 'var(--rainbow-glow)' : 'none'
                }}
            >
                <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => {
                        setInputText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    rows={1}
                    // Visual Clone: Use standard Search Placeholder
                    placeholder={t('info.lookup_placeholder') || "输入单词或语法进行查询..."}
                    className={clsx(
                        "flex-1 w-full bg-transparent !border-0 !outline-none !shadow-none !ring-0 focus:!ring-0 focus-visible:!ring-0 focus-visible:!outline-none py-2.5 resize-none floating-scrollbar leading-relaxed appearance-none placeholder:text-[var(--text-muted)] text-[var(--accent-primary)]",
                        "text-[15px] min-h-[44px] max-h-[200px]",
                        isWafu ? "font-serif" : "font-sans"
                    )}
                    style={{
                        color: 'var(--accent-primary) !important',
                    }}
                    autoComplete="off"
                    spellCheck="false"
                />

                {/* Search Button Clone */}
                <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className={clsx(
                        "shrink-0 mb-1 flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                        inputText.trim()
                            ? "text-[var(--accent-primary)] hover:bg-[var(--bg-elevated)] active:scale-95 cursor-pointer"
                            : "text-[var(--text-muted)] cursor-default opacity-50"
                    )}
                    title={t('common.search') || "搜索"}
                >
                    <Search className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
