'use client';

import React from 'react';
import { useKanaProgressStore } from '@/store/useKanaProgressStore';
import { useAppStore } from '@/store/useAppStore';
import { Trophy, Flame, Play, ChevronRight, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardWidget() {
    const { xp, level, streak, lessonProgress, checkStreak } = useKanaProgressStore();
    const { setAppMode } = useAppStore();

    // 计算下一个待办课程
    // 逻辑：找到第一个 'unlocked' 或 'in_progress' 的课程
    const nextLesson = Object.values(lessonProgress).find(
        l => l.status === 'unlocked' || l.status === 'in_progress'
    ) || lessonProgress['L1']; // 默认 L1

    const handleStart = () => {
        setAppMode('kana');
        // 这里未来还需要触发 KanaCourseView 加载对应课程
        useKanaProgressStore.getState().setCurrentLesson(nextLesson.lessonId);
        // 模拟打卡（测试用）
        checkStreak();
    };

    return (
        <div className="w-full h-full flex flex-col p-6 relative overflow-hidden group">
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* 顶部：用户状态 */}
            <div className="flex items-center justify-between mb-6 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 text-sm">
                        {level}
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Level</div>
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-100">初心者</div>
                    </div>
                </div>

                {/* 连胜火焰 */}
                <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-800/30">
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}</span>
                </div>
            </div>

            {/* 中部：主行动卡片 */}
            <div className="flex-1 flex flex-col justify-center z-10">
                <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group/card relative overflow-hidden"
                    onClick={handleStart}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />

                    <div className="flex justify-between items-start mb-2 relative">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 uppercase tracking-wide">
                            Next Goal
                        </span>
                        <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Play className="w-3 h-3 text-indigo-500 fill-indigo-500 ml-0.5" />
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 relative flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-gray-400" />
                        五十音图: {nextLesson.lessonId}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 relative">
                        掌握基础元音与发音规则
                    </p>

                    {/* 迷你进度条 */}
                    <div className="mt-3 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                        <motion.div
                            className="h-full bg-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: '0%' }}
                        />
                    </div>
                </motion.button>
            </div>

            {/* 底部：XP 统计 */}
            <div className="mt-6 flex items-center justify-between text-xs text-gray-400 z-10">
                <span className="flex items-center gap-1.5 font-medium">
                    <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                    {xp} XP Earned
                </span>
                <button className="hover:text-indigo-500 transition-colors flex items-center gap-0.5 font-medium">
                    详情 <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
