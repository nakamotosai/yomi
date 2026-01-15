'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useGeminiStore } from '@/store/useGeminiStore';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';

export default function AIHeroInput() {
    const [input, setInput] = useState('');
    const { setChatOpen, sendMessage, isChatGenerating } = useGeminiStore();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { settings } = useAppStore();
    const isWafu = settings.colorScheme === 'wafu';

    const handleSend = async () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput('');

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Open chat first
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
        setInput(e.target.value);
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
                <div className="flex items-center gap-2 mb-2 opacity-80" style={{ color: 'var(--text-muted)' }}>
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-bold tracking-wide">AI 先生</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
                    今日は<br />何を作りますか？
                </h2>
                <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                    質問、翻訳、文法解説...
                </p>
            </div>

            {/* Input Area */}
            <div className="flex-1 relative z-10 flex flex-col justify-end">
                <div className={clsx(
                    "w-full rounded-2xl p-2 transition-all duration-300 ring-1",
                    "bg-[var(--bg-base)]/50 backdrop-blur-md", // Transparent base
                    "focus-within:bg-[var(--bg-elevated)] focus-within:shadow-lg focus-within:ring-2",
                    isWafu ? "ring-[#8b5e3c]/20 focus-within:ring-[#8b5e3c]/40" : "ring-[var(--border-default)] focus-within:ring-[var(--accent-primary)]/30"
                )}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="在此输入问题..."
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
                            disabled={!input.trim()}
                            className={clsx(
                                "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95",
                                input.trim()
                                    ? (isWafu ? "bg-[#8b5e3c] text-[#f4e4bc] shadow-md" : "bg-[var(--accent-primary)] text-white shadow-md")
                                    : "bg-transparent opacity-50 cursor-not-allowed"
                            )}
                            style={!input.trim() ? { color: 'var(--text-muted)' } : {}}
                        >
                            <span>发送</span>
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
