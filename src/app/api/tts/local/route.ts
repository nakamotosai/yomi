import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Node.js runtime for Python subprocess
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const tempAudioPath = join(tmpdir(), `tts_${randomUUID()}.mp3`);

    try {
        const { text, voice = 'ja-JP-NanamiNeural', rate = 0 } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const ratePercent = Math.round(rate * 100);
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

        await new Promise<void>((resolve, reject) => {
            const args = [
                '--text', text,
                '--voice', voice,
                '--rate', rateStr,
                '--write-media', tempAudioPath
            ];

            const proc = spawn('edge-tts', args, { shell: true, timeout: 30000 });

            let stderr = '';
            proc.stderr?.on('data', (data) => { stderr += data.toString(); });
            proc.on('error', (err) => reject(new Error(`Failed to start edge-tts: ${err.message}`)));
            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`edge-tts exited with code ${code}: ${stderr}`));
            });
        });

        const audioBuffer = await fs.readFile(tempAudioPath);
        const base64 = audioBuffer.toString('base64');
        await fs.unlink(tempAudioPath).catch(() => { });

        return NextResponse.json({ audioBase64: base64, alignment: [] });

    } catch (error: unknown) {
        await fs.unlink(tempAudioPath).catch(() => { });
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Edge TTS Local Error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
