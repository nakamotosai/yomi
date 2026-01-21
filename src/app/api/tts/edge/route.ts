import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

// Constants for Edge TTS (2024/2025 updated version)
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '130.0.2849.68';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

/**
 * Generate the Sec-MS-GEC token using Web Crypto API
 */
async function generateSecMsGec(): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const unixEpochStart = 11644473600;
    let ticksSeconds = nowSeconds + unixEpochStart;
    ticksSeconds -= (ticksSeconds % 300);
    const ticks = BigInt(ticksSeconds) * BigInt(10000000);
    const strToHash = ticks.toString() + TRUSTED_CLIENT_TOKEN;

    const encoder = new TextEncoder();
    const data = encoder.encode(strToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

interface AlignmentData {
    charIndex: number;
    charLength?: number;
    duration?: number;
    time: number;
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
        }
    });
}

export async function POST(req: NextRequest) {
    try {
        const { text, voice = 'ja-JP-NanamiNeural', rate = 0 } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const audioData = await generateEdgeTTS(text, voice, rate);
        return NextResponse.json(audioData);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Edge TTS Error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

async function generateEdgeTTS(text: string, voice: string, rate: number): Promise<{ audioBase64: string, alignment: AlignmentData[] }> {
    const secMsGec = await generateSecMsGec();
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

    console.log('[EdgeTTS] Connecting to Edge TTS...');

    // Try Cloudflare-style fetch upgrade first
    let ws: WebSocket | null = null;
    let useCloudflareStyle = false;

    try {
        const fetchUrl = wsUrl.replace('wss://', 'https://');
        const connectResp = await fetch(fetchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
                'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Upgrade': 'websocket',
                'Connection': 'Upgrade',
                'Sec-WebSocket-Key': btoa(globalThis.crypto.randomUUID().substring(0, 16)),
                'Sec-WebSocket-Version': '13'
            }
        });

        if (connectResp.status === 101) {
            const socket = (connectResp as unknown as { webSocket?: WebSocket }).webSocket;
            if (socket) {
                ws = socket;
                useCloudflareStyle = true;
                console.log('[EdgeTTS] Connected via Cloudflare fetch upgrade');
            }
        }
    } catch (e) {
        console.log('[EdgeTTS] Fetch upgrade not available:', (e as Error).message);
    }

    // Fallback: Standard WebSocket (works in Node.js/local dev)
    if (!ws) {
        console.log('[EdgeTTS] Using standard WebSocket connection');
        ws = new WebSocket(wsUrl);
    }

    return new Promise((resolve, reject) => {
        const requestId = uuidv4().replace(/-/g, '');
        const audioChunks: Uint8Array[] = [];
        const alignmentData: AlignmentData[] = [];
        let playbackFinished = false;
        let cursor = 0;

        // For Cloudflare Workers, we need to accept the connection
        if (useCloudflareStyle && 'accept' in ws!) {
            (ws as unknown as { accept: () => void }).accept();
        }

        ws!.addEventListener('message', async (event: MessageEvent) => {
            let data = event.data;

            if (typeof Blob !== 'undefined' && data instanceof Blob) {
                data = await data.arrayBuffer();
            }

            let buffer: Uint8Array | null = null;
            if (data instanceof ArrayBuffer) {
                buffer = new Uint8Array(data);
            } else if (ArrayBuffer.isView(data)) {
                buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            }

            if (buffer) {
                if (buffer.length < 2) return;
                const headerLen = (buffer[0] << 8) | buffer[1];
                if (buffer.length < 2 + headerLen) return;

                const textDecoder = new TextDecoder();
                const headerText = textDecoder.decode(buffer.slice(2, 2 + headerLen));

                if (headerText.includes('Path:audio\r\n')) {
                    const audioPayload = buffer.slice(2 + headerLen);
                    audioChunks.push(new Uint8Array(audioPayload));
                }
            } else if (typeof data === 'string') {
                const message = data;

                if (message.includes('Path:audio.metadata')) {
                    const jsonParts = message.split('\r\n\r\n');
                    if (jsonParts.length > 1) {
                        try {
                            const metadata = JSON.parse(jsonParts[1]);
                            if (metadata.Metadata) {
                                metadata.Metadata.forEach((meta: { Type: string; Data?: { Offset: number; Duration?: number; text?: { Text: string } } }) => {
                                    if (meta.Type === 'WordBoundary' && meta.Data?.text?.Text) {
                                        const word = meta.Data.text.Text;
                                        let foundIndex = text.indexOf(word, cursor);
                                        let matchLength = word.length;

                                        if (foundIndex === -1) {
                                            const numericMatch = text.slice(cursor).match(/^\s*([0-9０-９]+)/);
                                            if (numericMatch) {
                                                foundIndex = cursor;
                                                matchLength = numericMatch[0].length;
                                            }
                                        }

                                        if (foundIndex !== -1) {
                                            alignmentData.push({
                                                charIndex: foundIndex,
                                                charLength: matchLength,
                                                time: meta.Data.Offset / 10000,
                                                duration: meta.Data.Duration ? meta.Data.Duration / 10000 : undefined
                                            });
                                            cursor = foundIndex + matchLength;
                                        }
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('[EdgeTTS] Metadata parse error', e);
                        }
                    }
                } else if (message.includes('Path:turn.end')) {
                    playbackFinished = true;
                    ws!.close();
                }
            }
        });

        ws!.addEventListener('close', () => {
            if (audioChunks.length > 0) {
                const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const fullAudio = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of audioChunks) {
                    fullAudio.set(chunk, offset);
                    offset += chunk.length;
                }

                let binary = '';
                for (let i = 0; i < fullAudio.byteLength; i++) {
                    binary += String.fromCharCode(fullAudio[i]);
                }
                const base64 = btoa(binary);

                resolve({ audioBase64: base64, alignment: alignmentData });
            } else {
                if (playbackFinished) {
                    resolve({ audioBase64: '', alignment: [] });
                } else {
                    reject(new Error('Connection closed without audio data'));
                }
            }
        });

        ws!.addEventListener('error', (err) => {
            console.error('[EdgeTTS] WebSocket Error:', err);
            reject(new Error(`WebSocket connection error`));
        });

        ws!.addEventListener('open', () => {
            const configMessage = `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
                JSON.stringify({
                    context: {
                        synthesis: {
                            audio: {
                                metadataOptions: {
                                    sentenceBoundaryEnabled: false,
                                    wordBoundaryEnabled: true
                                },
                                outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                            }
                        }
                    }
                });
            ws!.send(configMessage);

            const ratePct = Math.round(rate * 100);
            const rateStr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;
            const escapedText = escapeXml(text);
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>` +
                `<voice name='${voice}'>` +
                `<prosody rate='${rateStr}'>` +
                `${escapedText}` +
                `</prosody>` +
                `</voice>` +
                `</speak>`;

            const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n` + ssml;
            ws!.send(ssmlMessage);
        });
    });
}
