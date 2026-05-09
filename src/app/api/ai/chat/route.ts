import { NextRequest, NextResponse } from 'next/server';
import { getAIUsageStats, incrementAIUsage, D1Database } from '@/lib/db';
import { RemoteD1Client } from '@/lib/remoteD1';

export const runtime = 'edge';

const DEFAULT_MODEL_ID = 'qwen/qwen3.5-122b-a10b';
const DEFAULT_CLIPROXY_BASE_URL = 'http://127.0.0.1:8317/v1';
const RPM_LIMIT = 25;
const TPM_LIMIT = 12000;
const MAX_OUTPUT_TOKENS = 2000;
const UPSTREAM_FETCH_TIMEOUT_MS = 45000;
const UPSTREAM_STREAM_IDLE_TIMEOUT_MS = 60000;

type ChatRole = 'system' | 'user';

interface ChatMessage {
    role: ChatRole;
    content: string;
}

interface AIRequestBody {
    prompt?: string;
    systemPrompt?: string;
    temperature?: number;
    topP?: number;
    cacheKey?: string;
    forceRefresh?: boolean;
}

interface OpenAIStreamChoice {
    delta?: {
        content?: string;
        reasoning_content?: string;
    };
}

interface OpenAIStreamChunk {
    choices?: OpenAIStreamChoice[];
    usage?: {
        total_tokens?: number;
    };
}

class UpstreamTimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UpstreamTimeoutError';
    }
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

function getEnvValue(...names: string[]): string {
    if (typeof process === 'undefined' || !process.env) return '';

    for (const [key, value] of Object.entries(process.env)) {
        const trimmedKey = key.trim();
        if (names.includes(trimmedKey)) {
            return value?.trim() || '';
        }
    }

    return '';
}

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
}

function buildMessages(prompt: string, systemPrompt?: string): ChatMessage[] {
    if (!systemPrompt) {
        return [{ role: 'user', content: prompt }];
    }

    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
    ];
}

function extractStreamText(chunk: OpenAIStreamChunk): string {
    return (chunk.choices || [])
        .map((choice) => `${choice.delta?.content || ''}${choice.delta?.reasoning_content || ''}`)
        .join('');
}

function parseSSELine(line: string): { text: string; totalTokens?: number; done: boolean } | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return null;

    const payload = trimmed.slice(5).trim();
    if (!payload) return null;
    if (payload === '[DONE]') return { text: '', done: true };

    try {
        const chunk = JSON.parse(payload) as OpenAIStreamChunk;
        const totalTokens = typeof chunk.usage?.total_tokens === 'number' ? chunk.usage.total_tokens : undefined;
        return { text: extractStreamText(chunk), totalTokens, done: false };
    } catch (error) {
        console.warn('[AI API] Failed to parse upstream SSE chunk:', error);
        return null;
    }
}

async function finalizeUsageAndCache(
    db: D1Database,
    modelId: string,
    minuteKey: string,
    estInputTokens: number,
    actualTotalTokens: number | undefined,
    cacheKey: string | undefined,
    fullText: string
): Promise<void> {
    try {
        if (typeof actualTotalTokens === 'number') {
            const correction = actualTotalTokens - estInputTokens;
            if (correction !== 0) {
                await incrementAIUsage(db, modelId, minuteKey, 0, correction);
            }
            console.log(`[AI Usage] Minute: ${minuteKey}, Actual total: ${actualTotalTokens} (est was ${estInputTokens})`);
        }

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
}

async function fetchUpstreamWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...init,
            signal: timeoutController.signal,
        });
    } catch (error) {
        if (isAbortError(error)) {
            throw new UpstreamTimeoutError(`AI upstream did not respond within ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function readUpstreamChunkWithTimeout(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    timeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array>> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new UpstreamTimeoutError(`AI upstream stream was idle for ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([reader.read(), timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

// 获取 D1 数据库绑定
function getDB(request: NextRequest): D1Database | null {
    // 1. 尝试从 process.env 获取 (Cloudflare Pages nodejs_compat 标准方式)
    if (typeof process !== 'undefined' && process.env?.DB) {
        return process.env.DB as unknown as D1Database;
    }

    // 2. 尝试从 globalThis 获取
    const globalDB = (globalThis as unknown as { DB: D1Database }).DB;
    if (globalDB) return globalDB;

    // 3. 尝试从 request.env 获取 (部分环境支持)
    const env = (request as unknown as { env: { DB: D1Database } }).env;
    if (env?.DB) return env.DB;

    // 4. 本地开发环境：尝试连接远程 D1 (增强容错处理)
    let apiToken = '';
    let accountId = '';
    let dbId = '';

    for (const [key, value] of Object.entries(process.env)) {
        const trimmedKey = key.trim();
        const trimmedValue = value?.trim() || '';
        if (trimmedKey === 'CLOUDFLARE_API_TOKEN') apiToken = trimmedValue;
        if (trimmedKey === 'CLOUDFLARE_ACCOUNT_ID') accountId = trimmedValue;
        if (trimmedKey === 'CLOUDFLARE_D1_ID') dbId = trimmedValue;
    }

    if (apiToken && accountId && dbId) {
        console.log('[AI API] Local Dev: Initializing Remote D1 Client');
        return new RemoteD1Client(apiToken, accountId, dbId);
    }

    console.warn('[AI API] DB not found. Env check:', {
        hasToken: !!apiToken,
        hasAccount: !!accountId,
        hasDb: !!dbId
    });

    return null;
}

export async function POST(req: NextRequest, ctx: unknown) {
    try {
        const {
            prompt,
            systemPrompt,
            temperature = 0.85,
            topP = 0.95,
            cacheKey,
            forceRefresh
        } = await req.json() as AIRequestBody;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const db = getDB(req);
        if (!db) {
            console.error('[AI API] D1 Database binding "DB" is missing');
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        if (cacheKey) {
            if (forceRefresh) {
                console.log(`[AI API] Force Refresh: Deleting old cache for ${cacheKey}`);
                try {
                    await db.prepare('DELETE FROM ai_cache WHERE key = ?').bind(cacheKey).run();
                } catch (error) {
                    console.warn('[AI API] Failed to delete old cache:', error);
                }
            } else {
                const cached = await db.prepare('SELECT value FROM ai_cache WHERE key = ?').bind(cacheKey).first<{ value: string }>();
                if (cached) {
                    console.log(`[AI API] Backend Cache Hit: ${cacheKey}`);
                    return NextResponse.json({ success: true, text: cached.value, fromCache: true });
                }
            }
        }

        const modelId = getEnvValue('CLIPROXY_MODEL') || DEFAULT_MODEL_ID;
        const apiKey = getEnvValue('CLIPROXY_API_KEY', 'CODEX_CLIPROXYAPI_8317_API_KEY');
        const apiBaseUrl = normalizeBaseUrl(getEnvValue('CLIPROXY_API_BASE_URL') || DEFAULT_CLIPROXY_BASE_URL);

        if (!apiKey) {
            return NextResponse.json({ error: 'CLIPROXY_API_KEY is missing' }, { status: 500 });
        }

        const estInputTokens = Math.ceil((prompt.length + (systemPrompt?.length || 0)) * 1.5);
        const now = new Date();
        const minuteKey = `${now.toISOString().slice(0, 16).replace('T', ' ')}`;

        const stats = await getAIUsageStats(db, modelId, minuteKey);
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

        try {
            await incrementAIUsage(db, modelId, minuteKey, 1, estInputTokens);
        } catch (error) {
            console.error('[AI Usage] Failed to increment initial usage', error);
        }

        const upstreamResponse = await fetchUpstreamWithTimeout(`${apiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: buildMessages(prompt, systemPrompt),
                temperature,
                top_p: topP,
                max_tokens: MAX_OUTPUT_TOKENS,
                stream: true,
                stream_options: { include_usage: true },
            }),
        }, UPSTREAM_FETCH_TIMEOUT_MS);

        if (!upstreamResponse.ok) {
            const upstreamError = await upstreamResponse.text();
            console.error('[AI API] Upstream cliproxyapi error:', upstreamResponse.status, upstreamError.slice(0, 500));
            return NextResponse.json(
                { error: 'AI upstream unavailable', status: upstreamResponse.status },
                { status: 502 }
            );
        }

        if (!upstreamResponse.body) {
            return NextResponse.json({ error: 'AI upstream returned empty body' }, { status: 502 });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = upstreamResponse.body.getReader();
        let fullText = '';
        let sseBuffer = '';
        let actualTotalTokens: number | undefined;
        let isStreamClosed = false;

        const responseStream = new ReadableStream({
            start(controller) {
                const processStream = async () => {
                    try {
                        while (true) {
                            const nextChunk = await readUpstreamChunkWithTimeout(reader, UPSTREAM_STREAM_IDLE_TIMEOUT_MS);
                            const { done, value } = nextChunk;
                            if (done) break;

                            sseBuffer += decoder.decode(value, { stream: true });
                            const lines = sseBuffer.split(/\r?\n/);
                            sseBuffer = lines.pop() || '';

                            for (const line of lines) {
                                const parsed = parseSSELine(line);
                                if (!parsed) continue;
                                if (typeof parsed.totalTokens === 'number') {
                                    actualTotalTokens = parsed.totalTokens;
                                }
                                if (parsed.done) continue;
                                if (!parsed.text) continue;

                                fullText += parsed.text;
                                if (!isStreamClosed) {
                                    try {
                                        controller.enqueue(encoder.encode(parsed.text));
                                    } catch {
                                        console.warn('[AI API] Client disconnected, marking stream closed.');
                                        isStreamClosed = true;
                                    }
                                }
                            }
                        }

                        const tail = parseSSELine(sseBuffer);
                        if (tail?.totalTokens) {
                            actualTotalTokens = tail.totalTokens;
                        }
                        if (tail?.text) {
                            fullText += tail.text;
                            if (!isStreamClosed) {
                                controller.enqueue(encoder.encode(tail.text));
                            }
                        }

                        if (!isStreamClosed) {
                            controller.close();
                            isStreamClosed = true;
                        }

                        await finalizeUsageAndCache(db, modelId, minuteKey, estInputTokens, actualTotalTokens, cacheKey, fullText);
                    } catch (error: unknown) {
                        console.error('[AI API] Stream Processing Error:', error);
                        if (error instanceof UpstreamTimeoutError) {
                            void reader.cancel();
                        }
                        if (!isStreamClosed) {
                            controller.error(error);
                            isStreamClosed = true;
                        }
                    }
                };

                const task = processStream();
                const context = ctx as { waitUntil?: (promise: Promise<unknown>) => void };
                if (context && typeof context.waitUntil === 'function') {
                    context.waitUntil(task);
                }
            },
            cancel() {
                isStreamClosed = true;
                void reader.cancel();
                console.log('[AI API] Stream cancelled by client.');
            }
        });

        return new Response(responseStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });

    } catch (error: unknown) {
        if (error instanceof UpstreamTimeoutError) {
            console.error('[AI API] Upstream timeout:', error.message);
            return NextResponse.json(
                { error: 'AI upstream timeout' },
                { status: 504 }
            );
        }

        console.error('[AI API] Fatal Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
