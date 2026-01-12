import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAIUsageStats, incrementAIUsage, D1Database } from '@/lib/db';

export const runtime = 'edge';

const MODEL_ID = "gemma-3-27b-it";
const RPM_LIMIT = 25; // 安全阈值，官方 30
const TPM_LIMIT = 12000; // 安全阈值，官方 15000

// 获取 D1 数据库绑定
function getDB(request: NextRequest): D1Database | null {
    // 1. 尝试从 process.env 获取 (Cloudflare Pages nodejs_compat 标准方式)
    if (typeof process !== 'undefined' && process.env?.DB) {
        return process.env.DB as unknown as D1Database;
    }

    // 2. 尝试从 globalThis 获取
    const globalDB = (globalThis as any).DB;
    if (globalDB) return globalDB;

    // 3. 尝试从 request.env 获取 (部分环境支持)
    const env = (request as any).env;
    if (env?.DB) return env.DB;

    return null;
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        const { prompt, systemPrompt, temperature = 0.85, topP = 0.95, cacheKey } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const db = getDB(req);
        if (!db) {
            console.error('[AI API] D1 Database binding "DB" is missing');
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // 0. 如果有 cacheKey，先尝试直接从后端读取缓存 (多一层保险)
        if (cacheKey) {
            const cached = await db.prepare('SELECT value FROM ai_cache WHERE key = ?').bind(cacheKey).first<{ value: string }>();
            if (cached) {
                console.log(`[AI API] Backend Cache Hit: ${cacheKey}`);
                return NextResponse.json({ success: true, text: cached.value, fromCache: true });
            }
        }

        // 1. 预估 Token 消耗 (保守估计)
        // 中日文约 1.5 - 2 token/char，英文约 0.3 - 0.5
        const estInputTokens = Math.ceil((prompt.length + (systemPrompt?.length || 0)) * 1.5);

        // 2. 检查配额
        // 获取当前分钟 Key (UTC 时间)
        const now = new Date();
        const minuteKey = `${now.toISOString().slice(0, 16).replace('T', ' ')}`; // YYYY-MM-DD HH:mm

        const stats = await getAIUsageStats(db, MODEL_ID, minuteKey);
        const currentRPM = stats?.request_count || 0;
        const currentTPM = stats?.token_count || 0;

        if (currentRPM >= RPM_LIMIT || currentTPM + estInputTokens > TPM_LIMIT) {
            console.warn(`[AI RateLimit] Limit hit: RPM ${currentRPM}/${RPM_LIMIT}, TPM ${currentTPM}/${TPM_LIMIT} (est ${estInputTokens})`);
            return NextResponse.json({
                error: 'Too Many Requests',
                message: '老师现在太忙了，请等一分钟后再试（流量配额已接近限制）。',
                retryAfter: 60
            }, { status: 429 });
        }

        // 3. 预先占位增加计数 (防止瞬时并发绕过检查)
        try {
            await incrementAIUsage(db, MODEL_ID, minuteKey, 1, estInputTokens);
        } catch (e) {
            console.error('[AI Usage] Failed to increment initial usage', e);
            // 继续执行，防止数据库错误阻断 AI 服务，但记录日志
        }

        // 4. 调用 Gemini
        // 优先使用后端独有的 GEMINI_API_KEY，如果没有则尝试 NEXT_PUBLIC_GEMINI_API_KEY
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
        if (!apiKey) {
            return NextResponse.json({ error: 'AI API Key is missing' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL_ID,
            generationConfig: {
                temperature,
                topP,
                maxOutputTokens: 2000,
            }
        });

        // 合并 Prompt (Gemma 3 推荐将 System Instructions 放入 Prompt 开头)
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Question:\n${prompt}` : prompt;

        // 流式调用
        const result = await model.generateContentStream(fullPrompt);

        // 5. 准备流式响应
        const encoder = new TextEncoder();
        let fullText = "";

        // 用于控制流的状态
        let isStreamClosed = false;

        const responseStream = new ReadableStream({
            async start(controller) {
                // 定义后台处理逻辑 (唯一的一次流消费)
                const processStream = async () => {
                    try {
                        for await (const chunk of result.stream) {
                            const text = chunk.text();
                            if (text) {
                                fullText += text;
                                // 如果客户端未断开，发送数据
                                if (!isStreamClosed) {
                                    try {
                                        controller.enqueue(encoder.encode(text));
                                    } catch (e) {
                                        // 可能是客户端已断开
                                        console.warn('[AI API] Client disconnected, marking stream closed.');
                                        isStreamClosed = true;
                                    }
                                }
                            }
                        }

                        // 流结束，关闭控制器
                        if (!isStreamClosed) {
                            controller.close();
                            isStreamClosed = true;
                        }

                        // 6. 后台统计与缓存 (在流结束后执行)
                        try {
                            const response = await result.response;
                            const usage = response.usageMetadata;

                            // 更新 Token 统计
                            if (usage) {
                                const actualTotal = usage.totalTokenCount;
                                const correction = actualTotal - estInputTokens;
                                if (correction !== 0) {
                                    await incrementAIUsage(db, MODEL_ID, minuteKey, 0, correction);
                                }
                                console.log(`[AI Usage] Minute: ${minuteKey}, Actual total: ${actualTotal} (est was ${estInputTokens})`);
                            }

                            // 写入缓存
                            if (cacheKey && fullText) {
                                await db.prepare(`
                                    INSERT OR REPLACE INTO ai_cache (key, value, created_at)
                                    VALUES (?, ?, ?)
                                `).bind(cacheKey, fullText, new Date().toISOString()).run();
                                console.log(`[AI API] Background Cache Saved: ${cacheKey}`);
                            }
                        } catch (statsError) {
                            console.error('[AI API] Stats/Cache Error:', statsError);
                        }

                    } catch (err: any) {
                        console.error('[AI API] Stream Processing Error:', err);
                        if (!isStreamClosed) {
                            controller.error(err);
                            isStreamClosed = true;
                        }
                    }
                };

                // 启动处理任务
                const task = processStream();

                // 使用 waitUntil 保持后台运行
                if (ctx && typeof ctx.waitUntil === 'function') {
                    ctx.waitUntil(task);
                } else {
                    // 非 Cloudflare 环境下等待任务完成 (防止过早终止)
                    await task;
                }
            },
            cancel() {
                isStreamClosed = true;
                console.log('[AI API] Stream cancelled by client.');
            }
        });

        return new Response(responseStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('AI Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
