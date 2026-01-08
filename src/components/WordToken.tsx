'use client';

import React from 'react';
import clsx from 'clsx';
import { WordToken, PartOfSpeech } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { COLOR_THEMES, POS_GLOW_COLORS } from '@/lib/colorThemes';
import { ttsManager } from '@/lib/tts/manager';
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
        'small': { main: 'text-sm', furigana: 'text-[9px]', furiganaHeight: 'h-3' },
        'medium': { main: 'text-base', furigana: 'text-[10px]', furiganaHeight: 'h-4' },
        'large': { main: 'text-lg', furigana: 'text-[12px]', furiganaHeight: 'h-5' }
    }[settings.fontSize] || { main: 'text-base', furigana: 'text-[10px]', furiganaHeight: 'h-4' };

    if (isPunctuation) {
        return (
            <div
                className="relative inline-flex flex-col items-center mx-0 group select-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 标点符号上方不显示任何内容 */}
                <div className={fontSizeClasses.furiganaHeight}></div>

                {/* 标点符号本体 - 无背景，纯文字 */}
                <div className={clsx("px-0 py-0.5 font-medium text-[var(--text-muted)]", fontSizeClasses.main)}>
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
    const textClass = isColorEnabled ? themeColors.text : 'text-[var(--text-muted)]';

    // Logic: Show Furigana?
    const isEnglish = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(token.surface);
    const hasFurigana = token.reading && token.reading.length > 0;
    const shouldHideDueToCommon = settings.hideCommonFurigana && token.isCommon;
    const shouldShowFurigana = settings.showFurigana && hasFurigana && !shouldHideDueToCommon && !isEnglish;

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

                // Auto-read on click if enabled
                if (settings.autoReadOnClick) {
                    ttsManager.speak(token.surface, settings);
                }
            }}
        >
            {/* Pitch Accent Visualization */}
            {settings.showPitchAccent && token.pitch && token.pitch.length > 0 && !isHiddenParticle && (
                <span style={{ color: '#AA5555' }}>
                    <PitchAccent pattern={token.pitch} />
                </span>
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
                    !isSelected && !isSpeaking && "hover:brightness-95",
                    isSpeaking && settings.karaokeMode && "scale-110 z-10"
                )}
                style={{
                    boxShadow: isSelected
                        ? `0 0 12px 4px ${POS_GLOW_COLORS[token.pos]}66, 0 0 4px 2px ${POS_GLOW_COLORS[token.pos]}44`
                        : isSpeaking && settings.karaokeMode
                            ? `0 0 18px 8px ${POS_GLOW_COLORS[token.pos]}55, 0 0 8px 4px ${POS_GLOW_COLORS[token.pos]}40`
                            : undefined
                }}
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
