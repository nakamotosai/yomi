'use client';

import React, { useRef, useEffect } from 'react';
import { useGeminiStore } from '@/store/useGeminiStore';
import { useAppStore } from '@/store/useAppStore';
import { ChevronLeft, User, Bot, Send, Trash2, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIChatView({ hideHeader = false }: { hideHeader?: boolean }) {
    const { history, isChatGenerating, setChatOpen, resetChat, cancelGeneration } = useGeminiStore();
    const settings = useAppStore(s => s.settings);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isChatGenerating]);

    const [input, setInput] = React.useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = async () => {
        if (!input.trim() || isChatGenerating) return;
        const text = input;
        setInput('');

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        await useGeminiStore.getState().sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    const handleClear = () => {
        if (window.confirm('确定要清空所有聊天记录吗？')) {
            resetChat();
        }
    };

    return (
        <div className={`flex flex-col h-full rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'glass-panel'}`}>
            {/* Header */}
            {!hideHeader && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-muted)] bg-transparent backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setChatOpen(false)}
                            className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="font-bold text-[var(--text-primary)] text-sm md:text-base">向 AI 日语老师提问任何关于日语学习的问题</h2>
                        </div>
                    </div>

                    <button
                        onClick={handleClear}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-all group"
                        title="清空聊天记录"
                    >
                        <Trash2 className="w-4 h-4 group-hover:scale-110" />
                    </button>
                </div>
            )}

            {/* Chat Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 floating-scrollbar bg-transparent"
            >
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-4">
                        <div className="w-16 h-16 rounded-full bg-[var(--scheme-accent-surface)] flex items-center justify-center">
                            <Bot className="w-8 h-8 text-[var(--scheme-accent)]" />
                        </div>
                        <p>请在下方输入框提问，开始对话...</p>
                    </div>
                ) : (
                    history.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar */}
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-colors border border-[var(--border-default)] shadow-sm backdrop-blur-sm ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'bg-white/40 dark:bg-black/20'}`}
                                style={{
                                    color: msg.role === 'user' ? 'var(--chat-user-avatar-icon)' : 'var(--chat-ai-avatar-icon)'
                                }}
                            >
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            {/* Bubble */}
                            < div className={`
                                max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all
                                ${msg.role === 'user'
                                    ? 'rounded-tr-none bg-[var(--chat-user-bubble)] backdrop-blur-sm border border-white/5'
                                    : `backdrop-blur-sm border border-[var(--border-default)] rounded-tl-none shadow-sm ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'bg-white/40 dark:bg-black/20'}`
                                }
                            `}
                                style={msg.role === 'user' ? {
                                    color: 'var(--chat-user-text)'
                                } : {}}
                            >
                                {msg.role === 'user' ? (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <div className="markdown-body prose dark:prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                )}
                                {msg.role === 'model' && msg.content && (
                                    <div className="mt-2 pt-1 border-t border-[var(--border-muted)] flex justify-end">
                                        <span className="text-[10px] text-[var(--text-faint)] select-none">
                                            字数: {msg.content.length}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )
                }

                {/* Loading Indicator */}
                {
                    isChatGenerating && history.length > 0 && history[history.length - 1].role !== 'model' && (
                        <div className="flex gap-3">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 border border-[var(--border-default)] shadow-sm backdrop-blur-sm ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'bg-white/40 dark:bg-black/20'}`}
                                style={{ color: 'var(--chat-ai-avatar-icon)' }}
                            >
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className={`backdrop-blur-sm border border-[var(--border-default)] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2 ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'bg-white/40 dark:bg-black/20'}`}>
                                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Input Area */}
            < div className="p-4 border-t border-[var(--border-muted)] bg-transparent" >
                <div className={`flex items-center gap-2 rounded-xl px-3 py-1 border border-[var(--border-default)] focus-within:ring-2 focus-within:ring-[var(--scheme-accent)]/20 transition-all min-h-[56px] ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'bg-black/5 dark:bg-white/5'}`}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="向AI日语老师提问..."
                        className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 focus:outline-none resize-none p-0 text-[18px] floating-scrollbar !outline-none !border-none !ring-0 !shadow-none focus:!outline-none focus:!border-none focus:!ring-0 focus-visible:!outline-none focus-visible:!border-none focus-visible:!ring-0"
                        rows={1}
                        style={{
                            color: 'var(--chat-user-text)',
                            '--tw-placeholder-opacity': '0.6',
                            scrollbarWidth: 'none',
                            lineHeight: '1.4'
                        } as any}
                    />
                    <button
                        onClick={() => isChatGenerating ? cancelGeneration() : handleSend()}
                        disabled={!input.trim() && !isChatGenerating}
                        className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5 border border-[var(--border-default)] shadow-sm hover:shadow-md active:scale-95 group"
                        style={{
                            backgroundColor: 'var(--chat-user-bubble)',
                            color: 'var(--chat-user-text)'
                        }}
                        title={isChatGenerating ? "停止分析" : "发送消息"}
                    >
                        {isChatGenerating ? (
                            <Square className="w-4 h-4 fill-current animate-pulse" />
                        ) : (
                            <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        )}
                    </button>
                </div>
            </div >
        </div >
    );
}
