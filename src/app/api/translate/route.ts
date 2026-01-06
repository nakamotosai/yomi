import { NextRequest, NextResponse } from 'next/server';

// Using Google Translate's free API endpoint (unofficial but widely used)
const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

export async function POST(request: NextRequest) {
    try {
        const { text, targetLang = 'zh-CN' } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Call Google Translate API
        const params = new URLSearchParams({
            client: 'gtx',
            sl: 'ja',          // Source language: Japanese
            tl: targetLang,    // Target language: Chinese (Simplified)
            dt: 't',           // Return translation
            q: text
        });

        const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params.toString()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error('Translation API request failed');
        }

        const data = await response.json();

        // Parse response - format is [[["translation","original",null,null,10],...],null,"ja",...]
        let translation = '';
        if (data && data[0]) {
            translation = data[0]
                .filter((item: unknown[]) => item && item[0])
                .map((item: unknown[]) => item[0])
                .join('');
        }

        return NextResponse.json({
            translation,
            sourceText: text,
            targetLang
        });

    } catch (error) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: 'Translation failed' },
            { status: 500 }
        );
    }
}
