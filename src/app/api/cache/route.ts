import { NextRequest, NextResponse } from 'next/server';
import { getAICache, setAICache, D1Database } from '@/lib/db';

export const runtime = 'edge';

// 获取 D1 数据库绑定
function getDB(request: NextRequest): D1Database | null {
    const env = (request as unknown as { env?: { DB?: D1Database } }).env;
    if (env?.DB) return env.DB;

    const cf = (globalThis as unknown as { process?: { env?: { DB?: D1Database } } }).process?.env;
    if (cf?.DB) return cf.DB;

    return null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        const db = getDB(request);
        if (!db) {
            // 如果没有数据库绑定，直接返回未命中（开发环境如果不配置 D1 本地 dev 可能也会走到这也行）
            return NextResponse.json({ success: false, error: 'Database not available' });
        }

        const text = await getAICache(db, key);

        if (text) {
            return NextResponse.json({ success: true, text });
        }

        return NextResponse.json({ success: false });
    } catch (error) {
        console.error('Cache Read Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { key, text } = body;

        if (!key || !text) {
            return NextResponse.json({ error: 'Key and text are required' }, { status: 400 });
        }

        const db = getDB(request);
        if (!db) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        await setAICache(db, key, text);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cache Write Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
