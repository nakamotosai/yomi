import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Using clients5.google.com which is historically more reliable for server-side requests
const GOOGLE_TRANSLATE_URL = 'https://clients5.google.com/translate_a/t';

export async function POST(request: NextRequest) {
    try {
        const { text, sourceLang = 'ja', targetLang = 'zh-CN' } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Call Google Translate API (clients5)
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: new URLSearchParams({
                client: 'dict-chrome-ex',
                sl: sourceLang,
                tl: targetLang,
                q: text
            }).toString()
        };

        const response = await fetch(GOOGLE_TRANSLATE_URL, fetchOptions);

        if (!response.ok) {
            // Log status for debugging
            console.error(`GT API failed with status: ${response.status}`);
            throw new Error(`Translation API request failed: ${response.status}`);
        }

        const data = await response.json();

        // Parse response - clients5 returns: ["Translated text"] or [["Translated 1", "Translatred 2"]]?
        // Actually for dict-chrome-ex it returns an array of strings or nested arrays depending on input.
        // Usually: ["Translated Text"]
        // Let's handle both string array and nested.
        let translation = '';

        if (Array.isArray(data)) {
            // Check if it's array of strings [ "Trans", "lation" ]
            if (typeof data[0] === 'string') {
                translation = data.join('');
            }
            // Check if it's nested (rare for this client but possible)
            else if (Array.isArray(data[0])) {
                translation = data.map((item: any) => (Array.isArray(item) ? item[0] : item)).join('');
            }
        }

        return NextResponse.json({
            translation,
            sourceText: text,
            targetLang,
            sourceLang
        });

    } catch (error) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: 'Translation failed' },
            { status: 500 }
        );
    }
}
