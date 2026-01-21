
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

    // Track if Edge TTS API is available
    private static edgeTtsAvailable: boolean | null = null;
    // Web Speech API utterance for fallback
    private utterance: SpeechSynthesisUtterance | null = null;

    private getCacheKey(text: string, voice: string, rate: number): string {
        return `${voice}_${rate}_${text}`;
    }

    async preload(text: string, options: { voiceURI?: string; speed?: number }) {
        // Only preload if Edge TTS is known to work
        if (EdgeTtsProvider.edgeTtsAvailable === false) return;

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
                    EdgeTtsProvider.edgeTtsAvailable = true;
                    this.prefetchCache.set(key, data);
                    if (this.prefetchCache.size > 1) {
                        const firstKey = this.prefetchCache.keys().next().value;
                        if (firstKey !== undefined) this.prefetchCache.delete(firstKey);
                    }
                    console.log(`[EdgeTTS] Preloaded: ${text.substring(0, 10)}...`);
                }
            } else {
                EdgeTtsProvider.edgeTtsAvailable = false;
            }
        } catch (e) {
            console.warn('[EdgeTTS] Preload failed, will use Web Speech API fallback', e);
            EdgeTtsProvider.edgeTtsAvailable = false;
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

        // Try Edge TTS API if not known to be unavailable
        if (!data && EdgeTtsProvider.edgeTtsAvailable !== false) {
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

                if (res.ok) {
                    data = await res.json();
                    if (data?.audioBase64) {
                        EdgeTtsProvider.edgeTtsAvailable = true;
                    }
                } else {
                    console.log('[EdgeTTS] API failed, falling back to Web Speech API');
                    EdgeTtsProvider.edgeTtsAvailable = false;
                }
            } catch (e) {
                this.isFetching = false;
                const error = e as Error;
                if (error.name === 'AbortError') {
                    console.log('[EdgeTTS] Request aborted');
                    return;
                }
                console.warn('[EdgeTTS] Error, falling back to Web Speech API:', e);
                EdgeTtsProvider.edgeTtsAvailable = false;
            }
        }

        // Use Edge TTS audio if available
        if (data?.audioBase64) {
            this.playEdgeTtsAudio(data, options);
            return;
        }

        // Fallback to Web Speech API
        this.isFetching = false;
        this.playWithWebSpeechAPI(text, options);
    }

    private playEdgeTtsAudio(data: EdgeTtsResponse, options: {
        onStart?: () => void;
        onEnd?: () => void;
        onError?: (error: Error) => void;
        onBoundary?: (charIndex: number, charLength?: number) => void;
    }) {
        const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
        this.audio = new Audio(audioUrl);
        this.audio.playbackRate = 1.0;

        this.audio.onplay = () => {
            console.log('[EdgeTTS] Audio started');
            options.onStart && options.onStart();

            if (options.onBoundary && data.alignment && data.alignment.length > 0) {
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

        this.audio.play().catch(e => {
            console.error('[EdgeTTS] Play error:', e);
            this.isFetching = false;
            if (options.onError) options.onError(e as Error);
        });
    }

    private playWithWebSpeechAPI(text: string, options: {
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onError?: (error: Error) => void;
        onBoundary?: (charIndex: number, charLength?: number) => void;
    }) {
        if (!('speechSynthesis' in window)) {
            console.error('[WebSpeech] Not supported in this browser');
            if (options.onError) options.onError(new Error('Web Speech API not supported'));
            return;
        }

        console.log('[WebSpeech] Using browser TTS fallback');

        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.lang = 'ja-JP';
        this.utterance.rate = options.speed || 1.0;

        // Try to find a Japanese voice
        const voices = speechSynthesis.getVoices();
        const japaneseVoice = voices.find(v => v.lang.startsWith('ja'));
        if (japaneseVoice) {
            this.utterance.voice = japaneseVoice;
        }

        this.utterance.onstart = () => {
            console.log('[WebSpeech] Started');
            options.onStart && options.onStart();
        };

        this.utterance.onend = () => {
            console.log('[WebSpeech] Ended');
            options.onEnd && options.onEnd();
        };

        this.utterance.onerror = (e) => {
            console.error('[WebSpeech] Error:', e);
            if (options.onError) options.onError(new Error(e.error || 'Speech synthesis error'));
        };

        this.utterance.onboundary = (e) => {
            if (e.name === 'word' && options.onBoundary) {
                options.onBoundary(e.charIndex, e.charLength);
            }
        };

        speechSynthesis.speak(this.utterance);
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

        // Stop Web Speech API
        if (this.utterance) {
            speechSynthesis.cancel();
            this.utterance = null;
        }
    }

    pause() {
        if (this.audio) {
            this.audio.pause();
        } else if (this.utterance) {
            speechSynthesis.pause();
        }
    }

    resume() {
        if (this.audio) {
            this.audio.play();
        } else if (this.utterance) {
            speechSynthesis.resume();
        }
    }

    async getVoices(): Promise<{ id: string; name: string }[]> {
        return [
            { id: 'ja-JP-NanamiNeural', name: 'Nanami (Microsoft)' },
            { id: 'ja-JP-KeitaNeural', name: 'Keita (Microsoft)' }
        ];
    }
}
