'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Image from 'next/image';

// --- Mobile Header ---
export function MobileHeader() {
    const { setIsMobileDrawerOpen, appMode, settings } = useAppStore();
    const isDark = settings.theme === 'dark';

    return (
        <header
            className="h-14 flex items-center px-4 sticky top-0 z-30 lg:hidden"
            style={{
                background: isDark ? 'var(--bg-elevated)' : 'white',
                borderBottom: `1px solid var(--border-default)`
            }}
        >
            <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="p-2 -ml-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className="ml-3 flex items-center gap-2 relative w-6 h-6">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" unoptimized />
                <span className="font-bold text-slate-500">
                    {appMode === 'reader' ? 'Reader' : 'Kana'}
                </span>
            </div>
        </header>
    );
}

// --- Mobile Drawer (Left) ---
interface MobileDrawerProps {
    children: ReactNode;
}

export function MobileDrawer({ children }: MobileDrawerProps) {
    const { isMobileDrawerOpen, setIsMobileDrawerOpen, settings } = useAppStore();
    const isDark = settings.theme === 'dark';

    return (
        <AnimatePresence>
            {isMobileDrawerOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="fixed inset-0 z-40 lg:hidden"
                        style={{
                            background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    {/* Drawer Content */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 bottom-0 left-0 w-[85%] max-w-[320px] shadow-xl z-50 lg:hidden flex flex-col"
                        style={{
                            background: isDark ? 'var(--bg-elevated)' : 'white'
                        }}
                    >
                        <div
                            className="flex justify-end p-2"
                            style={{ borderBottom: `1px solid var(--border-default)` }}
                        >
                            <button
                                onClick={() => setIsMobileDrawerOpen(false)}
                                className="p-2 rounded-full transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// --- Mobile Bottom Sheet (Right) ---
interface MobileBottomSheetProps {
    children: ReactNode;
}

export function MobileBottomSheet({ children }: MobileBottomSheetProps) {
    const { isMobileSheetOpen, setIsMobileSheetOpen, settings } = useAppStore();
    const isDark = settings.theme === 'dark';

    return (
        <AnimatePresence>
            {isMobileSheetOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileSheetOpen(false)}
                        className="fixed inset-0 z-40 lg:hidden"
                        style={{ background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)' }}
                    />

                    {/* Sheet Content */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 h-[80vh] rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.2)] z-50 lg:hidden flex flex-col"
                        style={{
                            background: isDark ? 'var(--bg-elevated)' : 'white',
                            borderTop: `1px solid var(--border-default)`
                        }}
                    >
                        {/* Handle Bar */}
                        <div
                            className="h-1.5 w-12 rounded-full mx-auto my-3 shrink-0 cursor-pointer"
                            style={{ background: 'var(--text-faint)' }}
                            onClick={() => setIsMobileSheetOpen(false)}
                        />

                        {/* Close Button */}
                        <div className="absolute top-3 right-3">
                            <button
                                onClick={() => setIsMobileSheetOpen(false)}
                                className="p-1.5 rounded-full transition-colors"
                                style={{
                                    background: 'var(--bg-muted)',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
