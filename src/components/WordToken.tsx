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
    // Updated to accept optional sentenceText for context-aware callbacks
    onSelect: (token: WordToken, sentenceText?: string) => void;
    isSelected?: boolean;
    isSpeaking?: boolean;
    skyDropReveal?: boolean; // Prop to control visibility in Sky Drop mode
    sentenceText?: string;   // Optional context prop for memoization optimization
}

// Internal component (unmemoized)
function WordTokenBase({ token, onSelect, isSelected, isSpeaking, skyDropReveal = true, sentenceText }: WordTokenProps) {
    // Get settings and global speaking state
    // Alias global isSpeaking to avoid conflict with prop
    const { settings, isSpeaking: isGlobalSpeaking } = useAppStore();

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
    const isWafu = settings.colorScheme === 'wafu';
    const isMonochrome = settings.colorScheme === 'monochrome';

    // Helper to map POS to safe CSS variable key (aligned with HistoryPanel/InfoPanel)
    const getWafuPosKey = (pos: string) => {
        const lower = pos.toLowerCase();
        if (lower.includes('noun') || lower.includes('名詞') || lower.includes('名词')) return 'noun';
        if (lower.includes('pronoun') || lower.includes('代名詞') || lower.includes('代词')) return 'pronoun';
        if (lower.includes('proper') || lower.includes('固有名詞') || lower.includes('专名')) return 'proper_noun';
        if (lower.includes('verb') || lower.includes('動詞') || lower.includes('动词')) return 'verb';
        if (lower.includes('adjective') || lower.includes('形容詞') || lower.includes('形容词')) return 'adjective';
        if (lower.includes('particle') || lower.includes('助詞') || lower.includes('助词')) return 'particle';
        if (lower.includes('auxiliary') || lower.includes('助動詞') || lower.includes('助动词')) return 'auxiliary';
        if (lower.includes('adverb') || lower.includes('副詞') || lower.includes('副词')) return 'adverb';
        if (lower.includes('conjunction') || lower.includes('接続詞') || lower.includes('连词')) return 'conjunction';
        if (lower.includes('interjection') || lower.includes('感動詞') || lower.includes('感叹词')) return 'interjection';
        if (lower.includes('prefix') || lower.includes('接頭辞') || lower.includes('前缀')) return 'prefix';
        if (lower.includes('suffix') || lower.includes('接尾辞') || lower.includes('后缀')) return 'suffix';
        if (lower.includes('symbol') || lower.includes('記号') || lower.includes('符号')) return 'symbol';
        return 'other';
    };

    // Helper to get Wafu/Monochrome override styles
    const getOverrideStyle = () => {
        if ((!isWafu && !isMonochrome) || !isColorEnabled) return {};

        const key = getWafuPosKey(token.pos);

        // For monochrome, we can reuse the same wafu-prefixed variables because we defined them in the [data-color-scheme="monochrome"] block
        // to point to the grayscale vars. This keeps the JS clean.
        return {
            background: `var(--wafu-${key}-bg)`,
            color: `var(--wafu-${key}-text)`,
            // Optional: border if needed, though standard theme doesn't usually use border for box style
            border: `1px solid var(--wafu-${key}-border)`
        };
    };

    const overrideStyle = getOverrideStyle();

    // 背景色：如果启用则使用主题色，否则透明
    // If Wafu or Monochrome is active, standard bgClass is ignored in favor of style override
    const bgClass = (!isWafu && !isMonochrome && isColorEnabled) ? themeColors.bg : 'bg-transparent';

    // 文字颜色：始终使用主题颜色（即使背景透明）
    // If Wafu or Monochrome is active, standard textClass is ignored in favor of style override
    const textClass = (!isWafu && !isMonochrome && isColorEnabled) ? themeColors.text : ((isWafu || isMonochrome) && isColorEnabled ? '' : '');
    const textStyle = (!isWafu && !isMonochrome && isColorEnabled) ? {} : ((isWafu || isMonochrome) && isColorEnabled ? {} : { color: 'var(--text-muted)' });

    // Logic: Show Furigana?
    const isEnglish = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(token.surface);
    const hasFurigana = token.reading && token.reading.length > 0;
    const shouldHideDueToCommon = settings.hideCommonFurigana && token.isCommon;
    const shouldShowFurigana = settings.showFurigana && hasFurigana && !shouldHideDueToCommon && !isEnglish;

    // Logic: Hide Particle for cloze practice?
    const isParticle = token.pos === PartOfSpeech.PARTICLE;
    const isHiddenParticle = settings.hideParticles && isParticle;

    // Extract dynamic glow color from themeColors.text if possible (assuming it's a hex code)
    const extractHexColor = (str: string) => {
        const match = str.match(/#[0-9a-fA-F]{6}/);
        return match ? match[0] : null;
    };

    const dynamicGlowColor = (!isWafu && !isMonochrome && themeColors?.text)
        ? (extractHexColor(themeColors.text) || POS_GLOW_COLORS[token.pos])
        : (isMonochrome ? '#4b5563' : (isWafu ? `var(--wafu-${getWafuPosKey(token.pos)}-text)` : POS_GLOW_COLORS[token.pos]));

    return (
        <div
            className={clsx(
                "relative inline-flex flex-col items-center mx-0.5 mb-1 group cursor-pointer select-none transition-all duration-200",
                isSelected && "z-10" // Removed scale-105
            )}
            onClick={(e) => {
                e.stopPropagation();
                // Pass token AND sentenceText to the callback if available
                // This allows parent to handle logic without creating inline functions
                onSelect(token, sentenceText);

                // Auto-read on click if enabled AND NOT currently playing global audio
                if (settings.autoReadOnClick && !isGlobalSpeaking) {
                    ttsManager.speak(token.surface, settings, {});
                }
            }}
        >
            {/* Pitch Accent Visualization */}
            {settings.showPitchAccent && token.pitch && token.pitch.length > 0 && !isHiddenParticle && (
                <span style={{ color: 'var(--color-pitch)' }}>
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
                    "px-1.5 py-0.5 rounded font-medium transition-all duration-200 relative",
                    fontSizeClasses.main,
                    isHiddenParticle
                        ? "text-transparent bg-gray-100 min-w-[1em] hover:text-gray-400"
                        : (!isWafu && currentTheme.type === 'underline')
                            ? clsx(
                                "border-b-[3px] border-solid rounded-none px-0.5 mx-0.5 pb-0.5",
                                textClass,
                                themeColors.border || 'border-transparent',
                                "bg-transparent"
                            )
                            : clsx(bgClass, textClass), // Box style (Standard OR Wafu)
                    !isSelected && !isSpeaking && "hover:brightness-95",
                    // Karaoke animations based on style
                    isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'glow-scale' && "scale-110 z-10",
                    isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'float-up' && "karaoke-float-up z-10",
                    isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'bounce' && "karaoke-bounce z-10",
                    isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'underline' && "karaoke-underline z-10"
                )}
                style={{
                    ...overrideStyle, // Apply Wafu/Monochrome overrides
                    ...textStyle,
                    boxShadow: isSpeaking && settings.karaokeMode && (settings.karaokeStyle === 'glow-scale' || settings.karaokeStyle === 'glow-only')
                        ? `0 0 18px 8px color-mix(in srgb, ${dynamicGlowColor}, transparent 66%), 0 0 8px 4px color-mix(in srgb, ${dynamicGlowColor}, transparent 75%)`
                        : undefined,
                    // Gradient fill animation
                    ...(isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'border' ? {
                        // Use box-shadow to simulate border ensuring no layout shift (jitter)
                        boxShadow: `0 0 0 2px ${dynamicGlowColor}, 0 0 8px color-mix(in srgb, ${dynamicGlowColor}, transparent 75%)`,
                        borderRadius: '4px',
                        background: `color-mix(in srgb, ${dynamicGlowColor}, transparent 94%)`,
                        transition: 'all 0.2s ease',
                        transform: 'scale(1.02)',
                        willChange: 'transform, box-shadow' // Hardware acceleration
                    } : {})
                }}
            >
                <span style={{
                    display: 'inline-block',
                    // Use undefined to let class transition take precedence
                    transition: (settings.karaokeMode && settings.karaokeStyle === 'sky-drop')
                        ? undefined
                        : 'all 0.1s ease-out',
                    transform: isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'text-magnify' ? 'scale(1.25)' : 'none',
                    color: isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'text-magnify' ? dynamicGlowColor : 'inherit',
                    fontWeight: isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'text-magnify' ? '700' : 'inherit',
                    willChange: isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'text-magnify' ? 'transform' : 'auto',
                    // Sky Drop Animation
                    ...(isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'sky-drop' ? {
                        animation: 'skyDrop 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                        opacity: 0,
                        color: dynamicGlowColor,
                        fontWeight: 700
                    } : {})
                }}
                    className={clsx(
                        settings.karaokeMode && settings.karaokeStyle === 'sky-drop' && "sky-drop-base",
                        settings.karaokeMode && settings.karaokeStyle === 'sky-drop' && !skyDropReveal && "sky-drop-hidden",
                        settings.karaokeMode && settings.karaokeStyle === 'sky-drop' && skyDropReveal && "sky-drop-visible"
                    )}
                >
                    {token.surface}
                </span>

                {/* Selected Underline (Absolute layer, no layout shift) */}
                {isSelected && (
                    <span
                        className="absolute bottom-0 left-0 w-full h-[3px]"
                        style={{
                            backgroundColor: dynamicGlowColor,
                            // Match parent rounded corners at the bottom
                            borderBottomLeftRadius: '0.25rem',
                            borderBottomRightRadius: '0.25rem',
                        }}
                    />
                )}

                {/* Underline slide effect */}
                {isSpeaking && settings.karaokeMode && settings.karaokeStyle === 'underline' && (
                    <span
                        className="absolute bottom-0 left-0 h-[3px] rounded-full"
                        style={{
                            backgroundColor: dynamicGlowColor,
                            animation: 'karaoke-underline-slide 0.5s ease-out forwards'
                        }}
                    />
                )}
            </div>

            {/* Cloze Mode Hint */}
            {
                isHiddenParticle && (
                    <div className="absolute top-full mt-0.5 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        ?
                    </div>
                )
            }
        </div >
    );
}

// Memoized export
// Use custom comparison or default shallow comparison?
// Default shallow comparison should work if onSelect, token, and other primitives are stable.
export default React.memo(WordTokenBase);
