'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface ResizableLayoutProps {
    leftContent: React.ReactNode;
    centerContent: React.ReactNode;
    rightContent: React.ReactNode;
}

export default function ResizableLayout({ leftContent, centerContent, rightContent }: ResizableLayoutProps) {
    const { layout, setLayout } = useAppStore();
    // Local state for smooth dragging without constant store updates causing jank
    const [leftWidth, setLeftWidth] = useState(256);
    const [rightWidth, setRightWidth] = useState(340);
    const [isDraggingLeft, setIsDraggingLeft] = useState(false);
    const [isDraggingRight, setIsDraggingRight] = useState(false);

    // Sync from store on mount and when layout changes (e.g. hydration)
    useEffect(() => {
        if (!isDraggingLeft && layout.leftSidebarWidth && layout.leftSidebarWidth !== leftWidth) {
            setLeftWidth(layout.leftSidebarWidth);
        }
        if (!isDraggingRight && layout.rightSidebarWidth && layout.rightSidebarWidth !== rightWidth) {
            setRightWidth(layout.rightSidebarWidth);
        }
    }, [layout.leftSidebarWidth, layout.rightSidebarWidth, isDraggingLeft, isDraggingRight]);

    // Handle global mouse events
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingLeft) {
                // Constrain width: min 200px, max 450px
                const newWidth = Math.max(200, Math.min(450, e.clientX));
                setLeftWidth(newWidth);
            } else if (isDraggingRight) {
                // Right width is window width - mouse X
                // Constrain width: min 280px, max 500px
                const newWidth = Math.max(280, Math.min(500, window.innerWidth - e.clientX));
                setRightWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isDraggingLeft || isDraggingRight) {
                setIsDraggingLeft(false);
                setIsDraggingRight(false);
                // Persist to store on drag end
                setLayout({
                    leftSidebarWidth: isDraggingLeft ? leftWidth : layout.leftSidebarWidth,
                    rightSidebarWidth: isDraggingRight ? rightWidth : layout.rightSidebarWidth,
                    leftInputHeight: layout.leftInputHeight,
                    rightBottomHeight: layout.rightBottomHeight
                });
                // Remove selection blocking class from body
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        };

        if (isDraggingLeft || isDraggingRight) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection while dragging
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingLeft, isDraggingRight, leftWidth, rightWidth, layout, setLayout]);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-base)]">
            {/* Left Column */}
            <div
                style={{ width: leftWidth }}
                className="flex-shrink-0 flex flex-col relative"
            >
                {leftContent}

                {/* Drag Handle - Right Edge of Left Col */}
                <div
                    className="absolute top-0 right-0 bottom-0 w-4 cursor-col-resize z-50 flex items-center justify-center group/handle -mr-2"
                    onMouseDown={() => setIsDraggingLeft(true)}
                >
                    <div className="w-1 h-16 rounded-full bg-[var(--border-default)] opacity-0 group-hover/handle:opacity-100 transition-opacity" />
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
                {/* Drag Handle - Left Edge of Right Col */}
                <div
                    className="absolute top-0 -left-0.5 bottom-0 w-4 cursor-col-resize z-50 flex items-center justify-center group/handle -ml-2"
                    onMouseDown={() => setIsDraggingRight(true)}
                >
                    <div className="w-1 h-16 rounded-full bg-[var(--border-default)] opacity-0 group-hover/handle:opacity-100 transition-opacity" />
                </div>

                {rightContent}
            </div>
        </div>
    );
}
