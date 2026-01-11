import { NextRequest, NextResponse } from 'next/server';
import { createSystemLog, D1Database } from '@/lib/db';

export const runtime = 'edge';

// 获取 D1 数据库绑定
function getDB(request: NextRequest): D1Database | null {
    const env = (request as unknown as { env?: { DB?: D1Database } }).env;
    if (env?.DB) return env.DB;

    const cf = (globalThis as unknown as { process?: { env?: { DB?: D1Database } } }).process?.env;
    if (cf?.DB) return cf.DB;

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, stack, type = 'ERROR' } = body;

        const db = getDB(request);
        if (db) {
            await createSystemLog(db, type, message, stack);
        } else {
            // Fallback to console if DB not available (e.g. during build or misconfiguration)
            console.log(`[${type}] ${message}`, stack);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to write log', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
