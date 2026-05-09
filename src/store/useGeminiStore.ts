import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: number;
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
    sendMessage: (text: string) => Promise<void>;
    resetChat: () => void;
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

            resetChat: () => set({ history: [] }),

            sendMessage: async (text) => {
                const previousHistory = get().history;
                const newMessage: ChatMessage = {
                    role: 'user',
                    content: text,
                    timestamp: Date.now()
                };
                const aiTimestamp = newMessage.timestamp + 1;
                const aiPlaceholder: ChatMessage = {
                    role: 'model',
                    content: '',
                    timestamp: aiTimestamp
                };

                const updateAIMessage = (content: string) => {
                    set((state) => ({
                        history: state.history.map((msg) =>
                            msg.role === 'model' && msg.timestamp === aiTimestamp
                                ? { ...msg, content }
                                : msg
                        )
                    }));
                };

                let fullResponse = "";

                // Create the assistant bubble before the network round trip so token streaming is visible immediately.
                set((state) => ({
                    history: [...state.history, newMessage, aiPlaceholder],
                    isChatOpen: true,
                    isChatGenerating: true,
                }));

                const controller = new AbortController();
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
所有回答必须简洁明了，字数尽量控制在 500 字以内（除非是长难句翻译等特殊情况）。`;

                    // Construct context from history - Limit to last 4 messages (approx 2 rounds)
                    const contextMessages = [...previousHistory, newMessage].slice(-4);
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

                        updateAIMessage(fullResponse);
                    }

                    const tail = decoder.decode();
                    if (tail) {
                        fullResponse += tail;
                        updateAIMessage(fullResponse);
                    }

                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log("Chat Generation aborted");
                        if (!fullResponse) {
                            set((state) => ({
                                history: state.history.filter((msg) => msg.timestamp !== aiTimestamp)
                            }));
                        }
                    } else {
                        console.error("Gemini Chat Error:", error);
                        updateAIMessage(`(error: ${error.message})`);
                    }
                } finally {
                    set({ isChatGenerating: false, abortController: null } as any);
                }
            },

            generateText: async (prompt, systemPrompt, onUpdate, options = { temperature: 0.85, top_p: 0.95 }) => {
                const uniqueKey = options.cacheKey || 'unknown';

                // Client-side cache check is deprecated. Backend handles cache via 'cacheKey'.
                // if (options.cacheKey && !options.forceRefresh) ...

                // 2. Concurrency Limit Check
                // We allow max 2 concurrent generations as requested
                if (get().streamedResults.size >= 2) {
                    // Optionally notify user or just throw
                    // throw new Error("同时进行的任务太多了，请稍后再试。");
                    // But better to just return error so UI can handle it
                    // Actually validation should happen before we start fetching
                }

                // If we are already generating THIS key, just return the existing stream/promise?
                // But the store doesn't keep promises. 
                // If it's in streamedResults, it's running.
                if (get().streamedResults.has(uniqueKey)) {
                    // It's already running. We generally shouldn't trigger it again.
                    // Just return an indicator? 
                    return { text: '', fromCache: false };
                }

                if (get().streamedResults.size >= 2) {
                    throw new Error("同时进行的任务已达上限 (2个)，请耐心等待之前的解读完成后再试。");
                }

                // Initialize streaming content in Map
                set((state) => {
                    const newMap = new Map(state.streamedResults);
                    newMap.set(uniqueKey, ''); // Start empty
                    return { streamedResults: newMap };
                });

                try {
                    // Note: We deliberately do NOT use an AbortController here.
                    // This allows the request to continue in the background even if the UI unmounts/switches.
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
                        })
                    });

                    if (response.status === 429) throw new Error('请求过于频繁，请稍后再试。');
                    if (!response.ok) throw new Error(`AI 服务暂时不可用 (${response.status})`);

                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        const data = await response.json();
                        if (data.success && data.text) {
                            // Update Map with final text
                            set((state) => {
                                const newMap = new Map(state.streamedResults);
                                newMap.set(uniqueKey, data.text);
                                return { streamedResults: newMap };
                            });
                            if (onUpdate) onUpdate(data.text);
                            return { text: data.text, fromCache: !!data.fromCache };
                        }
                    }

                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = "";
                    let buffer = "";
                    const forbiddenTerms = ["核心:", "核心：", "Core:", "用法:", "用法：", "Usage:", "避坑:", "避坑：", "Pitfalls:", "注意:", "注意：", "Note:", "总结:", "总结：", "人话解读", "人话解读：", "AI解读", "AI 详解"];

                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            buffer += chunk;

                            // ... Token processing (simplified) ...
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

                            // Update Store and Callback
                            fullResponse += buffer;

                            // CRITICAL: Update the persistent map with the accumulating response
                            set((state) => {
                                const newMap = new Map(state.streamedResults);
                                newMap.set(uniqueKey, fullResponse); // Update progressive content
                                return { streamedResults: newMap };
                            });

                            if (onUpdate) onUpdate(fullResponse);
                            buffer = "";
                        }
                    }

                    return { text: fullResponse, fromCache: false };

                } catch (error: any) {
                    console.error("Gemini Generation Error:", error);
                    throw error;
                } finally {
                    // Start a timer to remove the key from active generation map
                    // effectively marking it as "done" but keeping the result for a bit?
                    // No, invalidating it immediately means isGenerating becomes false.
                    // But we want the text to persist? 
                    // The text persists in the local component (since it receives the full text in the end).
                    // The MAP entry is chiefly for "isGenerating" check AND "current stream content".
                    // Once done, we remove it from the map.
                    // The component should handle "done" state by seeing it's not in the map anymore,
                    // BUT it should have already received the final content via onUpdate or polling.

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
                history: state.history,
                bookmarks: state.bookmarks, // Persist bookmarks
                // Do NOT persist activeGenerations across page reloads
            }),
        }
    )
);
