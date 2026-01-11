import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

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

        // Aozora uses Shift_JIS
        // Edge Runtime supports TextDecoder with 'shift_jis'
        const decoder = new TextDecoder('shift_jis');
        const decodedText = decoder.decode(arrayBuffer);

        return NextResponse.json({ content: decodedText });
    } catch (error) {
        console.error('Error fetching Aozora content:', error);
        return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }
}
