'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ttsManager } from '@/lib/tts/manager';

/**
 * Global component to handle TTS playback.
 * It subscribes to the store's playlist and playback state,
 * and orchestrates the ttsManager accordingly.
 */
export default function GlobalAudioPlayer() {
    // Selectors
    const isSpeaking = useAppStore(s => s.isSpeaking);
    const isPaused = useAppStore(s => s.isPaused);
    const playlist = useAppStore(s => s.playlist);
    const setSpeakingTokenId = useAppStore(s => s.setSpeakingTokenId);
    const currentIndex = useAppStore(s => s.currentSentenceIndex);
    const playNextSentence = useAppStore(s => s.playNextSentence);
    const stopTTS = useAppStore(s => s.stopTTS);
    const settings = useAppStore(s => s.settings);

    // Refs to track state inside callbacks
    const isSpeakingRef = useRef(isSpeaking);
    const currentIndexRef = useRef(currentIndex);
    const lastHandledIndexRef = useRef<number | null>(null);

    // Sync refs
    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
        currentIndexRef.current = currentIndex;
    }, [isSpeaking, currentIndex]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                // Ignore if typing in input/textarea
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }

                e.preventDefault(); // Prevent scrolling

                // Toggle Play/Pause
                const store = useAppStore.getState();

                // Logic: If current playlist is partial (single sentence), Space should RESET to full
                const isPartial = store.playlist.length !== store.fullPlaylist.length;

                if (isPartial) {
                    store.setPlaylist(store.fullPlaylist);
                    store.setIsSpeaking(true);
                    store.setIsPaused(false);
                    return;
                }

                if (store.isSpeaking) {
                    store.setIsPaused(!store.isPaused);
                } else {
                    // Start Playing (if content exists)
                    if (store.playlist.length > 0) {
                        store.setIsSpeaking(true);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Effect: Handle Playback
    useEffect(() => {
        // If not speaking, ensure TTS is stopped
        if (!isSpeaking) {
            ttsManager.stop();
            lastHandledIndexRef.current = null;
            return;
        }

        // Handle Pause/Resume for existing sentence
        if (isPaused) {
            ttsManager.pause();
            return;
        } else {
            // We are resuming or starting fresh.
            // If the current index matches the last handled index, it means we are resuming the same sentence.
            if (lastHandledIndexRef.current === currentIndex) {
                ttsManager.resume();
                return;
            }
        }

        const currentSentence = playlist[currentIndex];

        if (!currentSentence) {
            // End of playlist
            stopTTS();
            lastHandledIndexRef.current = null;
            return;
        }

        console.log(`[GlobalPlayer] Playing sentence ${currentIndex + 1}/${playlist.length}:`, currentSentence.text.substring(0, 10) + '...');
        lastHandledIndexRef.current = currentIndex;

        ttsManager.speak(currentSentence.text, settings, {
            onStart: () => {
                // Preload NEXT sentence
                const nextSentence = playlist[currentIndex + 1];
                if (nextSentence) {
                    ttsManager.preload(nextSentence.text, settings);
                }
            },
            onEnd: () => {
                // Play next
                console.log('[GlobalPlayer] Sentence finished, moving to next');
                playNextSentence();
            },
            onError: (err) => {
                // Ignore AbortError / Cancelled errors which happen during rapid skipping or double-trigger
                if (err.name === 'AbortError' || err.message.includes('cancelled') || err.message.includes('aborted')) {
                    console.log('[GlobalPlayer] Playback aborted/cancelled (ignoring)');
                    return;
                }
                console.error('[GlobalPlayer] Playback error:', err);
                stopTTS();
            },
            onBoundary: (charIndex, _charLength, boundaryIndex) => {
                // Boundary tracking logic (unchanged)
                if (charIndex === -1) return;

                const map = currentSentence.tokenMap;
                if (!map || map.length === 0) {
                    setSpeakingTokenId(null);
                    return;
                }

                const match = map.find(t => charIndex >= t.start && charIndex < t.end);
                if (match) {
                    setSpeakingTokenId(match.id);
                    return;
                }

                let closest = null;
                let minDist = Infinity;
                for (const t of map) {
                    const distStart = Math.abs(t.start - charIndex);
                    const distEnd = Math.abs(t.end - charIndex);
                    const dist = Math.min(distStart, distEnd);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = t;
                    }
                }

                if (closest && minDist <= 5) {
                    setSpeakingTokenId(closest.id);
                    return;
                }

                if (boundaryIndex !== undefined && boundaryIndex >= 0 && boundaryIndex < map.length) {
                    setSpeakingTokenId(map[boundaryIndex].id);
                    return;
                }
            }
        });

    }, [isSpeaking, isPaused, currentIndex, playlist, settings, stopTTS, playNextSentence, setSpeakingTokenId]);

    return null; // Logic only component
}
