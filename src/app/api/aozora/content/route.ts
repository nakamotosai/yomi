import { NextRequest, NextResponse } from 'next/server';
import iconv from 'iconv-lite';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    if (!url.includes('aozora.gr.jp')) {
        return NextResponse.json({ error: 'Only aozora.gr.jp URLs are allowed' }, { status: 403 });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Aozora uses Shift_JIS
        const decodedText = iconv.decode(buffer, 'Shift_JIS');

        return NextResponse.json({ content: decodedText });
    } catch (error) {
        console.error('Error fetching Aozora content:', error);
        return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }
}
