
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as webllm from '@mlc-ai/web-llm';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

interface WebLLMState {
    // Model State
    engine: webllm.MLCEngineInterface | null;
    isLoading: boolean;
    progress: number;
    progressText: string;
    isModelLoaded: boolean;

    // Chat State
    history: ChatMessage[];
    isChatOpen: boolean;
    currentContext: string | null; // e.g., "Grammar: 〜こと"

    // Actions
    initializeEngine: () => Promise<void>;
    sendMessage: (text: string, context?: string) => Promise<void>;
    resetChat: () => void;
    setChatOpen: (isOpen: boolean) => void;
    setContext: (context: string | null) => void;
    generateText: (prompt: string, systemPrompt: string, onUpdate?: (text: string) => void) => Promise<string>;
    unloadModel: () => Promise<void>;
}

// WebLLM model library version - must match the compatible MLC LLM version
const MODEL_LIB_VERSION = "v0_2_80";
const MODEL_LIB_URL_PREFIX = "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/";

// Config will be generated dynamically
const getModelConfig = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
        "model_list": [
            {
                // Point to our NEWLY fine-tuned model weights (re-trained with safe params)
                "model": `${origin}/models/qwen-grammar-teacher/resolve/main`,
                // Use our custom model ID
                "model_id": "qwen-grammar-teacher-q4f16_1",
                // Use the official Qwen3-1.7B WASM library (compatible with our architecture)
                "model_lib": MODEL_LIB_URL_PREFIX + MODEL_LIB_VERSION + "/Qwen3-1.7B-q4f16_1-ctx4k_cs1k-webgpu.wasm",
                "vram_required_MB": 2000,
                "low_resource_required": true,
                "overrides": {
                    "context_window_size": 2048,
                }
            }
        ]
    };
};

// Use a simple global instance for the engine since it can't be purely serializable in Zustand
let globalEngine: webllm.MLCEngineInterface | null = null;

export const useWebLLM = create<WebLLMState>()(
    persist(
        (set, get) => ({
            engine: null,
            isLoading: false,
            progress: 0,
            progressText: '',
            isModelLoaded: false,
            history: [],
            isChatOpen: false,
            currentContext: null,

            setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
            setContext: (context) => set({ currentContext: context }),

            initializeEngine: async () => {
                if (globalEngine || get().isLoading || get().isModelLoaded) return;

                set({ isLoading: true, progress: 0, progressText: 'AI 老师准备中...' });

                try {
                    // Custom handler to capture progress
                    const initProgressCallback = (report: webllm.InitProgressReport) => {
                        set({
                            progress: report.progress,
                            progressText: report.text
                        });
                    };

                    // Detect GPU
                    const appConfig = getModelConfig();
                    // const gpuDetect = await webllm.hasModelInCache("Qwen2.5-1.5B-Instruct-q4f16_1-MLC", appConfig); 

                    globalEngine = await webllm.CreateMLCEngine(
                        "qwen-grammar-teacher-q4f16_1",
                        {
                            appConfig: appConfig,
                            initProgressCallback: initProgressCallback
                        }
                    );

                    set({ isModelLoaded: true, isLoading: false });
                } catch (err) {
                    console.error("Failed to load model", err);
                    set({ isLoading: false, progressText: '加载失败: ' + (err as Error).message });
                }
            },

            sendMessage: async (text, context) => {
                if (!globalEngine) await get().initializeEngine();
                if (!globalEngine) return;

                const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
                const systemPrompt = context
                    ? `你是一位专业的日语语法老师。用户正在学习「${context}」。请结合这个上下文回答用户的问题。解释要清晰、易懂，拒绝废话，不要重复相同的语句。`
                    : `你是一位专业的日语语法老师。请用中文回答用户的日语问题。解释要清晰、易懂，拒绝废话，不要重复相同的语句。`;

                // Update UI with user message immediately
                set(state => ({ history: [...state.history, userMsg] }));

                let assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() };
                set(state => ({ history: [...state.history, assistantMsg] }));

                try {
                    const messages = [
                        { role: 'system', content: systemPrompt },
                        ...get().history.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: text }
                    ];

                    const completion = await globalEngine.chat.completions.create({
                        messages: messages as any,
                        stream: true,
                        // Official Qwen3 recommended settings
                        temperature: 0.6,
                        top_p: 0.9,
                        repetition_penalty: 1.05 // Light penalty is enough for decent models
                    } as any);

                    let fullResponse = "";
                    for await (const chunk of completion) {
                        const delta = chunk.choices[0]?.delta?.content || "";
                        fullResponse += delta;

                        // Stream update
                        set(state => {
                            const newHistory = [...state.history];
                            const lastMsg = newHistory[newHistory.length - 1];
                            if (lastMsg.role === 'assistant') {
                                lastMsg.content = fullResponse;
                            }
                            return { history: newHistory };
                        });
                    }
                } catch (err) {
                    console.error("Chat error", err);
                    set(state => {
                        const newHistory = [...state.history];
                        newHistory.push({ role: 'assistant', content: '😭 老师开小差了，请重试一下...', timestamp: Date.now() });
                        return { history: newHistory };
                    });
                }
            },

            generateText: async (prompt, systemPrompt, onUpdate, options = { temperature: 0.7, top_p: 0.9 }) => {
                if (!globalEngine) await get().initializeEngine();
                if (!globalEngine) throw new Error("Model not initialized");

                try {
                    const messages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ];

                    const completion = await globalEngine.chat.completions.create({
                        messages: messages as any,
                        stream: true,
                        temperature: options.temperature,
                        top_p: options.top_p,
                    } as any);

                    let safeResponse = "";
                    let buffer = "";
                    const forbiddenTerms = ["核心:", "核心：", "Core:", "用法:", "用法：", "Usage:", "避坑:", "避坑：", "Pitfalls:", "例句:", "例句：", "Example:", "注意:", "注意：", "Note:", "总结:", "总结：", "**", "人话解读", "人话解读：", "神例句", "神例句：", "AI解读", "AI 详解"];

                    for await (const chunk of completion) {
                        const delta = chunk.choices[0]?.delta?.content || "";
                        buffer += delta;

                        // 1. Remove complete forbidden terms from buffer
                        let changed = true;
                        while (changed) {
                            changed = false;
                            for (const term of forbiddenTerms) {
                                const idx = buffer.indexOf(term);
                                if (idx !== -1) {
                                    // Remove the term
                                    buffer = buffer.slice(0, idx) + buffer.slice(idx + term.length);
                                    changed = true;
                                }
                            }
                        }

                        // 2. Check for partial matches at the end
                        let maxPartialMatchLen = 0;
                        for (const term of forbiddenTerms) {
                            // Check if buffer ends with a prefix of term
                            // Only care if it's potentially growing into the term
                            for (let i = 1; i < term.length; i++) {
                                if (buffer.endsWith(term.slice(0, i))) {
                                    maxPartialMatchLen = Math.max(maxPartialMatchLen, i);
                                }
                            }
                        }

                        // 3. Commit safe part
                        if (maxPartialMatchLen > 0) {
                            // Keep the partial match in buffer, commit the rest
                            const splitIdx = buffer.length - maxPartialMatchLen;
                            safeResponse += buffer.slice(0, splitIdx);
                            buffer = buffer.slice(splitIdx);
                        } else {
                            // No partial match, commit all
                            safeResponse += buffer;
                            buffer = "";
                        }

                        if (onUpdate) onUpdate(safeResponse);
                    }

                    // Flush remaining buffer (it wasn't a forbidden term completely, and stream ended)
                    safeResponse += buffer;
                    if (onUpdate) onUpdate(safeResponse);

                    return safeResponse;
                } catch (err) {
                    console.error("Generation error", err);
                    throw err;
                }
            },

            resetChat: () => {
                if (globalEngine) globalEngine.resetChat();
                set({ history: [] });
            },

            unloadModel: async () => {
                if (globalEngine) {
                    await globalEngine.unload();
                    globalEngine = null;
                }
                set({ engine: null, isModelLoaded: false, isLoading: false, progress: 0 });
            }
        }),
        {
            name: 'yomi-ai-teacher-storage',
            partialize: (state) => ({ history: state.history }), // Persist history only
        }
    )
);
