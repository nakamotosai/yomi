'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import KanaCourseMap from './kana/KanaCourseMap';
import LessonView from './kana/LessonView';
import PracticeArena from './kana/PracticeArena';
import { KanaLesson } from '@/data/kana_curriculum';
import { useKanaProgressStore } from '@/store/useKanaProgressStore';

// =============================================================================
// 假名模式主视图
// 使用中间栏和右边栏的双栏布局
// =============================================================================

type KanaModeScreen = 'course' | 'lesson' | 'practice';



export default function KanaModeView() {
    const [screen, setScreen] = useState<KanaModeScreen>('course');
    const [selectedLesson, setSelectedLesson] = useState<KanaLesson | null>(null);
    const { completeLesson } = useKanaProgressStore();

    // 选择课程
    const handleSelectLesson = (lesson: KanaLesson) => {
        setSelectedLesson(lesson);
        setScreen('lesson');
    };

    // 完成课程
    const handleCompleteLesson = (score: number) => {
        if (selectedLesson) {
            completeLesson(selectedLesson.id, score);
        }
    };

    // 返回课程地图
    const handleBackToCourse = () => {
        setSelectedLesson(null);
        setScreen('course');
    };

    // 打开练习场
    const handleOpenPractice = () => {
        setScreen('practice');
    };

    return (
        <div className="h-full w-full">
            <AnimatePresence mode="wait">
                {screen === 'course' && (
                    <motion.div
                        key="course"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-full"
                    >
                        <KanaCourseMap
                            onSelectLesson={handleSelectLesson}
                            onOpenPractice={handleOpenPractice}
                        />
                    </motion.div>
                )}

                {screen === 'lesson' && selectedLesson && (
                    <motion.div
                        key="lesson"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="h-full"
                    >
                        <LessonView
                            lesson={selectedLesson}
                            onBack={handleBackToCourse}
                            onComplete={handleCompleteLesson}
                        />
                    </motion.div>
                )}

                {screen === 'practice' && (
                    <motion.div
                        key="practice"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="h-full"
                    >
                        <PracticeArena onBack={handleBackToCourse} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
