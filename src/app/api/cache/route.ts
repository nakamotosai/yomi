import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define cache file path
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'ai_cache.json');

// Ensure directory and file exist
const ensureCacheFile = () => {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(CACHE_FILE_PATH)) {
        fs.writeFileSync(CACHE_FILE_PATH, '{}', 'utf-8');
    }
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        ensureCacheFile();
        const fileContent = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
        const cache = JSON.parse(fileContent);

        if (cache[key]) {
            return NextResponse.json({ success: true, text: cache[key] });
        }

        return NextResponse.json({ success: false });
    } catch (error) {
        console.error('Cache Read Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { key, text } = body;

        if (!key || !text) {
            return NextResponse.json({ error: 'Key and text are required' }, { status: 400 });
        }

        ensureCacheFile();
        const fileContent = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
        let cache: Record<string, string> = {};
        try {
            cache = JSON.parse(fileContent);
        } catch (e) {
            // If corrupt, start fresh
            cache = {};
        }

        cache[key] = text;

        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cache Write Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
