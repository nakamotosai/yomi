'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, CheckCircle2, RotateCcw, Pencil, PlayCircle } from 'lucide-react';
import { KanaChar } from '@/types';
import clsx from 'clsx';
import { KANA_STROKES, KanaStrokeData } from '@/data/kanaStrokes';
import { useAppStore } from '@/store/useAppStore';

interface KanaModalProps {
    char: KanaChar | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function KanaModal({ char, isOpen, onClose }: KanaModalProps) {
    const [activeTab, setActiveTab] = useState<'stroke' | 'trace'>('stroke');
    const [key, setKey] = useState(0);
    // Local state to toggle between hiragana/katakana view in modal
    const [viewType, setViewType] = useState<'hiragana' | 'katakana'>('hiragana');
    const { settings } = useAppStore();

    // Sync view type with global settings initially
    useEffect(() => {
        if (settings.kanaCharType) {
            setViewType(settings.kanaCharType);
        }
    }, [settings.kanaCharType, isOpen]);

    if (!isOpen || !char) return null;

    const displayChar = viewType === 'hiragana' ? char.hiragana : char.katakana;
    const strokeData: KanaStrokeData | undefined = KANA_STROKES[displayChar];

    const handleReplay = () => setKey(k => k + 1);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <div className="flex gap-2 items-baseline">
                                            <h2 className="text-4xl font-black text-slate-800 font-serif">
                                                {viewType === 'hiragana' ? char.hiragana : char.katakana}
                                            </h2>
                                            <span className="text-xl text-slate-400 font-mono">/ {char.romaji} /</span>
                                        </div>
                                    </div>

                                    {/* Type Toggle */}
                                    <div className="flex bg-slate-200 rounded-lg p-0.5">
                                        <button
                                            onClick={() => setViewType('hiragana')}
                                            className={clsx(
                                                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                viewType === 'hiragana' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            あ
                                        </button>
                                        <button
                                            onClick={() => setViewType('katakana')}
                                            className={clsx(
                                                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                viewType === 'katakana' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            ア
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-100">
                                <button
                                    className={clsx(
                                        "flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-2",
                                        activeTab === 'stroke' ? "text-blue-600" : "text-gray-500 hover:bg-gray-50"
                                    )}
                                    onClick={() => setActiveTab('stroke')}
                                >
                                    <PlayCircle className="w-4 h-4" />
                                    笔顺演示
                                    {activeTab === 'stroke' && (
                                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                                    )}
                                </button>
                                <button
                                    className={clsx(
                                        "flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-2",
                                        activeTab === 'trace' ? "text-blue-600" : "text-gray-500 hover:bg-gray-50"
                                    )}
                                    onClick={() => {
                                        setActiveTab('trace');
                                        setKey(k => k + 1); // Reset tracing on tab switch
                                    }}
                                >
                                    <Pencil className="w-4 h-4" />
                                    描红练习
                                    {activeTab === 'trace' && (
                                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                                    )}
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 relative min-h-[360px]">
                                {activeTab === 'stroke' ? (
                                    <StrokeOrderView
                                        strokeData={strokeData}
                                        key={`stroke-${key}-${viewType}`}
                                        onReplay={handleReplay}
                                    />
                                ) : (
                                    <TracingCanvas
                                        strokeData={strokeData}
                                        charDisplay={viewType === 'hiragana' ? char.hiragana : char.katakana}
                                        key={`trace-${key}-${viewType}`}
                                    />
                                )}
                            </div>

                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ----------------------------------------------------------------------
// Stroke Order View
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Stroke Order View
// ----------------------------------------------------------------------

function StrokeOrderView({ strokeData, onReplay }: { strokeData: KanaStrokeData | undefined, onReplay: () => void }) {
    if (!strokeData) {
        return (
            <div className="text-center text-slate-300">
                <p>暂无笔顺数据</p>
            </div>
        );
    }

    return (
        <div className="relative w-72 h-72 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200">
            <button
                onClick={onReplay}
                className="absolute top-2 right-2 p-2 text-gray-300 hover:text-blue-500 transition-colors z-10"
                title="重播"
            >
                <RefreshCw className="w-5 h-5" />
            </button>

            <svg viewBox="0 0 1024 1024" className="w-full h-full p-4 pointer-events-none">
                <defs>
                    {strokeData.outlines.map((d, i) => (
                        <clipPath key={`clip-${i}`} id={`clip-${i}`}>
                            <path d={d} />
                        </clipPath>
                    ))}
                </defs>

                {/* Grid Lines (1024 scale) */}
                <line x1="512" y1="0" x2="512" y2="1024" stroke="#f1f5f9" strokeWidth="4" strokeDasharray="20 20" />
                <line x1="0" y1="512" x2="1024" y2="512" stroke="#f1f5f9" strokeWidth="4" strokeDasharray="20 20" />

                {/* Background Outlines (Gray) */}
                {strokeData.outlines.map((d, i) => (
                    <path
                        key={`bg-${i}`}
                        d={d}
                        fill="#e2e8f0" // slate-200
                        stroke="none"
                    />
                ))}

                {/* Animated Strokes (Masked) */}
                {strokeData.paths.map((d, i) => (
                    <g key={`anim-group-${i}`} clipPath={`url(#clip-${i})`}>
                        <motion.path
                            d={d}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="150" // Expanded width to cover the outline
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{
                                duration: 0.8,
                                ease: "linear", // Linear is better for path animation
                                delay: i * 0.9,
                            }}
                        />
                    </g>
                ))}

                {/* Stroke Numbers */}
                {strokeData.paths.map((d, i) => {
                    // Start point approximation
                    const match = d.match(/M\s*([\d.]+)[,\s]([\d.]+)/);
                    if (!match) return null;
                    const x = parseFloat(match[1]);
                    const y = parseFloat(match[2]);

                    return (
                        <motion.g
                            key={`num-${i}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.9 }}
                        >
                            <circle cx={x} cy={y} r="30" fill="#ef4444" />
                            <text x={x} y={y} dy="10" textAnchor='middle' fontSize="40" fill="white" className="font-bold font-mono">{i + 1}</text>
                        </motion.g>
                    )
                })}
            </svg>
        </div>
    );
}

// ----------------------------------------------------------------------
// Advanced Tracing Canvas
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Advanced Tracing Canvas
// ----------------------------------------------------------------------

function TracingCanvas({ strokeData, charDisplay }: { strokeData: KanaStrokeData | undefined, charDisplay: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set high DPI
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 20;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    useEffect(() => {
        setupCanvas();
    }, [setupCanvas, strokeData]);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (isComplete) return;
        setIsDrawing(true);
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || isComplete) return;
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

        // Validation simulation
        if (strokeData && currentStrokeIndex < strokeData.paths.length - 1) {
            setCurrentStrokeIndex(prev => prev + 1);
        } else if (strokeData) {
            setIsComplete(true);
            playSound();
        }
    };

    const playSound = () => {
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance("Yoku dekimashita"); // "Well done"
        utter.lang = "ja-JP";
        utter.rate = 1.2;
        synth.speak(utter);
    };

    const handleRetry = () => {
        setCurrentStrokeIndex(0);
        setIsComplete(false);
        setupCanvas();
    };

    if (!strokeData) return <div className="text-gray-400">Loading...</div>;

    return (
        <div className="relative w-72 h-72">
            {/* Base Layer: Guide Outlines 1024x1024 */}
            <div className="absolute inset-0 bg-white rounded-xl shadow-sm border border-gray-200 pointer-events-none">
                <svg viewBox="0 0 1024 1024" className="w-full h-full p-4 opacity-30">
                    <line x1="512" y1="0" x2="512" y2="1024" stroke="#000" strokeWidth="4" strokeDasharray="20 20" />
                    <line x1="0" y1="512" x2="1024" y2="512" stroke="#000" strokeWidth="4" strokeDasharray="20 20" />
                    {strokeData.outlines.map((d, i) => (
                        <path
                            key={i}
                            d={d}
                            fill="#000"
                        />
                    ))}
                </svg>
            </div>

            {/* Active Stroke Hint (Centerline) */}
            {!isComplete && strokeData.paths[currentStrokeIndex] && (
                <div className="absolute inset-0 pointer-events-none">
                    <svg viewBox="0 0 1024 1024" className="w-full h-full p-4">
                        <motion.path
                            d={strokeData.paths[currentStrokeIndex]}
                            fill="none"
                            stroke="#3b82f6" // Blue hint
                            strokeWidth="150" // Match animation width
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-20"
                            animate={{ opacity: [0.1, 0.3, 0.1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    </svg>
                </div>
            )}

            {/* Drawing Layer */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none rounded-xl"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={endDrawing}
            />

            {/* Status Overlay */}
            <div className="absolute top-2 left-2 text-xs font-bold text-slate-400 pointer-events-none bg-white/80 px-2 py-1 rounded">
                Stroke {isComplete ? strokeData.paths.length : currentStrokeIndex + 1} / {strokeData.paths.length}
            </div>

            {/* Complete Overlay */}
            <AnimatePresence>
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl z-20"
                    >
                        <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-16 h-16 text-green-500 drop-shadow-md mb-2" />
                            <span className="text-green-700 font-bold text-lg">完成!</span>
                            <button
                                onClick={handleRetry}
                                className="mt-3 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-full shadow-lg transition-transform active:scale-95"
                            >
                                再练一次
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Button */}
            <button
                onClick={handleRetry}
                className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 transition-colors z-10"
                title="重置"
            >
                <RotateCcw className="w-5 h-5" />
            </button>
        </div>
    );
}
