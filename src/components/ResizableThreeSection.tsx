'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ResizableThreeSectionProps {
    topContent: React.ReactNode;
    middleContent: React.ReactNode;
    bottomContent: React.ReactNode;
    initialTopHeight?: number;
    initialBottomHeight?: number;
    onTopHeightChange?: (height: number) => void;
    onBottomHeightChange?: (height: number) => void;
    minTopHeight?: number;
    minBottomHeight?: number;
    minSectionHeight?: number;
    gap?: number;
}

export default function ResizableThreeSection({
    topContent,
    middleContent,
    bottomContent,
    initialTopHeight = 200,
    initialBottomHeight = 160,
    onTopHeightChange,
    onBottomHeightChange,
    minSectionHeight = 80,
    minTopHeight,
    minBottomHeight,
    gap = 16
}: ResizableThreeSectionProps) {
    const [topHeight, setTopHeight] = useState(initialTopHeight);
    const [bottomHeight, setBottomHeight] = useState(initialBottomHeight);
    const [dragging, setDragging] = useState<'top' | 'bottom' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Default specific mins to generic min if not provided
    const effectiveMinTop = minTopHeight ?? minSectionHeight;
    const effectiveMinBottom = minBottomHeight ?? minSectionHeight;

    useEffect(() => {
        setTopHeight(Math.max(initialTopHeight, effectiveMinTop));
    }, [initialTopHeight, effectiveMinTop]);

    useEffect(() => {
        setBottomHeight(Math.max(initialBottomHeight, effectiveMinBottom));
    }, [initialBottomHeight, effectiveMinBottom]);

    const handleMouseDown = useCallback((splitter: 'top' | 'bottom') => (e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(splitter);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const containerHeight = rect.height;

            if (dragging === 'top') {
                // Dragging the first splitter (between top and middle)
                let newTopHeight = relativeY - gap / 2;

                // Ensure minimum top height
                newTopHeight = Math.max(effectiveMinTop, newTopHeight);

                // Ensure middle section has minimum height
                const remainingForMiddleAndBottom = containerHeight - newTopHeight - 2 * gap - bottomHeight;
                if (remainingForMiddleAndBottom < minSectionHeight) {
                    newTopHeight = containerHeight - 2 * gap - bottomHeight - minSectionHeight;
                }

                setTopHeight(Math.max(effectiveMinTop, newTopHeight));
            } else if (dragging === 'bottom') {
                // Dragging the second splitter (between middle and bottom)
                let newBottomHeight = containerHeight - relativeY - gap / 2;

                // Ensure minimum bottom height
                newBottomHeight = Math.max(effectiveMinBottom, newBottomHeight);

                // Ensure middle section has minimum height
                const remainingForMiddle = containerHeight - topHeight - 2 * gap - newBottomHeight;
                if (remainingForMiddle < minSectionHeight) {
                    newBottomHeight = containerHeight - topHeight - 2 * gap - minSectionHeight;
                }

                setBottomHeight(Math.max(effectiveMinBottom, newBottomHeight));
            }
        };

        const handleMouseUp = () => {
            if (dragging) {
                setDragging(null);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Commit changes
                if (dragging === 'top') {
                    onTopHeightChange?.(topHeight);
                } else {
                    onBottomHeightChange?.(bottomHeight);
                }
            }
        };

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, topHeight, bottomHeight, minSectionHeight, gap, onTopHeightChange, onBottomHeightChange]);

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full relative">
            {/* Top Section */}
            <div
                style={{ height: `${topHeight}px` }}
                className="flex flex-col min-h-0 relative shrink-0"
            >
                {topContent}
            </div>

            {/* First Splitter */}
            <div
                className="cursor-row-resize z-10 flex-shrink-0 relative group flex items-center justify-center transition-colors"
                style={{ height: `${gap}px` }}
                onMouseDown={handleMouseDown('top')}
            >
                <div className="absolute top-0 bottom-0 left-0 right-0" />
                <div className="w-8 h-1 rounded-full bg-[var(--border-default)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Middle Section (flexible) */}
            <div
                style={{ height: `calc(100% - ${topHeight}px - ${bottomHeight}px - ${2 * gap}px)` }}
                className="flex flex-col min-h-0 relative"
            >
                {middleContent}
            </div>

            {/* Second Splitter */}
            <div
                className="cursor-row-resize z-10 flex-shrink-0 relative group flex items-center justify-center transition-colors"
                style={{ height: `${gap}px` }}
                onMouseDown={handleMouseDown('bottom')}
            >
                <div className="absolute top-0 bottom-0 left-0 right-0" />
                <div className="w-8 h-1 rounded-full bg-[var(--border-default)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Bottom Section */}
            <div
                style={{ height: `${bottomHeight}px` }}
                className="flex flex-col min-h-0 relative shrink-0"
            >
                {bottomContent}
            </div>
        </div>
    );
}
