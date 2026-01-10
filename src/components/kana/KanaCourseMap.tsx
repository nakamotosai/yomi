'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ChevronRight, Sparkles, Gamepad2 } from 'lucide-react';
import { KANA_CURRICULUM, KanaLesson } from '@/data/kana_curriculum';
import { useKanaProgressStore } from '@/store/useKanaProgressStore';
import clsx from 'clsx';

interface KanaCourseMapProps {
    onSelectLesson: (lesson: KanaLesson) => void;
    onOpenPractice: () => void;
}

export default function KanaCourseMap({ onSelectLesson, onOpenPractice }: KanaCourseMapProps) {
    const { lessonProgress, initializeProgress, setSelectedKanaDetail } = useKanaProgressStore();

    // 初始化进度
    React.useEffect(() => {
        initializeProgress();
    }, [initializeProgress]);

    // 计算解锁状态的课程列表
    const lessonsWithStatus = useMemo(() => {
        return KANA_CURRICULUM.map(lesson => {
            const progress = lessonProgress[lesson.id];
            let status: 'locked' | 'unlocked' | 'in_progress' | 'completed' = 'locked';

            if (progress) {
                status = progress.status;
            } else if (lesson.id === 'L1') {
                status = 'unlocked'; // 第一课默认解锁
            }

            return { ...lesson, status, score: progress?.score };
        });
    }, [lessonProgress]);

    // 统计
    const completedCount = lessonsWithStatus.filter(l => l.status === 'completed').length;
    const totalCount = lessonsWithStatus.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="h-full flex flex-col">
            {/* 顶部进度概览 */}
            <div className="shrink-0 p-6 border-b border-[var(--border-default)]">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">假名学习之旅</h2>
                            <p className="text-sm text-[var(--text-muted)]">
                                已完成 {completedCount} / {totalCount} 课 ({progressPercent}%)
                            </p>
                        </div>
                        <button
                            onClick={onOpenPractice}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium text-sm shadow-sm hover:translate-y-[-1px] transition-all hover:bg-[var(--bg-subtle)]"
                        >
                            <Gamepad2 className="w-4 h-4 text-purple-500" />
                            练习场
                        </button>
                    </div>

                    {/* 进度条 - Morandi Style */}
                    <div className="h-2.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-emerald-400/80 dark:bg-emerald-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            </div>

            {/* 课程列表 */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                    {lessonsWithStatus.map((lesson, index) => (
                        <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            index={index}
                            status={lesson.status}
                            score={lesson.score}
                            onClick={() => lesson.status !== 'locked' && onSelectLesson(lesson)}
                            onKanaClick={(kanaId) => {
                                setSelectedKanaDetail(kanaId);
                            }}
                        />
                    ))}
                </div>
                <div className="h-20" /> {/* 底部留白 */}
            </div>
        </div>
    );
}

// 单个课程卡片
interface LessonCardProps {
    lesson: KanaLesson;
    index: number;
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    score?: number;
    onClick: () => void;
    onKanaClick: (kanaId: string) => void;
}

function LessonCard({ lesson, index, status, score, onClick, onKanaClick }: LessonCardProps) {
    const isLocked = status === 'locked';
    const isCompleted = status === 'completed';
    const isIntro = lesson.type === 'intro';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={clsx(
                "relative rounded-2xl border transition-all glass-card",
                isLocked ? "bg-[var(--bg-subtle)] border-transparent opacity-60" : "bg-[var(--bg-elevated)] border-[var(--border-default)]",
                !isLocked && "hover:border-[var(--border-active)] hover:shadow-md"
            )}
        >
            {/* Main Click Area for Lesson */}
            <div
                className={clsx("p-5 flex items-center gap-5 cursor-pointer", isLocked && "cursor-not-allowed")}
                onClick={onClick}
            >
                {/* 序号/状态图标 */}
                <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 transition-colors",
                    isLocked && "bg-[var(--bg-muted)] text-[var(--text-faint)]",
                    isCompleted && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                    !isLocked && !isCompleted && "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                )}>
                    {isLocked ? (
                        <Lock className="w-5 h-5" />
                    ) : isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                    ) : (
                        <span>{index + 1}</span>
                    )}
                </div>

                {/* 课程信息 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={clsx(
                            "font-bold truncate text-[16px]",
                            isLocked ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
                        )}>
                            {lesson.title}
                        </h3>
                        {isIntro && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                                S
                            </span>
                        )}
                    </div>
                    <p className={clsx(
                        "text-sm truncate",
                        isLocked ? "text-[var(--text-faint)]" : "text-[var(--text-muted)]"
                    )}>
                        {lesson.subtitle}
                    </p>
                </div>

                {/* 右侧状态 */}
                <div className="shrink-0 flex items-center gap-3">
                    {isCompleted && score !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{score}%</span>
                        </div>
                    )}
                    {!isLocked && (
                        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] opacity-50" />
                    )}
                </div>
            </div>

            {/* 假名预览（可交互） */}
            {lesson.content.kanaIds && lesson.content.kanaIds.length > 0 && !isLocked && (
                <div className="px-5 pb-5 pt-0 flex gap-2 flex-wrap">
                    {lesson.content.kanaIds.slice(0, 10).map(id => (
                        <button
                            key={id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onKanaClick(id);
                            }}
                            className="group relative w-9 h-9 rounded-lg bg-[var(--bg-base)] border border-[var(--border-muted)] flex items-center justify-center text-[15px] font-medium text-[var(--text-secondary)] hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all active:scale-95"
                            title={`查看 ${id} 详情`}
                        >
                            {id}
                        </button>
                    ))}
                    {lesson.content.kanaIds.length > 10 && (
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)]">
                            ...
                        </span>
                    )}
                </div>
            )}
        </motion.div>
    );
}
