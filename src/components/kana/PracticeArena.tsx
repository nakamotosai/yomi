'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, Trophy, Zap, Heart, RotateCcw, X } from 'lucide-react';
import { useKanaProgressStore } from '@/store/useKanaProgressStore';
import { useAppStore } from '@/store/useAppStore';
import { KANA_DATA, getKanaById } from '@/data/kanaData';
import { KanaChar } from '@/types';
import clsx from 'clsx';

interface PracticeArenaProps {
    onBack: () => void;
}

type GameType = 'listening' | 'typing' | 'writing';

export default function PracticeArena({ onBack }: PracticeArenaProps) {
    const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
    const { unlockedKana, gameScores } = useKanaProgressStore();

    // 获取可用假名（已解锁的）
    const availableKana = useMemo(() => {
        if (unlockedKana.length === 0) {
            // 如果没有解锁任何假名，使用前5个元音作为默认
            return KANA_DATA.filter(k => ['a', 'i', 'u', 'e', 'o'].includes(k.id));
        }
        return unlockedKana
            .map(id => getKanaById(id))
            .filter((k): k is KanaChar => k !== undefined);
    }, [unlockedKana]);

    const games = [
        {
            type: 'listening' as GameType,
            title: '听音辨字',
            subtitle: '听发音选假名',
            icon: Volume2,
            gradient: 'from-blue-500 to-purple-500',
            highScore: gameScores.listening?.highScore || 0
        },
        {
            type: 'typing' as GameType,
            title: '罗马音打字',
            subtitle: '看假名打罗马音',
            icon: Zap,
            gradient: 'from-emerald-500 to-cyan-500',
            highScore: gameScores.typing?.highScore || 0
        },
        {
            type: 'writing' as GameType,
            title: '假名书写',
            subtitle: '看罗马音写假名',
            icon: Heart,
            gradient: 'from-pink-500 to-rose-500',
            highScore: gameScores.writing?.highScore || 0
        }
    ];

    if (selectedGame === 'listening') {
        return <ListeningGame kanaPool={availableKana} onBack={() => setSelectedGame(null)} />;
    }

    if (selectedGame === 'typing') {
        return <TypingGame kanaPool={availableKana} onBack={() => setSelectedGame(null)} />;
    }

    if (selectedGame === 'writing') {
        return <WritingGame kanaPool={availableKana} onBack={() => setSelectedGame(null)} />;
    }

    return (
        <div className="h-full flex flex-col">
            {/* 顶部 */}
            <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">返回课程</span>
                </button>

                <h1 className="font-bold text-[var(--text-primary)]">练习场</h1>

                <div className="w-16" />
            </div>

            {/* 游戏选择 */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">选择游戏模式</h2>
                        <p className="text-sm text-[var(--text-muted)]">
                            可用假名: {availableKana.length} 个
                        </p>
                    </div>

                    <div className="space-y-4">
                        {games.map(game => (
                            <motion.button
                                key={game.type}
                                onClick={() => setSelectedGame(game.type)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={clsx(
                                    "w-full p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-left transition-all hover:shadow-xl group"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br text-white",
                                        game.gradient
                                    )}>
                                        <game.icon className="w-7 h-7" />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                                            {game.title}
                                        </h3>
                                        <p className="text-sm text-[var(--text-muted)]">{game.subtitle}</p>
                                    </div>

                                    {game.highScore > 0 && (
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <Trophy className="w-4 h-4" />
                                            <span className="font-bold">{game.highScore}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 听音辨字游戏
// =============================================================================

interface GameProps {
    kanaPool: KanaChar[];
    onBack: () => void;
}

function ListeningGame({ kanaPool, onBack }: GameProps) {
    const { settings } = useAppStore();
    const { updateGameScore, recordKanaPractice } = useKanaProgressStore();
    const viewType = settings.kanaCharType;

    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [lives, setLives] = useState(3);
    const [currentKana, setCurrentKana] = useState<KanaChar | null>(null);
    const [options, setOptions] = useState<KanaChar[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5);

    // 生成新问题
    const generateQuestion = useCallback(() => {
        const kana = kanaPool[Math.floor(Math.random() * kanaPool.length)];
        const others = kanaPool.filter(k => k.id !== kana.id);
        const shuffled = [...others].sort(() => Math.random() - 0.5);
        const wrongOptions = shuffled.slice(0, 3);
        const allOptions = [kana, ...wrongOptions].sort(() => Math.random() - 0.5);

        setCurrentKana(kana);
        setOptions(allOptions);
        setShowResult(false);
        setSelectedId(null);
        setTimeLeft(5);
    }, [kanaPool]);

    // 播放发音
    const speak = useCallback((text: string) => {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ja-JP';
        utter.rate = 0.8;
        synth.speak(utter);
    }, []);

    // 初始化
    useEffect(() => {
        if (kanaPool.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            generateQuestion();
        }
    }, [kanaPool, generateQuestion]);

    // 播放当前题目
    useEffect(() => {
        if (currentKana && !showResult && !gameOver) {
            const char = viewType === 'hiragana' ? currentKana.hiragana : currentKana.katakana;
            speak(char);
        }
    }, [currentKana, viewType, speak, showResult, gameOver]);

    // 倒计时
    useEffect(() => {
        if (gameOver || showResult || !currentKana) return;

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    // 超时算错 - 使用 ref 避免闭包问题
                    setShowResult(true);
                    setSelectedId(null);
                    setCombo(0);
                    setLives(l => l - 1);
                    return 5;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentKana, showResult, gameOver]);

    // 处理答案
    const handleAnswer = useCallback((option: KanaChar | null) => {
        if (showResult || !currentKana) return;

        const isCorrect = option?.id === currentKana.id;
        setSelectedId(option?.id || null);
        setShowResult(true);

        if (isCorrect) {
            const newCombo = combo + 1;
            setCombo(newCombo);
            setMaxCombo(Math.max(maxCombo, newCombo));
            setScore(s => s + 10 + Math.min(newCombo * 2, 20)); // 基础10分 + combo奖励
            recordKanaPractice(currentKana.id, true);
        } else {
            setCombo(0);
            setLives(l => l - 1);
            if (lives <= 1) {
                setGameOver(true);
                updateGameScore('listening', score);
                return;
            }
            if (currentKana) {
                recordKanaPractice(currentKana.id, false);
            }
        }

        setTimeout(() => {
            generateQuestion();
        }, 800);
    }, [showResult, currentKana, combo, maxCombo, lives, score, generateQuestion, recordKanaPractice, updateGameScore]);

    if (gameOver) {
        return (
            <GameOverScreen
                score={score}
                maxCombo={maxCombo}
                onRestart={() => {
                    setScore(0);
                    setCombo(0);
                    setMaxCombo(0);
                    setLives(3);
                    setGameOver(false);
                    generateQuestion();
                }}
                onBack={onBack}
            />
        );
    }

    return (
        <div className="h-full flex flex-col bg-[var(--bg-base)]">
            {/* 顶部状态栏 */}
            <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <button onClick={onBack} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                    {/* 生命值 */}
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <Heart
                                key={i}
                                className={clsx(
                                    "w-5 h-5",
                                    i <= lives ? "text-red-500 fill-red-500" : "text-gray-300"
                                )}
                            />
                        ))}
                    </div>

                    {/* 分数 */}
                    <div className="font-bold text-[var(--text-primary)]">{score}</div>

                    {/* Combo */}
                    {combo > 1 && (
                        <div className="flex items-center gap-1 text-amber-500">
                            <Zap className="w-4 h-4" />
                            <span className="font-bold">x{combo}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 游戏区域 */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {/* 倒计时进度条 */}
                <div className="w-full max-w-xs mb-8">
                    <div className="h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            initial={{ width: '100%' }}
                            animate={{ width: `${(timeLeft / 5) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* 播放按钮 */}
                <button
                    onClick={() => {
                        if (currentKana) {
                            const char = viewType === 'hiragana' ? currentKana.hiragana : currentKana.katakana;
                            speak(char);
                        }
                    }}
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-xl mb-8 flex items-center justify-center hover:shadow-2xl transition-all hover:scale-105"
                >
                    <Volume2 className="w-10 h-10" />
                </button>

                {/* 选项 */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    {options.map(option => {
                        const optionChar = viewType === 'hiragana' ? option.hiragana : option.katakana;
                        const isCorrect = currentKana && option.id === currentKana.id;
                        const isSelected = selectedId === option.id;

                        return (
                            <motion.button
                                key={option.id}
                                onClick={() => handleAnswer(option)}
                                disabled={showResult}
                                whileTap={{ scale: 0.95 }}
                                className={clsx(
                                    "p-4 rounded-2xl border-2 transition-all",
                                    showResult && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30",
                                    showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/30 animate-shake",
                                    !showResult && "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]"
                                )}
                            >
                                <span className="text-3xl font-serif">{optionChar}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 打字游戏
// =============================================================================

function TypingGame({ kanaPool, onBack }: GameProps) {
    const { settings } = useAppStore();
    const { updateGameScore, recordKanaPractice } = useKanaProgressStore();
    const viewType = settings.kanaCharType;

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [currentKana, setCurrentKana] = useState<KanaChar | null>(null);
    const [input, setInput] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

    // 生成新问题
    const generateQuestion = useCallback(() => {
        const kana = kanaPool[Math.floor(Math.random() * kanaPool.length)];
        setCurrentKana(kana);
        setInput('');
        setShowFeedback(null);
    }, [kanaPool]);

    // 初始化
    useEffect(() => {
        if (kanaPool.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            generateQuestion();
        }
    }, [kanaPool, generateQuestion]);

    // 处理输入
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentKana || showFeedback) return;

        const isCorrect = input.toLowerCase() === currentKana.romaji.toLowerCase();
        setShowFeedback(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            setScore(s => s + 10);
            recordKanaPractice(currentKana.id, true);
        } else {
            setLives(l => l - 1);
            recordKanaPractice(currentKana.id, false);
            if (lives <= 1) {
                setGameOver(true);
                updateGameScore('typing', score);
                return;
            }
        }

        setTimeout(() => {
            generateQuestion();
        }, 500);
    };

    if (gameOver) {
        return (
            <GameOverScreen
                score={score}
                onRestart={() => {
                    setScore(0);
                    setLives(3);
                    setGameOver(false);
                    generateQuestion();
                }}
                onBack={onBack}
            />
        );
    }

    const displayChar = currentKana
        ? (viewType === 'hiragana' ? currentKana.hiragana : currentKana.katakana)
        : '';

    return (
        <div className="h-full flex flex-col bg-[var(--bg-base)]">
            {/* 顶部状态栏 */}
            <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <button onClick={onBack} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <Heart
                                key={i}
                                className={clsx(
                                    "w-5 h-5",
                                    i <= lives ? "text-red-500 fill-red-500" : "text-gray-300"
                                )}
                            />
                        ))}
                    </div>
                    <div className="font-bold text-[var(--text-primary)]">{score}</div>
                </div>
            </div>

            {/* 游戏区域 */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {/* 假名展示 */}
                <motion.div
                    key={currentKana?.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                        "w-32 h-32 rounded-3xl flex items-center justify-center mb-8 shadow-xl",
                        showFeedback === 'correct' && "bg-emerald-500",
                        showFeedback === 'wrong' && "bg-red-500",
                        !showFeedback && "bg-gradient-to-br from-emerald-500 to-cyan-500"
                    )}
                >
                    <span className="text-6xl font-serif text-white">{displayChar}</span>
                </motion.div>

                <p className="text-[var(--text-muted)] mb-4">输入罗马音</p>

                {/* 输入框 */}
                <form onSubmit={handleSubmit} className="w-full max-w-xs">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        autoFocus
                        className="w-full text-center text-2xl font-mono py-4 px-6 rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-elevated)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                        placeholder="..."
                    />
                </form>
            </div>
        </div>
    );
}

// =============================================================================
// 书写游戏（简化版）
// =============================================================================

function WritingGame({ kanaPool, onBack }: GameProps) {
    const { updateGameScore, recordKanaPractice } = useKanaProgressStore();

    const [score, setScore] = useState(0);
    const [currentKana, setCurrentKana] = useState<KanaChar | null>(null);
    const [strokeCount, setStrokeCount] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const totalQuestions = 10;

    // 生成新问题
    const generateQuestion = useCallback(() => {
        if (questionsAnswered >= totalQuestions) {
            setGameOver(true);
            updateGameScore('writing', score);
            return;
        }
        const kana = kanaPool[Math.floor(Math.random() * kanaPool.length)];
        setCurrentKana(kana);
        setStrokeCount(0);

        // 清空画布
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [kanaPool, questionsAnswered, score, updateGameScore]);

    // 初始化 - 使用 ref 跟踪首次渲染
    const initialized = React.useRef(false);
    useEffect(() => {
        if (kanaPool.length > 0 && !initialized.current) {
            initialized.current = true;
            // 直接生成问题而不是调用 generateQuestion
            const kana = kanaPool[Math.floor(Math.random() * kanaPool.length)];
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentKana(kana);
            setStrokeCount(0);
        }
    }, [kanaPool]);

    // 初始化画布
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(2, 2);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 16;
        }
    }, []);

    // 绘制逻辑
    const [isDrawing, setIsDrawing] = useState(false);

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

    const handleComplete = () => {
        if (!currentKana) return;
        // 简化判定：只要画了就算对
        if (strokeCount >= 1) {
            setScore(s => s + 10);
            recordKanaPractice(currentKana.id, true);
        }
        setQuestionsAnswered(q => q + 1);
        setTimeout(() => {
            generateQuestion();
        }, 300);
    };

    if (gameOver) {
        return (
            <GameOverScreen
                score={score}
                onRestart={() => {
                    setScore(0);
                    setQuestionsAnswered(0);
                    setGameOver(false);
                    generateQuestion();
                }}
                onBack={onBack}
            />
        );
    }

    return (
        <div className="h-full flex flex-col bg-[var(--bg-base)]">
            {/* 顶部状态栏 */}
            <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <button onClick={onBack} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-5 h-5" />
                </button>

                <div className="text-sm text-[var(--text-muted)]">
                    {questionsAnswered + 1} / {totalQuestions}
                </div>

                <div className="font-bold text-[var(--text-primary)]">{score}</div>
            </div>

            {/* 游戏区域 */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {/* 罗马音提示 */}
                <div className="mb-4 text-center">
                    <p className="text-[var(--text-muted)] text-sm mb-2">请书写</p>
                    <div className="text-4xl font-mono font-bold text-[var(--accent-primary)]">
                        {currentKana?.romaji}
                    </div>
                </div>

                {/* 画布 */}
                <div className="relative w-64 h-64 mb-6">
                    <div className="absolute inset-0 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--border-default)]" />
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
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            const canvas = canvasRef.current;
                            if (canvas) {
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                }
                            }
                            setStrokeCount(0);
                        }}
                        className="px-6 py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium hover:bg-[var(--bg-muted)] transition-colors"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleComplete}
                        disabled={strokeCount < 1}
                        className={clsx(
                            "px-8 py-3 rounded-xl font-bold transition-all",
                            strokeCount >= 1
                                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:shadow-xl"
                                : "bg-[var(--bg-muted)] text-[var(--text-faint)] cursor-not-allowed"
                        )}
                    >
                        提交
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 游戏结束画面
// =============================================================================

function GameOverScreen({ score, maxCombo, onRestart, onBack }: {
    score: number;
    maxCombo?: number;
    onRestart: () => void;
    onBack: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center p-6 bg-[var(--bg-base)]"
        >
            <Trophy className="w-20 h-20 text-amber-500 mb-6" />

            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">游戏结束！</h2>

            <div className="text-4xl font-bold text-[var(--accent-primary)] mb-4">{score} 分</div>

            {maxCombo !== undefined && maxCombo > 1 && (
                <p className="text-[var(--text-muted)] mb-8">
                    最高连击: <span className="font-bold text-amber-500">{maxCombo}x</span>
                </p>
            )}

            <div className="flex gap-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium hover:bg-[var(--bg-muted)] transition-colors"
                >
                    返回
                </button>

                <button
                    onClick={onRestart}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    再来一局
                </button>
            </div>
        </motion.div>
    );
}
