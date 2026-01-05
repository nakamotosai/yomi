import { TtsProvider } from './types';
import { NativeTtsProvider } from './native';
import { VoicevoxProvider } from './voicevox';
import { OnlineTtsProvider } from './online';
import { AppSettings } from '@/store/useAppStore';

class TtsManager {
    private native: NativeTtsProvider;
    private voicevox: VoicevoxProvider;
    private online: OnlineTtsProvider;
    private activeProvider: TtsProvider | null = null;

    constructor() {
        this.native = new NativeTtsProvider();
        this.voicevox = new VoicevoxProvider();
        this.online = new OnlineTtsProvider();
    }

    getProvider(settings: AppSettings): TtsProvider {
        switch (settings.ttsProvider) {
            case 'voicevox': return this.voicevox;
            case 'online': return this.online;
            case 'native':
            default:
                return this.native;
        }
    }

    speak(text: string, settings: AppSettings, callbacks: {
        onStart?: () => void;
        onEnd?: () => void;
        onBoundary?: (charIndex: number) => void;
    }) {
        const provider = this.getProvider(settings);

        // Stop any previous playback from any provider
        this.native.stop();
        this.voicevox.stop();
        this.online.stop();

        this.activeProvider = provider;

        provider.speak(text, {
            ...callbacks,
            voiceURI: settings.nativeVoiceURI,
            speakerId: settings.voicevoxSpeakerId,
            serverUrl: settings.voicevoxUrl,
            speed: settings.playbackSpeed,
        });
    }

    stop() {
        this.native.stop();
        this.voicevox.stop();
        this.online.stop();
        this.activeProvider = null;
    }

    async getVoices(providerType: 'native' | 'voicevox' | 'online') {
        switch (providerType) {
            case 'voicevox': return this.voicevox.getVoices();
            case 'online': return this.online.getVoices();
            case 'native': return this.native.getVoices();
        }
    }
}

export const ttsManager = new TtsManager();
