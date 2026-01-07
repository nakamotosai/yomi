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
}: ResizableVerticalSectionProps) {
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
                // Mouse is at the split line.
                // Bottom height = Container Height - Mouse Y (relative to container top)
                // Wait, if Mouse Y is the top of the bottom section (split line).
                // Then Bottom Height = Container Height - Relative Y.

                let newHeight = containerHeight - relativeY;

                // Constraints
                // Top section height = relativeY. Must be >= minTopHeight
                // Bottom section height = newHeight. Must be >= minBottomHeight

                if (relativeY < minTopHeight) {
                    newHeight = containerHeight - minTopHeight;
                } else if (newHeight < minBottomHeight) {
                    newHeight = minBottomHeight;
                }

                setBottomHeight(newHeight);
            } else if (mode === 'ratio') {
                // Calculate ratio
                let ratio = relativeY / containerHeight;

                // Constraints using pixels for conversion
                const topPixelHeight = ratio * containerHeight;
                const bottomPixelHeight = (1 - ratio) * containerHeight;

                if (topPixelHeight < minTopHeight) {
                    ratio = minTopHeight / containerHeight;
                } else if (bottomPixelHeight < minBottomHeight) {
                    ratio = 1 - (minBottomHeight / containerHeight);
                }

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
    }, [isDragging, mode, bottomHeight, splitRatio, minTopHeight, minBottomHeight, onBottomHeightChange, onSplitRatioChange]);

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden relative">
            {/* Top Section */}
            <div
                style={{
                    height: mode === 'ratio' ? `${splitRatio * 100}%` : `calc(100% - ${bottomHeight}px)`,
                    // Flex grow if not fixed? No, height matches.
                }}
                className="flex flex-col min-h-0 relative"
            >
                {topContent}
            </div>

            {/* Splitter */}
            <div
                className="h-1 cursor-row-resize bg-[var(--border-default)] hover:bg-[var(--text-secondary)] transition-colors z-10 flex-shrink-0 relative"
                onMouseDown={handleMouseDown}
            >
                {/* Invisible hit area to make grabbing easier */}
                <div className="absolute top-[-3px] bottom-[-3px] left-0 right-0 z-20 cursor-row-resize" />
            </div>

            {/* Bottom Section */}
            <div
                style={{
                    height: mode === 'ratio' ? `${(1 - splitRatio) * 100}%` : `${bottomHeight}px`
                }}
                className="flex flex-col min-h-0 relative"
            >
                {bottomContent}
            </div>
        </div>
    );
}


