'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Check, X, ArrowRight, Trophy, Play, Star, ChevronRight, GraduationCap, Lock, RotateCcw } from 'lucide-react';
import { useKanaProgressStore } from '@/store/useKanaProgressStore';
import { useAppStore } from '@/store/useAppStore';
import { KANA_DATA, getKanaByRow } from '@/data/kanaData';
import { KANA_STROKES } from '@/data/kanaStrokes';
import { KanaChar } from '@/types';
import clsx from 'clsx';

// ============================================================================
// 0. 课程选择菜单 (Course Menu) - The "Lobby"
// ============================================================================
function LessonSelector() {
    const { lessonProgress, setCurrentLesson } = useKanaProgressStore();
    const [activeTab, setActiveTab] = useState<'hiragana' | 'katakana'>('hiragana');
    
    // Define the curriculum structure
    const baseRows = [
        { id: '1', title: '元音 (A行)', desc: '发音基础', chars: 'あいうえお', kataChars: 'アイウエオ' },
        { id: '2', title: 'K行 (Ka)', desc: '清音 K', chars: 'かきくけこ', kataChars: 'カキクケコ' },
        { id: '3', title: 'S行 (Sa)', desc: '清音 S', chars: 'さしすせそ', kataChars: 'サシスセソ' },
        { id: '4', title: 'T行 (Ta)', desc: '清音 T', chars: 'たちつてと', kataChars: 'タチツテト' },
        { id: '5', title: 'N行 (Na)', desc: '清音 N', chars: 'なにぬねの', kataChars: 'ナニヌネノ' },
        { id: '6', title: 'H行 (Ha)', desc: '清音 H', chars: 'はひふへほ', kataChars: 'ハヒフヘホ' },
        { id: '7', title: 'M行 (Ma)', desc: '清音 M', chars: 'まみむめも', kataChars: 'マミムメモ' },
        { id: '8', title: 'Y行 (Ya)', desc: '半元音 Y', chars: 'やゆよ', kataChars: 'ヤユヨ' },
        { id: '9', title: 'R行 (Ra)', desc: '弹舌音 R', chars: 'らりるれろ', kataChars: 'ラリルレロ' },
        { id: '10', title: 'W/N (Wa)', desc: '词尾与拨音', chars: 'わをん', kataChars: 'ワヲン' },
    ];

    return (
        <div className="w-full h-full overflow-y-auto p-8 floating-scrollbar">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">五十音图修行</h1>
                    <p className="text-slate-500 mb-8">选择一个关卡开始你的日语之旅</p>
                    
                    {/* Tab Switcher */}
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('hiragana')}
                            className={clsx(
                                "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                                activeTab === 'hiragana' 
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            平假名 (Hiragana)
                        </button>
                        <button
                            onClick={() => setActiveTab('katakana')}
                            className={clsx(
                                "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                                activeTab === 'katakana' 
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            片假名 (Katakana)
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {baseRows.map((row, index) => {
                        // Construct Lesson ID based on type
                        // Hiragana: L1-L10, Katakana: L11-L20
                        const lessonId = activeTab === 'hiragana' ? `L${row.id}` : `L${parseInt(row.id) + 10}`;
                        
                        const progress = lessonProgress[lessonId];
                        // Logic: For Katakana L11, check if L10 (Hiragana last) is done? Or separate track?
                        // Let's keep tracks separate for flexibility, but L11 unlocks after L1 maybe?
                        // Simple logic: Check previous lesson in SAME track.
                        const prevLessonId = activeTab === 'hiragana' 
                            ? (index > 0 ? `L${baseRows[index-1].id}` : null)
                            : (index > 0 ? `L${parseInt(baseRows[index-1].id) + 10}` : null);
                            
                        const prevLesson = prevLessonId ? lessonProgress[prevLessonId] : null;
                        const isLocked = index > 0 && (!prevLesson || prevLesson.status !== 'completed');
                        
                        // For MVP, allow access to all or just check logic
                        const locked = isLocked; 

                        return (
                            <motion.button
                                key={lessonId}
                                whileHover={{ y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => !locked && setCurrentLesson(lessonId)}
                                className={clsx(
                                    "relative flex flex-col text-left p-6 rounded-3xl border-2 transition-all overflow-hidden group",
                                    locked 
                                        ? "bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed"
                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-sm hover:shadow-md"
                                )}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold",
                                        locked ? "bg-slate-200 text-slate-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                                    )}>
                                        {row.id}
                                    </div>
                                    {locked && <Lock className="w-5 h-5 text-slate-300" />}
                                    {!locked && <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                                        <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-white ml-0.5" />
                                    </div>}
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{row.title}</h3>
                                <p className="text-sm text-slate-500 mb-4">{row.desc}</p>
                                
                                <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 w-full flex justify-between items-center">
                                    <span className="font-mono text-sm text-slate-400 tracking-widest">
                                        {activeTab === 'hiragana' ? row.chars : row.kataChars}
                                    </span>
                                    {/* Optional: Star rating or score */}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 1. 描红动画组件 (Stroke Animator) - Same as before
// ============================================================================
function StrokeAnimator({ char, autoPlay = true }: { char: string; autoPlay?: boolean }) {
    const strokeData = KANA_STROKES[char];
    const [key, setKey] = useState(0); 

    if (!strokeData) {
        return <div className="text-9xl font-bold flex items-center justify-center w-64 h-64 border-2 border-dashed border-gray-200 rounded-3xl text-gray-300">{char}</div>;
    }

    return (
        <div className="relative w-64 h-64 cursor-pointer" onClick={() => setKey(k => k + 1)}>
            <svg viewBox="0 0 1024 1024" className="w-full h-full">
                <g>
                    {strokeData.paths.map((path, index) => (
                        <path
                            key={`bg-${index}`}
                            d={path}
                            fill="none"
                            stroke="currentColor" 
                            strokeWidth="120"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-slate-200 dark:text-slate-700"
                        />
                    ))}
                    
                    <AnimatePresence mode='wait'>
                        {strokeData.paths.map((path, index) => (
                            <motion.path
                                key={`stroke-${key}-${index}`}
                                d={path}
                                fill="none"
                                stroke="var(--accent-primary)"
                                strokeWidth="120"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{
                                    duration: 0.8,
                                    ease: "easeInOut",
                                    delay: index * 0.9, 
                                    repeat: 0
                                }}
                            />
                        ))}
                    </AnimatePresence>
                </g>
            </svg>
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
                点击重播
            </div>
        </div>
    );
}

// ============================================================================
// 2. 学习卡片 (Study Card)
// ============================================================================
function StudyCard({ kana, scriptType, onNext }: { kana: KanaChar; scriptType: 'hiragana' | 'katakana'; onNext: () => void }) {
    const displayChar = scriptType === 'hiragana' ? kana.hiragana : kana.katakana;

    useEffect(() => {
        const speak = () => {
            const uttr = new SpeechSynthesisUtterance(displayChar);
            uttr.lang = 'ja-JP';
            uttr.rate = 0.8;
            window.speechSynthesis.speak(uttr);
        };
        const timer = setTimeout(speak, 500);
        return () => clearTimeout(timer);
    }, [kana, displayChar]);

    const playSound = () => {
        const uttr = new SpeechSynthesisUtterance(displayChar);
        uttr.lang = 'ja-JP';
        window.speechSynthesis.speak(uttr);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 md:p-12 flex flex-col items-center w-full relative overflow-hidden border border-slate-100 dark:border-slate-700"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500" />
                
                <h2 className="text-xl font-bold text-slate-400 mb-6 uppercase tracking-wider">
                    观察与记忆 ({scriptType === 'hiragana' ? '平假名' : '片假名'})
                </h2>

                <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl">
                    <StrokeAnimator char={displayChar} />
                </div>

                <div className="flex items-center gap-6 mb-10">
                    <div className="text-5xl font-mono font-bold text-slate-700 dark:text-slate-200">
                        {kana.romaji}
                    </div>
                    <button 
                        onClick={playSound}
                        className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                    >
                        <Volume2 className="w-8 h-8" />
                    </button>
                </div>

                <button
                    onClick={onNext}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                >
                    记住了 <ArrowRight className="w-5 h-5" />
                </button>
            </motion.div>
        </div>
    );
}

// ============================================================================
// 3. 测验卡片 (Quiz Card)
// ============================================================================
function QuizCard({ 
    question, 
    options, 
    scriptType,
    onAnswer 
}: { 
    question: KanaChar; 
    options: KanaChar[]; 
    scriptType: 'hiragana' | 'katakana';
    onAnswer: (correct: boolean) => void 
}) {
    const [selected, setSelected] = useState<string | null>(null);
    const [answered, setAnswered] = useState(false);
    const displayChar = scriptType === 'hiragana' ? question.hiragana : question.katakana;

    const handleSelect = (option: KanaChar) => {
        if (answered) return;
        setSelected(option.id);
        setAnswered(true);
        
        const isCorrect = option.id === question.id;
        
        setTimeout(() => {
            onAnswer(isCorrect);
            setSelected(null);
            setAnswered(false);
        }, isCorrect ? 800 : 1500);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
            >
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-10 flex flex-col items-center mb-6 border border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">选择正确的读音</span>
                    <div className="text-8xl font-bold text-slate-800 dark:text-white">
                        {displayChar}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {options.map((opt) => {
                        const isSelected = selected === opt.id;
                        const isCorrect = opt.id === question.id;
                        
                        let cardStyle = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:shadow-md";
                        if (answered) {
                            if (isCorrect) cardStyle = "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-1 ring-emerald-500";
                            else if (isSelected) cardStyle = "bg-rose-50 border-rose-500 text-rose-700 shadow-md";
                            else cardStyle = "opacity-40 grayscale";
                        }

                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleSelect(opt)}
                                disabled={answered}
                                className={clsx(
                                    "h-20 rounded-2xl border-2 text-2xl font-bold font-mono transition-all flex items-center justify-center shadow-sm active:scale-95",
                                    cardStyle
                                )}
                            >
                                {opt.romaji}
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}

// ============================================================================
// 4. 结算画面 (Summary View)
// ============================================================================
function SummaryView({ xpEarned, onFinish }: { xpEarned: number; onFinish: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-yellow-400/30"
            >
                <Trophy className="w-16 h-16 text-white" />
            </motion.div>

            <h2 className="text-3xl font-black mb-2 text-slate-800 dark:text-white">课程完成！</h2>
            <p className="text-slate-500 mb-10">你离日语大师又近了一步</p>

            <div className="flex flex-col items-center gap-2 mb-12 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 w-full max-w-xs shadow-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">本次获得</span>
                <div className="text-5xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    +{xpEarned} <span className="text-xl text-slate-400 font-medium">XP</span>
                </div>
            </div>

            <button
                onClick={onFinish}
                className="px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
                返回列表
            </button>
        </div>
    );
}

// ============================================================================
// Main Container: KanaCourseView
// ============================================================================
export default function KanaCourseView() {
    const { currentLessonId, lessonProgress, addXp, completeLesson, updateKanaProgress, setCurrentLesson } = useKanaProgressStore();
    const { setAppMode } = useAppStore();
    
    const [phase, setPhase] = useState<'intro' | 'learn' | 'quiz' | 'summary'>('intro');
    const [queue, setQueue] = useState<KanaChar[]>([]);
    const [scriptType, setScriptType] = useState<'hiragana' | 'katakana'>('hiragana');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mistakes, setMistakes] = useState<number>(0);

    // Watch for Lesson Selection
    useEffect(() => {
        if (!currentLessonId) return;

        // Start Lesson Logic
        let lessonNum = parseInt(currentLessonId.replace('L', '')) || 1;
        
        // Determine Type: 1-10 Hiragana, 11-20 Katakana
        const isKatakana = lessonNum > 10;
        if (isKatakana) lessonNum -= 10;

        const rows = ['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'];
        const targetRow = rows[lessonNum - 1] || 'a';
        
        // Fetch Kana for this row (Only Seion for now)
        const targetKana = getKanaByRow(targetRow).filter(k => k.type === 'seion'); 
        
        setScriptType(isKatakana ? 'katakana' : 'hiragana');
        setQueue(targetKana);
        setPhase('learn'); 
        setCurrentIndex(0);
        setMistakes(0);
    }, [currentLessonId]);

    // Handlers
    const handleLearnNext = () => {
        if (currentIndex < queue.length - 1) {
            setCurrentIndex(i => i + 1);
        } else {
            setPhase('quiz');
            setCurrentIndex(0);
            // Shuffle for quiz? For now keep order to reduce confusion
        }
    };

    const handleQuizAnswer = (correct: boolean) => {
        if (!correct) {
            setMistakes(m => m + 1);
        }
        if (currentIndex < queue.length - 1) {
            setCurrentIndex(i => i + 1);
        } else {
            finishLesson();
        }
    };

    const finishLesson = () => {
        if (!currentLessonId) return;
        const score = Math.max(0, 100 - (mistakes * 10)); 
        const xp = 50 + (score > 90 ? 20 : 0); 

        completeLesson(currentLessonId, score);
        addXp(xp);
        queue.forEach(k => {
            updateKanaProgress(currentLessonId, k.id, true);
        });

        setPhase('summary');
    };

    const exitCourse = () => {
        setCurrentLesson(null); // Return to Lobby
    };

    // RENDER: If no lesson selected, show Lobby
    if (!currentLessonId) {
        return <LessonSelector />;
    }

    if (queue.length === 0) return <div className="p-12 text-center text-slate-400">准备中...</div>;

    return (
        <div className="w-full h-full bg-slate-50/50 dark:bg-black/20 relative overflow-hidden flex flex-col">
            {/* Header / Progress */}
            <div className="shrink-0 w-full p-6 flex justify-between items-center z-10 max-w-3xl mx-auto">
                <button onClick={exitCourse} className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    <X className="w-5 h-5 text-slate-500" />
                </button>
                
                <div className="flex-1 mx-8">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-indigo-500"
                            animate={{ 
                                width: `${((currentIndex + (phase === 'quiz' ? queue.length : 0)) / (queue.length * 2)) * 100}%` 
                            }}
                        />
                    </div>
                </div>
                
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider w-12 text-right">
                    {phase === 'learn' ? 'LEARN' : 'QUIZ'}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative">
                <AnimatePresence mode='wait'>
                    {phase === 'learn' && (
                        <motion.div key="learn" className="h-full absolute inset-0">
                            <StudyCard 
                                kana={queue[currentIndex]} 
                                scriptType={scriptType}
                                onNext={handleLearnNext} 
                            />
                        </motion.div>
                    )}

                    {phase === 'quiz' && (
                        <motion.div key="quiz" className="h-full absolute inset-0">
                            <QuizCard 
                                question={queue[currentIndex]}
                                scriptType={scriptType}
                                options={[
                                    queue[currentIndex],
                                    ...KANA_DATA.filter(k => k.id !== queue[currentIndex].id && k.type === 'seion')
                                        .sort(() => Math.random() - 0.5)
                                        .slice(0, 3)
                                ].sort(() => Math.random() - 0.5)}
                                onAnswer={handleQuizAnswer}
                            />
                        </motion.div>
                    )}

                    {phase === 'summary' && (
                        <motion.div key="summary" className="h-full absolute inset-0">
                            <SummaryView 
                                xpEarned={50} // Dynamic later
                                onFinish={exitCourse}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
