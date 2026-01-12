
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

// Constants for Edge TTS (2024/2025 updated version)
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '130.0.2849.68';
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split('.')[0];
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

// Windows epoch offset (1601-01-01 to 1970-01-01) in seconds
const WIN_EPOCH = 11644473600;

/**
 * Generate the Sec-MS-GEC token using Web Crypto API
 */
async function generateSecMsGec(): Promise<string> {
    // Current time in seconds (Unix Epoch)
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Windows Epoch (1601-01-01) to Unix Epoch (1970-01-01) difference in seconds
    const unixEpochStart = 11644473600;

    // Total seconds since Windows Epoch
    let ticksSeconds = nowSeconds + unixEpochStart;

    // Round down to nearest 5 minutes (300 seconds)
    // This is the critical step for the token window validation
    ticksSeconds -= (ticksSeconds % 300);

    // Convert to 100-nanosecond intervals (Windows File Time)
    // 1 second = 10,000,000 ticks (10^7)
    // Using BigInt to prevent overflow
    const ticks = BigInt(ticksSeconds) * BigInt(10000000);

    // Trusted Client Token (Hardcoded in Edge Browser)
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

interface EdgeMetadataItem {
    Type: string;
    Data?: {
        Offset: number;
        Duration?: number;
        text?: {
            Text: string;
        };
    };
}

interface EdgeMetadataResponse {
    Metadata: EdgeMetadataItem[];
}

/**
 * Simple XML escape for SSML
 */
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

    // standard WebSocket connection
    // IMPORTANT: The User-Agent must match the version used in Sec-MS-GEC calculation
    // and Origin must be exactly correct to avoid 403/Reset packets.
    const ws = new WebSocket(wsUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    } as any);

    return new Promise((resolve, reject) => {
        const requestId = uuidv4().replace(/-/g, '');
        const audioChunks: Uint8Array[] = [];
        const alignmentData: AlignmentData[] = [];
        let playbackFinished = false;
        let cursor = 0;

        // Message handler
        ws.addEventListener('message', async (event: any) => {
            let data = event.data;

            // Handle Blob (standard Web API)
            if (typeof Blob !== 'undefined' && data instanceof Blob) {
                data = await data.arrayBuffer();
            }

            // Handle Node.js Buffer or standard ArrayBuffer
            // In Node.js, data might be a Buffer which is a Uint8Array
            let buffer: Uint8Array | null = null;

            if (data instanceof ArrayBuffer) {
                buffer = new Uint8Array(data);
            } else if (ArrayBuffer.isView(data)) { // Handles Node.js Buffer/Uint8Array
                buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            }

            if (buffer) {
                if (buffer.length < 2) return;

                const headerLen = (buffer[0] << 8) | buffer[1];
                const textDecoder = new TextDecoder();
                // Ensure we don't read past buffer bounds
                if (buffer.length < 2 + headerLen) return;

                const headerText = textDecoder.decode(buffer.slice(2, 2 + headerLen));
                // console.log('[EdgeTTS] Binary Header:', headerText); // Keep minimal logs

                if (headerText.includes('Path:audio\r\n')) {
                    const audioPayload = buffer.slice(2 + headerLen);
                    audioChunks.push(new Uint8Array(audioPayload));
                }
            } else if (typeof data === 'string') {
                const message = data;
                // console.log('[EdgeTTS] Text:', message.slice(0, 50)); // Keep minimal logs

                if (message.includes('Path:audio.metadata')) {
                    const jsonParts = message.split('\r\n\r\n');
                    if (jsonParts.length > 1) {
                        try {
                            const metadata: EdgeMetadataResponse = JSON.parse(jsonParts[1]);
                            if (metadata.Metadata && metadata.Metadata.length > 0) {
                                metadata.Metadata.forEach((meta: EdgeMetadataItem) => {
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
                    ws.close();
                }
            }
        });

        ws.addEventListener('close', () => {
            if (audioChunks.length > 0) {
                // Concatenate Chunks
                const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const fullAudio = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of audioChunks) {
                    fullAudio.set(chunk, offset);
                    offset += chunk.length;
                }

                // Base64 Encoding
                let binary = '';
                const bytes = new Uint8Array(fullAudio);
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                resolve({
                    audioBase64: base64,
                    alignment: alignmentData
                });
            } else {
                if (playbackFinished) {
                    resolve({ audioBase64: '', alignment: [] });
                } else {
                    reject(new Error('Connection closed by server without audio data'));
                }
            }
        });

        ws.addEventListener('error', (err: any) => {
            console.error('[EdgeTTS] WebSocket Error Details:', err);
            reject(new Error(`WebSocket connection error to ${wsUrl.slice(0, 50)}...`));
        });

        // 1. Send Speech Config
        ws.addEventListener('open', () => {
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
            ws.send(configMessage);

            // 2. Send SSML
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
            ws.send(ssmlMessage);
        });
    });
}
