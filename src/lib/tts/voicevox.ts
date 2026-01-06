import { TtsProvider } from './types';
import axios from 'axios';

// Interfaces for VOICEVOX API
interface VoicevoxSpeaker {
    name: string;
    speaker_uuid: string;
    styles: { name: string; id: number }[];
    version: string;
}

export class VoicevoxProvider implements TtsProvider {
    private audio: HTMLAudioElement | null = null;
    private currentRequestId: number = 0;

    async speak(text: string, options: {
        speakerId?: number;
        serverUrl?: string;
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onBoundary?: (charIndex: number) => void;
    }) {
        // 1. Cancel previous playback immediately and invalidate pending requests
        this.stop();

        // 2. Increment request ID.
        const requestId = ++this.currentRequestId;

        const baseUrl = options.serverUrl || 'http://localhost:50021';
        const speaker = options.speakerId || 3; // Default to Zundamon Normal
        const speed = options.speed || 1.0;

        try {
            // 1. Create Audio Query
            // Using axios cancel token would be better, but logic check is safer for logic flow.
            const queryRes = await axios.post(`${baseUrl}/audio_query`, null, {
                params: { text, speaker }
            });

            if (this.currentRequestId !== requestId) return; // Obsolete

            const query = queryRes.data;
            query.speedScale = speed;

            // 2. Synthesize Audio
            const synthRes = await axios.post(`${baseUrl}/synthesis`, query, {
                params: { speaker },
                responseType: 'blob'
            });

            if (this.currentRequestId !== requestId) return; // Obsolete

            // 3. Create Audio URL
            const audioUrl = URL.createObjectURL(synthRes.data);
            this.audio = new Audio(audioUrl);

            this.audio.onplay = () => {
                if (this.currentRequestId === requestId) {
                    options.onStart && options.onStart();
                }
            };

            this.audio.onended = () => {
                if (this.currentRequestId === requestId) {
                    options.onEnd && options.onEnd();
                }
            };

            this.audio.onerror = (e) => {
                if (this.currentRequestId === requestId) {
                    console.error('Voicevox playback error', e);
                    options.onEnd && options.onEnd();
                }
            };

            this.audio.play();

        } catch (err) {
            if (this.currentRequestId !== requestId) return; // Ignore errors from old requests

            console.error('Voicevox Error:', err);
            // alert('VOICEVOX 连接失败。\n请确保已打开 VOICEVOX 软件 (http://localhost:50021)');
            options.onEnd && options.onEnd();
        }
    }

    stop() {
        // Invalidate active request
        this.currentRequestId++;

        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.audio = null;
        }
    }

    pause() {
        if (this.audio) {
            this.audio.pause();
        }
    }

    resume() {
        if (this.audio) {
            this.audio.play();
        }
    }

    async getVoices(): Promise<{ id: string; name: string }[]> {
        // This connects to local VOICEVOX to get text speakers
        try {
            const res = await axios.get('http://localhost:50021/speakers');
            const speakers: VoicevoxSpeaker[] = res.data;
            const voices: { id: string; name: string }[] = [];

            speakers.forEach(s => {
                s.styles.forEach(style => {
                    voices.push({
                        id: style.id.toString(),
                        name: `${s.name} (${style.name})`
                    });
                });
            });
            return voices;
        } catch (e) {
            return [{ id: '3', name: '连接失败 (请启动VOICEVOX)' }];
        }
    }
}
