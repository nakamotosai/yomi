import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: number;
}

interface GeminiState {
    // Model State
    isChatGenerating: boolean;
    isAnalysisGenerating: boolean; // For "AI 详解"

    // Chat State
    history: ChatMessage[];
    isChatOpen: boolean;

    // Actions
    sendMessage: (text: string) => Promise<void>;
    resetChat: () => void;
    setChatOpen: (isOpen: boolean) => void;
    // Stateless generation for "AI 详解"
    generateText: (prompt: string, systemPrompt: string, onUpdate?: (text: string) => void, options?: { temperature?: number, top_p?: number, cacheKey?: string, forceRefresh?: boolean }) => Promise<{ text: string, fromCache: boolean }>;
    cancelGeneration: () => void;
}

// In the new architecture, we call the backend API which handles the SDK.
// The public API Key is no longer strictly needed in the frontend for these calls.

export const useGeminiStore = create<GeminiState>()(
    persist(
        (set, get) => ({
            isChatGenerating: false,
            isAnalysisGenerating: false,
            history: [],
            isChatOpen: false,
            abortController: null,

            setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),

            resetChat: () => set({ history: [] }),

            sendMessage: async (text) => {
                const newMessage: ChatMessage = {
                    role: 'user',
                    content: text,
                    timestamp: Date.now()
                };

                // Optimistically add user message
                set((state) => ({
                    history: [...state.history, newMessage],
                    isChatOpen: true,
                    isChatGenerating: true,
                }));

                const controller = new AbortController();
                set({ abortController: controller } as any);

                try {
                    const currentState = get();
                    const history = currentState.history;

                    const systemPrompt = `# Role
你是一位拥有20年教学经验的**专业日语导师**。你的学生是母语为中文的初学者。
你的核心任务是：不仅仅回答学生的问题，更要**主动引导**他们学习相关的背景知识、使用场景和注意事项。

# Core Rules (铁律)
1. **母语环境**：学生是**母语为中文的人**，完全理解并能流畅阅读汉字。
2. **严禁中文拼音**：禁止在任何地方出现中文拼音（Hanyu Pinyin）。严禁给中文文字标注拼音。
3. **智能注音 (日语专用)**：仅为日语汉字标注假名。汉字后紧跟括号，如：私（わたし）。
4. **简洁开场**：开场白要干脆利落。

# Output Format
请严格遵守 Markdown 格式结构进行回答。`;

                    // Construct context from history
                    const contextMessages = history.slice(-6);
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

                    // Create a placeholder message for the AI response
                    const aiPlaceholder: ChatMessage = {
                        role: 'model',
                        content: '',
                        timestamp: Date.now()
                    };

                    set((state) => ({
                        history: [...state.history, aiPlaceholder]
                    }));

                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = "";

                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            fullResponse += chunk;

                            // Update the last message progressively
                            set((state) => ({
                                history: state.history.map((msg, index) =>
                                    index === state.history.length - 1 ? { ...msg, content: fullResponse } : msg
                                )
                            }));
                        }
                    }

                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log("Chat Generation aborted");
                    } else {
                        console.error("Gemini Chat Error:", error);
                        set((state) => ({
                            history: [...state.history, {
                                role: 'model',
                                content: `(抱歉，发生了错误: ${error.message || '连接失败'})`,
                                timestamp: Date.now()
                            }]
                        }));
                    }
                } finally {
                    set({ isChatGenerating: false, abortController: null } as any);
                }
            },

            generateText: async (prompt, systemPrompt, onUpdate, options = { temperature: 0.85, top_p: 0.95 }) => {
                // Check Cache Logic
                if (options.cacheKey && !options.forceRefresh) {
                    try {
                        const res = await fetch(`/api/cache?key=${encodeURIComponent(options.cacheKey)}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.success && data.text) {
                                console.log('[GeminiStore] Cache Hit:', options.cacheKey);
                                if (onUpdate) onUpdate(data.text);
                                return { text: data.text, fromCache: true };
                            }
                        }
                    } catch (err) {
                        console.error('[GeminiStore] Cache check failed:', err);
                    }
                }

                const controller = new AbortController();
                set({ isAnalysisGenerating: true, abortController: controller } as any);

                try {
                    const response = await fetch('/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt,
                            systemPrompt,
                            temperature: options.temperature,
                            topP: options.top_p,
                            cacheKey: options.cacheKey // Pass cacheKey to backend
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

                    // Handle backend response (could be JSON for cache hit or stream)
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        const data = await response.json();
                        if (data.success && data.text) {
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

                            // Process forbidden terms
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

                            // Check for partial matches
                            let maxPartialMatchLen = 0;
                            for (const term of forbiddenTerms) {
                                for (let i = 1; i < term.length; i++) {
                                    if (buffer.endsWith(term.slice(0, i))) {
                                        maxPartialMatchLen = Math.max(maxPartialMatchLen, i);
                                    }
                                }
                            }

                            if (maxPartialMatchLen > 0) {
                                const splitIdx = buffer.length - maxPartialMatchLen;
                                const safePart = buffer.slice(0, splitIdx);
                                if (safePart) {
                                    fullResponse += safePart;
                                    if (onUpdate) onUpdate(fullResponse);
                                    buffer = buffer.slice(splitIdx);
                                }
                            } else if (buffer) {
                                fullResponse += buffer;
                                if (onUpdate) onUpdate(fullResponse);
                                buffer = "";
                            }
                        }
                    }

                    // Flush remaining
                    if (buffer) {
                        fullResponse += buffer;
                        if (onUpdate) onUpdate(fullResponse);
                    }

                    if (!fullResponse) throw new Error("Empty response from AI");

                    // No need for frontend cache save, as discussed. Backend handles it.

                    return { text: fullResponse, fromCache: false };
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log("Generation aborted");
                        return { text: "", fromCache: false };
                    }
                    console.error("Gemini Generation Error:", error);
                    throw error;
                } finally {
                    set({ isAnalysisGenerating: false, abortController: null } as any);
                }
            },

            cancelGeneration: () => {
                const controller = (get() as any).abortController;
                if (controller) controller.abort();
                set({ isChatGenerating: false, isAnalysisGenerating: false, abortController: null } as any);
            }
        }),
        {
            name: 'yomi-gemini-storage',
            partialize: (state) => ({ history: state.history }),
        }
    )
);
