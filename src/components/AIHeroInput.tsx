'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
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

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
        // Auto-resize
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        }
    };

    return (
        <div className="flex flex-col w-full h-full relative overflow-hidden p-6 gap-4">
            {/* Decorative Background for Hero Feel */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-10"
                style={{
                    background: isWafu
                        ? 'radial-gradient(circle at 80% 20%, #d4a373 0%, transparent 60%)'
                        : 'radial-gradient(circle at 80% 20%, var(--accent-primary) 0%, transparent 60%)'
                }}
            />

            {/* Header / Greeting */}
            <div className="relative z-10 shrink-0">
                <div className="flex items-center gap-2 mb-2 opacity-80 text-slate-500">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-bold tracking-wide">{t('ai.teacher')}</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight leading-tight text-slate-500">
                    {t('ai.hero_greeting').split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                            {line}
                            {i === 0 && <br />}
                        </React.Fragment>
                    ))}
                </h2>
                <p className="text-sm mt-1 opacity-60 text-slate-500">
                    {t('ai.hero_placeholder')}
                </p>
            </div>

            {/* Input Area */}
            <div className="flex-1 relative z-10 flex flex-col justify-end">
                <div className={clsx(
                    "w-full rounded-3xl transition-all duration-300 relative overflow-visible z-20 p-2",
                    isActive
                        ? "rainbow-highlight"
                        : clsx(
                            "bg-[var(--bg-base)]/50 backdrop-blur-md ring-1 shadow-sm",
                            isWafu ? "ring-[#8b5e3c]/20" : "ring-[var(--border-default)]"
                        ),
                )}
                    style={{
                        border: 'none',
                        background: isActive
                            ? (settings.theme === 'dark' ? 'rgba(20, 20, 28, 0.6)' : '#fff')
                            : 'transparent',
                        boxShadow: isActive ? 'var(--rainbow-glow)' : 'none'
                    }}
                >
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={t('ai.input_placeholder')}
                        rows={1}
                        className="w-full bg-transparent !border-0 !outline-none !shadow-none !ring-0 focus:!ring-0 focus-visible:!ring-0 focus-visible:!outline-none text-base p-3 resize-none floating-scrollbar leading-relaxed placeholder:opacity-50 appearance-none"
                        style={{
                            color: 'var(--text-primary)',
                            minHeight: '60px',
                            maxHeight: '150px'
                        }}
                        autoComplete="off"
                        spellCheck="false"
                    />

                    <div className="flex justify-end px-1 pb-1">
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim()}
                            className={clsx(
                                "group flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm",
                                inputText.trim()
                                    ? "rainbow-highlight text-[var(--accent-primary)] shadow-lg shadow-indigo-500/20 scale-100 hover:scale-[1.02] active:scale-95"
                                    : "bg-[var(--bg-muted)] text-[var(--text-muted)] opacity-30 cursor-not-allowed"
                            )}
                        >
                            <span>{t('ai.send')}</span>
                            <Send className={clsx(
                                "w-4 h-4 transition-transform duration-300",
                                inputText.trim() && "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            )} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
