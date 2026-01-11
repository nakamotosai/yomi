import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Initialize API Client
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
// Explicitly using the user-requested model
const modelId = "gemma-3-27b-it";

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

                    // Create a system prompt that enforces the "Japanese Teacher" persona (Fluent in Chinese)
                    // Create a system prompt that enforces the "Japanese Teacher" persona (Fluent in Chinese)
                    const systemPrompt = `# Role
你是一位拥有20年教学经验的**专业日语导师**。你的学生是母语为中文的初学者。
你的核心任务是：不仅仅回答学生的问题，更要**主动引导**他们学习相关的背景知识、使用场景和注意事项。

# Core Rules (铁律)
1. **母语环境**：学生是**母语为中文的人**，完全理解并能流畅阅读汉字。
2. **严禁中文拼音**：禁止在任何地方出现中文拼音（Hanyu Pinyin）。严禁给中文文字（开场白、标题、解释、例句翻译）标注拼音。绝对禁止写出类似 [你好(nǐ hǎo)] 的内容。
3. **智能注音 (日语专用)**：仅为日语汉字标注假名。汉字后紧跟括号，如：私（わたし）。纯假名单词（如：おはよう）不标注。
4. **简洁开场**：开场白要干脆利落，直接进入教学内容，不要废话。

# Teaching Strategy (教学策略)
1.  **核心含义**：用最通俗的中文解释意思。
2.  **句式与场景**：阐述适用场合与注意事项。
3.  **互动式教学**：
    - **默认建议仅提供 1 个高质量实战例句**。
    - 在回答末尾**必须**抛出一个能引导学生发散思考的【追问互动】。
    - 告知学生：如需更多例句或想深入了解（如同义/反义词），请直接提出。

# Output Format (回答模板)
请严格遵守以下 Markdown 格式结构进行回答：

### 【核心解答】
(解释含义、用法与适用场景。如果有初学者易错点，请在此提醒。)

### 【实战例句】
* 日文原文 (带智能注音)
* 中文翻译

### 【追问互动】
(引导学生进行下一步，例如：需要更多例句吗？想了解这个词的反义词吗？需要练习一下这个词的接续吗？)`;

                    // Construct the full prompt context from history
                    // We only take the last 10 messages to avoid token limits and keep context relevant
                    const contextMessages = history.slice(-10);
                    let fullPrompt = `${systemPrompt}\n\nCurrent Conversation:\n`;
                    contextMessages.forEach(msg => {
                        fullPrompt += `${msg.role === 'user' ? 'Student' : 'Teacher'}: ${msg.content}\n`;
                    });
                    fullPrompt += `Student: ${text}\nTeacher:`; // Explicitly prompt for the next teacher response

                    const model = genAI.getGenerativeModel({
                        model: modelId,
                        generationConfig: {
                            temperature: 0.7, // Lower temperature for more factual/focused answers
                            topP: 0.95,
                            maxOutputTokens: 2000,
                        }
                    });

                    const signal = controller.signal;
                    const result = await model.generateContentStream(fullPrompt);

                    // Create a placeholder message for the AI response
                    const aiMessageId = Date.now(); // Use timestamp as temp ID
                    const aiPlaceholder: ChatMessage = {
                        role: 'model',
                        content: '',
                        timestamp: aiMessageId
                    };

                    set((state) => ({
                        history: [...state.history, aiPlaceholder]
                    }));

                    let fullResponse = "";

                    for await (const chunk of result.stream) {
                        if (signal.aborted) throw new Error("Aborted");
                        const delta = chunk.text();
                        fullResponse += delta;

                        // Update the last message (AI response) progressively
                        set((state) => ({
                            history: state.history.map((msg, index) =>
                                index === state.history.length - 1 ? { ...msg, content: fullResponse } : msg
                            )
                        }));
                    }

                } catch (error: any) {
                    if (error.message === "Aborted") {
                        console.log("Chat Generation aborted");
                    } else {
                        console.error("Gemini Chat Error:", error);
                        // Add error message to chat? or just toast? 
                        // For now let's append an error note to the last message if it exists, or push a new one.
                        set((state) => ({
                            history: [...state.history, {
                                role: 'model',
                                content: `(Error: ${error.message || 'Something went wrong.'})`,
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
                                // Cache Hit
                                console.log('[GeminiStore] Cache Hit:', options.cacheKey);
                                if (onUpdate) onUpdate(data.text);
                                return { text: data.text, fromCache: true };
                            }
                        }
                    } catch (err) {
                        console.error('[GeminiStore] Cache check failed:', err);
                    }
                }

                // Cancel previous generation if any
                const prevController = (get() as any).abortController;
                if (prevController) prevController.abort();

                const controller = new AbortController();
                set({ isAnalysisGenerating: true, abortController: controller } as any);

                try {
                    const signal = controller.signal;
                    const model = genAI.getGenerativeModel({
                        model: modelId,
                        // Gemma-3 models usually don't support systemInstruction via API
                        generationConfig: {
                            temperature: options.temperature,
                            topP: options.top_p,
                            maxOutputTokens: 2000,
                        }
                    });

                    // Manually merge system prompt for Gemma
                    const fullPrompt = `${systemPrompt}\n\nUser Question:\n${prompt}`;
                    const result = await model.generateContentStream(fullPrompt);

                    let fullResponse = "";
                    let buffer = "";
                    const forbiddenTerms = ["核心:", "核心：", "Core:", "用法:", "用法：", "Usage:", "避坑:", "避坑：", "Pitfalls:", "注意:", "注意：", "Note:", "总结:", "总结：", "人话解读", "人话解读：", "AI解读", "AI 详解"];

                    for await (const chunk of result.stream) {
                        try {
                            if (signal.aborted) throw new Error("Aborted");

                            // Get text from chunk, handle potential empty/blocked responses
                            const delta = chunk.text();
                            if (!delta) continue;

                            buffer += delta;

                            // 1. Remove complete forbidden terms from buffer
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

                            // 2. Check for partial matches at the end
                            let maxPartialMatchLen = 0;
                            for (const term of forbiddenTerms) {
                                for (let i = 1; i < term.length; i++) {
                                    if (buffer.endsWith(term.slice(0, i))) {
                                        maxPartialMatchLen = Math.max(maxPartialMatchLen, i);
                                    }
                                }
                            }

                            // 3. Commit safe part
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
                        } catch (err: any) {
                            console.warn('[GeminiStore] Chunk processing error:', err.message);
                            // Continue to next chunk if possible
                        }
                    }

                    // Flush remaining buffer
                    if (buffer) {
                        fullResponse += buffer;
                        if (onUpdate) onUpdate(fullResponse);
                    }

                    if (!fullResponse) {
                        throw new Error("Empty response from AI");
                    }

                    // Save to Cache if key is provided
                    if (options.cacheKey && fullResponse) {
                        try {
                            await fetch('/api/cache', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ key: options.cacheKey, text: fullResponse })
                            });
                            console.log('[GeminiStore] Saved to cache:', options.cacheKey);
                        } catch (e) {
                            console.error('[GeminiStore] Cache save failed:', e);
                        }
                    }

                    return { text: fullResponse, fromCache: false };
                } catch (error: any) {
                    if (error.message === "Aborted") {
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
                if (controller) {
                    controller.abort();
                }
                set({ isChatGenerating: false, isAnalysisGenerating: false, abortController: null } as any);
            }
        }),
        {
            name: 'yomi-gemini-storage',
            partialize: (state) => ({ history: state.history }),
        }
    )
);
