import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const NHK_BASE_URL = 'https://www3.nhk.or.jp/news/easy';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'list' or 'article'
    const id = searchParams.get('id'); // news_id for article

    try {
        if (type === 'list') {
            // Fetch top news list
            // Note: The structure of this JSON can change, but usually it's a list.
            const response = await fetch(`${NHK_BASE_URL}/top-list.json`, { next: { revalidate: 3600 } });
            if (!response.ok) throw new Error('Failed to fetch news list');

            // The encoding is usually UTF-8 for this JSON
            const data = await response.json();
            return NextResponse.json(data);

        } else if (type === 'article' && id) {
            // Fetch specific article content
            // URL format: https://www3.nhk.or.jp/news/easy/{news_id}/{news_id}.html
            const articleUrl = `${NHK_BASE_URL}/${id}/${id}.html`;

            // We need to fetch it as text/html
            const response = await fetch(articleUrl);
            if (!response.ok) throw new Error(`Failed to fetch article: ${response.status}`);

            // NHK Easy HTML is UTF-8
            const html = await response.text();
            return NextResponse.json({ content: html });

        } else {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error in News API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
