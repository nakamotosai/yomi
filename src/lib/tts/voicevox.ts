import { TtsProvider } from './types';
import axios from 'axios';

// Interfaces for VOICEVOX API
interface VoicevoxMora {
    vowel_length: number;
    consonant_length: number;
    text?: string;
}

interface VoicevoxAccentPhrase {
    moras: VoicevoxMora[];
    pause_mora?: VoicevoxMora;
}



interface VoicevoxSpeaker {
    name: string;
    speaker_uuid: string;
    styles: { name: string; id: number }[];
    version: string;
}

export class VoicevoxProvider implements TtsProvider {
    private audio: HTMLAudioElement | null = null;
    private currentRequestId: number = 0;

    private timer: number | null = null;
    private prefetchCache: Map<string, Blob> = new Map();

    private getCacheKey(text: string, speakerId: number, speed: number): string {
        return `${speakerId}_${speed}_${text}`;
    }

    async preload(text: string, options: { speakerId?: number; speed?: number; serverUrl?: string }) {
        const baseUrl = options.serverUrl || 'http://localhost:50021';
        const speaker = options.speakerId || 3;
        const speed = options.speed || 1.0;
        const key = this.getCacheKey(text, speaker, speed);

        if (this.prefetchCache.has(key)) return;

        try {
            const queryRes = await axios.post(`${baseUrl}/audio_query`, null, {
                params: { text, speaker }
            });
            const query = queryRes.data;
            query.speedScale = speed;

            const synthRes = await axios.post(`${baseUrl}/synthesis`, query, {
                params: { speaker },
                responseType: 'blob'
            });

            if (synthRes.data) {
                this.prefetchCache.set(key, synthRes.data);
                if (this.prefetchCache.size > 1) {
                    const firstKey = this.prefetchCache.keys().next().value;
                    if (firstKey !== undefined) this.prefetchCache.delete(firstKey);
                }
                console.log(`[Voicevox] Preloaded: ${text.substring(0, 10)}...`);
            }
        } catch (e) {
            console.warn('[Voicevox] Preload failed', e);
        }
    }

    async speak(text: string, options: {
        speakerId?: number;
        serverUrl?: string;
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onError?: (error: Error) => void;
        onBoundary?: (charIndex: number) => void;
    }) {
        // 1. Cancel previous playback immediately
        this.stop();

        // 2. Increment request ID.
        const requestId = ++this.currentRequestId;

        const baseUrl = options.serverUrl || 'http://localhost:50021';
        const speaker = options.speakerId || 3; // Default to Zundamon Normal
        const speed = options.speed || 1.0;
        const key = this.getCacheKey(text, speaker, speed);

        try {
            let audioBlob: Blob | null = null;
            let totalDurationMs = 2000; // Fallback

            if (this.prefetchCache.has(key)) {
                console.log(`[Voicevox] Using cached audio for: ${text.substring(0, 10)}...`);
                audioBlob = this.prefetchCache.get(key)!;
                this.prefetchCache.delete(key);
                // Note: For cached blob, we use a rough estimate for boundary tracking
                totalDurationMs = text.length * 200;
            }

            if (!audioBlob) {
                // 1. Create Audio Query
                const queryRes = await axios.post(`${baseUrl}/audio_query`, null, {
                    params: { text, speaker }
                });

                if (this.currentRequestId !== requestId) return;

                const query = queryRes.data;
                query.speedScale = speed;

                const timeScale = 1.0 / speed;

                // Let's calculate TOTAL DURATION from the query data first.
                let explicitDuration = (query.prePhonationLength || 0) + (query.postPhonationLength || 0);

                if (query.accent_phrases) {
                    query.accent_phrases.forEach((phrase: VoicevoxAccentPhrase) => {
                        if (phrase.pause_mora) {
                            explicitDuration += (phrase.pause_mora.vowel_length || 0) + (phrase.pause_mora.consonant_length || 0);
                        }
                        if (phrase.moras) {
                            phrase.moras.forEach((m: VoicevoxMora) => {
                                explicitDuration += (m.vowel_length || 0) + (m.consonant_length || 0);
                            });
                        }
                    });
                }
                totalDurationMs = (explicitDuration * timeScale) * 1000;
                console.log('[Voicevox] Calculated duration:', totalDurationMs, 'ms');

                // 2. Synthesize Audio
                const synthRes = await axios.post(`${baseUrl}/synthesis`, query, {
                    params: { speaker },
                    responseType: 'blob'
                });

                if (this.currentRequestId !== requestId) return;
                audioBlob = synthRes.data;
            }

            // 3. Create Audio URL
            const audioUrl = URL.createObjectURL(audioBlob!);
            this.audio = new Audio(audioUrl);

            this.audio.onplay = () => {
                if (this.currentRequestId === requestId) {
                    options.onStart && options.onStart();
                    if (options.onBoundary) {
                        this.startBoundaryTracking(text.length, totalDurationMs, options.onBoundary);
                    }
                }
            };

            this.audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                if (this.currentRequestId === requestId) {
                    this.stopBoundaryTracking();
                    options.onEnd && options.onEnd();
                }
            };

            this.audio.onerror = (e) => {
                URL.revokeObjectURL(audioUrl);
                if (this.currentRequestId === requestId) {
                    console.error('Voicevox playback error', e);
                    const err = new Error('Voicevox playback error');
                    options.onError ? options.onError(err) : (options.onEnd && options.onEnd());
                }
            };

            this.audio.play();

        } catch (err) {
            if (this.currentRequestId !== requestId) return;
            console.error('Voicevox Error:', err);
            if (options.onError) {
                options.onError(err as Error);
            }
        }
    }

    // Simple linear interpolation tracker for Voicevox (better than nothing)
    // Since we know the Exact Total Duration from the phonemes, this is reasonably accurate for short sentences.
    private startBoundaryTracking(textLength: number, totalDurationMs: number, callback: (idx: number) => void) {

        const track = () => {
            if (!this.audio || this.audio.paused) return;

            // Use actual audio time if possible, fallback to performance
            const currentTimeMs = this.audio.currentTime * 1000;

            // Map time to char index
            const progress = currentTimeMs / totalDurationMs;
            const charIndex = Math.floor(progress * textLength);

            if (charIndex >= 0 && charIndex < textLength) {
                callback(charIndex);
            }

            this.timer = requestAnimationFrame(track);
        };
        this.timer = requestAnimationFrame(track);
    }

    private stopBoundaryTracking() {
        if (this.timer) {
            cancelAnimationFrame(this.timer);
            this.timer = null;
        }
    }

    stop() {
        this.currentRequestId++;
        this.stopBoundaryTracking();
        if (this.audio) {
            // Nullify callbacks to prevent race conditions
            this.audio.onended = null;
            this.audio.onerror = null;
            this.audio.onplay = null;

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
        } catch {
            return [{ id: '3', name: '连接失败 (请启动VOICEVOX)' }];
        }
    }
}
