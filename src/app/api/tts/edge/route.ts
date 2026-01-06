
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

// Constants for Edge TTS
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_WEBSOCKET_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

interface AlignmentData {
    charIndex: number;
    charLength?: number;
    duration?: number; // duration in ms
    time: number; // in milliseconds
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
    return new Promise((resolve, reject) => {
        // Add headers to mimic official extension
        const ws = new WebSocket(EDGE_WEBSOCKET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
                'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        const requestId = uuidv4().replace(/-/g, '');

        const audioChunks: Buffer[] = [];
        const alignmentData: AlignmentData[] = [];

        let playbackFinished = false;
        let cursor = 0; // Track current character position in the original text

        ws.on('open', () => {
            // 1. Send Speech Config
            const configMessage = `X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
                JSON.stringify({
                    context: {
                        synthesis: {
                            audio: {
                                activityDetection: false,
                                metadataOptions: {
                                    sentenceBoundaryEnabled: false,
                                    wordBoundaryEnabled: true // We need word boundaries for Karaoke
                                },
                                outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                            }
                        }
                    }
                });
            ws.send(configMessage);

            // 2. Send SSML
            // Rate is usually +0% or -0% format
            const rateStr = rate >= 0 ? `+${Math.round(rate * 100)}%` : `${Math.round(rate * 100)}%`;

            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>` +
                `<voice name='${voice}'>` +
                `<prosody rate='${rateStr}'>` +
                `${text}` +
                `</prosody>` +
                `</voice>` +
                `</speak>`;

            const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n` + ssml;
            ws.send(ssmlMessage);
        });

        ws.on('message', (data: Buffer | string, isBinary: boolean) => {
            if (isBinary) {
                // Binary data contains header + audio
                const buffer = Buffer.from(data as Buffer);
                const headerLen = buffer.readUInt16BE(0);
                const headerText = buffer.toString('utf-8', 2, 2 + headerLen);

                if (headerText.includes('Path:audio\r\n')) {
                    const audioPayload = buffer.slice(2 + headerLen);
                    audioChunks.push(audioPayload);
                }
            } else {
                // Text data
                const message = data.toString();
                if (message.includes('Path:audio.metadata')) {
                    // Extract JSON
                    const jsonParts = message.split('\r\n\r\n');
                    if (jsonParts.length > 1) {
                        try {
                            const metadata: EdgeMetadataResponse = JSON.parse(jsonParts[1]);
                            if (metadata.Metadata && metadata.Metadata.length > 0) {
                                metadata.Metadata.forEach((meta: EdgeMetadataItem) => {
                                    if (meta.Type === 'WordBoundary') {
                                        // Robust logic: Match spoken word to text using cursor
                                        if (meta.Data && meta.Data.text && meta.Data.text.Text) {
                                            const word = meta.Data.text.Text;

                                            // Find this word in the original text starting from current cursor
                                            let foundIndex = text.indexOf(word, cursor);
                                            let matchLength = word.length;

                                            // Fallback: If word not found, but text at cursor is numeric, assume implicit reading match
                                            if (foundIndex === -1) {
                                                // Allow leading spaces in match
                                                const numericMatch = text.slice(cursor).match(/^\s*([0-9０-９]+)/);
                                                if (numericMatch) {
                                                    // numericMatch[0] contains " 10", numericMatch[1] contains "10"
                                                    // We consume the whole match including space to keep cursor valid
                                                    foundIndex = cursor; // Start at cursor (including space)
                                                    matchLength = numericMatch[0].length;
                                                }
                                            }

                                            if (foundIndex !== -1) {
                                                alignmentData.push({
                                                    charIndex: foundIndex,
                                                    charLength: matchLength,
                                                    time: meta.Data.Offset / 10000, // 100ns -> ms
                                                    duration: meta.Data.Duration ? meta.Data.Duration / 10000 : undefined
                                                });

                                                // Advance cursor. 
                                                // Ensure forward progress.
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
        });

        ws.on('close', () => {
            if (audioChunks.length > 0) {
                const fullAudio = Buffer.concat(audioChunks);
                resolve({
                    audioBase64: fullAudio.toString('base64'),
                    alignment: alignmentData
                });
            } else {
                // If we closed but have no audio, implies failure unless empty text.
                if (playbackFinished) {
                    resolve({ audioBase64: '', alignment: [] });
                } else {
                    reject(new Error('Connection closed without audio'));
                }
            }
        });

        ws.on('error', (err) => {
            console.error('WebSocket Error:', err);
            reject(err);
        });
    });
}
