import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface DictResult {
    source: string;
    data: any;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const provider = searchParams.get('provider') || 'jisho';

    if (!keyword) {
        return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    try {
        let result: any = null;

        if (provider === 'jisho') {
            const res = await axios.get(`https://jisho.org/api/v1/search/words`, {
                params: { keyword },
                headers: { 'User-Agent': 'YOMI-App/0.1.0' }
            });
            result = res.data;
        }
        else if (provider === 'weblio_jj') {
            // Japanese-Japanese (Weblio)
            const url = `https://www.weblio.jp/content/${encodeURIComponent(keyword)}`;
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const $ = cheerio.load(res.data);

            // Extract definitions. Weblio structure varies.
            // Try to get the main definition from "NetDicBody" or "kiji"
            const definitions: string[] = [];
            const titile = $('h1').first().text().trim();

            // Simple extraction: Get text from the first significant content block
            // Sanseido etc. are inside .NetDicBody
            $('.NetDicBody').each((i, el) => {
                if (definitions.length < 3) {
                    definitions.push($(el).text().trim());
                }
            });

            if (definitions.length === 0) {
                // Fallback for other dictionary types in Weblio
                $('.kiji .midashigo').parent().each((i, el) => {
                    const text = $(el).text().replace(keyword, '').trim(); // simplistic
                    if (text && definitions.length < 3) definitions.push(text.substring(0, 200));
                });
            }

            result = {
                meta: { status: 200 },
                data: definitions.length > 0 ? [{
                    slug: titile || keyword,
                    japanese: [{ word: titile || keyword, reading: '' }], // Hard to extract reading robustly without specific parsing
                    senses: definitions.map(d => ({
                        parts_of_speech: ['国語辞典'],
                        english_definitions: [d.replace(/\s+/g, ' ').substring(0, 500)] // We put Japanese text in english_definitions for now to reuse frontend
                    }))
                }] : []
            };
        }
        else if (provider === 'weblio_cj') {
            // Chinese-Japanese (Weblio CJJC)
            const url = `https://cjjc.weblio.jp/content/${encodeURIComponent(keyword)}`;
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const $ = cheerio.load(res.data);

            const definitions: string[] = [];

            // .level0 is often the main definition block
            $('.level0').each((i, el) => {
                definitions.push($(el).text().trim());
            });

            result = {
                meta: { status: 200 },
                data: definitions.length > 0 ? [{
                    slug: keyword,
                    japanese: [{ word: keyword }],
                    senses: definitions.map(d => ({
                        parts_of_speech: ['中日辞典'],
                        english_definitions: [d.replace(/\s+/g, ' ')]
                    }))
                }] : []
            };
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error(`Dictionary Proxy Error (${provider}):`, error.message);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 });
    }
}
