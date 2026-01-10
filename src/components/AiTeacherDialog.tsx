
import React, { useEffect, useRef, useState } from 'react';
import { useWebLLM } from '@/store/useWebLLM';
import { useAppStore } from '@/store/useAppStore';
import { X, Send, Bot, User, Trash2, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import clsx from 'clsx';
import Markdown from 'react-markdown';

export default function AiTeacherDialog() {
    const {
        isChatOpen, setChatOpen,
        history, sendMessage,
        isLoading, progress, progressText,
        isModelLoaded, resetChat,
        currentContext
    } = useWebLLM();

    const settings = useAppStore(s => s.settings);
    const isDark = settings.theme === 'dark';

    const [input, setInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    if (!isChatOpen) return null;

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input, currentContext || undefined);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                className={clsx(
                    "relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300",
                    isExpanded ? "w-[90vw] h-[90vh]" : "w-full max-w-2xl h-[600px]"
                )}
                style={{
                    background: isDark ? 'var(--bg-elevated)' : 'white',
                    border: '1px solid var(--border-default)'
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-muted)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">AI 日语老师</h2>
                            {currentContext && (
                                <p className="text-xs text-opacity-70" style={{ color: 'var(--text-secondary)' }}>
                                    正在讨论：{currentContext}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={resetChat}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                            title="清空对话"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setChatOpen(false)}
                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/5 dark:bg-black/20">
                    {/* Welcome Message */}
                    {history.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                            <Bot className="w-16 h-16" />
                            <p className="text-center max-w-xs">
                                你好！我是你的专属 AI 老师。<br />
                                有什么不懂的日语语法或单词，尽管问我吧！
                            </p>
                        </div>
                    )}

                    {/* Chat History */}
                    {history.map((msg, idx) => (
                        <div key={idx} className={clsx("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                            )}

                            <div
                                className={clsx(
                                    "px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-indigo-600 text-white rounded-tr-sm"
                                        : (isDark ? "bg-[#2d2d2d] text-white rounded-tl-sm" : "bg-white text-gray-800 rounded-tl-sm")
                                )}
                            >
                                <Markdown>{msg.content}</Markdown>
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center shrink-0 mt-1">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Progress Indicator */}
                    {isLoading && (
                        <div className="flex flex-col items-center gap-2 py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            <p className="text-xs text-indigo-500 font-medium">{progressText} ({Math.round(progress * 100)}%)</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div
                    className="p-4 shrink-0"
                    style={{ background: isDark ? 'var(--bg-elevated)' : 'white' }}
                >
                    <div className="relative flex items-end gap-2 border rounded-xl p-2 focus-within:ring-2 ring-indigo-500/50 transition-all" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9f9f9', borderColor: 'var(--border-default)' }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="请输入你的问题..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none min-h-[44px] max-h-32 py-2.5"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={clsx(
                                "p-2.5 rounded-lg mb-0.5 transition-all",
                                input.trim() && !isLoading
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
