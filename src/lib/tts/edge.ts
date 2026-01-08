
import { TtsProvider } from './types';

interface EdgeTtsResponse {
    audioBase64: string;
    alignment: {
        charIndex: number;
        charLength: number;
        time: number; // ms
        duration?: number; // ms
    }[];
}

export class EdgeTtsProvider implements TtsProvider {
    private audio: HTMLAudioElement | null = null;
    private timer: number | null = null; // requestAnimationFrame ID
    private isFetching: boolean = false; // Lock to prevent duplicate requests
    private abortController: AbortController | null = null;

    async speak(text: string, options: {
        voiceURI?: string;
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onError?: (error: Error) => void;
        onBoundary?: (charIndex: number, charLength?: number) => void;
    }) {
        // Stop any existing playback first
        this.stop();

        // Skip if already fetching (prevents double-trigger from StrictMode)
        if (this.isFetching) {
            console.log('[EdgeTTS] Skipping duplicate request');
            return;
        }

        this.isFetching = true;
        this.abortController = new AbortController();

        try {
            const voice = options.voiceURI || 'ja-JP-NanamiNeural';
            const rate = (options.speed || 1.0) - 1.0;

            const res = await fetch('/api/tts/edge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, rate }),
                signal: this.abortController.signal
            });

            // Check if we were stopped during fetch
            if (!this.isFetching) {
                console.log('[EdgeTTS] Request was cancelled');
                return;
            }

            if (!res.ok) {
                throw new Error('Edge TTS API failed with status ' + res.status);
            }

            const data: EdgeTtsResponse = await res.json();

            if (!data.audioBase64) {
                throw new Error('No audio received');
            }

            const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
            this.audio = new Audio(audioUrl);
            this.audio.playbackRate = 1.0;

            this.audio.onplay = () => {
                console.log('[EdgeTTS] Audio started. Alignment data length:', data.alignment?.length);
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

            await this.audio.play();

        } catch (e) {
            this.isFetching = false;

            if ((e as Error).name === 'AbortError') {
                console.log('[EdgeTTS] Request aborted');
                // Abort is user action, do not call onEnd or onError to avoid side effects
            } else {
                console.error('Edge TTS Error:', e);
                // Real error -> use onError if available, otherwise silence or fallback
                if (options.onError) {
                    options.onError(e as Error);
                } else {
                    // Legacy behavior fallback, but careful not to loop
                    // options.onEnd && options.onEnd(); 
                    // DISABLE fallback to onEnd for errors to prevent loops
                }
            }
        }
    }

    private startBoundaryTracking(alignment: EdgeTtsResponse['alignment'], callback: (idx: number, len?: number, boundaryIndex?: number) => void) {
        let lastEmittedIndex = -2;
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
                    if (i < alignment.length - 1) {
                        duration = alignment[i + 1].time - start;
                    } else {
                        duration = 1000;
                    }
                }

                if (currentTimeMs >= start && currentTimeMs < start + duration) {
                    currentBoundaryIndex = alignment[i].charIndex;
                    currentBoundaryLength = alignment[i].charLength;
                    boundaryArrayIndex = i;
                    break;
                }
            }

            // Emit when boundary changes (either charIndex or array index)
            if (boundaryArrayIndex !== lastBoundaryArrayIndex) {
                lastEmittedIndex = currentBoundaryIndex;
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
        // Abort any pending fetch
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.isFetching = false;
        this.stopBoundaryTracking();

        if (this.audio) {
            // CRITICAL: Nullify callbacks FIRST to prevent any events during pause/cleanup
            this.audio.onended = null;
            this.audio.onerror = null;
            this.audio.onplay = null;

            this.audio.pause();
            this.audio.src = ''; // Release the audio resource
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
        return [
            { id: 'ja-JP-NanamiNeural', name: 'Nanami (Microsoft)' },
            { id: 'ja-JP-KeitaNeural', name: 'Keita (Microsoft)' }
        ];
    }
}
