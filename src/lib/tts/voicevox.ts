import { TtsProvider } from './types';
import axios from 'axios';

// Interfaces for VOICEVOX API
interface VoicevoxMora {
    vowel_length: number;
    consonant_length: number;
    text?: string;
}

interface VoicevoxAccentPhrase {
    moras: VoicevoxMora[];
    pause_mora?: VoicevoxMora;
}

interface VoicevoxQuery {
    accent_phrases: VoicevoxAccentPhrase[];
    speedScale: number;
    prePhonationLength?: number;
    postPhonationLength?: number;
}

interface VoicevoxSpeaker {
    name: string;
    speaker_uuid: string;
    styles: { name: string; id: number }[];
    version: string;
}

export class VoicevoxProvider implements TtsProvider {
    private audio: HTMLAudioElement | null = null;
    private currentRequestId: number = 0;

    private timer: number | null = null;

    async speak(text: string, options: {
        speakerId?: number;
        serverUrl?: string;
        speed?: number;
        onStart?: () => void;
        onEnd?: () => void;
        onBoundary?: (charIndex: number) => void;
    }) {
        // 1. Cancel previous playback immediately
        this.stop();

        // 2. Increment request ID.
        const requestId = ++this.currentRequestId;

        const baseUrl = options.serverUrl || 'http://localhost:50021';
        const speaker = options.speakerId || 3; // Default to Zundamon Normal
        const speed = options.speed || 1.0;

        try {
            // 1. Create Audio Query
            const queryRes = await axios.post(`${baseUrl}/audio_query`, null, {
                params: { text, speaker }
            });

            if (this.currentRequestId !== requestId) return;

            const query = queryRes.data;
            query.speedScale = speed;

            // 1.5 Parse timing from query
            // accent_phrases -> moras -> wait?
            // We need to map time -> char index in text.
            // Voicevox normalizes text, so mapping to original `text` is hard.
            // But usually for Japanese text, the kana conversion is roughly linear.
            // Strategy: We will just fire boundaries at the start of each Accent Phrase, 
            // and maybe try to map it to the original text if possible.
            // Since we can't easily map back to original chars without a dictionary, 
            // we will use a rough estimation or rely on the Fact that the user's TextAnalyzer
            // works with "tokens".

            // Let's create a time map: [ { timeMs: number, label: string } ]
            // Moras have 'vowel_length' and 'consonant_length' in seconds.
            // We can calculate cumulative time.

            const alignment: { time: number }[] = [];
            let currentTime = 0 + (query.prePhonationLength || 0.1); // Add some padding/pre-phonation

            // Note: speedScale affects synthesis, so we must adjust our calculated time by speedScale?
            // Actually, query results (lengths) are usually base 1.0. If we set speedScale,
            // the generated audio is shorter. So we need to divide lengths by speed.

            const timeScale = 1.0 / speed;

            if (query.accent_phrases) {
                query.accent_phrases.forEach((phrase: VoicevoxAccentPhrase) => {
                    // Pause before phrase? (pause_mora)
                    if (phrase.pause_mora) {
                        const len = (phrase.pause_mora.vowel_length + phrase.pause_mora.consonant_length) * timeScale;
                        currentTime += len;
                    }

                    // Log this visual boundary
                    // We fire a boundary at the start of the phrase
                    // Ideally we want to know WHICH char index this corresponds to.
                    // Since we don't know, we will just emit boundaries periodically based on moras
                    // and let the frontend snap to the nearest token?
                    // Wait, the frontend `onBoundary` takes `charIndex`.
                    // If we emit wrong charIndex, highlighting breaks.

                    // Fallback: If we can't map, we can't do Karaoke for Voicevox accurately on raw text.
                    // BUT, TextAnalyzer has `tokenMap`.
                    // Maybe we can just emit an INCREMENTING char index relative to kana count?
                    // No, that won't match.

                    // Hacky Solution:
                    // We will assume the `text` matches the kana structure roughly.
                    // We will distribute the boundaries evenly across the text length based on time?
                    // No, that's what Online TTS did.

                    // Better Solution:
                    // Voicevox `kana` is what is verified.
                    // Is there any way to get the original text mapping? No.
                    // However, we can approximate. 
                    // Let's try to just map "Accent Phrase Start" to "Rough Percentage of Text".

                    // Calculate total duration first?
                    // Let's just create points in time.

                    // For each mora
                    if (phrase.moras) {
                        phrase.moras.forEach((mora: VoicevoxMora) => {
                            // This is a boundary opportunity
                            // Accumulate time
                            const len = (mora.vowel_length + mora.consonant_length) * timeScale;

                            // We push a timing point.
                            // What is the charIndex? 
                            // We don't know. 

                            currentTime += len;
                        });
                    }
                });
            }

            // Realization: Voicevox Karaoke is HARD without text alignment.
            // But wait, the user wants it to work.
            // If we can't get alignment, we can fall back to the "Time Interpolation" method 
            // but effectively using the REAL duration of the audio (from audio_query output)
            // rather than a blind guess.
            // `query.outputStereo` is false usually.

            // Let's calculate TOTAL DURATION from the query data first.
            // We must include pre/post phonation and all pauses.
            let explicitDuration = (query.prePhonationLength || 0) + (query.postPhonationLength || 0);

            if (query.accent_phrases) {
                query.accent_phrases.forEach((phrase: VoicevoxAccentPhrase) => {
                    // Add logic to include pause_mora if present
                    if (phrase.pause_mora) {
                        explicitDuration += (phrase.pause_mora.vowel_length || 0) + (phrase.pause_mora.consonant_length || 0);
                    }
                    if (phrase.moras) {
                        phrase.moras.forEach((m: VoicevoxMora) => {
                            explicitDuration += (m.vowel_length || 0) + (m.consonant_length || 0);
                        });
                    }
                });
            }
            const totalDurationMs = (explicitDuration * timeScale) * 1000;

            console.log('[Voicevox] Calculated duration:', totalDurationMs, 'ms');

            // 2. Synthesize Audio
            const synthRes = await axios.post(`${baseUrl}/synthesis`, query, {
                params: { speaker },
                responseType: 'blob'
            });

            if (this.currentRequestId !== requestId) return;

            // 3. Create Audio URL
            const audioUrl = URL.createObjectURL(synthRes.data);
            this.audio = new Audio(audioUrl);

            this.audio.onplay = () => {
                if (this.currentRequestId === requestId) {
                    options.onStart && options.onStart();

                    if (options.onBoundary) {
                        // Start simulated tracking
                        this.startBoundaryTracking(text.length, totalDurationMs, options.onBoundary);
                    }
                }
            };

            // ... (rest of audio handlers)
            this.audio.onended = () => {
                if (this.currentRequestId === requestId) {
                    this.stopBoundaryTracking();
                    options.onEnd && options.onEnd();
                }
            };
            this.audio.onerror = (e) => {
                if (this.currentRequestId === requestId) {
                    console.error('Voicevox playback error', e);
                    options.onEnd && options.onEnd();
                }
            };

            this.audio.play();

        } catch (err) {
            if (this.currentRequestId !== requestId) return;
            console.error('Voicevox Error:', err);
            options.onEnd && options.onEnd();
        }
    }

    // Simple linear interpolation tracker for Voicevox (better than nothing)
    // Since we know the Exact Total Duration from the phonemes, this is reasonably accurate for short sentences.
    private startBoundaryTracking(textLength: number, totalDurationMs: number, callback: (idx: number) => void) {
        const startTime = performance.now();

        const track = () => {
            if (!this.audio || this.audio.paused) return;

            // Use actual audio time if possible, fallback to performance
            const currentTimeMs = this.audio.currentTime * 1000;

            // Map time to char index
            const progress = currentTimeMs / totalDurationMs;
            const charIndex = Math.floor(progress * textLength);

            if (charIndex >= 0 && charIndex < textLength) {
                callback(charIndex);
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
        this.currentRequestId++;
        this.stopBoundaryTracking();
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
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
        // This connects to local VOICEVOX to get text speakers
        try {
            const res = await axios.get('http://localhost:50021/speakers');
            const speakers: VoicevoxSpeaker[] = res.data;
            const voices: { id: string; name: string }[] = [];

            speakers.forEach(s => {
                s.styles.forEach(style => {
                    voices.push({
                        id: style.id.toString(),
                        name: `${s.name} (${style.name})`
                    });
                });
            });
            return voices;
        } catch (e) {
            return [{ id: '3', name: '连接失败 (请启动VOICEVOX)' }];
        }
    }
}
