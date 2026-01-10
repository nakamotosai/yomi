'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// 假名学习进度管理 Store
// =============================================================================

export interface KanaStat {
    kanaId: string;
    correctCount: number;
    wrongCount: number;
    lastPracticed: number; // timestamp
    mastered: boolean;     // 掌握标记
}

export interface LessonProgress {
    lessonId: string;
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    score?: number;        // 测验得分 (0-100)
    completedAt?: number;  // 完成时间戳
    kanaProgress: Record<string, boolean>; // kanaId -> 是否完成该假名学习
}

export interface GameScore {
    gameType: 'listening' | 'typing' | 'writing';
    highScore: number;
    totalPlays: number;
    lastPlayed: number;
}

interface KanaProgressState {
    // 课程进度
    lessonProgress: Record<string, LessonProgress>;

    // 已解锁假名列表（用于游戏题库动态生成）
    unlockedKana: string[];

    // 单个假名统计
    kanaStats: Record<string, KanaStat>;

    // 游戏分数
    gameScores: Record<string, GameScore>;

    // 当前学习状态
    currentLessonId: string | null;
    currentKanaIndex: number;
    selectedKanaDetail: string | null; // Currently selected kana ID for side panel details

    // Actions
    initializeProgress: () => void;
    unlockLesson: (lessonId: string) => void;
    completeLesson: (lessonId: string, score: number) => void;
    updateKanaProgress: (lessonId: string, kanaId: string, completed: boolean) => void;
    addUnlockedKana: (kanaIds: string[]) => void;
    recordKanaPractice: (kanaId: string, correct: boolean) => void;
    updateGameScore: (gameType: 'listening' | 'typing' | 'writing', score: number) => void;
    setCurrentLesson: (lessonId: string | null, kanaIndex?: number) => void;
    setSelectedKanaDetail: (kanaId: string | null) => void;
    getReviewKana: (count: number, excludeIds: string[]) => string[];
    resetProgress: () => void;
}

// 初始状态
const initialState = {
    lessonProgress: {
        'L1': {
            lessonId: 'L1',
            status: 'unlocked' as const,
            kanaProgress: {}
        }
    },
    unlockedKana: [],
    kanaStats: {},
    gameScores: {},
    currentLessonId: null,
    currentKanaIndex: 0,
    selectedKanaDetail: null
};

export const useKanaProgressStore = create<KanaProgressState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // 初始化进度（首次进入时调用）
            initializeProgress: () => {
                const current = get().lessonProgress;
                if (!current['L1']) {
                    set({
                        lessonProgress: {
                            'L1': {
                                lessonId: 'L1',
                                status: 'unlocked',
                                kanaProgress: {}
                            }
                        }
                    });
                }
            },

            // 解锁课程
            unlockLesson: (lessonId: string) => {
                set(state => ({
                    lessonProgress: {
                        ...state.lessonProgress,
                        [lessonId]: {
                            lessonId,
                            status: 'unlocked',
                            kanaProgress: {}
                        }
                    }
                }));
            },

            // 完成课程
            completeLesson: (lessonId: string, score: number) => {
                set(state => {
                    const newProgress = {
                        ...state.lessonProgress,
                        [lessonId]: {
                            ...state.lessonProgress[lessonId],
                            status: 'completed' as const,
                            score,
                            completedAt: Date.now()
                        }
                    };

                    // 根据分数决定是否解锁下一课
                    // 这里简单实现：完成即解锁下一课
                    const lessonNum = parseInt(lessonId.replace('L', ''));
                    const nextLessonId = `L${lessonNum + 1}`;

                    if (score >= 80 && lessonNum < 24) {
                        newProgress[nextLessonId] = {
                            lessonId: nextLessonId,
                            status: 'unlocked',
                            kanaProgress: {}
                        };
                    }

                    return { lessonProgress: newProgress };
                });
            },

            // 更新单个假名学习进度
            updateKanaProgress: (lessonId: string, kanaId: string, completed: boolean) => {
                set(state => ({
                    lessonProgress: {
                        ...state.lessonProgress,
                        [lessonId]: {
                            ...state.lessonProgress[lessonId],
                            status: 'in_progress',
                            kanaProgress: {
                                ...(state.lessonProgress[lessonId]?.kanaProgress || {}),
                                [kanaId]: completed
                            }
                        }
                    }
                }));
            },

            // 添加已解锁假名
            addUnlockedKana: (kanaIds: string[]) => {
                set(state => ({
                    unlockedKana: [...new Set([...state.unlockedKana, ...kanaIds])]
                }));
            },

            // 记录假名练习结果
            recordKanaPractice: (kanaId: string, correct: boolean) => {
                set(state => {
                    const existing = state.kanaStats[kanaId] || {
                        kanaId,
                        correctCount: 0,
                        wrongCount: 0,
                        lastPracticed: 0,
                        mastered: false
                    };

                    const newStat = {
                        ...existing,
                        correctCount: existing.correctCount + (correct ? 1 : 0),
                        wrongCount: existing.wrongCount + (correct ? 0 : 1),
                        lastPracticed: Date.now(),
                        // 连续正确5次以上视为掌握
                        mastered: correct && existing.correctCount >= 4
                    };

                    return {
                        kanaStats: {
                            ...state.kanaStats,
                            [kanaId]: newStat
                        }
                    };
                });
            },

            // 更新游戏分数
            updateGameScore: (gameType: 'listening' | 'typing' | 'writing', score: number) => {
                set(state => {
                    const existing = state.gameScores[gameType] || {
                        gameType,
                        highScore: 0,
                        totalPlays: 0,
                        lastPlayed: 0
                    };

                    return {
                        gameScores: {
                            ...state.gameScores,
                            [gameType]: {
                                ...existing,
                                highScore: Math.max(existing.highScore, score),
                                totalPlays: existing.totalPlays + 1,
                                lastPlayed: Date.now()
                            }
                        }
                    };
                });
            },

            // 设置当前学习状态
            setCurrentLesson: (lessonId: string | null, kanaIndex: number = 0) => {
                set({ currentLessonId: lessonId, currentKanaIndex: kanaIndex });
            },

            // 设置当前查看详情的假名
            setSelectedKanaDetail: (kanaId: string | null) => {
                set({ selectedKanaDetail: kanaId });
            },

            // 获取复习用假名（随机选取已掌握/解锁的假名）
            getReviewKana: (count: number, excludeIds: string[]) => {
                const { unlockedKana } = get();
                const pool = unlockedKana.filter(id => !excludeIds.includes(id));

                // Shuffle pool
                const shuffled = [...pool].sort(() => Math.random() - 0.5);

                return shuffled.slice(0, count);
            },

            // 重置所有进度
            resetProgress: () => {
                set(initialState);
            }
        }),
        {
            name: 'yomi-kana-progress-v1',
            partialize: (state) => ({
                lessonProgress: state.lessonProgress,
                unlockedKana: state.unlockedKana,
                kanaStats: state.kanaStats,
                gameScores: state.gameScores
            })
        }
    )
);
