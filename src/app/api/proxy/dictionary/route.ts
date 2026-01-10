 
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Dictionary API Proxy - 方案D: 统一使用 Jisho API
 * 
 * 所有语言模式都使用 Jisho API 获取结构化数据：
 * - EN: 直接显示英文释义
 * - JP: 显示英文释义 + 日语词性标签
 * - ZH: 前端翻译英文释义为中文
 */

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    // provider 参数保留以保持兼容性，但统一使用 jisho
    // const provider = searchParams.get('provider') || 'jisho';

    if (!keyword) {
        return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    try {
        // 统一使用 Jisho API - 最稳定的免费日语词典 API
        const res = await axios.get<unknown>(`https://jisho.org/api/v1/search/words`, {
            params: { keyword },
            headers: { 'User-Agent': 'YOMI-App/0.1.0' },
            timeout: 10000
        });

        const result = res.data;

        return NextResponse.json(result);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Dictionary Proxy Error:`, errorMessage);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 });
    }
}
