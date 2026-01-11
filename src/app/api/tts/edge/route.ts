
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
    // Get current Unix timestamp in seconds
    let ticks = Math.floor(Date.now() / 1000);

    // Add Windows epoch offset
    ticks += WIN_EPOCH;

    // Round down to nearest 5 minutes (300 seconds)
    ticks -= ticks % 300;

    // Convert to 100-nanosecond intervals (Windows file time format)
    const ticksNs = BigInt(ticks) * BigInt(10000000);

    // Create string to hash
    const strToHash = ticksNs.toString() + TRUSTED_CLIENT_TOKEN;

    // Use Web Crypto SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(strToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string
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

function generateEdgeTTS(text: string, voice: string, rate: number): Promise<{ audioBase64: string, alignment: AlignmentData[] }> {
    return new Promise(async (resolve, reject) => {
        try {
            const secMsGec = await generateSecMsGec();
            const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

            // Standard WebSocket does not support custom headers in constructor
            // We hope the query parameters are enough or the server is lenient
            const ws = new WebSocket(wsUrl);

            const requestId = uuidv4().replace(/-/g, '');
            const audioChunks: Uint8Array[] = [];
            const alignmentData: AlignmentData[] = [];
            let playbackFinished = false;
            let cursor = 0;

            ws.onopen = () => {
                // 1. Send Speech Config
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
                const rateStr = rate >= 0 ? `+${Math.round(rate * 100)}%` : `${Math.round(rate * 100)}%`;
                const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>` +
                    `<voice name='${voice}'>` +
                    `<prosody rate='${rateStr}'>` +
                    `${text}` +
                    `</prosody>` +
                    `</voice>` +
                    `</speak>`;

                const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n` + ssml;
                ws.send(ssmlMessage);
            };

            ws.onmessage = async (event) => {
                const data = event.data;

                if (data instanceof Blob) {
                    const arrayBuffer = await data.arrayBuffer();
                    const buffer = new Uint8Array(arrayBuffer);

                    // Simple parsing of binary message
                    // Header length is first 2 bytes (Big Endian)
                    const headerLen = (buffer[0] << 8) | buffer[1];
                    const decoder = new TextDecoder();
                    const headerText = decoder.decode(buffer.slice(2, 2 + headerLen));

                    if (headerText.includes('Path:audio\r\n')) {
                        const audioPayload = buffer.slice(2 + headerLen);
                        audioChunks.push(audioPayload);
                    }
                } else if (typeof data === 'string') {
                    const message = data;
                    if (message.includes('Path:audio.metadata')) {
                        const jsonParts = message.split('\r\n\r\n');
                        if (jsonParts.length > 1) {
                            try {
                                const metadata: EdgeMetadataResponse = JSON.parse(jsonParts[1]);
                                if (metadata.Metadata && metadata.Metadata.length > 0) {
                                    metadata.Metadata.forEach((meta: EdgeMetadataItem) => {
                                        if (meta.Type === 'WordBoundary') {
                                            if (meta.Data && meta.Data.text && meta.Data.text.Text) {
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
                                        }
                                    });
                                }
                            } catch (e) {
                                console.error('Error parsing metadata JSON', e);
                            }
                        }
                    } else if (message.includes('Path:turn.end')) {
                        playbackFinished = true;
                        ws.close();
                    }
                }
            };

            ws.onclose = () => {
                if (audioChunks.length > 0) {
                    // Concatenate chunks
                    let totalLength = 0;
                    for (const chunk of audioChunks) totalLength += chunk.length;

                    const fullAudio = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of audioChunks) {
                        fullAudio.set(chunk, offset);
                        offset += chunk.length;
                    }

                    // Convert to base64
                    let binary = '';
                    const len = fullAudio.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(fullAudio[i]);
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
                        reject(new Error('Connection closed without audio'));
                    }
                }
            };

            ws.onerror = (err) => {
                console.error('WebSocket Error:', err);
                reject(err);
            };

        } catch (e) {
            reject(e);
        }
    });
}
