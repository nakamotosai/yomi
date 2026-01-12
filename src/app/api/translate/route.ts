import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Fallback Translation Endpoints
const GOOGLE_ENDPOINTS = [
    'https://translate.googleapis.com/translate_a/single', // Standard (Best)
    'https://clients5.google.com/translate_a/t',           // Legacy (Backup)
];

export async function POST(request: NextRequest) {
    let requestBody: any = {};
    try {
        requestBody = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { text, sourceLang = 'ja', targetLang = 'zh-CN' } = requestBody;

    if (!text) {
        return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Try endpoints sequentially
    for (const endpoint of GOOGLE_ENDPOINTS) {
        try {
            console.log(`[Translate] Attempting endpoint: ${endpoint}`);
            const result = await translateSingle(endpoint, text, sourceLang, targetLang);
            if (result) {
                return NextResponse.json({
                    translation: result,
                    sourceText: text,
                    targetLang,
                    sourceLang
                });
            }
        } catch (error: any) {
            console.warn(`[Translate] Failed endpoint ${endpoint}:`, error.message);
            // Continue to next endpoint
        }
    }

    // If all fail
    console.error('[Translate] All endpoints failed.');
    return NextResponse.json(
        { error: 'Translation failed', details: 'All fallback endpoints failed' },
        { status: 500 }
    );
}

/**
 * Helper to call a specific endpoint
 */
async function translateSingle(baseUrl: string, text: string, sl: string, tl: string): Promise<string | null> {
    const isSingle = baseUrl.includes('translate_a/single');

    const params = new URLSearchParams({
        client: isSingle ? 'gtx' : 'dict-chrome-ex',
        sl,
        tl,
        q: text,
        dt: isSingle ? 't' : undefined, // Only needed for /single
        ie: 'UTF-8',
        oe: 'UTF-8'
    });

    // Randomize User-Agent to reduce blocking chance
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
        method: isSingle ? 'GET' : 'POST', // clients5 often prefers POST
        headers: {
            'User-Agent': ua,
            'Accept': '*/*'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Strategy A: /single endpoint
    if (isSingle && Array.isArray(data) && Array.isArray(data[0])) {
        return data[0]
            .filter((item: any) => Array.isArray(item) && typeof item[0] === 'string')
            .map((item: any) => item[0])
            .join('');
    }

    // Strategy B: clients5 endpoint
    // Usually returns [ "Translated text" ] or [ [ "Translated text" ] ]
    if (!isSingle) {
        if (Array.isArray(data)) {
            // Flat array
            if (typeof data[0] === 'string') return data.join('');
            // Nested array
            if (Array.isArray(data[0])) {
                return data.map((item: any) => Array.isArray(item) ? item[0] : item).join('');
            }
        }
    }

    return null;
}
