'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X, Trophy } from 'lucide-react';
import { KanaChar } from '@/types';
import { KANA_DATA } from '@/data/kanaData';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';

interface KanaGameProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function KanaGame({ isOpen, onClose }: KanaGameProps) {
    const { settings } = useAppStore();
    // const [isPlaying, setIsPlaying] = useState(false); // Unused
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState<KanaChar | null>(null);
    const [options, setOptions] = useState<KanaChar[]>([]);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    // Reset game when opened
    useEffect(() => {
        if (isOpen) {
            setScore(0);
            setStreak(0);
            nextQuestion();
        }
    }, [isOpen]);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const uttr = new SpeechSynthesisUtterance(text);
        uttr.lang = 'ja-JP';
        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang === 'ja-JP' && !v.name.includes('Google'));
        if (jaVoice) uttr.voice = jaVoice;
        window.speechSynthesis.speak(uttr);
    };

    const nextQuestion = () => {
        setSelectedOptionId(null);
        setIsCorrect(null);

        // Pick a random char from ALL data
        // TODO: Ideally use only active filtered ones if passed, but global for now is fine
        const target = KANA_DATA[Math.floor(Math.random() * KANA_DATA.length)];
        setCurrentQuestion(target);

        // Generate distractors
        const distractors: KanaChar[] = [];
        while (distractors.length < 3) {
            const d = KANA_DATA[Math.floor(Math.random() * KANA_DATA.length)];
            if (d.id !== target.id && !distractors.find(x => x.id === d.id)) {
                distractors.push(d);
            }
        }

        // Shuffle options
        const allOptions = [target, ...distractors].sort(() => Math.random() - 0.5);
        setOptions(allOptions);

        // Auto play sound after short delay
        setTimeout(() => speak(target.hiragana), 500);
    };

    const handleOptionClick = (char: KanaChar) => {
        if (selectedOptionId) return; // Prevent double click

        setSelectedOptionId(char.id);

        if (currentQuestion && char.id === currentQuestion.id) {
            setIsCorrect(true);
            setScore(s => s + 10 + streak * 2);
            setStreak(s => s + 1);
            // Success sound?
            setTimeout(nextQuestion, 1500);
        } else {
            setIsCorrect(false);
            setStreak(0);
            // Wrong sound?
            // Show correct answer?
            // setTimeout(nextQuestion, 2000); // Wait longer on error?
        }
    };

    const replaySound = () => {
        if (currentQuestion) speak(currentQuestion.hiragana);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4"
        >
            {/* Header / Score */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium opacity-80">SCORE</span>
                        <span className="text-2xl font-bold font-mono">{score}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
                    <Trophy className={clsx("w-5 h-5", streak > 2 ? "text-yellow-300 animate-pulse" : "text-white")} />
                    <span className="font-bold">x{streak}</span>
                </div>
            </div>

            {/* Game Center */}
            <div className="w-full max-w-md flex flex-col items-center gap-12">

                {/* Sound Button */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={replaySound}
                    className="w-32 h-32 rounded-full bg-white shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center justify-center relative z-10"
                >
                    <div className="absolute inset-0 rounded-full bg-blue-500 opacity-0 hover:opacity-10 transition-opacity" />
                    <Volume2 className="w-12 h-12 text-indigo-600" />
                    <div className="absolute -bottom-8 text-white/80 text-sm font-medium">点击重听</div>
                </motion.button>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    <AnimatePresence mode='popLayout'>
                        {options.map((char) => {
                            const isSelected = selectedOptionId === char.id;
                            const isThisCorrect = currentQuestion?.id === char.id;

                            let stateStyles = "bg-white/90 text-gray-800 hover:scale-105 active:scale-95";
                            if (selectedOptionId) {
                                if (isThisCorrect) {
                                    stateStyles = "bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)] scale-105";
                                } else if (isSelected) {
                                    stateStyles = "bg-red-500 text-white animate-shake";
                                } else {
                                    stateStyles = "bg-white/50 text-gray-400 scale-95 opacity-50";
                                }
                            }

                            return (
                                <motion.button
                                    key={char.id}
                                    layoutId={`option-${char.id}`}
                                    onClick={() => handleOptionClick(char)}
                                    disabled={!!selectedOptionId}
                                    className={clsx(
                                        "h-32 rounded-2xl text-5xl font-bold flex flex-col items-center justify-center shadow-lg transition-all duration-300 relative overflow-hidden",
                                        stateStyles
                                    )}
                                >
                                    {settings.kanaCharType === 'katakana' ? char.katakana : char.hiragana}
                                    {/* Decor */}
                                    <div className="absolute top-2 right-2 text-xs font-normal opacity-50 font-mono">
                                        {char.romaji}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Feedback / Next Button */}
                <AnimatePresence>
                    {selectedOptionId && !isCorrect && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onClick={nextQuestion}
                            className="px-8 py-3 bg-white text-indigo-600 rounded-full font-bold shadow-xl hover:bg-gray-50 transition"
                        >
                            下一题
                        </motion.button>
                    )}
                </AnimatePresence>

            </div>
        </motion.div>
    );
}
