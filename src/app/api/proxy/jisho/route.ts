 
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');

    if (!keyword) {
        return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    try {
        // Jisho API: https://jisho.org/api/v1/search/words?keyword=...
        // Note: Jisho doesn't have strict rate limits for small usage but be polite.
        const response = await axios.get(`https://jisho.org/api/v1/search/words`, {
            params: { keyword },
            headers: {
                'User-Agent': 'YOMI-App/0.1.0' // Polite UA
            }
        });

        return NextResponse.json(response.data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Jisho API Proxy Error:', errorMessage);
        return NextResponse.json(
            { error: 'Failed to fetch from dictionary API' },
            { status: 502 }
        );
    }
}
