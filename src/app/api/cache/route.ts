import { NextRequest, NextResponse } from 'next/server';
import { getAICache, setAICache, D1Database } from '@/lib/db';
import { RemoteD1Client } from '@/lib/remoteD1';

export const runtime = 'edge';

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

    // 4. 本地开发环境：尝试连接远程 D1 (增强容错处理)
    let apiToken = "";
    let accountId = "";
    let dbId = "";

    // 遍历环境变量，处理可能的空格问题
    if (typeof process !== 'undefined' && process.env) {
        for (const [key, value] of Object.entries(process.env)) {
            const trimmedKey = key.trim();
            const trimmedValue = value?.trim() || "";
            if (trimmedKey === 'CLOUDFLARE_API_TOKEN') apiToken = trimmedValue;
            if (trimmedKey === 'CLOUDFLARE_ACCOUNT_ID') accountId = trimmedValue;
            if (trimmedKey === 'CLOUDFLARE_D1_ID') dbId = trimmedValue;
        }
    }

    if (apiToken && accountId && dbId) {
        // console.log('[Cache API] Local Dev: using Remote D1'); // Optional debug
        return new RemoteD1Client(apiToken, accountId, dbId);
    }

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
            console.error('[Cache API] D1 Database binding "DB" is missing in GET');
            return NextResponse.json({ success: false, error: 'Database not available' });
        }

        const text = await getAICache(db, key);

        if (text) {
            console.log(`[Cache API] Hit for key: ${key}`);
            return NextResponse.json({ success: true, text });
        }

        console.log(`[Cache API] Miss for key: ${key}`);
        return NextResponse.json({ success: false });
    } catch (error: any) {
        console.error('[Cache API] GET Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
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
            console.error('[Cache API] D1 Database binding "DB" is missing in POST');
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        await setAICache(db, key, text);
        console.log(`[Cache API] Saved key: ${key} (${text.length} chars)`);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Cache API] POST Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
