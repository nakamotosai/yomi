'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { useGeminiStore } from '@/store/useGeminiStore';
import { useAppStore } from '@/store/useAppStore';
import clsx from 'clsx';

export default function AIChatInput() {
    const [input, setInput] = useState('');
    const { sendMessage, isChatGenerating, setChatOpen, isChatOpen } = useGeminiStore();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { settings, layout } = useAppStore();
    const isDark = settings.theme === 'dark';
    const isCompact = layout.leftSidebarWidth < 300;

    const isWafu = settings.colorScheme === 'wafu';
    const isMonochrome = settings.colorScheme === 'monochrome';

    const handleSend = async () => {
        if (!input.trim() || isChatGenerating) return;

        const text = input;
        setInput('');

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // SVG Gradient for the icon - Defined once and used via ID
    const RainbowGradient = (
        <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
            <defs>
                <linearGradient id="rainbow-gradient-icon" x1="0%" y1="0%" x2="100%" y2="0%" spreadMethod="repeat">
                    <stop offset="0%" stopColor="#ff5f6d" />
                    <stop offset="16.6%" stopColor="#ffc371" />
                    <stop offset="33.3%" stopColor="#ffec82" />
                    <stop offset="50%" stopColor="#81ffb4" />
                    <stop offset="66.6%" stopColor="#71c5ff" />
                    <stop offset="83.3%" stopColor="#c371ff" />
                    <stop offset="100%" stopColor="#ff5f6d" />
                    <animateTransform
                        attributeName="gradientTransform"
                        type="translate"
                        values="0,0; -1,0"
                        dur="3s"
                        repeatCount="indefinite"
                    />
                </linearGradient>
            </defs>
        </svg>
    );

    return (
        <div className="flex items-stretch gap-2 w-full min-w-0">
            {/* Left: Input Field Container */}
            <div className={clsx(
                "flex-1 flex items-center py-2 rounded-2xl bg-transparent backdrop-blur-xl border border-[var(--border-muted)] shadow-sm group/input transition-all min-h-[56px] min-w-0 px-4"
            )}>
                <div className="flex-1 flex items-center gap-1 min-w-0">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="向AI老师提问。"
                        rows={1}
                        disabled={isChatGenerating}
                        className="flex-1 h-9 py-2 resize-none bg-transparent text-sm !border-none !outline-none !ring-0 !shadow-none focus:!ring-0 focus:!outline-none focus:!border-none focus-visible:!ring-0 focus-visible:!outline-none focus-visible:!border-none appearance-none floating-scrollbar placeholder:italic leading-normal min-w-0"
                        style={{
                            color: 'var(--text-primary)',
                            minHeight: '36px',
                            maxHeight: '120px'
                        }}
                    />

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isChatGenerating}
                        className="p-2 shrink-0 rounded-xl text-[var(--scheme-accent)] hover:bg-[var(--scheme-accent-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                        title="发送"
                    >
                        {isChatGenerating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>

            <button
                onClick={() => setChatOpen(true)}
                className={clsx(
                    "flex-none w-14 h-14 flex items-center justify-center rounded-2xl transition-all group/ai border border-transparent dark:border-white/10",
                    isChatOpen
                        ? "bg-transparent border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                        : "bg-transparent shadow-sm hover:shadow-lg hover:scale-[1.02] hover:bg-black/5 dark:hover:bg-white/5"
                )}
                title="开启全屏 AI 聊天"
            >
                <div className="relative w-8 h-8 flex items-center justify-center group-hover/ai:scale-110 transition-transform duration-300">
                    <div className="w-full h-full relative">
                        <MessageSquare
                            className={clsx("w-full h-full transition-colors")}
                            strokeWidth={1.8}
                            style={isChatOpen ? { stroke: 'url(#rainbow-gradient-icon)' } : { color: 'var(--text-muted)' }}
                        />
                        {RainbowGradient}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pb-1">
                        <span className={clsx(
                            "font-extrabold select-none tracking-tighter leading-none text-[13px]",
                            isChatOpen ? "rainbow-text-scroll" : ""
                        )}
                            style={{ color: isChatOpen ? undefined : 'var(--text-muted)' }}
                        >
                            AI
                        </span>
                    </div>
                </div>
            </button>
        </div>
    );
}
