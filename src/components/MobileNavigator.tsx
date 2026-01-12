'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useGeminiStore } from '@/store/useGeminiStore';
import MobileBottomBar from './MobileBottomBar';
import { MobileDrawer } from './MobileComponents';
import RefactoredInput from './RefactoredInput';

// View Types
type MobileView = 'main' | 'info' | 'ai' | 'vocab' | 'grammar';

interface MobileNavigatorProps {
    mainContent: ReactNode; // Reader
    infoContent: ReactNode; // InfoPanel
    aiContent: ReactNode;   // AIChatView
    vocabContent: ReactNode; // Vocab List
    grammarContent: ReactNode; // Grammar List
    menuContent: ReactNode; // Drawer Content
}

export default function MobileNavigator({
    mainContent,
    infoContent,
    aiContent,
    vocabContent,
    grammarContent,
    menuContent
}: MobileNavigatorProps) {
    const [currentView, setCurrentView] = useState<MobileView>('main');
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);

    // Store access
    const { settings, selectedToken, setSelectedToken, inputText, setInputText, centerViewMode, setCenterViewMode } = useAppStore();
    const { isChatOpen, setChatOpen } = useGeminiStore();
    const isDark = settings.theme === 'dark';

    // Clear ghost selection on mount to prevent auto-jump
    useEffect(() => {
        useAppStore.setState({ selectedToken: null });
        useGeminiStore.setState({ isChatOpen: false });
    }, []);

    // Sync: Selected Token -> Info View
    useEffect(() => {
        if (selectedToken) {
            setCurrentView('info');
        }
    }, [selectedToken]);

    // Sync: Chat Open -> AI View
    useEffect(() => {
        if (isChatOpen) {
            setCurrentView('ai');
        } else {
            // Close AI view if store says closed (e.g. from elsewhere)
            setCurrentView(v => v === 'ai' ? 'main' : v);
        }
    }, [isChatOpen]);

    // Sync: Center View Mode -> Mobile Views
    useEffect(() => {
        if (centerViewMode === 'vocab') {
            setCurrentView('vocab');
        } else if (centerViewMode === 'grammar') {
            setCurrentView('grammar');
        } else if (centerViewMode === 'reader' && (currentView === 'vocab' || currentView === 'grammar')) {
            setCurrentView('main');
        }
    }, [centerViewMode]);

    // Handle Back Navigation
    const handleBack = () => {
        const prevView = currentView;
        setCurrentView('main');

        // Reset Stores based on what we are leaving
        if (prevView === 'info') {
            setSelectedToken(null);
        }
        if (prevView === 'ai') {
            setChatOpen(false);
        }
        if (prevView === 'vocab' || prevView === 'grammar') {
            setCenterViewMode('reader');
        }
    };

    // Animation Variants
    const slideVariants = {
        enter: { x: '100%', opacity: 1 },
        center: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 1 }, // Slide back to right
    };

    const transition = { type: 'spring', stiffness: 300, damping: 30 } as const;

    return (
        <div className="h-full w-full relative overflow-hidden bg-[var(--bg-base)]">

            {/* ====================
                Layer 0: Main View (Reader)
                Always rendered
               ==================== */}
            <div
                className="absolute inset-0 z-0 flex flex-col pb-16" // pb-16 for BottomBar
                style={{ overflowY: isInputModalOpen ? 'hidden' : 'auto' }}
            >
                <div className="flex-1 relative">
                    {mainContent}
                </div>
            </div>

            {/* ====================
                Layer 1: Bottom Bar
               ==================== */}
            <MobileBottomBar
                currentView={currentView}
                onMenuClick={() => useAppStore.getState().setIsMobileDrawerOpen(true)}
                onInputClick={() => setIsInputModalOpen(true)}
                onAIClick={() => setChatOpen(true)}
            />

            {/* ====================
                Layer 2: Left Drawer (Menu)
               ==================== */}
            <MobileDrawer>
                {menuContent}
            </MobileDrawer>

            {/* ====================
                Layer 3: Input Modal (Refactored to Half-Height Sheet)
               ==================== */}
            <AnimatePresence>
                {isInputModalOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsInputModalOpen(false)}
                        />
                        <div
                            className="absolute bottom-0 left-0 right-0 h-[60vh] z-[60] flex flex-col bg-[var(--bg-base)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-3xl border-t border-[var(--border-default)]"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                                <h2 className="font-bold text-lg">输入文本</h2>
                                <button onClick={() => setIsInputModalOpen(false)} className="p-2 rounded-full hover:bg-[var(--bg-muted)]">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 p-2 overflow-hidden">
                                <RefactoredInput
                                    inputText={inputText}
                                    setInputText={(t) => setInputText(t)}
                                    onClear={() => setInputText('')}
                                    compact={false}
                                />
                            </div>
                        </div>
                    </>
                )}
            </AnimatePresence>


            {/* ====================
                Layer 4: Full Screen Stack Pages (Info / AI)
               ==================== */}
            <AnimatePresence>
                {currentView !== 'main' && (
                    <motion.div
                        key={currentView}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={transition}
                        className="absolute inset-0 z-[70] bg-[var(--bg-base)] flex flex-col shadow-2xl"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0, right: 0.5 }} // Only drag right (back)
                        dragMomentum={false}
                        onDragEnd={(e, { offset, velocity }) => {
                            // Threshold: 100px or fast swipe
                            if (offset.x > 100 || velocity.x > 500) {
                                handleBack();
                            }
                        }}
                    >
                        {/* Page Header (Navigation) - Shared custom layout */}
                        {(currentView === 'info' || currentView === 'vocab' || currentView === 'grammar' || currentView === 'ai') && (
                            <div
                                className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[var(--border-default)]"
                                style={{ background: isDark ? 'var(--bg-elevated)' : 'white' }}
                            >
                                {/* Left spacer to balance right button if needed, but here we just use justify-between */}
                                <div className="w-10" />

                                <span className="absolute left-1/2 -translate-x-1/2 font-bold text-[var(--text-primary)] text-sm md:text-base whitespace-nowrap">
                                    {currentView === 'info' && '单词详解'}
                                    {currentView === 'vocab' && '我的单词本'}
                                    {currentView === 'grammar' && '语法知识库'}
                                    {currentView === 'ai' && 'AI智能老师'}
                                </span>

                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-1 text-[var(--text-secondary)] p-2 rounded-lg active:bg-[var(--bg-muted)] transition-colors"
                                >
                                    <span className="font-medium text-sm">返回</span>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Page Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                            {currentView === 'info' && infoContent}
                            {currentView === 'ai' && aiContent}
                            {currentView === 'vocab' && vocabContent}
                            {currentView === 'grammar' && grammarContent}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
