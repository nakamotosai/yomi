'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ResizableVerticalSectionProps {
    topContent: React.ReactNode;
    bottomContent: React.ReactNode;
    // Two modes:
    // 1. 'bottom-fixed': The bottom section has a height, top fills remaining. (For Left Column w/ Input)
    // 2. 'ratio': The sections are split by a ratio. (For Right Column)
    mode: 'bottom-fixed' | 'ratio';

    // Initial values
    initialBottomHeight?: number; // for bottom-fixed
    initialSplitRatio?: number; // for ratio (0-1), represents top height ratio

    // Callbacks
    onBottomHeightChange?: (height: number) => void;
    onSplitRatioChange?: (ratio: number) => void;

    // Constraints
    minTopHeight?: number;
    minBottomHeight?: number;
}

export default function ResizableVerticalSection({
    topContent,
    bottomContent,
    mode,
    initialBottomHeight = 160,
    initialSplitRatio = 0.6,
    onBottomHeightChange,
    onSplitRatioChange,
    minTopHeight = 100,
    minBottomHeight = 100,
    gap = 0
}: ResizableVerticalSectionProps & { gap?: number }) {
    const [bottomHeight, setBottomHeight] = useState(initialBottomHeight);
    const [splitRatio, setSplitRatio] = useState(initialSplitRatio);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync props to state if they change externally (e.g. reset)
    useEffect(() => {
        setBottomHeight(initialBottomHeight);
    }, [initialBottomHeight]);

    useEffect(() => {
        setSplitRatio(initialSplitRatio);
    }, [initialSplitRatio]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const containerHeight = rect.height;

            if (mode === 'bottom-fixed') {
                // Calculate new bottom height based on mouse position
                // relativeY is the position of the mouse, which is dragging the gap.
                // We want to calculate the new bottom height.
                // Distance from bottom = Container Height - Mouse Y
                // Adjust for gap center: we want the mouse to be in the middle of the gap.
                // So bottom start = Mouse Y + gap/2
                // Bottom Height = Container Height - (Mouse Y + gap/2)

                let newHeight = containerHeight - relativeY - (gap / 2);

                // Constraints
                // Top section height = relativeY - gap/2. Must be >= minTopHeight
                const potentialTopHeight = containerHeight - newHeight - gap;

                if (potentialTopHeight < minTopHeight) {
                    newHeight = containerHeight - minTopHeight - gap;
                } else if (newHeight < minBottomHeight) {
                    newHeight = minBottomHeight;
                }

                setBottomHeight(newHeight);
            } else if (mode === 'ratio') {
                // Calculate ratio based on available space (Container - Gap)
                const availableHeight = containerHeight - gap;
                if (availableHeight <= 0) return;

                // Mouse Y is at the gap. 
                // Top Height = Mouse Y - gap/2
                const topHeight = relativeY - (gap / 2);

                let ratio = topHeight / availableHeight;

                // Constraints
                // limit ratio between 0.1 and 0.9 or based on min pixels
                const minRatio = minTopHeight / availableHeight;
                const maxRatio = 1 - (minBottomHeight / availableHeight);

                ratio = Math.max(minRatio, Math.min(maxRatio, ratio));

                setSplitRatio(ratio);
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Commit changes
                if (mode === 'bottom-fixed') {
                    onBottomHeightChange?.(bottomHeight);
                } else {
                    onSplitRatioChange?.(splitRatio);
                }
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, mode, bottomHeight, splitRatio, minTopHeight, minBottomHeight, onBottomHeightChange, onSplitRatioChange, gap]);

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full relative">
            {/* Top Section */}
            <div
                style={{
                    height: mode === 'ratio'
                        ? `calc((100% - ${gap}px) * ${splitRatio})`
                        : `calc(100% - ${bottomHeight}px - ${gap}px)`,
                }}
                className="flex flex-col min-h-0 relative transition-[height] duration-0 ease-linear"
            >
                {topContent}
            </div>

            {/* Splitter (The Gap) */}
            <div
                className="cursor-row-resize z-10 flex-shrink-0 relative group flex items-center justify-center transition-colors"
                style={{ height: `${gap}px` }} // Physical gap
                onMouseDown={handleMouseDown}
            >
                {/* 
                   Hidden Interaction Hitbox 
                   (Larger than the visual gap if gap is small, but if gap is big (e.g. 12px), it's fine) 
                */}
                <div className="absolute top-0 bottom-0 left-0 right-0" />

                {/* Visual Handle (Optional hover effect) */}
                <div className="w-8 h-1 rounded-full bg-[var(--border-default)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Bottom Section */}
            <div
                style={{
                    height: mode === 'ratio'
                        ? `calc((100% - ${gap}px) * (1 - ${splitRatio}))`
                        : `${bottomHeight}px`
                }}
                className="flex flex-col min-h-0 relative transition-[height] duration-0 ease-linear"
            >
                {bottomContent}
            </div>
        </div>
    );
}


