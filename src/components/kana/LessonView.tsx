'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Volume2, CheckCircle2, RotateCcw, Pencil, Eye, BookOpen, Sparkles } from 'lucide-react';
import { KanaLesson } from '@/data/kana_curriculum';
import { getKanaById } from '@/data/kanaData';
import { useKanaProgressStore } from '@/store/useKanaProgressStore';
import { useAppStore } from '@/store/useAppStore';
import { KanaChar } from '@/types';
import { KANA_STROKES, KanaStrokeData } from '@/data/kanaStrokes';
import clsx from 'clsx';

interface LessonViewProps {
    lesson: KanaLesson;
    onBack: () => void;
    onComplete: (score: number) => void;
}

type LessonPhase = 'intro' | 'learn' | 'practice' | 'quiz' | 'complete';
type LearnStep = 'recognize' | 'write' | 'review';

export default function LessonView({ lesson, onBack, onComplete }: LessonViewProps) {
    const { settings } = useAppStore();
    const { updateKanaProgress, addUnlockedKana, recordKanaPractice } = useKanaProgressStore();

    // 当前阶段
    const [phase, setPhase] = useState<LessonPhase>(lesson.type === 'intro' ? 'intro' : 'learn');

    // 学习进度
    const [currentKanaIndex, setCurrentKanaIndex] = useState(0);
    const [learnStep, setLearnStep] = useState<LearnStep>('recognize');
    const [completedKana, setCompletedKana] = useState<Set<string>>(new Set());

    // 测验状态
    const [quizAnswers, setQuizAnswers] = useState<boolean[]>([]);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);

    // 获取课程假名列表
    const kanaList = useMemo(() => {
        if (!lesson.content.kanaIds) return [];
        return lesson.content.kanaIds
            .map(id => getKanaById(id))
            .filter((k): k is KanaChar => k !== undefined);
    }, [lesson.content.kanaIds]);

    const currentKana = kanaList[currentKanaIndex];
    const viewType = settings.kanaCharType;

    // 播放发音
    const speak = useCallback((text: string) => {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ja-JP';
        utter.rate = 0.8;
        synth.speak(utter);
    }, []);

    // 测验题目队列
    const [quizQueue, setQuizQueue] = useState<KanaChar[]>([]);

    // ... (existing code) ...

    // 处理假名完成 -> 进入测验
    const handleKanaComplete = useCallback(() => {
        if (!currentKana) return;

        const newCompleted = new Set(completedKana);
        newCompleted.add(currentKana.id);
        setCompletedKana(newCompleted);

        updateKanaProgress(lesson.id, currentKana.id, true);
        recordKanaPractice(currentKana.id, true);

        // 进入下一个假名或完成学习
        if (currentKanaIndex < kanaList.length - 1) {
            setCurrentKanaIndex(i => i + 1);
            setLearnStep('recognize');
        } else {
            // 所有假名学习完成，进入测验
            addUnlockedKana(lesson.content.kanaIds || []);

            // 生成测验队列 (80% 新内容, 20% 复习内容)
            const currentLessonKana = lesson.content.kanaIds?.map(id => getKanaById(id)).filter((k): k is KanaChar => !!k) || [];
            const reviewCount = Math.max(2, Math.floor(currentLessonKana.length * 0.25)); // At least 2 review items if possible
            const reviewIds = useKanaProgressStore.getState().getReviewKana(reviewCount, lesson.content.kanaIds || []);
            const reviewKana = reviewIds.map(id => getKanaById(id)).filter((k): k is KanaChar => !!k);

            // Combine: Ensure we have at least 10 questions or length of lesson
            let pool = [...currentLessonKana];
            // If lesson is short (e.g. 5 items), double it up for practice
            if (pool.length < 5) pool = [...pool, ...pool];

            // Add review items
            pool = [...pool, ...reviewKana];

            // Shuffle
            const shuffledQueue = pool.sort(() => Math.random() - 0.5);

            setQuizQueue(shuffledQueue);
            setPhase('quiz');
        }
    }, [currentKana, completedKana, currentKanaIndex, kanaList.length, lesson, updateKanaProgress, recordKanaPractice, addUnlockedKana]);

    // 处理测验答案
    const handleQuizAnswer = useCallback((correct: boolean) => {
        const newAnswers = [...quizAnswers, correct];
        setQuizAnswers(newAnswers);

        if (currentQuizIndex < quizQueue.length - 1) {
            setCurrentQuizIndex(i => i + 1);
        } else {
            // 测验完成
            const score = Math.round((newAnswers.filter(a => a).length / newAnswers.length) * 100);
            setPhase('complete');
            onComplete(score);
        }
    }, [quizAnswers, currentQuizIndex, quizQueue.length, onComplete]);

    // 介绍页完成
    const handleIntroComplete = () => {
        if (lesson.content.kanaIds && lesson.content.kanaIds.length > 0) {
            setPhase('learn');
        } else {
            // 纯介绍课，直接完成
            onComplete(100);
        }
    };

    const combinedKanaList = useMemo(() => [...kanaList, ...quizQueue], [kanaList, quizQueue]);

    return (
        <div className="h-full flex flex-col bg-[var(--bg-base)]">
            {/* 顶部导航栏 */}
            <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">返回</span>
                </button>

                <h1 className="font-bold text-[var(--text-primary)]">{lesson.title}</h1>

                {/* 进度指示器 */}
                {phase === 'learn' && kanaList.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <span>{currentKanaIndex + 1}</span>
                        <span>/</span>
                        <span>{kanaList.length}</span>
                    </div>
                )}
                {phase !== 'learn' && <div className="w-16" />}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {phase === 'intro' && (
                        <IntroPhase
                            key="intro"
                            content={lesson.content.introText || ''}
                            onContinue={handleIntroComplete}
                        />
                    )}

                    {phase === 'learn' && currentKana && (
                        <LearnPhase
                            key={`learn-${currentKana.id}`}
                            kana={currentKana}
                            step={learnStep}
                            viewType={viewType}
                            onStepChange={setLearnStep}
                            onComplete={handleKanaComplete}
                            onSpeak={speak}
                        />
                    )}

                    {phase === 'quiz' && quizQueue[currentQuizIndex] && (
                        <QuizPhase
                            key={`quiz-${currentQuizIndex}`}
                            kana={quizQueue[currentQuizIndex]}
                            allKana={combinedKanaList} // Use memoized list
                            questionIndex={currentQuizIndex}
                            totalQuestions={quizQueue.length}
                            viewType={viewType}
                            onAnswer={handleQuizAnswer}
                            onSpeak={speak}
                        />
                    )}

                    {phase === 'complete' && (
                        <CompletePhase
                            key="complete"
                            score={Math.round((quizAnswers.filter(a => a).length / quizAnswers.length) * 100)}
                            onBack={onBack}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// =============================================================================
// 介绍阶段
// =============================================================================

function IntroPhase({ content, onContinue }: { content: string; onContinue: () => void }) {
    // 简单的 Markdown 渲染
    const renderContent = () => {
        const lines = content.split('\n');
        return lines.map((line, i) => {
            if (line.startsWith('# ')) {
                return <h1 key={i} className="text-2xl font-bold mb-4 text-[var(--text-primary)]">{line.slice(2)}</h1>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={i} className="text-xl font-bold mt-6 mb-2 text-[var(--text-primary)]">{line.slice(3)}</h2>;
            }
            if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-bold text-[var(--text-primary)]">{line.slice(2, -2)}</p>;
            }
            if (line.startsWith('- ')) {
                return <li key={i} className="ml-4 text-[var(--text-secondary)]">{line.slice(2)}</li>;
            }
            if (line.trim() === '') {
                return <br key={i} />;
            }
            return <p key={i} className="text-[var(--text-secondary)] leading-relaxed">{line}</p>;
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto p-6"
        >
            <div className="prose prose-slate dark:prose-invert max-w-none">
                {renderContent()}
            </div>

            <div className="mt-8 flex justify-center">
                <button
                    onClick={onContinue}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    <span>开始学习</span>
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    );
}

// =============================================================================
// 学习阶段
// =============================================================================

interface LearnPhaseProps {
    kana: KanaChar;
    step: LearnStep;
    viewType: 'hiragana' | 'katakana';
    onStepChange: (step: LearnStep) => void;
    onComplete: () => void;
    onSpeak: (text: string) => void;
}

function LearnPhase({ kana, step, viewType, onStepChange, onComplete, onSpeak }: LearnPhaseProps) {
    const displayChar = viewType === 'hiragana' ? kana.hiragana : kana.katakana;
    const strokeData: KanaStrokeData | undefined = KANA_STROKES[displayChar];

    // 自动播放发音
    useEffect(() => {
        if (step === 'recognize') {
            onSpeak(displayChar);
        }
    }, [step, displayChar, onSpeak]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center p-6"
        >
            {/* 步骤指示器 */}
            <div className="flex items-center gap-4 mb-8">
                {(['recognize', 'write', 'review'] as LearnStep[]).map((s, i) => (
                    <React.Fragment key={s}>
                        <button
                            onClick={() => onStepChange(s)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                                step === s
                                    ? "bg-[var(--accent-primary)] text-white"
                                    : "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                            )}
                        >
                            {s === 'recognize' && <Eye className="w-4 h-4" />}
                            {s === 'write' && <Pencil className="w-4 h-4" />}
                            {s === 'review' && <BookOpen className="w-4 h-4" />}
                            <span className="text-sm font-medium">
                                {s === 'recognize' && '认识'}
                                {s === 'write' && '书写'}
                                {s === 'review' && '复习'}
                            </span>
                        </button>
                        {i < 2 && <div className="w-8 h-0.5 bg-[var(--border-default)]" />}
                    </React.Fragment>
                ))}
            </div>

            {/* 步骤内容 */}
            <AnimatePresence mode="wait">
                {step === 'recognize' && (
                    <RecognizeStep
                        key="recognize"
                        kana={kana}
                        displayChar={displayChar}
                        onSpeak={onSpeak}
                        onNext={() => onStepChange('write')}
                    />
                )}

                {step === 'write' && (
                    <WriteStep
                        key="write"
                        displayChar={displayChar}
                        strokeData={strokeData}
                        onComplete={() => {
                            onStepChange('review');
                        }}
                    />
                )}

                {step === 'review' && (
                    <ReviewStep
                        key="review"
                        kana={kana}
                        displayChar={displayChar}
                        onComplete={onComplete}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// 认识步骤
function RecognizeStep({ kana, displayChar, onSpeak, onNext }: {
    kana: KanaChar;
    displayChar: string;
    onSpeak: (text: string) => void;
    onNext: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
        >
            {/* 大字卡片 */}
            <div
                className="w-48 h-48 rounded-3xl bg-[var(--bg-elevated)] border-2 border-[var(--border-default)] shadow-xl flex items-center justify-center mb-6 cursor-pointer hover:border-[var(--accent-primary)] transition-colors"
                onClick={() => onSpeak(displayChar)}
            >
                <span className="text-8xl font-serif text-[var(--text-primary)]">{displayChar}</span>
            </div>

            {/* 罗马音 */}
            <div className="text-2xl font-mono text-[var(--accent-primary)] mb-4">
                / {kana.romaji} /
            </div>

            {/* 播放按钮 */}
            <button
                onClick={() => onSpeak(displayChar)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors mb-8"
            >
                <Volume2 className="w-5 h-5" />
                <span className="font-medium">播放发音</span>
            </button>

            {/* 平片假名对照 */}
            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mb-8">
                <span>平假名: {kana.hiragana}</span>
                <span>|</span>
                <span>片假名: {kana.katakana}</span>
            </div>

            <button
                onClick={onNext}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
                <span>开始书写</span>
                <ArrowRight className="w-5 h-5" />
            </button>
        </motion.div>
    );
}

// 书写步骤（简化版临摹画布）
function WriteStep({ displayChar, strokeData, onComplete }: {
    displayChar: string;
    strokeData: KanaStrokeData | undefined;
    onComplete: () => void;
}) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokeCount, setStrokeCount] = useState(0);

    const totalStrokes = strokeData?.paths.length || 3;

    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 16;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    useEffect(() => {
        setupCanvas();
    }, [setupCanvas]);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const endDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        setStrokeCount(s => s + 1);
    };

    const handleRetry = () => {
        setStrokeCount(0);
        setupCanvas();
    };

    const canComplete = strokeCount >= totalStrokes;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
        >
            <div className="relative w-64 h-64 mb-6">
                {/* 背景字形 */}
                <div className="absolute inset-0 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--border-default)] flex items-center justify-center pointer-events-none">
                    <span className="text-[120px] font-serif text-[var(--text-faint)] opacity-20">{displayChar}</span>
                </div>

                {/* 画布 */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full rounded-2xl cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />

                {/* 笔画计数 */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-white/80 dark:bg-black/50 text-xs font-bold text-[var(--text-muted)]">
                    笔画 {strokeCount} / {totalStrokes}
                </div>

                {/* 重置按钮 */}
                <button
                    onClick={handleRetry}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-white/80 dark:bg-black/50 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-6">
                在画布上临摹假名「{displayChar}」
            </p>

            <button
                onClick={onComplete}
                disabled={!canComplete}
                className={clsx(
                    "flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg transition-all",
                    canComplete
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-xl hover:scale-105"
                        : "bg-[var(--bg-muted)] text-[var(--text-faint)] cursor-not-allowed"
                )}
            >
                <CheckCircle2 className="w-5 h-5" />
                <span>完成书写</span>
            </button>
        </motion.div>
    );
}

// 复习步骤（翻转卡片）
function ReviewStep({ kana, displayChar, onComplete }: {
    kana: KanaChar;
    displayChar: string;
    onComplete: () => void;
}) {
    const [flipped, setFlipped] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
        >
            <p className="text-sm text-[var(--text-muted)] mb-4">点击卡片翻转</p>

            {/* 翻转卡片 */}
            <div
                className="w-48 h-48 perspective-1000 cursor-pointer mb-8"
                onClick={() => setFlipped(f => !f)}
            >
                <motion.div
                    className="w-full h-full relative"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* 正面 - 假名 */}
                    <div
                        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-xl flex items-center justify-center backface-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <span className="text-8xl font-serif text-white">{displayChar}</span>
                    </div>

                    {/* 背面 - 罗马音 */}
                    <div
                        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-xl flex flex-col items-center justify-center backface-hidden"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        <span className="text-4xl font-mono text-white mb-2">{kana.romaji}</span>
                        <span className="text-sm text-white/80">
                            {kana.hiragana} / {kana.katakana}
                        </span>
                    </div>
                </motion.div>
            </div>

            <button
                onClick={onComplete}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
                <Sparkles className="w-5 h-5" />
                <span>下一个</span>
            </button>
        </motion.div>
    );
}

// =============================================================================
// 测验阶段
// =============================================================================

interface QuizPhaseProps {
    kana: KanaChar;
    allKana: KanaChar[];
    questionIndex: number;
    totalQuestions: number;
    viewType: 'hiragana' | 'katakana';
    onAnswer: (correct: boolean) => void;
    onSpeak: (text: string) => void;
}

function QuizPhase({ kana, allKana, questionIndex, totalQuestions, viewType, onAnswer, onSpeak }: QuizPhaseProps) {
    const displayChar = viewType === 'hiragana' ? kana.hiragana : kana.katakana;
    const [selected, setSelected] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const [options, setOptions] = useState<KanaChar[]>([]);

    // 生成选项（包含正确答案和3个干扰项）
    useEffect(() => {
        const others = allKana.filter(k => k.id !== kana.id);
        const shuffled = [...others].sort(() => Math.random() - 0.5);
        const wrongOptions = shuffled.slice(0, 3);
        const allOptions = [kana, ...wrongOptions].sort(() => Math.random() - 0.5);
        setTimeout(() => setOptions(allOptions), 0);
    }, [kana, allKana]);

    // 播放题目音频
    useEffect(() => {
        onSpeak(displayChar);
    }, [displayChar, onSpeak]);

    const handleSelect = (option: KanaChar) => {
        if (showResult) return;
        setSelected(option.id);
        setShowResult(true);

        const isCorrect = option.id === kana.id;

        // 延迟进入下一题
        setTimeout(() => {
            onAnswer(isCorrect);
            setSelected(null);
            setShowResult(false);
        }, 1000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto p-6 flex flex-col items-center"
        >
            {/* 进度 */}
            <div className="w-full mb-6">
                <div className="flex justify-between text-sm text-[var(--text-muted)] mb-2">
                    <span>问题 {questionIndex + 1} / {totalQuestions}</span>
                </div>
                <div className="h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
                    />
                </div>
            </div>

            {/* 题目 */}
            <div className="text-center mb-8">
                <p className="text-[var(--text-muted)] mb-4">请听音频，选择正确的假名</p>
                <button
                    onClick={() => onSpeak(displayChar)}
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center"
                >
                    <Volume2 className="w-10 h-10" />
                </button>
            </div>

            {/* 选项 */}
            <div className="grid grid-cols-2 gap-4 w-full">
                {options.map(option => {
                    const optionChar = viewType === 'hiragana' ? option.hiragana : option.katakana;
                    const isCorrect = option.id === kana.id;
                    const isSelected = selected === option.id;

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleSelect(option)}
                            disabled={showResult}
                            className={clsx(
                                "p-4 rounded-2xl border-2 transition-all",
                                !showResult && "hover:border-[var(--accent-primary)] hover:shadow-lg",
                                showResult && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30",
                                showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/30",
                                !showResult && "border-[var(--border-default)] bg-[var(--bg-elevated)]"
                            )}
                        >
                            <span className="text-4xl font-serif">{optionChar}</span>
                            <p className="text-sm text-[var(--text-muted)] mt-2">{option.romaji}</p>
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
}

// =============================================================================
// 完成阶段
// =============================================================================

function CompletePhase({ score, onBack }: { score: number; onBack: () => void }) {
    const isPassing = score >= 80;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col items-center justify-center p-6"
        >
            <div className={clsx(
                "w-32 h-32 rounded-full flex items-center justify-center mb-6",
                isPassing ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
            )}>
                {isPassing ? (
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                ) : (
                    <RotateCcw className="w-16 h-16 text-amber-500" />
                )}
            </div>

            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {isPassing ? '太棒了！' : '继续加油！'}
            </h2>

            <p className="text-[var(--text-muted)] mb-4">
                你的得分: <span className="font-bold text-[var(--text-primary)]">{score}%</span>
            </p>

            {isPassing ? (
                <p className="text-emerald-600 dark:text-emerald-400 mb-8">
                    ✅ 下一课已解锁
                </p>
            ) : (
                <p className="text-amber-600 dark:text-amber-400 mb-8">
                    需要 80% 以上才能解锁下一课
                </p>
            )}

            <button
                onClick={onBack}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>返回课程</span>
            </button>
        </motion.div>
    );
}
