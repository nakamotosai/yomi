import { TtsProvider } from './types';

// Using Google Translate TTS as a lightweight "Online" fallback
// Note: This is unofficial and may be rate limited or blocked.
// It does NOT support boundary events, so karaoke won't look great (mock sync).

export class OnlineTtsProvider implements TtsProvider {
    private audio: HTMLAudioElement | null = null;
    private timer: NodeJS.Timeout | null = null;

    speak(text: string, options: {
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onBoundary?: (charIndex: number) => void;
    }) {
        this.stop();

        // Google TTS URL (unofficial)
        // client=tw-ob is commonly used for these hacks
        const speed = options.speed || 1.0;
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob&ttsspeed=${speed}`;

        this.audio = new Audio(url);
        this.audio.playbackRate = speed; // Attempt to set rate on audio element

        this.audio.onplay = () => {
            options.onStart && options.onStart();

            // Mock Karaoke: advance cursor linearly based on text length and avg reading speed
            // Japanese avg: ~10 chars/sec?
            if (options.onBoundary) {
                const totalDuration = (text.length * 0.2) * 1000; // rough guess specific to this speed
                const interval = totalDuration / text.length;
                let charIndex = 0;

                this.timer = setInterval(() => {
                    if (charIndex < text.length) {
                        options.onBoundary!(charIndex);
                        charIndex++;
                    }
                }, interval);
            }
        };

        this.audio.onended = () => {
            this.clearTimer();
            options.onEnd && options.onEnd();
        };

        this.audio.onerror = (e) => {
            console.error('Online TTS Error', e);
            // Fallback to alert
            options.onEnd && options.onEnd();
        };

        this.audio.play().catch(e => {
            console.error("Audio playback failed", e);
            options.onEnd && options.onEnd();
        });
    }

    stop() {
        this.clearTimer();
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
    }

    private clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async getVoices(): Promise<{ id: string; name: string }[]> {
        return [{ id: 'google', name: 'Google Translate (Online)' }];
    }
}
