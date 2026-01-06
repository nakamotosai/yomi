export interface AozoraBook {
    id: string;
    title: string;
    author: string;
    coverUrl?: string; // Optional custom cover
    txtUrl: string; // URL to the HTML version (we use the API to fetch it)
}

export const FEATURED_BOOKS: AozoraBook[] = [
    {
        id: 'kokoro',
        title: 'こころ',
        author: '夏目 漱石',
        txtUrl: 'https://www.aozora.gr.jp/cards/000148/files/773_14560.html',
    },
    {
        id: 'rashomon',
        title: '羅生門',
        author: '芥川 龍之介',
        txtUrl: 'https://www.aozora.gr.jp/cards/000879/files/127_15260.html',
    },
    {
        id: 'gingatetsudo',
        title: '銀河鉄道の夜',
        author: '宮沢 賢治',
        txtUrl: 'https://www.aozora.gr.jp/cards/000081/files/43737_19028.html',
    },
    {
        id: 'sangetsuki',
        title: '山月記',
        author: '中島 敦',
        txtUrl: 'https://www.aozora.gr.jp/cards/000622/files/1763_17421.html',
    },
    {
        id: 'wagahai',
        title: '吾輩は猫である',
        author: '夏目 漱石',
        txtUrl: 'https://www.aozora.gr.jp/cards/000148/files/789_14547.html',
    },
    {
        id: 'runmelos',
        title: '走れメロス',
        author: '太宰 治',
        txtUrl: 'https://www.aozora.gr.jp/cards/000035/files/1567_14913.html',
    },
    {
        id: 'humanlost',
        title: '人間失格',
        author: '太宰 治',
        txtUrl: 'https://www.aozora.gr.jp/cards/000035/files/301_14912.html',
    },
    {
        id: 'bottchan',
        title: '坊っちゃん',
        author: '夏目 漱石',
        txtUrl: 'https://www.aozora.gr.jp/cards/000148/files/752_14964.html',
    }
];

export async function fetchAozoraContent(url: string): Promise<string> {
    const response = await fetch(`/api/aozora/content?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch content');
    }
    const data = await response.json();
    return data.content || '';
}

export function parseAozoraHTML(html: string): string {
    if (!html) return '';

    // Create a temporary DOM element to parse HTML
    // Note: This runs on the client side
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove ruby (furigana) rt tags because YOMI generates its own
    // Aozora ruby: <ruby><rb>漢字</rb><rp>（</rp><rt>かんじ</rt><rp>）</rp></ruby>
    // Sometimes simpler: <ruby>漢字<rt>かんじ</rt></ruby>

    // Strategy: Remove <rt> and <rp> tags entirely, keep the base text.
    // If we want to keep original furigana, we'd need complex logic to map it to our token format.
    // For now, strip it and let Kuroshiro re-generate it for consistency.
    const rts = doc.querySelectorAll('rt');
    rts.forEach(el => el.remove());

    const rps = doc.querySelectorAll('rp');
    rps.forEach(el => el.remove());

    // Get the main text content
    // Usually in <div class="main_text">
    const mainTextDiv = doc.querySelector('.main_text');
    let text = mainTextDiv ? mainTextDiv.textContent || '' : doc.body.textContent || '';

    // Clean up extra whitespace
    text = text.replace(/^\s*[\r\n]/gm, '').trim();

    return text;
}

// Simple chunking for long texts
export function chunkText(text: string, chunkSize: number = 2000): string[] {
    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
        let endIndex = currentIndex + chunkSize;

        // Try to break at a period or newline to avoid splitting sentences
        if (endIndex < text.length) {
            const periodIndex = text.indexOf('。', endIndex);
            const newlineIndex = text.indexOf('\n', endIndex);

            // Should optimize this logic, but for now:
            // If punctuation is found reasonably close (within 200 chars), extend to it.
            // Otherwise hard break.
            if (periodIndex !== -1 && periodIndex - endIndex < 200) {
                endIndex = periodIndex + 1;
            } else if (newlineIndex !== -1 && newlineIndex - endIndex < 200) {
                endIndex = newlineIndex + 1;
            }
        }

        chunks.push(text.slice(currentIndex, endIndex));
        currentIndex = endIndex;
    }

    return chunks;
}
