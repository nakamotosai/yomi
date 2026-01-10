'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { KANA_DATA } from '@/data/kanaData';
import { KanaChar } from '@/types';
import clsx from 'clsx';
// import { Volume2 } from 'lucide-react'; // Unused
import KanaModal from './KanaModal';
import KanaGame from './KanaGame';
import { Gamepad2 } from 'lucide-react'; // Icon for game

// KanaCard Component
const KanaCard = React.memo(({ char, isPressed, onClick }: { char: KanaChar, isPressed: boolean, onClick: (char: KanaChar) => void }) => {
    const { settings } = useAppStore();
    const displayChar = settings.kanaCharType === 'katakana' ? char.katakana : char.hiragana;

    return (
        <motion.div
            layoutId={`card-${char.id}`}
            className={clsx(
                "relative aspect-[4/5] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 select-none group backdrop-blur-sm",
                isPressed
                    ? "bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] border-transparent"
                    : "bg-white dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 border border-transparent hover:border-gray-100 dark:border-white/5 dark:hover:border-white/10 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]"
            )}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onClick(char)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            {/* Main Character */}
            <div className={clsx(
                "text-4xl md:text-5xl font-medium transition-colors",
                isPressed ? "text-white" : "text-gray-800 dark:text-gray-400"
            )}>
                {displayChar}
            </div>

            {/* Romaji (conditional or on hover) */}
            <div className={clsx(
                "absolute bottom-2 left-3 text-sm font-bold opacity-0 transition-all duration-300",
                settings.showRomaji ? "opacity-100" : "group-hover:opacity-100",
                isPressed ? "text-blue-100" : "text-gray-300 dark:text-gray-600 group-hover:text-blue-400"
            )}>
                {char.romaji}
            </div>

            {/* Glow Effect on Hover */}
            {!isPressed && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-blue-50/0 via-blue-50/0 to-blue-50/0 group-hover:to-blue-50/30 transition-all duration-500 pointer-events-none" />
            )}
        </motion.div>
    );
});

KanaCard.displayName = 'KanaCard';

export default function KanaGrid() {
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<'seion' | 'dakuon' | 'yoon'>('seion');
    const [selectedChar, setSelectedChar] = useState<KanaChar | null>(null);
    const [isGameOpen, setIsGameOpen] = useState(false);

    // Audio Context removed (unused)

    useEffect(() => {
        // Initialize AudioContext logic removed
    }, []);

    const playSound = useCallback((text: string) => {
        // Cancel previous utterance for instant feedback feeling
        window.speechSynthesis.cancel();

        const uttr = new SpeechSynthesisUtterance(text);
        uttr.lang = 'ja-JP';
        uttr.rate = 1.0;

        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang === 'ja-JP' && !v.name.includes('Google')); // Prefer native OS voices usually
        if (jaVoice) uttr.voice = jaVoice;

        window.speechSynthesis.speak(uttr);
    }, []);

    const handleCardClick = useCallback((char: KanaChar) => {
        // Flash effect via state if needed, but tap animation handles visual
        playSound(char.hiragana);
        setSelectedChar(char);
    }, [playSound]);

    // Keyboard instrument logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            const key = e.key.toLowerCase();
            // Simple mapping for demonstration (a, i, u, e, o, k, s, t, n, h, m, y, r, w)
            // This is a naive implementation, a real instrument needs robust mapping
            // For now, let's just highlight if exact romaji match (unlikely for "ka", "shi")
            // OR map single keys to rows? Let's implement visual feedback first.

            // Better approach for "instrument": map keys to sounds directly if possible?
            // Or just map a few keys for fun: A=あ, I=い, U=う, E=え, O=お
            const mappedChar = KANA_DATA.find(c => c.romaji === key);
            if (mappedChar) {
                setActiveKeys(prev => new Set(prev).add(mappedChar.id));
                playSound(mappedChar.hiragana);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const mappedChar = KANA_DATA.find(c => c.romaji === key);
            if (mappedChar) {
                setActiveKeys(prev => {
                    const next = new Set(prev);
                    next.delete(mappedChar.id);
                    return next;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [playSound]);

    const filteredData = KANA_DATA.filter(c => c.type === filterType);

    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
            {/* Controls / Filter Tabs */}
            <div className="flex flex-col md:flex-row justify-center items-center mb-8 gap-4">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-full">
                    {(['seion', 'dakuon', 'yoon'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={clsx(
                                "px-6 py-2 rounded-full text-sm font-bold transition-all relative",
                                filterType === type
                                    ? "bg-white dark:bg-white/5 text-slate-700 dark:text-gray-400 shadow-sm rainbow-highlight"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                            )}
                        >
                            {type === 'seion' ? '清音' : type === 'dakuon' ? '濁音/半濁音' : '拗音'}
                        </button>
                    ))}
                </div>

                {/* Game Button moved here */}
                <button
                    onClick={() => setIsGameOpen(true)}
                    className="px-6 py-2 bg-white dark:bg-white/5 text-slate-700 dark:text-gray-400 rounded-full font-bold shadow-sm rainbow-highlight hover:shadow-md hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Gamepad2 className="w-4 h-4" />
                    <span>练习模式</span>
                </button>
            </div>

            {/* Grid */}
            <motion.div
                layout
                className="grid grid-cols-5 gap-4 md:gap-6"
            >
                <AnimatePresence mode='popLayout'>
                    {filteredData.map((char) => (
                        <KanaCard
                            key={char.id}
                            char={char}
                            isPressed={activeKeys.has(char.id)}
                            onClick={handleCardClick}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            <div className="mt-12 text-center text-slate-300 text-sm">
                <p>Tip: 按下键盘上的 A, I, U, E, O 试试看</p>
            </div>

            <KanaModal
                char={selectedChar}
                isOpen={!!selectedChar}
                onClose={() => setSelectedChar(null)}
            />

            <KanaGame
                isOpen={isGameOpen}
                onClose={() => setIsGameOpen(false)}
            />
        </div>
    );
}
