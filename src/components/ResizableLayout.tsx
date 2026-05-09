'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface ResizableLayoutProps {
    leftContent: React.ReactNode;
    centerContent: React.ReactNode;
    rightContent: React.ReactNode;
}

export default function ResizableLayout({ leftContent, centerContent, rightContent }: ResizableLayoutProps) {
    const { layout, setLayout } = useAppStore();
    const [leftWidth, setLeftWidth] = useState(layout.leftSidebarWidth);
    const [rightWidth, setRightWidth] = useState(layout.rightSidebarWidth);
    const [isDraggingLeft, setIsDraggingLeft] = useState(false);
    const [isDraggingRight, setIsDraggingRight] = useState(false);

    // Adaptive calculation logic
    const updateAdaptiveLayout = useCallback(() => {
        if (!layout.isManualLayout) {
            const width = window.innerWidth;
            // Adaptive proportions: Left 22%, Right 28%, Center takes rest
            const newLeft = Math.max(200, Math.min(450, width * 0.22));
            const newRight = Math.max(280, Math.min(500, width * 0.28));
            setLeftWidth(newLeft);
            setRightWidth(newRight);
        }
    }, [layout.isManualLayout]);

    // Initialize and listen for window resize
    useEffect(() => {
        const timeout = window.setTimeout(updateAdaptiveLayout, 0);
        window.addEventListener('resize', updateAdaptiveLayout);
        return () => {
            window.clearTimeout(timeout);
            window.removeEventListener('resize', updateAdaptiveLayout);
        };
    }, [updateAdaptiveLayout]);

    // Sync from store when NOT dragging (keeps manual pixel values consistent)
    useEffect(() => {
        if (!isDraggingLeft && !isDraggingRight) {
            const timeout = window.setTimeout(() => {
                setLeftWidth(layout.leftSidebarWidth);
                setRightWidth(layout.rightSidebarWidth);
            }, 0);
            return () => window.clearTimeout(timeout);
        }
    }, [layout.leftSidebarWidth, layout.rightSidebarWidth, isDraggingLeft, isDraggingRight]);

    // Dragging Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingLeft) {
                const newWidth = Math.max(200, Math.min(450, e.clientX));
                setLeftWidth(newWidth);
            } else if (isDraggingRight) {
                const newWidth = Math.max(280, Math.min(500, window.innerWidth - e.clientX));
                setRightWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isDraggingLeft || isDraggingRight) {
                setIsDraggingLeft(false);
                setIsDraggingRight(false);

                // Save specific pixels and LOCK adaptive mode
                setLayout({
                    leftSidebarWidth: leftWidth,
                    rightSidebarWidth: rightWidth,
                    isManualLayout: true
                });

                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        };

        if (isDraggingLeft || isDraggingRight) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingLeft, isDraggingRight, leftWidth, rightWidth, setLayout]);

    // Helper to reset to adaptive mode
    const handleResetToAdaptive = () => {
        setLayout({ isManualLayout: false });
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-base)]">
            {/* Left Column */}
            <div
                style={{ width: leftWidth }}
                className="flex-shrink-0 flex flex-col relative"
            >
                {leftContent}

                {/* Drag Handle */}
                <div
                    className="absolute top-0 right-0 bottom-0 w-4 cursor-col-resize z-50 flex items-center justify-center group/handle -mr-2"
                    onMouseDown={(e) => {
                        if (e.button === 0) setIsDraggingLeft(true);
                    }}
                    onDoubleClick={handleResetToAdaptive}
                    title="双击恢复自动比例"
                >
                    <div className="w-1 h-16 rounded-full bg-[var(--border-default)] opacity-20 group-hover/handle:opacity-100 transition-opacity" />
                </div>
            </div>

            {/* Center Column */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {centerContent}
            </div>

            {/* Right Column */}
            <div
                style={{ width: rightWidth }}
                className="flex-shrink-0 flex flex-col relative"
            >
                {/* Drag Handle */}
                <div
                    className="absolute top-0 -left-0.5 bottom-0 w-4 cursor-col-resize z-50 flex items-center justify-center group/handle -ml-2"
                    onMouseDown={(e) => {
                        if (e.button === 0) setIsDraggingRight(true);
                    }}
                    onDoubleClick={handleResetToAdaptive}
                    title="双击恢复自动比例"
                >
                    <div className="w-1 h-16 rounded-full bg-[var(--border-default)] opacity-20 group-hover/handle:opacity-100 transition-opacity" />
                </div>

                {rightContent}
            </div>
        </div>
    );
}
