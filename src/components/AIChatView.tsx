'use client';

import React, { useRef, useEffect } from 'react';
import { useChatTypewriterStore, useGeminiStore, type ChatMessage } from '@/store/useGeminiStore';
import { useAppStore } from '@/store/useAppStore';
import { ChevronLeft, User, Bot, Send, Trash2, Square, Bookmark, BookMarked, MessageSquare, CheckSquare, Check, X, RotateCw } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '@/lib/i18n';
import { StreamingMarkdown } from './StreamingMarkdown';

function StreamingDots() {
    return (
        <div className="flex items-center gap-1 py-1">
            <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
}

const PROMPT_TERM_STOP_WORDS = new Set([
    '怎么', '怎麼', '什么', '什麼', '意思', '用法', '区别', '差异', '請問', '请问', '解释', '講解', '讲解', '一下', '如何', '為什麼', '为什么'
]);

function cleanPromptTerm(term: string) {
    return term
        .replace(/^[\s"'“”‘’「『【（(]+|[\s"'“”‘’」』】）),，。！？?：:；;]+$/g, '')
        .trim();
}

function extractAIChatHighlightTerms(prompt?: string) {
    if (!prompt) return [];
    const terms: string[] = [];
    const quotedMatches = prompt.matchAll(/[「『“"']([^」』”"']{1,30})[」』”"']/g);
    for (const match of quotedMatches) {
        terms.push(cleanPromptTerm(match[1]));
    }

    const markerMatch = prompt.match(/^\s*(?:请问|請問|解释一下|解釋一下|解释|解釋|讲一下|講一下|帮我看看|幫我看看)?\s*(.+?)(?:怎么用|怎麼用|是什么意思|是什麼意思|什么意思|什麼意思|是什么|是什麼|用法|区别|差异|差別|如何用|咋用)/);
    if (markerMatch) {
        terms.push(cleanPromptTerm(markerMatch[1].replace(/[和与與、,，/].*$/g, '')));
    }

    const japaneseRuns = prompt.match(/[ぁ-ゖァ-ヺー々〆〤一-龯]+/g) || [];
    for (const run of japaneseRuns) {
        const term = cleanPromptTerm(run);
        if (/[ぁ-ゖァ-ヺー]/.test(term) || prompt.length <= 12) {
            terms.push(term);
        }
    }

    return [...new Set(terms)]
        .filter((term) => term && !PROMPT_TERM_STOP_WORDS.has(term) && term.length <= 30)
        .sort((a, b) => b.length - a.length)
        .slice(0, 3);
}

function ModelMessageContent({
    msg,
    isStreamingModel,
    scrollRef,
}: {
    msg: ChatMessage;
    isStreamingModel: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const streamingText = useChatTypewriterStore((state) =>
        isStreamingModel ? state.streamingText[String(msg.timestamp)] || '' : ''
    );
    const visibleContent = isStreamingModel ? (streamingText || msg.content) : msg.content;

    useEffect(() => {
        if (isStreamingModel && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [isStreamingModel, scrollRef, visibleContent]);

    if (isStreamingModel && !visibleContent) {
        return <StreamingDots />;
    }

    return (
        <StreamingMarkdown
            content={visibleContent}
            isStreaming={isStreamingModel}
            highlightTerms={extractAIChatHighlightTerms(msg.sourcePrompt)}
        />
    );
}

export default function AIChatView({ hideHeader = false }: { hideHeader?: boolean }) {
    const { history, isChatGenerating, setChatOpen, resetChat, cancelGeneration, bookmarks, toggleBookmark, deleteMessage, deleteMessages, retryMessage } = useGeminiStore();
    const activeChatMessageTimestamp = useChatTypewriterStore((state) => state.activeMessageTimestamp);
    const { settings, setCenterViewMode } = useAppStore();
    const { t } = useI18n();
    const [showBookmarks, setShowBookmarks] = React.useState(false);
    const [isSelectionMode, setIsSelectionMode] = React.useState(false);
    const [selectedTimestamps, setSelectedTimestamps] = React.useState<Set<number>>(() => new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isChatGenerating, activeChatMessageTimestamp]);

    const [input, setInput] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const selectedCount = selectedTimestamps.size;

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedTimestamps(new Set());
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            exitSelectionMode();
            return;
        }
        setShowBookmarks(false);
        setIsSelectionMode(true);
    };

    const toggleSelected = (timestamp: number) => {
        setSelectedTimestamps((current) => {
            const next = new Set(current);
            if (next.has(timestamp)) {
                next.delete(timestamp);
            } else {
                next.add(timestamp);
            }
            return next;
        });
    };

    const handleDeleteSelected = () => {
        if (selectedCount === 0) return;
        deleteMessages(Array.from(selectedTimestamps).filter((timestamp) => timestamp !== activeChatMessageTimestamp));
        exitSelectionMode();
    };

    const handleDeleteOne = (timestamp: number) => {
        deleteMessage(timestamp);
        setSelectedTimestamps((current) => {
            const next = new Set(current);
            next.delete(timestamp);
            return next;
        });
    };

    const handleRetry = async (timestamp: number) => {
        if (isChatGenerating) return;
        exitSelectionMode();
        setShowBookmarks(false);
        await retryMessage(timestamp);
    };

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
        if (window.confirm(t('ai.clear_confirm'))) {
            exitSelectionMode();
            resetChat();
        }
    };

    return (
        <div className={`relative flex flex-col h-full rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'glass-panel'}`}>
            {/* Header */}
            {!hideHeader && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-muted)] bg-transparent backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (showBookmarks) {
                                    setShowBookmarks(false);
                                } else {
                                    setChatOpen(false);
                                    setCenterViewMode('reader');
                                }
                            }}
                            className="p-2 -ml-2 rounded-xl transition-all bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="font-bold text-[var(--text-primary)] text-sm md:text-base">
                                {showBookmarks ? "AI 先生收藏夹" : t('ai.ask_hint')}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                exitSelectionMode();
                                setShowBookmarks(!showBookmarks);
                            }}
                            className={clsx(
                                "p-2 rounded-xl transition-all hover:shadow-sm active:scale-95 cursor-pointer flex items-center gap-2",
                                showBookmarks
                                    ? "rainbow-highlight text-[var(--accent-primary)] font-bold px-4"
                                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                            )}
                            title={showBookmarks ? "返回对话" : "查看收藏"}
                        >
                            {showBookmarks ? <MessageSquare className="w-4 h-4" /> : <BookMarked className="w-4 h-4" />}
                            {showBookmarks && <span className="text-xs">返回对话</span>}
                        </button>

                        {!showBookmarks && (
                            <>
                                <button
                                    onClick={toggleSelectionMode}
                                    disabled={history.length === 0}
                                    className={clsx(
                                        "p-2 rounded-xl transition-all hover:shadow-sm active:scale-95 flex items-center gap-2",
                                        isSelectionMode
                                            ? "rainbow-highlight text-[var(--accent-primary)] font-bold px-3"
                                            : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                                        history.length === 0 && "opacity-40 cursor-default"
                                    )}
                                    title={isSelectionMode ? "退出多选" : "多选删除"}
                                >
                                    {isSelectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                                    {isSelectionMode && <span className="text-xs">退出</span>}
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="p-2 rounded-xl transition-all bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 cursor-pointer"
                                    title={t('ai.clear_chat')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {hideHeader && !showBookmarks && (
                <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-muted)] bg-transparent backdrop-blur-md z-10">
                    <button
                        onClick={() => {
                            exitSelectionMode();
                            setShowBookmarks(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] active:scale-95 transition-all text-xs font-medium"
                    >
                        <BookMarked className="w-4 h-4" />
                        收藏
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSelectionMode}
                            disabled={history.length === 0}
                            className={clsx(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-all text-xs font-medium",
                                isSelectionMode
                                    ? "rainbow-highlight text-[var(--accent-primary)]"
                                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]",
                                history.length === 0 && "opacity-40 cursor-default"
                            )}
                        >
                            {isSelectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                            {isSelectionMode ? "退出" : "多选"}
                        </button>
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] active:scale-95 transition-all text-xs font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            全删
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Content */}
            <div
                ref={scrollRef}
                className="relative flex-1 overflow-y-auto p-4 space-y-6 floating-scrollbar bg-transparent"
            >
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-4">
                        <div className="w-16 h-16 rounded-full bg-[var(--scheme-accent-surface)] flex items-center justify-center">
                            <Bot className="w-8 h-8 text-[var(--scheme-accent)]" />
                        </div>
                        <p>{t('ai.start_conv')}</p>
                    </div>
                ) : (
                    history.map((msg, idx) => {
                        const isStreamingModel = msg.role === 'model' && activeChatMessageTimestamp === msg.timestamp;
                        const isSelected = selectedTimestamps.has(msg.timestamp);
                        const isActionDisabled = isChatGenerating || isStreamingModel;
                        const isSelectable = !isStreamingModel;

                        return (
                        <div
                            key={idx}
                            onClick={() => {
                                if (isSelectionMode && isSelectable) toggleSelected(msg.timestamp);
                            }}
                            className={clsx(
                                "flex gap-3",
                                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                                isSelectionMode && "cursor-pointer"
                            )}
                        >
                            {isSelectionMode && (
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (isSelectable) toggleSelected(msg.timestamp);
                                    }}
                                    disabled={!isSelectable}
                                    className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 border transition-all",
                                        isSelected
                                            ? "rainbow-highlight text-[var(--accent-primary)] border-transparent shadow-sm"
                                            : "bg-[var(--bg-muted)] text-[var(--text-faint)] border-[var(--border-default)]",
                                        !isSelectable && "opacity-40 cursor-default"
                                    )}
                                    aria-label={isSelected ? "取消选择这条消息" : "选择这条消息"}
                                >
                                    {isSelected && <Check className="w-4 h-4" />}
                                </button>
                            )}

                            {/* Avatar */}
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-colors border border-[var(--border-default)] shadow-sm backdrop-blur-sm ${settings.colorScheme === 'wafu' ? 'bg-transparent' : 'bg-white/40 dark:bg-black/20'}`}
                                style={{
                                    color: msg.role === 'user' ? 'var(--chat-user-avatar-icon)' : 'var(--chat-ai-avatar-icon)'
                                }}
                            >
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            <div className={clsx(
                                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all relative",
                                msg.role === 'user'
                                    ? "rounded-tr-none bg-[var(--bg-muted)] border border-[var(--border-default)] text-[var(--text-secondary)] shadow-sm"
                                    : "rounded-tl-none rainbow-highlight text-[var(--text-primary)] shadow-md",
                                isSelected && "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-base)]"
                            )}
                            >
                                {msg.role === 'user' ? (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <ModelMessageContent msg={msg} isStreamingModel={isStreamingModel} scrollRef={scrollRef} />
                                )}
                                {!isSelectionMode && !isStreamingModel && msg.content && (
                                    <div className="mt-2 pt-1 border-t border-[var(--border-muted)] flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            {msg.role === 'model' && (
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        toggleBookmark(msg);
                                                    }}
                                                    className={clsx(
                                                        "p-1.5 rounded-lg transition-all flex items-center gap-1 group/btn",
                                                        bookmarks.some(b => b.timestamp === msg.timestamp)
                                                            ? "text-yellow-500 bg-yellow-500/10"
                                                            : "text-[var(--text-faint)] hover:text-yellow-500 hover:bg-yellow-500/5"
                                                    )}
                                                >
                                                    <Bookmark className={clsx("w-3.5 h-3.5", bookmarks.some(b => b.timestamp === msg.timestamp) ? "fill-current" : "group-hover/btn:fill-yellow-500/30")} />
                                                    <span className="text-[10px] font-medium">{bookmarks.some(b => b.timestamp === msg.timestamp) ? "已收藏" : "收藏"}</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleRetry(msg.timestamp);
                                                }}
                                                disabled={isActionDisabled}
                                                className={clsx(
                                                    "p-1.5 rounded-lg transition-all flex items-center gap-1 text-[var(--text-faint)] hover:text-[var(--accent-primary)] hover:bg-[var(--scheme-accent-surface)]",
                                                    isActionDisabled && "opacity-40 cursor-default hover:bg-transparent"
                                                )}
                                            >
                                                <RotateCw className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-medium">重试</span>
                                            </button>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleDeleteOne(msg.timestamp);
                                                }}
                                                disabled={isActionDisabled}
                                                className={clsx(
                                                    "p-1.5 rounded-lg transition-all flex items-center gap-1 text-[var(--text-faint)] hover:text-red-500 hover:bg-red-500/5",
                                                    isActionDisabled && "opacity-40 cursor-default hover:bg-transparent"
                                                )}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-medium">删除</span>
                                            </button>
                                        </div>
                                        <span className="text-[10px] text-[var(--text-faint)] select-none">
                                            {msg.role === 'model' ? `${t('ai.char_count')}: ${msg.content.length}` : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })
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
                            <div className="rainbow-highlight rounded-2xl rounded-tl-none px-4 py-3 shadow-md flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Bookmarks List Overlay */}
            {showBookmarks && (
                <div
                    className="absolute inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden"
                    style={{
                        background: 'var(--bg-base)',
                        top: hideHeader ? 0 : 57,
                    }}
                >
                    {hideHeader && (
                        <div
                            className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-muted)] backdrop-blur-md"
                            style={{ background: 'var(--bg-base)' }}
                        >
                            <button
                                onClick={() => setShowBookmarks(false)}
                                className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95"
                                title="返回对话"
                                aria-label="返回对话"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span className="text-xs font-bold">返回对话</span>
                            </button>
                            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                                <BookMarked className="w-4 h-4" />
                                <span>AI 先生收藏夹</span>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto floating-scrollbar p-4 space-y-4 pb-24">
                        {bookmarks.length === 0 ? (
                            <div className="min-h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-4">
                                <BookMarked className="w-12 h-12 opacity-20" />
                                <p>还没有收藏任何 AI 老师的回答</p>
                            </div>
                        ) : (
                            bookmarks.map((msg, idx) => (
                                <div key={idx} className="rainbow-highlight rounded-2xl p-5 shadow-md relative group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 text-[var(--text-faint)] text-[10px]">
                                            <Bot className="w-3 h-3" />
                                            <span>AI 先生的精彩解读</span>
                                            <span>•</span>
                                            <span>{new Date(msg.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={() => toggleBookmark(msg)}
                                            className="text-yellow-500 hover:scale-110 active:scale-95 transition-all"
                                        >
                                            <Bookmark className="w-4 h-4 fill-current" />
                                        </button>
                                    </div>
                                        <StreamingMarkdown content={msg.content} highlightTerms={extractAIChatHighlightTerms(msg.sourcePrompt)} />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Input Area */}
            {!showBookmarks && (
                < div className="p-4 border-t border-[var(--border-muted)] bg-transparent" >
                    {isSelectionMode ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-default)]">
                            <button
                                onClick={exitSelectionMode}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] active:scale-95 transition-all text-sm font-medium"
                            >
                                <X className="w-4 h-4" />
                                取消
                            </button>
                            <span className="text-xs text-[var(--text-muted)]">
                                已选择 {selectedCount} 条
                            </span>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedCount === 0}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl active:scale-95 transition-all text-sm font-bold",
                                    selectedCount > 0
                                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/15"
                                        : "text-[var(--text-muted)] opacity-40 cursor-default"
                                )}
                            >
                                <Trash2 className="w-4 h-4" />
                                删除
                            </button>
                        </div>
                    ) : (
                        <div className={clsx(
                            "flex items-center gap-2 rounded-xl px-4 py-2 transition-all min-h-[56px] relative overflow-visible z-20",
                            isFocused ? "rainbow-highlight" : "bg-[var(--bg-muted)] border border-[var(--border-default)]"
                        )}
                            style={{
                                boxShadow: isFocused ? 'var(--rainbow-glow)' : 'none'
                            }}
                        >
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={t('ai.input_placeholder')}
                                className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 focus:outline-none resize-none p-0 text-[16px] md:text-[18px] floating-scrollbar !outline-none !border-none !ring-0 !shadow-none focus:!outline-none focus:!border-none focus:!ring-0 focus-visible:!outline-none focus-visible:!border-none focus-visible:!ring-0"
                                rows={1}
                                style={{
                                    color: 'var(--accent-primary) !important',
                                    lineHeight: '1.5'
                                } as any}
                            />
                            <button
                                onClick={() => isChatGenerating ? cancelGeneration() : handleSend()}
                                disabled={!input.trim() && !isChatGenerating}
                                className={clsx(
                                    "p-2.5 rounded-xl transition-all shrink-0 active:scale-95 group",
                                    (input.trim() || isChatGenerating)
                                        ? "rainbow-highlight text-[var(--accent-primary)] shadow-sm cursor-pointer"
                                        : "text-[var(--text-muted)] opacity-30 cursor-default"
                                )}
                                title={isChatGenerating ? t('ai.stop_analysis') : t('ai.send')}
                            >
                                {isChatGenerating ? (
                                    <Square className="w-4 h-4 fill-current animate-pulse" />
                                ) : (
                                    <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                )}
                            </button>
                        </div>
                    )}
                </div >
            )}
        </div >
    );
}
