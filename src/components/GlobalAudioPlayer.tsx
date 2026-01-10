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
            return;
        }

        // If paused, just pause
        if (isPaused) {
            ttsManager.pause();
            return;
        } else {


            // If was paused and now resumed, and we correspond to the same sentence?
            // Since we re-run this effect on `isPaused` change, we need to check if we should resume or start fresh.
            // ttsManager.resume() works if audio exists. 
            // BUT, if we switched sentences, we need to speak new.

            // To be safe and simple: 
            // If we are actively "playing" (not paused) and there is a sentence, we trigger speak.
            // ttsManager.speak handles stopping previous internal audio.
        }

        const currentSentence = playlist[currentIndex];

        if (!currentSentence) {
            // End of playlist
            stopTTS();
            return;
        }

        console.log(`[GlobalPlayer] Playing sentence ${currentIndex + 1}/${playlist.length}:`, currentSentence.text.substring(0, 10) + '...');

        ttsManager.speak(currentSentence.text, settings, {
            onStart: () => {
                // Optional: Scroll to sentence
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
                // Ignore invalid boundary - Do NOT clear speakingTokenId
                // This preserves the "active" state during silence/gaps for Sky Drop
                if (charIndex === -1) {
                    // setSpeakingTokenId(null); // REMOVED to prevent flicker
                    return;
                }

                const map = currentSentence.tokenMap;
                if (!map || map.length === 0) {
                    setSpeakingTokenId(null);
                    return;
                }

                // Primary Strategy: Use charIndex to find the token
                // This is the most accurate because it's based on TTS timing
                const match = map.find(t => charIndex >= t.start && charIndex < t.end);

                if (match) {
                    setSpeakingTokenId(match.id);
                    return;
                }

                // Fallback 1: Find token whose start is closest to charIndex (within range)
                let closest = null;
                let minDist = Infinity;
                for (const t of map) {
                    // Check if charIndex is near this token's boundaries
                    const distStart = Math.abs(t.start - charIndex);
                    const distEnd = Math.abs(t.end - charIndex);
                    const dist = Math.min(distStart, distEnd);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = t;
                    }
                }

                // Accept match if within reasonable distance (5 chars)
                if (closest && minDist <= 5) {
                    setSpeakingTokenId(closest.id);
                    return;
                }

                // Fallback 2: Use boundaryIndex if it's valid
                // This handles cases where charIndex doesn't match exactly
                if (boundaryIndex !== undefined && boundaryIndex >= 0 && boundaryIndex < map.length) {
                    setSpeakingTokenId(map[boundaryIndex].id);
                    return;
                }

                // No match found - also keep last state instead of clearing?
                // setSpeakingTokenId(null); // REMOVED to prevent flicker
            }
        });

        // Cleanup: If the component unmounts or we switch sentences, we don't necessarily stop here
        // because `speak` cancels previous. 
        // But if `isSpeaking` turns false (handled at top), we stop.

    }, [isSpeaking, isPaused, currentIndex, playlist, settings, stopTTS, playNextSentence, setSpeakingTokenId]);

    // Handle Pausing specifically via Resume
    // The main effect handles "Stop -> Start" logic generally.
    // But `resume` is special.
    // If we just toggle `isPaused`, the effect runs.
    useEffect(() => {
        if (isSpeaking && !isPaused) {
            // Check if we need to resume instead of restart?
            // Our ttsManager wrapper is simple. 
            // If we call `speak` again, it restarts. 
            // We need `ttsManager` to support "resume if same text"? 
            // Currently ttsManager.resume() is for HTMLAudioElement.play().
            // If we are in the middle of a sentence, we want `resume()`.
            // If we changed sentence, we want `speak()`.

            // NOTE: The main effect above re-runs on `isPaused` change.
            // If we go Paused -> Playing:
            // The effect runs. `ttsManager.speak` is called. It RESTARTS the sentence.
            // This is acceptable behavior for now (easier to implement).
            // Ideal: `resume()` only.

            // Optimization for Resume:
            // We can check if `ttsManager` is paused and we are on the SAME sentence.
        } else if (isSpeaking && isPaused) {
            ttsManager.pause();
        }
    }, [isPaused, isSpeaking]);

    return null; // Logic only component
}
