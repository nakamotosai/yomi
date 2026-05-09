import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: number;
    sourcePrompt?: string;
    retryOfTimestamp?: number;
}

// Interface Update
// Interface Update
interface GeminiState {
    // Model State
    isChatGenerating: boolean;
    // Map of active generation keys to their current streaming content
    // Key: string (e.g. 'word:こんにちは'), Value: string (content)
    streamedResults: Map<string, string>;

    // Chat State
    history: ChatMessage[];
    isChatOpen: boolean;
    abortController: AbortController | null;

    // Actions
    sendMessage: (text: string, options?: { retryOfTimestamp?: number }) => Promise<void>;
    resetChat: () => void;
    deleteMessage: (timestamp: number) => void;
    deleteMessages: (timestamps: number[]) => void;
    retryMessage: (timestamp: number) => Promise<void>;
    setChatOpen: (isOpen: boolean) => void;

    // Stateless generation for "AI 详解"
    // Note: onUpdate is now optional/deprecated as components should subscribe to streamedResults
    generateText: (prompt: string, systemPrompt: string, onUpdate?: (text: string) => void, options?: { temperature?: number, top_p?: number, cacheKey?: string, forceRefresh?: boolean }) => Promise<{ text: string, fromCache: boolean }>;
    cancelGeneration: (key?: string) => void;
    // Bookmarks
    bookmarks: ChatMessage[];
    toggleBookmark: (message: ChatMessage) => void;
    clearBookmarks: () => void;
}

interface ChatTypewriterState {
    activeMessageTimestamp: number | null;
    streamingText: Record<string, string>;
    startChatStream: (timestamp: number) => void;
    setChatStreamText: (timestamp: number, text: string) => void;
    clearChatStream: (timestamp: number) => void;
    resetChatStream: () => void;
}

type SegmenterConstructor = new (
    locales?: string | string[],
    options?: { granularity: 'grapheme' }
) => {
    segment(input: string): Iterable<{ segment: string }>;
};

export const useChatTypewriterStore = create<ChatTypewriterState>((set) => ({
    activeMessageTimestamp: null,
    streamingText: {},
    startChatStream: (timestamp) => set((state) => ({
        activeMessageTimestamp: timestamp,
        streamingText: {
            ...state.streamingText,
            [String(timestamp)]: '',
        },
    })),
    setChatStreamText: (timestamp, text) => set((state) => ({
        streamingText: {
            ...state.streamingText,
            [String(timestamp)]: text,
        },
    })),
    clearChatStream: (timestamp) => set((state) => {
        const nextStreamingText = { ...state.streamingText };
        delete nextStreamingText[String(timestamp)];
        return {
            activeMessageTimestamp: state.activeMessageTimestamp === timestamp ? null : state.activeMessageTimestamp,
            streamingText: nextStreamingText,
        };
    }),
    resetChatStream: () => set({ activeMessageTimestamp: null, streamingText: {} }),
}));

function splitGraphemes(text: string): string[] {
    const Segmenter = (globalThis.Intl as (typeof Intl & { Segmenter?: SegmenterConstructor }) | undefined)?.Segmenter;
    if (Segmenter) {
        const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });
        return Array.from(segmenter.segment(text), (item) => item.segment);
    }
    return Array.from(text);
}

function typeDelay(char: string, backlog: number): number {
    if (backlog > 220) return 3;
    if (backlog > 120) return 5;
    if (backlog > 70) return 8;
    if (char === "\n") return 36;
    if (/[。！？!?]/.test(char)) return 42;
    if (/[、，,；;：:]/.test(char)) return 22;
    return 12;
}

const EXPLANATION_FETCH_TIMEOUT_MS = 70000;

function createTypewriter(onUpdate: (text: string) => void) {
    let visibleText = "";
    let pendingChars: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let idleResolvers: Array<() => void> = [];

    const resolveIdle = () => {
        if (timer || pendingChars.length > 0) return;
        const resolvers = idleResolvers;
        idleResolvers = [];
        resolvers.forEach((resolve) => resolve());
    };

    const schedule = () => {
        if (stopped || timer) return;
        if (pendingChars.length === 0) {
            resolveIdle();
            return;
        }

        const nextChar = pendingChars.shift() || "";
        visibleText += nextChar;
        onUpdate(visibleText);

        timer = setTimeout(() => {
            timer = null;
            schedule();
        }, typeDelay(nextChar, pendingChars.length));
    };

    return {
        enqueue(text: string) {
            if (!text || stopped) return;
            pendingChars.push(...splitGraphemes(text));
            schedule();
        },
        stop() {
            stopped = true;
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            pendingChars = [];
            resolveIdle();
        },
        waitForIdle() {
            if (!timer && pendingChars.length === 0) return Promise.resolve();
            return new Promise<void>((resolve) => {
                idleResolvers.push(resolve);
            });
        },
    };
}

// In the new architecture, we call the backend API which handles the SDK.
// The public API Key is no longer strictly needed in the frontend for these calls.

export const useGeminiStore = create<GeminiState>()(
    persist(
        (set, get) => ({
            isChatGenerating: false,
            streamedResults: new Map(),
            history: [],
            isChatOpen: false,
            // Controller for Chat ONLY. Analysis requests run in background.
            abortController: null,

            setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),

            resetChat: () => {
                const currentController = get().abortController;
                if (currentController) {
                    currentController.abort();
                }
                useChatTypewriterStore.getState().resetChatStream();
                set({ history: [], isChatGenerating: false, abortController: null } as any);
            },

            deleteMessage: (timestamp) => {
                useChatTypewriterStore.getState().clearChatStream(timestamp);
                set((state) => ({
                    history: state.history.filter((msg) => msg.timestamp !== timestamp),
                    bookmarks: state.bookmarks.filter((msg) => msg.timestamp !== timestamp),
                }));
            },

            deleteMessages: (timestamps) => {
                const selected = new Set(timestamps);
                timestamps.forEach((timestamp) => {
                    useChatTypewriterStore.getState().clearChatStream(timestamp);
                });
                set((state) => ({
                    history: state.history.filter((msg) => !selected.has(msg.timestamp)),
                    bookmarks: state.bookmarks.filter((msg) => !selected.has(msg.timestamp)),
                }));
            },

            retryMessage: async (timestamp) => {
                if (get().isChatGenerating) return;
                const history = get().history;
                const messageIndex = history.findIndex((msg) => msg.timestamp === timestamp);
                if (messageIndex === -1) return;

                const message = history[messageIndex];
                const prompt = message.sourcePrompt || (
                    message.role === 'user'
                        ? message.content
                        : [...history.slice(0, messageIndex)].reverse().find((msg) => msg.role === 'user')?.content
                );

                if (!prompt?.trim()) return;
                await get().sendMessage(prompt, { retryOfTimestamp: timestamp });
            },

            sendMessage: async (text, options) => {
                const previousHistory = get().history;
                const newMessage: ChatMessage = {
                    role: 'user',
                    content: text,
                    timestamp: Date.now(),
                    sourcePrompt: text,
                    retryOfTimestamp: options?.retryOfTimestamp,
                };
                const aiTimestamp = newMessage.timestamp + 1;
                const aiPlaceholder: ChatMessage = {
                    role: 'model',
                    content: '',
                    timestamp: aiTimestamp,
                    sourcePrompt: text,
                    retryOfTimestamp: options?.retryOfTimestamp,
                };

                const commitAIMessage = (content: string) => {
                    set((state) => ({
                        history: state.history.map((msg) =>
                            msg.role === 'model' && msg.timestamp === aiTimestamp
                                ? { ...msg, content }
                                : msg
                        )
                    }));
                };

                let fullResponse = "";
                let visibleResponse = "";
                const typewriterStore = useChatTypewriterStore.getState();
                const streamKey = aiTimestamp;
                let pendingChars: string[] = [];
                let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
                let typewriterStopped = false;
                let idleResolvers: Array<() => void> = [];

                const updateVisibleResponse = () => {
                    useChatTypewriterStore.getState().setChatStreamText(streamKey, visibleResponse);
                };

                const resolveTypewriterIdle = () => {
                    if (typewriterTimer || pendingChars.length > 0) return;
                    const resolvers = idleResolvers;
                    idleResolvers = [];
                    resolvers.forEach((resolve) => resolve());
                };

                const scheduleTypewriter = () => {
                    if (typewriterStopped || typewriterTimer) return;
                    if (pendingChars.length === 0) {
                        resolveTypewriterIdle();
                        return;
                    }

                    const nextChar = pendingChars.shift() || "";
                    visibleResponse += nextChar;
                    updateVisibleResponse();

                    typewriterTimer = setTimeout(() => {
                        typewriterTimer = null;
                        scheduleTypewriter();
                    }, typeDelay(nextChar, pendingChars.length));
                };

                const enqueueTypewriterText = (chunk: string) => {
                    pendingChars.push(...splitGraphemes(chunk));
                    scheduleTypewriter();
                };

                const waitForTypewriterIdle = async () => {
                    if (!typewriterTimer && pendingChars.length === 0) return;
                    await new Promise<void>((resolve) => {
                        idleResolvers.push(resolve);
                    });
                };

                const stopTypewriter = () => {
                    typewriterStopped = true;
                    if (typewriterTimer) {
                        clearTimeout(typewriterTimer);
                        typewriterTimer = null;
                    }
                    pendingChars = [];
                    resolveTypewriterIdle();
                };

                // Create the assistant bubble before the network round trip so token streaming is visible immediately.
                typewriterStore.startChatStream(aiTimestamp);
                set((state) => ({
                    history: [...state.history, newMessage, aiPlaceholder],
                    isChatOpen: true,
                    isChatGenerating: true,
                }));

                const controller = new AbortController();
                controller.signal.addEventListener('abort', stopTypewriter, { once: true });
                set({ abortController: controller } as any);

                try {
                    const systemPrompt = `# Role
你是一位拥有20年教学经验的**专业日语导师**。你的学生是母语为中文的初学者。
你的核心任务是：不仅仅回答学生的问题，更要**主动引导**他们学习相关的背景知识、使用场景和注意事项。

# Core Rules (铁律)
1. **母语环境**：学生是**母语为中文的人**，完全理解并能流畅阅读汉字。
2. **严禁中文拼音**：禁止在任何地方出现中文拼音（Hanyu Pinyin）。严禁给中文文字标注拼音。
3. **智能注音 (日语专用)**：仅为日语汉字标注假名。汉字后紧跟括号，如：私（わたし）。
4. **严禁寒暄**：开头严禁说“你好”、“您好”或任何客套话。直接开始正文回答，不要有任何开场白。

# Output Format
请严格遵守 Markdown 格式结构进行回答。
当回答“词语怎么用 / 语法怎么用 / 用法区别 / 有几种用法”这类问题时，必须使用下面的层级结构：
- 一级标题不要使用编号或小圆点，只输出 Markdown 粗体标题：**标题**。
- 一级标题前必须空一行，标题文字要简短；一级标题必须单独占一行，标题后换行再写正文，不要把标题和正文放在同一行。
- 二级结构只能使用半角小写字母：a. 内容、b. 内容、c. 内容。
- 二级条目前也要空一行；不要用“一、”“①”“1.”替代二级结构。
- 除一级标题和学生询问的目标词本身以外，其他你认为需要强调的重点内容使用 Markdown 粗体语法标记；页面会自动显示为下划线。重点必须克制，每个自然段最多 1 处，不要给普通语法术语或整句频繁加重点。
- 如果不需要分层，可以不用编号；一旦编号，就必须遵守上面的格式。
可以使用常见 Markdown 和 LaTeX 行内符号，但箭头等简单符号优先输出为可读符号（如 →），不要让学生看到原始控制命令。
所有回答必须简洁明了，字数尽量控制在 800 字以内（除非是长难句翻译等特殊情况）。`;

                    // Construct context from history. resetChat() clears persisted history, so a cleared chat starts from zero.
                    const contextMessages = [...previousHistory, newMessage].slice(-6);
                    let contextStr = `Current Conversation Context:\n`;
                    contextMessages.forEach(msg => {
                        contextStr += `${msg.role === 'user' ? 'Student' : 'Teacher'}: ${msg.content}\n`;
                    });

                    const response = await fetch('/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: text,
                            systemPrompt: systemPrompt + "\n\n" + contextStr,
                            temperature: 0.7
                        }),
                        signal: controller.signal
                    });

                    if (response.status === 429) {
                        const data = await response.json();
                        throw new Error(data.message || '请求过于频繁，请稍后再试。');
                    }

                    if (!response.ok) {
                        throw new Error(`AI 服务暂时不可用 (${response.status})`);
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                        throw new Error('AI 服务没有返回可读取的流。');
                    }

                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        if (!chunk) continue;
                        fullResponse += chunk;
                        enqueueTypewriterText(chunk);
                    }

                    const tail = decoder.decode();
                    if (tail) {
                        fullResponse += tail;
                        enqueueTypewriterText(tail);
                    }

                    await waitForTypewriterIdle();
                    commitAIMessage(fullResponse);

                } catch (error: any) {
                    stopTypewriter();
                    if (error.name === 'AbortError') {
                        console.log("Chat Generation aborted");
                        if (!fullResponse && !visibleResponse) {
                            set((state) => ({
                                history: state.history.filter((msg) => msg.timestamp !== aiTimestamp)
                            }));
                        } else if (visibleResponse) {
                            commitAIMessage(visibleResponse);
                        }
                    } else {
                        console.error("Gemini Chat Error:", error);
                        commitAIMessage(`(error: ${error.message})`);
                    }
                } finally {
                    useChatTypewriterStore.getState().clearChatStream(aiTimestamp);
                    set({ isChatGenerating: false, abortController: null } as any);
                }
            },

            generateText: async (prompt, systemPrompt, onUpdate, options = { temperature: 0.85, top_p: 0.95 }) => {
                const uniqueKey = options.cacheKey || 'unknown';

                if (get().streamedResults.has(uniqueKey)) {
                    return { text: get().streamedResults.get(uniqueKey) || '', fromCache: false };
                }

                if (get().streamedResults.size >= 2) {
                    throw new Error("同时进行的任务已达上限 (2个)，请耐心等待之前的解读完成后再试。");
                }

                set((state) => {
                    const newMap = new Map(state.streamedResults);
                    newMap.set(uniqueKey, '');
                    return { streamedResults: newMap };
                });

                const setVisibleText = (text: string) => {
                    set((state) => {
                        const newMap = new Map(state.streamedResults);
                        if (!newMap.has(uniqueKey)) return state;
                        newMap.set(uniqueKey, text);
                        return { streamedResults: newMap };
                    });
                    if (onUpdate) onUpdate(text);
                };
                const typewriter = createTypewriter(setVisibleText);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), EXPLANATION_FETCH_TIMEOUT_MS);

                try {
                    const response = await fetch('/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt,
                            systemPrompt,
                            temperature: options.temperature,
                            topP: options.top_p,
                            cacheKey: options.cacheKey,
                            forceRefresh: options.forceRefresh
                        }),
                        signal: controller.signal,
                    });

                    if (response.status === 429) throw new Error('请求过于频繁，请稍后再试。');
                    if (!response.ok) throw new Error(`AI 服务暂时不可用 (${response.status})`);

                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        const data = await response.json();
                        if (data.success && data.text) {
                            typewriter.enqueue(data.text);
                            await typewriter.waitForIdle();
                            return { text: data.text, fromCache: !!data.fromCache };
                        }
                        throw new Error(data.message || data.error || 'AI 服务返回了空结果。');
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                        throw new Error('AI 服务没有返回可读取的流。');
                    }

                    const decoder = new TextDecoder();
                    let fullResponse = "";
                    let buffer = "";
                    const forbiddenTerms = ["核心:", "核心：", "Core:", "用法:", "用法：", "Usage:", "避坑:", "避坑：", "Pitfalls:", "注意:", "注意：", "Note:", "总结:", "总结：", "人话解读", "人话解读：", "AI解读", "AI 详解"];

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        let changed = true;
                        while (changed) {
                            changed = false;
                            for (const term of forbiddenTerms) {
                                const idx = buffer.indexOf(term);
                                if (idx !== -1) {
                                    buffer = buffer.slice(0, idx) + buffer.slice(idx + term.length);
                                    changed = true;
                                }
                            }
                        }

                        if (buffer) {
                            fullResponse += buffer;
                            typewriter.enqueue(buffer);
                            buffer = "";
                        }
                    }

                    const tail = decoder.decode();
                    if (tail) {
                        fullResponse += tail;
                        typewriter.enqueue(tail);
                    }

                    if (!fullResponse.trim()) {
                        throw new Error('AI 服务返回了空结果，请稍后重试。');
                    }

                    await typewriter.waitForIdle();

                    return { text: fullResponse, fromCache: false };

                } catch (error: any) {
                    typewriter.stop();
                    console.error("Gemini Generation Error:", error);
                    if (error.name === 'AbortError') {
                        throw new Error('AI 老师响应超时，请稍后重试。');
                    }
                    throw error;
                } finally {
                    clearTimeout(timeoutId);
                    set((state) => {
                        const newMap = new Map(state.streamedResults);
                        newMap.delete(uniqueKey);
                        return { streamedResults: newMap };
                    });
                }
            },

            cancelGeneration: (key?: string) => {
                const state = get();
                if (state.abortController) {
                    state.abortController.abort();
                }
                if (key) {
                    set((state) => {
                        const newMap = new Map(state.streamedResults);
                        newMap.delete(key);
                        return { streamedResults: newMap, abortController: null };
                    });
                } else {
                    set({ streamedResults: new Map(), abortController: null });
                }
            },

            // Bookmarks Implementation
            bookmarks: [],
            toggleBookmark: (message) => set((state) => {
                const exists = state.bookmarks.find(b => b.timestamp === message.timestamp);
                if (exists) {
                    return { bookmarks: state.bookmarks.filter(b => b.timestamp !== message.timestamp) };
                } else {
                    return { bookmarks: [...state.bookmarks, message] };
                }
            }),
            clearBookmarks: () => set({ bookmarks: [] })
        }),
        {
            name: 'yomi-gemini-storage', // Key for localStorage
            partialize: (state) => ({
                isChatOpen: state.isChatOpen,
                history: state.history,
                bookmarks: state.bookmarks, // Persist bookmarks
                // Do NOT persist activeGenerations across page reloads
            }),
        }
    )
);
