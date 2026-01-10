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
            onError?: (error: Error) => void;
            onBoundary?: (charIndex: number, charLength?: number, boundaryIndex?: number) => void;
        }
    ): void;

    stop(): void;
    pause(): void;
    resume(): void;

    preload?(text: string, options: { voiceURI?: string; speed?: number; speakerId?: number; serverUrl?: string }): void;
    getVoices(): Promise<{ id: string; name: string }[]>;
}
