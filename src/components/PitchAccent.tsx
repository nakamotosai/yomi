'use client';

import React from 'react';
import { PitchPattern } from '@/types';

interface PitchAccentProps {
    pattern: PitchPattern;
    className?: string;
}

export default function PitchAccent({ pattern, className = '' }: PitchAccentProps) {
    if (!pattern || pattern.length === 0) return null;

    const width = pattern.length * 12; // 12px per mora
    const height = 16;
    const highY = 4;
    const lowY = 12;

    // Generate SVG path
    const points: string[] = [];
    pattern.forEach((level, i) => {
        const x = i * 12 + 6;
        const y = level === 1 ? highY : lowY;
        points.push(`${x},${y}`);
    });

    const pathD = `M ${points.join(' L ')}`;

    return (
        <svg
            width={width}
            height={height}
            className={`pointer-events-none overflow-visible ${className}`}
            viewBox={`0 0 ${width} ${height}`}
        >
            {/* Draw the pitch line */}
            <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Draw dots at each mora */}
            {pattern.map((level, i) => (
                <circle
                    key={i}
                    cx={i * 12 + 6}
                    cy={level === 1 ? highY : lowY}
                    r="2.5"
                    fill="currentColor"
                />
            ))}
        </svg>
    );
}
