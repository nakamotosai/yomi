'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, BookOpen, Sparkles } from 'lucide-react';
import { useKanaProgressStore } from '@/store/useKanaProgressStore';
import { getKanaById } from '@/data/kanaData';
import { useAppStore } from '@/store/useAppStore';

import { motion, AnimatePresence } from 'framer-motion';

export default function KanaSidePanel() {
    const { selectedKanaDetail, kanaStats } = useKanaProgressStore();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { settings: _settings } = useAppStore();

    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const kana = selectedKanaDetail ? getKanaById(selectedKanaDetail) : null;
    const stats = selectedKanaDetail ? kanaStats[selectedKanaDetail] : null;

    const speak = (text: string) => {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ja-JP';
        utter.rate = 0.8;
        synth.speak(utter);
    };

    if (!kana) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none text-[var(--text-muted)]">
                <div className="w-20 h-20 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium mb-2">选择假名</h3>
                <p className="text-sm opacity-80 max-w-[200px]">
                    在左侧列表中点击任意假名查看详细信息和发音
                </p>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={kana.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col overflow-y-auto"
            >
                {/* Header / Big Character Display */}
                <div className="p-6 pb-4 flex flex-col items-center border-b border-[var(--border-muted)] relative overflow-hidden">
                    {/* Background Decorative Blob */}
                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent pointer-events-none" />

                    <div className="relative z-10 flex gap-4 mb-4">
                        {/* Hiragana Card */}
                        <div
                            className="flex flex-col items-center p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-sm w-28 h-32 justify-center cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => speak(kana.hiragana)}
                        >
                            <span className="text-6xl font-serif text-[var(--text-primary)] mb-1">{kana.hiragana}</span>
                            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Hiragana</span>
                        </div>

                        {/* Katakana Card */}
                        <div
                            className="flex flex-col items-center p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-sm w-28 h-32 justify-center cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => speak(kana.katakana)}
                        >
                            <span className="text-6xl font-serif text-[var(--text-primary)] mb-1">{kana.katakana}</span>
                            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Katakana</span>
                        </div>
                    </div>

                    {/* Romaji & Action */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-2xl font-mono font-medium text-[var(--text-secondary)] tracking-wider">
                            / {kana.romaji} /
                        </div>

                        <button
                            onClick={() => speak(kana.hiragana)}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] text-sm font-medium transition-colors mt-1"
                        >
                            <Volume2 className="w-4 h-4" />
                            <span>播放发音</span>
                        </button>
                    </div>
                </div>

                {/* Stats / Details */}
                <div className="p-6 space-y-6">
                    {/* Learning Status */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">学习状态</h4>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-transparent">
                                <div className="text-xs text-[var(--text-muted)] mb-1">熟练度</div>
                                <div className="flex items-center gap-1.5">
                                    {stats?.mastered ? (
                                        <>
                                            <Sparkles className="w-4 h-4 text-emerald-500" />
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">已掌握</span>
                                        </>
                                    ) : (
                                        <span className="font-medium text-[var(--text-primary)]">学习中</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-transparent">
                                <div className="text-xs text-[var(--text-muted)] mb-1">练习次数</div>
                                <div className="font-bold text-[var(--text-primary)]">
                                    {(stats?.correctCount || 0) + (stats?.wrongCount || 0)} <span className="text-xs font-normal text-[var(--text-muted)]">次</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">信息</h4>
                        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                            <div className="flex items-center p-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                                <span className="text-sm font-medium text-[var(--text-secondary)] w-20">类型</span>
                                <span className="text-sm text-[var(--text-primary)] capitalize">{kana.type}</span>
                            </div>
                            <div className="flex items-center p-3 bg-[var(--bg-elevated)]">
                                <span className="text-sm font-medium text-[var(--text-secondary)] w-20">行</span>
                                <span className="text-sm text-[var(--text-primary)] uppercase">{kana.row || '-'} 行</span>
                            </div>
                        </div>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
