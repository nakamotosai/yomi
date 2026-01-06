
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

    async speak(text: string, options: {
        voiceURI?: string;
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onBoundary?: (charIndex: number, charLength?: number) => void;
    }) {
        this.stop();

        try {
            // Default to a good Japanese voice
            const voice = options.voiceURI || 'ja-JP-NanamiNeural';
            // Speed in Edge TTS: 0 is default. user speed 1.0 = 0. user speed 1.5 = +0.5?
            // Let's assume options.speed is 1.0 for normal.
            // Edge API takes 0.5, 1.0, 2.0 etc relative to normal?
            // No, the API route expects rate as float. 0 is normal?
            // Actually, my route implementation treats rate as percentage: rate * 100 %.
            // If user passes 1.0 (normal), I should pass 0 to route.
            // If user passes 1.5 (fast), I should pass 0.5.

            const rate = (options.speed || 1.0) - 1.0;

            const res = await fetch('/api/tts/edge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, rate })
            });

            if (!res.ok) {
                throw new Error('Edge TTS API failed');
            }

            const data: EdgeTtsResponse = await res.json();

            if (!data.audioBase64) {
                throw new Error('No audio received');
            }

            const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
            this.audio = new Audio(audioUrl);
            this.audio.playbackRate = 1.0; // Audio is already baked with speed, so play at 1x

            this.audio.onplay = () => {
                console.log('[EdgeTTS] Audio started. Alignment data length:', data.alignment?.length);
                options.onStart && options.onStart();

                if (options.onBoundary && data.alignment && data.alignment.length > 0) {
                    this.startBoundaryTracking(data.alignment, options.onBoundary);
                }
            };

            this.audio.onended = () => {
                this.stopBoundaryTracking();
                options.onEnd && options.onEnd();
            };

            this.audio.onerror = (e) => {
                console.error('Edge TTS Playback Error', e);
                options.onEnd && options.onEnd();
            };

            await this.audio.play();

        } catch (e) {
            console.error('Edge TTS Error:', e);
            options.onEnd && options.onEnd();
        }
    }

    private startBoundaryTracking(alignment: EdgeTtsResponse['alignment'], callback: (idx: number, len?: number) => void) {
        // Use requestAnimationFrame for high precision tracking
        let lastEmittedIndex = -2; // Start with invalid index

        const track = () => {
            if (!this.audio || this.audio.paused) return;

            const currentTimeMs = this.audio.currentTime * 1000;

            // Find the active word at current time
            let currentBoundaryIndex = -1;
            let currentBoundaryLength = 0;

            for (let i = 0; i < alignment.length; i++) {
                const start = alignment[i].time;
                // Calculate duration: explicit > next word start > default 1s
                let duration = alignment[i].duration;
                if (!duration) {
                    if (i < alignment.length - 1) {
                        duration = alignment[i + 1].time - start;
                    } else {
                        duration = 1000; // Last word default
                    }
                }

                if (currentTimeMs >= start && currentTimeMs < start + duration) {
                    currentBoundaryIndex = alignment[i].charIndex;
                    currentBoundaryLength = alignment[i].charLength;
                    break; // Found the active word
                }
            }

            // Emit only if changed
            if (currentBoundaryIndex !== lastEmittedIndex) {
                lastEmittedIndex = currentBoundaryIndex;
                callback(currentBoundaryIndex, currentBoundaryLength);
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
        this.stopBoundaryTracking();
        if (this.audio) {
            this.audio.pause();
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
        // Return a curated list of high quality Edge voices for Japanese
        return [
            { id: 'ja-JP-NanamiNeural', name: 'Nanami (Microsoft)' },
            { id: 'ja-JP-KeitaNeural', name: 'Keita (Microsoft)' }
        ];
    }
}
