export interface TtsProvider {
    speak(
        text: string,
        options: {
            voiceURI?: string;
            speed?: number;
            speakerId?: number;
            serverUrl?: string;
            onStart?: () => void;
            onEnd?: () => void;
            onBoundary?: (charIndex: number) => void;
        }
    ): void;

    stop(): void;
    pause(): void;
    resume(): void;

    getVoices(): Promise<{ id: string; name: string }[]>;
}
