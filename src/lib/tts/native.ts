import { TtsProvider } from './types';

interface SpeakOptions {
    voiceURI?: string;
    speed?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onBoundary?: (charIndex: number) => void;
}

export class NativeTtsProvider implements TtsProvider {
    private utterance: SpeechSynthesisUtterance | null = null;
    private queue: string[] = [];
    private currentIndex = 0;
    private isPlaying = false;
    private charOffset = 0;
    private currentOptions: SpeakOptions = {};
    private cachedVoices: SpeechSynthesisVoice[] = [];

    constructor() {
        // Pre-load voices when available
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Try to get voices immediately
            this.cachedVoices = window.speechSynthesis.getVoices();

            // Also listen for when voices become available
            window.speechSynthesis.onvoiceschanged = () => {
                this.cachedVoices = window.speechSynthesis.getVoices();
                console.log('[NativeTTS] Voices loaded:', this.cachedVoices.length);
            };
        }
    }

    speak(text: string, options: SpeakOptions) {
        this.stop(); // Stop any previous playback

        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }

        this.currentOptions = options;
        this.queue = this.chunkText(text);
        this.currentIndex = 0;
        this.charOffset = 0;
        this.isPlaying = true;

        // Refresh voices cache before speaking
        const freshVoices = window.speechSynthesis.getVoices();
        if (freshVoices.length > 0) {
            this.cachedVoices = freshVoices;
        }

        console.log('[NativeTTS] Starting playback, chunks:', this.queue.length, 'voiceURI:', options.voiceURI);
        console.log('[NativeTTS] Available voices:', this.cachedVoices.map(v => v.voiceURI).join(', '));

        if (this.queue.length > 0) {
            // Trigger onStart only for the first chunk
            if (options.onStart) options.onStart();
            this.playNextChunk();
        } else {
            if (options.onEnd) options.onEnd();
        }
    }

    private chunkText(text: string): string[] {
        // Split by punctuation but keep the punctuation
        // Max chunk size ~200 chars to be safe (browsers vary, Chrome can do more but safer is better)
        const chunks: string[] = [];
        let currentChunk = '';

        // Split by common Japanese sentence terminators
        const sentences = text.split(/([。！？\n]+)/); // Include delimiters

        for (let i = 0; i < sentences.length; i++) {
            const part = sentences[i];

            if (currentChunk.length + part.length > 200) {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = part;
            } else {
                currentChunk += part;
            }
        }
        if (currentChunk) chunks.push(currentChunk);

        return chunks;
    }

    private playNextChunk() {
        if (!this.isPlaying || this.currentIndex >= this.queue.length) {
            this.isPlaying = false;
            console.log('[NativeTTS] Playback finished');
            if (this.currentOptions.onEnd) this.currentOptions.onEnd();
            return;
        }

        const chunkText = this.queue[this.currentIndex];

        // Skip silent/whitespace chunks manually to avoid browser inconsistencies
        if (!chunkText.trim()) {
            this.charOffset += chunkText.length;
            this.currentIndex++;
            // Use timeout to prevent stack overflow on many empty lines
            setTimeout(() => this.playNextChunk(), 0);
            return;
        }

        console.log('[NativeTTS] Playing chunk', this.currentIndex, 'offset:', this.charOffset);

        const u = new SpeechSynthesisUtterance(chunkText);
        u.lang = 'ja-JP';
        u.rate = this.currentOptions.speed || 1.0;

        // Apply voice selection
        if (this.currentOptions.voiceURI) {
            // Use cached voices for reliability
            const voice = this.cachedVoices.find(v => v.voiceURI === this.currentOptions.voiceURI);
            if (voice) {
                u.voice = voice;
                console.log('[NativeTTS] Using voice:', voice.name);
            } else {
                console.warn('[NativeTTS] Voice not found:', this.currentOptions.voiceURI);
                // Try to find any Japanese voice as fallback
                const jaVoice = this.cachedVoices.find(v => v.lang.includes('ja') || v.lang.includes('JP'));
                if (jaVoice) {
                    u.voice = jaVoice;
                    console.log('[NativeTTS] Using fallback Japanese voice:', jaVoice.name);
                }
            }
        } else {
            // No voice specified, try to use first Japanese voice
            const jaVoice = this.cachedVoices.find(v => v.lang.includes('ja') || v.lang.includes('JP'));
            if (jaVoice) {
                u.voice = jaVoice;
                console.log('[NativeTTS] Using default Japanese voice:', jaVoice.name);
            }
        }

        // We don't trigger onStart for subsequent chunks, only the first one (handled in speak)

        u.onend = () => {
            if (this.isPlaying) {
                this.charOffset += chunkText.length;
                this.currentIndex++;
                this.playNextChunk();
            }
        };

        u.onerror = (e) => {
            // Only log error if we're still playing (not cancelled)
            if (this.isPlaying) {
                console.error('TTS Chunk Error:', e);
                // Try to continue to next chunk even if one fails
                this.charOffset += chunkText.length;
                this.currentIndex++;
                this.playNextChunk();
            }
            // If not playing, this was triggered by cancel() - ignore silently
        };

        // Boundary event mapping - accept all boundary events
        u.onboundary = (event) => {
            console.log('[NativeTTS] Boundary event:', event.name, 'charIndex:', event.charIndex);

            if (this.currentOptions.onBoundary) {
                // Map local chunk index to global text index
                this.currentOptions.onBoundary(this.charOffset + event.charIndex);
            }
        };

        this.utterance = u;
        window.speechSynthesis.speak(u);
    }

    stop() {
        this.isPlaying = false;
        this.queue = [];
        this.currentIndex = 0;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.utterance = null;
    }

    pause() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.pause();
            this.isPlaying = false; // "Logically" paused for our queue loop
        }
    }

    resume() {
        if ('speechSynthesis' in window) {
            // Restore state to allow onend to continue queue
            this.isPlaying = true;
            window.speechSynthesis.resume();
        }
    }

    async getVoices(): Promise<{ id: string; name: string }[]> {
        return new Promise((resolve) => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                this.cachedVoices = voices;
                resolve(this._formatVoices(voices));
            } else {
                window.speechSynthesis.onvoiceschanged = () => {
                    const newVoices = window.speechSynthesis.getVoices();
                    this.cachedVoices = newVoices;
                    resolve(this._formatVoices(newVoices));
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
