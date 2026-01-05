import { TtsProvider } from './types';

export class NativeTtsProvider implements TtsProvider {
    private utterance: SpeechSynthesisUtterance | null = null;

    speak(text: string, options: {
        voiceURI?: string;
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onBoundary?: (charIndex: number) => void;
    }) {
        this.stop();

        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }

        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ja-JP';
        u.rate = options.speed || 1.0;

        if (options.voiceURI) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.voiceURI === options.voiceURI);
            if (voice) u.voice = voice;
        }

        u.onstart = () => options.onStart && options.onStart();
        u.onend = () => options.onEnd && options.onEnd();
        u.onerror = (e) => {
            console.error('TTS Error:', e);
            options.onEnd && options.onEnd();
        };

        // Boundary event for karaoke
        u.onboundary = (event) => {
            if (event.name === 'word' && options.onBoundary) {
                options.onBoundary(event.charIndex);
            }
        };

        this.utterance = u;
        window.speechSynthesis.speak(u);
    }

    stop() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.utterance = null;
    }

    async getVoices(): Promise<{ id: string; name: string }[]> {
        return new Promise((resolve) => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                resolve(this._formatVoices(voices));
            } else {
                window.speechSynthesis.onvoiceschanged = () => {
                    resolve(this._formatVoices(window.speechSynthesis.getVoices()));
                };
            }
        });
    }

    private _formatVoices(voices: SpeechSynthesisVoice[]) {
        return voices
            .filter(v => v.lang.includes('ja') || v.lang.includes('JP'))
            .map(v => ({ id: v.voiceURI, name: v.name }));
    }
}
