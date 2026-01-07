'use client';

import React from 'react';
import clsx from 'clsx';
import { WordToken, PartOfSpeech } from '@/types';
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

    // 判断是否为标点符号（包括括号等）
    const isPunctuation = token.pos === PartOfSpeech.SYMBOL ||
        /^[、。！？「」『』（）【】・…ー～〜：；,\.!\?""''()[\]{}:;]$/.test(token.surface);

    // 标点符号特殊渲染 - 无背景，无假名
    // 获取字体大小
    const fontSizeClasses = {
        'small': { main: 'text-base', furigana: 'text-[9px]', furiganaHeight: 'h-3' },
        'medium': { main: 'text-lg', furigana: 'text-[10px]', furiganaHeight: 'h-4' },
        'large': { main: 'text-xl', furigana: 'text-[12px]', furiganaHeight: 'h-5' }
    }[settings.fontSize] || { main: 'text-lg', furigana: 'text-[10px]', furiganaHeight: 'h-4' };

    if (isPunctuation) {
        return (
            <div
                className="relative inline-flex flex-col items-center mx-0 group select-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 标点符号上方不显示任何内容 */}
                <div className={fontSizeClasses.furiganaHeight}></div>

                {/* 标点符号本体 - 无背景，纯文字 */}
                <div className={clsx("px-0 py-0.5 font-medium text-gray-600 dark:text-gray-400", fontSizeClasses.main)}>
                    {token.surface}
                </div>
            </div>
        );
    }

    // Resolve theme colors - 始终使用主题颜色
    const currentTheme = COLOR_THEMES[settings.colorTheme || 'standard'] || COLOR_THEMES.standard;
    const themeColors = currentTheme.colors[token.pos] || currentTheme.colors[PartOfSpeech.OTHER];

    // 检查该词性是否启用了颜色高亮
    const isColorEnabled = (settings.activeColorPOS || []).includes(token.pos);

    // 背景色：如果启用则使用主题色，否则透明
    const bgClass = isColorEnabled ? themeColors.bg : 'bg-transparent';

    // 文字颜色：始终使用主题颜色（即使背景透明）
    const textClass = themeColors.text;

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
                "relative inline-flex flex-col items-center mx-0.5 mb-1 group cursor-pointer select-none transition-all duration-200",
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

            {/* Furigana (Ruby text) - 使用对应词性颜色 */}
            <div className={clsx(
                fontSizeClasses.furiganaHeight,
                fontSizeClasses.furigana,
                "font-medium whitespace-nowrap transition-opacity",
                textClass,
                shouldShowFurigana ? "opacity-60" : "opacity-0 group-hover:opacity-40"
            )}>
                {token.reading || '\u00A0'}
            </div>

            {/* Main Surface Text */}
            <div
                className={clsx(
                    "px-1.5 py-0.5 rounded font-medium transition-all duration-200",
                    fontSizeClasses.main,
                    isHiddenParticle
                        ? "text-transparent bg-gray-100 min-w-[1em] hover:text-gray-400"
                        : currentTheme.type === 'underline'
                            ? clsx(
                                "border-b-[3px] border-solid rounded-none px-0.5 mx-0.5 pb-0.5",
                                textClass,
                                themeColors.border || 'border-transparent',
                                "bg-transparent"
                            )
                            : clsx(bgClass, textClass),
                    isSelected
                        ? "ring-2 ring-offset-1 ring-blue-400"
                        : isSpeaking && settings.karaokeMode
                            ? "bg-amber-100 ring-2 ring-offset-1 ring-amber-400 dark:bg-amber-900/50 dark:ring-amber-500"
                            : "hover:brightness-95"
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
