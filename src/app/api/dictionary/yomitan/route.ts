import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Yomitan Dictionary API
 * 
 * 注意：Edge Runtime 不支持读取本地文件系统。
 * 分布式部署时需要将词典数据迁移到 D1 或 KV，或者使用外部 API。
 * 当前版本在 Edge 环境下暂时禁用本地文件读取功能。
 */

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');

    if (!keyword) {
        return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // Edge 环境下无法读取本地 yomitan JSON 文件
    // 返回空结果，前端会 fallback 到其他字典或显示未找到
    console.warn('[Yomitan API] Local dictionary search is disabled in Edge Runtime.');

    return NextResponse.json({
        success: true,
        keyword,
        results: [],
        source: 'System (Edge Limit)'
    });
}
