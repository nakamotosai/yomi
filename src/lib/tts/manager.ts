import { TtsProvider } from './types';
import { EdgeTtsProvider } from './edge';
import { VoicevoxProvider } from './voicevox';
import { AppSettings } from '@/types';

import { wakeUpAudio } from '@/lib/audioUtils';

class TtsManager {
    private edge: EdgeTtsProvider;
    private voicevox: VoicevoxProvider;
    private activeProvider: TtsProvider | null = null;

    constructor() {
        this.edge = new EdgeTtsProvider();
        this.voicevox = new VoicevoxProvider();
    }

    getProvider(settings: AppSettings): TtsProvider {
        // Voicevox is explicit, everything else falls back to Edge
        if (settings.ttsProvider === 'voicevox') {
            return this.voicevox;
        }
        return this.edge;
    }

    speak(text: string, settings: AppSettings, callbacks: {
        onStart?: () => void;
        onEnd?: () => void;
        onError?: (error: Error) => void;
        onBoundary?: (charIndex: number, charLength?: number, boundaryIndex?: number) => void;
    }) {
        // Universal Bluetooth Wake-up
        wakeUpAudio();

        const provider = this.getProvider(settings);

        // Stop any previous playback from any provider
        this.edge.stop();
        this.voicevox.stop();

        this.activeProvider = provider;

        // Map settings to options
        // For Edge: use nativeVoiceURI as voiceURI
        // For Voicevox: use voicevoxSpeakerId
        provider.speak(text, {
            ...callbacks,
            voiceURI: settings.nativeVoiceURI, // We use this field for Edge Voice ID
            speakerId: settings.voicevoxSpeakerId,
            serverUrl: settings.voicevoxUrl,
            speed: settings.playbackSpeed,
        });
    }

    stop() {
        this.edge.stop();
        this.voicevox.stop();
        this.activeProvider = null;
    }

    pause() {
        if (this.activeProvider) {
            this.activeProvider.pause();
        }
    }

    resume() {
        if (this.activeProvider) {
            this.activeProvider.resume();
        }
    }

    async getVoices(providerType: 'native' | 'voicevox' | 'online'): Promise<{ id: string; name: string }[]> {
        // Map 'native' or 'online' request to Edge voices for compatibility
        if (providerType === 'voicevox') {
            return this.voicevox.getVoices();
        }
        // Default to Edge
        return this.edge.getVoices();
    }
}

export const ttsManager = new TtsManager();
