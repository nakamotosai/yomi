/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import clsx from 'clsx';

interface VoiceInputProps {
    onResult: (text: string) => void;
    onStateChange?: (isListening: boolean) => void;
}

export default function VoiceInput({ onResult, onStateChange }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            onStateChange?.(false);
        }
    }, [onStateChange]);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Initialize recognition if not already done
        if (!recognitionRef.current) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('お使いのブラウザは音声入力をサポートしていません。ChromeまたはEdgeをご利用ください。');
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'ja-JP';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    onResult(finalTranscript);
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
                onStateChange?.(false);
            };

            recognition.onend = () => {
                setIsListening(false);
                onStateChange?.(false);
            };

            recognitionRef.current = recognition;
        }

        try {
            recognitionRef.current.start();
            setIsListening(true);
            onStateChange?.(true);
        } catch (e) {
            console.error(e);
        }
    }, [onResult, onStateChange]);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <button
            onClick={toggleListening}
            className={clsx(
                "p-2 transition-all rounded-full flex items-center justify-center",
                isListening
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
            )}
            title={isListening ? "音声入力を停止" : "音声入力を開始"}
        >
            {isListening ? (
                <MicOff className="w-4 h-4" />
            ) : (
                <Mic className="w-4 h-4" />
            )}
        </button>
    );
}
