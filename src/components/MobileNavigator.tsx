'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, X, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useGeminiStore } from '@/store/useGeminiStore';
import MobileBottomBar from './MobileBottomBar';
import { MobileDrawer } from './MobileComponents';
import RefactoredInput from './RefactoredInput';
import { useI18n } from '@/lib/i18n';

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
    const [currentView, setCurrentView] = useState<MobileView>('ai');
    const [hasMainLoaded, setHasMainLoaded] = useState(false);

    // Store access
    const {
        settings,
        selectedToken,
        setSelectedToken,
        selectedGrammar,
        setSelectedGrammar,
        inputText,
        setInputText,
        centerViewMode,
        setCenterViewMode,
        isInputModalOpen,
        setIsInputModalOpen
    } = useAppStore();
    const { isChatOpen, setChatOpen } = useGeminiStore();
    const { t } = useI18n();
    const isDark = settings.theme === 'dark';

    // Clear ghost selection on mount to prevent auto-jump
    useEffect(() => {
        useAppStore.setState({ selectedToken: null });
        // Although default is 'ai', ensuring store sync is good practice
    }, []);

    // Lazy load main content when switching to it
    useEffect(() => {
        if (currentView === 'main' && !hasMainLoaded) {
            const timeout = window.setTimeout(() => setHasMainLoaded(true), 0);
            return () => window.clearTimeout(timeout);
        }
    }, [currentView, hasMainLoaded]);

    // Sync: Selected Token/Grammar -> Info View
    useEffect(() => {
        if (selectedToken || selectedGrammar) { // Use deconstructed state
            const timeout = window.setTimeout(() => setCurrentView('info'), 0);
            return () => window.clearTimeout(timeout);
        }
    }, [selectedToken, selectedGrammar]); // Use proper dependency

    // Sync: Chat Open -> AI View
    const isInitialMount = React.useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (isChatOpen) {
            const timeout = window.setTimeout(() => setCurrentView('ai'), 0);
            return () => window.clearTimeout(timeout);
        }
        // We no longer auto-close AI view when isChatOpen becomes false,
        // because AI view is now the main view and accessible via tabs.
    }, [isChatOpen]);

    // Sync: Center View Mode -> Mobile Views
    useEffect(() => {
        let nextView: MobileView | null = null;
        if (centerViewMode === 'vocab') {
            nextView = 'vocab';
        } else if (centerViewMode === 'grammar') {
            nextView = 'grammar';
        } else if (centerViewMode === 'reader' && (currentView === 'vocab' || currentView === 'grammar')) {
            nextView = 'main';
        }

        if (!nextView) return;
        const timeout = window.setTimeout(() => setCurrentView(nextView), 0);
        return () => window.clearTimeout(timeout);
    }, [centerViewMode, currentView]);

    // Handle Back Navigation
    const handleBack = () => {
        const prevView = currentView;
        setCurrentView('main');

        // Reset Stores based on what we are leaving
        if (prevView === 'info') {
            setSelectedToken(null);
            setSelectedGrammar(null); // Clear grammar too
        }
        if (prevView === 'ai') {
            setChatOpen(false);
        }
        if (prevView === 'vocab' || prevView === 'grammar') {
            setCenterViewMode('reader');
        }
    };

    // Animation Variants
    // Animation Variants (Fade)
    const fadeVariants = {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
    };

    const transition = { duration: 0.25, ease: 'easeInOut' } as const;

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
                {/* Back Button Overlay for Reader Mode */}
                {currentView === 'main' && (
                    <div className="absolute top-3 left-3 z-[60] pointer-events-none">
                        <button
                            onClick={() => setCurrentView('ai')}
                            className="pointer-events-auto flex items-center gap-1 bg-[var(--bg-elevated)]/90 backdrop-blur-md border border-[var(--border-default)] text-[var(--text-secondary)] px-3 py-2 rounded-full shadow-md active:scale-95 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="font-bold text-xs">AI老师</span>
                        </button>
                    </div>
                )}

                <div className="flex-1 relative">
                    {hasMainLoaded && mainContent}
                </div>
            </div>

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
                            className="fixed inset-0 z-[105] bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsInputModalOpen(false)}
                        />
                        <div
                            className="absolute bottom-0 left-0 right-0 h-[90vh] z-[110] flex flex-col bg-[var(--bg-base)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-3xl border-t border-[var(--border-default)]"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                                <h2 className="font-bold text-lg">{t('nav.reader_editor')}</h2>
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
                        variants={fadeVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={transition}
                        className="absolute inset-0 z-[70] bg-[#faf9f6] dark:bg-[#0a0a12] flex flex-col shadow-2xl pb-20" // Added pb-20 for BottomBar visibility
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0, right: 0.5 }} // Only drag right (back)
                        dragMomentum={false}
                        onDragEnd={(e, { offset, velocity }) => {
                            // Threshold: 100px or fast swipe
                            if (currentView !== 'ai' && (offset.x > 100 || velocity.x > 500)) {
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
                                {currentView === 'ai' ? (
                                    /* AI Header: Back, Logo & Title */
                                    <div className="flex items-center gap-2 min-w-0">
                                        <button
                                            onClick={handleBack}
                                            className="flex items-center justify-center p-2 -ml-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 transition-all"
                                            title="返回阅读"
                                            aria-label="返回阅读"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div className="relative w-8 h-8">
                                            {/* Assuming Image component is imported or we use img tag. 
                                               Since Next.js Image is better, we should check imports. 
                                               MobileNavigator doesn't import Image. Using img for now or standard div.
                                               wait, I should use Next Image if possible. But I don't see it imported.
                                               Let's use <img> for simplicity or check if I can import it.
                                               The previous file didn't have Image. I'll use <img> to be safe.
                                             */}
                                            <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                                        </div>
                                        <span className="font-bold text-[var(--text-primary)] truncate">YOMI | AI智能老师</span>
                                    </div>
                                ) : (
                                    /* Normal Header: Spacer for centering */
                                    <div className="w-10" />
                                )}

                                {currentView !== 'ai' && (
                                    <span className="absolute left-1/2 -translate-x-1/2 font-bold text-[var(--text-primary)] text-sm md:text-base whitespace-nowrap">
                                        {currentView === 'info' && t('header.vocab_detail')}
                                        {currentView === 'vocab' && t('header.my_vocab')}
                                        {currentView === 'grammar' && t('header.grammar_kb')}
                                    </span>
                                )}

                                {currentView !== 'ai' && (
                                    <button
                                        onClick={handleBack}
                                        className="flex items-center justify-center p-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 transition-all"
                                        title="返回"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                                {currentView === 'ai' && (
                                    <button
                                        onClick={() => {
                                            if (confirm('确定要清除所有对话记录吗？')) {
                                                useGeminiStore.getState().resetChat();
                                            }
                                        }}
                                        className="p-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm active:scale-95 transition-all"
                                        title="清除所有对话"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
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

            {/* ====================
                Layer 1: Bottom Bar (Moved to Top Z-Index)
               ==================== */}
            <div className="relative z-[80]">
                <MobileBottomBar
                    currentView={currentView}
                    onMenuClick={() => useAppStore.getState().setIsMobileDrawerOpen(true)}
                    onReaderClick={() => {
                        setChatOpen(false);
                        setCurrentView('main');
                    }}
                    onAIClick={() => setCurrentView('ai')} // Force switch to AI
                />
            </div>

        </div>
    );
}
