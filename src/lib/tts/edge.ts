
import { TtsProvider } from './types';

interface EdgeTtsResponse {
    audioBase64: string;
    alignment: {
        charIndex: number;
        charLength: number;
        time: number;
        duration?: number;
    }[];
}

export class EdgeTtsProvider implements TtsProvider {
    private audio: HTMLAudioElement | null = null;
    private timer: number | null = null;
    private isFetching: boolean = false;
    private abortController: AbortController | null = null;
    private prefetchCache: Map<string, EdgeTtsResponse> = new Map();

    private getCacheKey(text: string, voice: string, rate: number): string {
        return `${voice}_${rate}_${text}`;
    }

    async preload(text: string, options: { voiceURI?: string; speed?: number }) {
        const voice = options.voiceURI || 'ja-JP-NanamiNeural';
        const rate = (options.speed || 1.0) - 1.0;
        const key = this.getCacheKey(text, voice, rate);

        if (this.prefetchCache.has(key)) return;

        try {
            const res = await fetch('/api/tts/edge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, rate }),
            });

            if (res.ok) {
                const data: EdgeTtsResponse = await res.json();
                if (data.audioBase64) {
                    this.prefetchCache.set(key, data);
                    if (this.prefetchCache.size > 1) {
                        const firstKey = this.prefetchCache.keys().next().value;
                        if (firstKey !== undefined) this.prefetchCache.delete(firstKey);
                    }
                    console.log(`[EdgeTTS] Preloaded: ${text.substring(0, 10)}...`);
                }
            }
        } catch (e) {
            console.warn('[EdgeTTS] Preload failed', e);
        }
    }

    async speak(text: string, options: {
        voiceURI?: string;
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onError?: (error: Error) => void;
        onBoundary?: (charIndex: number, charLength?: number) => void;
    }) {
        this.stop();

        if (this.isFetching) {
            console.log('[EdgeTTS] Skipping duplicate request');
            return;
        }

        const voice = options.voiceURI || 'ja-JP-NanamiNeural';
        const rate = (options.speed || 1.0) - 1.0;
        const key = this.getCacheKey(text, voice, rate);

        let data: EdgeTtsResponse | null = null;

        // Check cache
        if (this.prefetchCache.has(key)) {
            console.log(`[EdgeTTS] Using cached audio`);
            data = this.prefetchCache.get(key)!;
            this.prefetchCache.delete(key);
        }

        if (!data) {
            this.isFetching = true;
            this.abortController = new AbortController();

            try {
                const res = await fetch('/api/tts/edge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice, rate }),
                    signal: this.abortController.signal
                });

                if (!this.isFetching) {
                    console.log('[EdgeTTS] Request was cancelled');
                    return;
                }

                if (!res.ok) {
                    const errorMsg = await res.text();
                    throw new Error(`Edge TTS API failed with status ${res.status}: ${errorMsg}`);
                }

                data = await res.json();
            } catch (e) {
                this.isFetching = false;
                const error = e as Error;
                if (error.name === 'AbortError') {
                    console.log('[EdgeTTS] Request aborted');
                } else {
                    console.error('Edge TTS Error:', e);
                    if (options.onError) options.onError(error);
                }
                return;
            }
        }

        if (!data || !data.audioBase64) {
            this.isFetching = false;
            if (options.onError) options.onError(new Error('No audio received'));
            return;
        }

        const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
        this.audio = new Audio(audioUrl);
        this.audio.playbackRate = 1.0;

        this.audio.onplay = () => {
            console.log('[EdgeTTS] Audio started. Alignment:', data?.alignment?.length || 0);
            options.onStart && options.onStart();

            if (options.onBoundary && data?.alignment && data.alignment.length > 0) {
                this.startBoundaryTracking(data.alignment, options.onBoundary);
            }
        };

        this.audio.onended = () => {
            this.stopBoundaryTracking();
            this.isFetching = false;
            options.onEnd && options.onEnd();
        };

        this.audio.onerror = (e) => {
            console.error('Edge TTS Playback Error', e);
            this.isFetching = false;
            const err = new Error('Playback error');
            options.onError ? options.onError(err) : (options.onEnd && options.onEnd());
        };

        try {
            await this.audio.play();
        } catch (e) {
            console.error('[EdgeTTS] Play error:', e);
            this.isFetching = false;
            if (options.onError) options.onError(e as Error);
        }
    }

    private startBoundaryTracking(alignment: EdgeTtsResponse['alignment'], callback: (idx: number, len?: number, boundaryIndex?: number) => void) {
        let lastBoundaryArrayIndex = -1;

        const track = () => {
            if (!this.audio || this.audio.paused) return;

            const currentTimeMs = this.audio.currentTime * 1000;
            let currentBoundaryIndex = -1;
            let currentBoundaryLength = 0;
            let boundaryArrayIndex = -1;

            for (let i = 0; i < alignment.length; i++) {
                const start = alignment[i].time;
                let duration = alignment[i].duration;
                if (!duration) {
                    duration = i < alignment.length - 1 ? alignment[i + 1].time - start : 1000;
                }

                if (currentTimeMs >= start && currentTimeMs < start + duration) {
                    currentBoundaryIndex = alignment[i].charIndex;
                    currentBoundaryLength = alignment[i].charLength;
                    boundaryArrayIndex = i;
                    break;
                }
            }

            if (boundaryArrayIndex !== lastBoundaryArrayIndex) {
                lastBoundaryArrayIndex = boundaryArrayIndex;
                callback(currentBoundaryIndex, currentBoundaryLength, boundaryArrayIndex);
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
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.isFetching = false;
        this.stopBoundaryTracking();

        if (this.audio) {
            this.audio.onended = null;
            this.audio.onerror = null;
            this.audio.onplay = null;
            this.audio.pause();
            this.audio.src = '';
            this.audio = null;
        }
    }

    pause() {
        if (this.audio) this.audio.pause();
    }

    resume() {
        if (this.audio) this.audio.play();
    }

    async getVoices(): Promise<{ id: string; name: string }[]> {
        return [
            { id: 'ja-JP-NanamiNeural', name: 'Nanami (Microsoft)' },
            { id: 'ja-JP-KeitaNeural', name: 'Keita (Microsoft)' }
        ];
    }
}
