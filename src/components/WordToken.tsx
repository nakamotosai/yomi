'use client';

import React from 'react';
import clsx from 'clsx';
import { WordToken, PartOfSpeech, POS_COLORS } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { COLOR_THEMES } from '@/lib/colorThemes';
import PitchAccent from './PitchAccent';

interface WordTokenProps {
    token: WordToken;
    onSelect: (token: WordToken) => void;
    isSelected?: boolean;
    isSpeaking?: boolean;
}

export default function WordTokenComponent({ token, onSelect, isSelected, isSpeaking }: WordTokenProps) {
    // Get settings
    const { settings } = useAppStore();

    // Determine color scheme
    // If POS is NOT in activeColorPOS list, force it to 'default' (black/transparent)
    // Use optional chaining and default to empty array to handle initial state mismatch
    const isColorEnabled = (settings.activeColorPOS || []).includes(token.pos);

    // Resolve theme colors
    // Default to 'standard' if theme not found
    const currentTheme = COLOR_THEMES[settings.colorTheme || 'standard'] || COLOR_THEMES.standard;
    const themeColors = currentTheme.colors[token.pos] || currentTheme.colors[PartOfSpeech.OTHER];

    const colorScheme = isColorEnabled ? themeColors : {
        bg: 'bg-transparent',
        text: 'text-gray-800',
        border: 'border-b border-transparent'
    };

    // Logic: Show Furigana?
    const hasFurigana = token.reading && token.reading.length > 0;
    const shouldHideDueToCommon = settings.hideCommonFurigana && token.isCommon;
    const shouldShowFurigana = settings.showFurigana && hasFurigana && !shouldHideDueToCommon;

    // Logic: Hide Particle for cloze practice?
    const isParticle = token.pos === PartOfSpeech.PARTICLE;
    const isHiddenParticle = settings.hideParticles && isParticle;

    return (
        <div
            className={clsx(
                "relative inline-flex flex-col items-center mx-0.5 mb-2 group cursor-pointer select-none transition-all duration-200",
                isSelected && "scale-105 z-10"
            )}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(token);
            }}
        >
            {/* Pitch Accent Visualization */}
            {settings.showPitchAccent && token.pitch && token.pitch.length > 0 && !isHiddenParticle && (
                <PitchAccent pattern={token.pitch} />
            )}

            {/* Furigana (Ruby text) */}
            <div className={clsx(
                "h-4 text-[10px] text-gray-500 font-medium whitespace-nowrap transition-opacity",
                shouldShowFurigana ? "opacity-70" : "opacity-0 group-hover:opacity-50"
            )}>
                {token.reading || '\u00A0'}
            </div>

            {/* Main Surface Text */}
            <div
                className={clsx(
                    "px-1.5 py-0.5 rounded text-lg font-medium transition-all duration-200 border-b-2",
                    isHiddenParticle
                        ? "text-transparent border-gray-300 bg-gray-100 min-w-[1em] hover:text-gray-400"
                        : [colorScheme.bg, colorScheme.text, colorScheme.border],
                    isSelected
                        ? "ring-2 ring-offset-1 ring-blue-400 shadow-md"
                        : isSpeaking && settings.karaokeMode
                            ? "bg-amber-100 ring-2 ring-offset-1 ring-amber-400"
                            : "border-transparent hover:brightness-95 hover:shadow-sm"
                )}
            >
                {token.surface}
            </div>

            {/* Cloze Mode Hint */}
            {isHiddenParticle && (
                <div className="absolute top-full mt-0.5 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ?
                </div>
            )}
        </div>
    );
}
