import { PartOfSpeech } from '@/types';

export type ThemeId = 'standard' | 'google_dark';

export interface ColorScheme {
    name: string;
    colors: Record<PartOfSpeech, { bg: string; text: string; border: string }>;
    type: 'box' | 'underline';
}

// Standard theme - 日系暖调配色（更淡的背景）
const STANDARD_THEME: ColorScheme = {
    name: '方块式',
    type: 'box',
    colors: {
        // 名词 - 青灰绿 (Muted Turquoise)
        [PartOfSpeech.NOUN]: {
            bg: 'bg-[#84A69D]/15 dark:bg-[#84A69D]/12',
            text: 'text-[#498B74] dark:text-[#84A69D]',
            border: 'border-[#84A69D]/20 dark:border-[#84A69D]/20'
        },
        // 动词 - 橘红 (Tangerine)
        [PartOfSpeech.VERB]: {
            bg: 'bg-[#C8733A]/12 dark:bg-[#C8733A]/12',
            text: 'text-[#C8733A] dark:text-[#D4956A]',
            border: 'border-[#C8733A]/18 dark:border-[#C8733A]/20'
        },
        // 形容词 - 暖棕 (Warm Brown)
        [PartOfSpeech.ADJECTIVE]: {
            bg: 'bg-[#B8956B]/15 dark:bg-[#B8956B]/12',
            text: 'text-[#8B6914] dark:text-[#C9A86C]',
            border: 'border-[#B8956B]/20 dark:border-[#B8956B]/20'
        },
        // 助词 - 藤紫 (Wisteria Purple) - 与名词绿色形成明显对比
        [PartOfSpeech.PARTICLE]: {
            bg: 'bg-[#9B8AA5]/15 dark:bg-[#9B8AA5]/12',
            text: 'text-[#7A6B85] dark:text-[#B8A8C5]',
            border: 'border-[#9B8AA5]/20 dark:border-[#9B8AA5]/20'
        },
        // 助动词 - 橘红
        [PartOfSpeech.AUXILIARY]: {
            bg: 'bg-[#C8733A]/12 dark:bg-[#C8733A]/12',
            text: 'text-[#C8733A] dark:text-[#D4956A]',
            border: 'border-[#C8733A]/18 dark:border-[#C8733A]/20'
        },
        // 副词 - 暖棕 (Warm Brown)
        [PartOfSpeech.ADVERB]: {
            bg: 'bg-[#B8956B]/15 dark:bg-[#B8956B]/12',
            text: 'text-[#8B6914] dark:text-[#C9A86C]',
            border: 'border-[#B8956B]/20 dark:border-[#B8956B]/20'
        },
        // 连词 - 藤紫 (与助词相同)
        [PartOfSpeech.CONJUNCTION]: {
            bg: 'bg-[#9B8AA5]/15 dark:bg-[#9B8AA5]/12',
            text: 'text-[#7A6B85] dark:text-[#B8A8C5]',
            border: 'border-[#9B8AA5]/20 dark:border-[#9B8AA5]/20'
        },
        // 感叹词 - 橘红
        [PartOfSpeech.INTERJECTION]: {
            bg: 'bg-[#C8733A]/12 dark:bg-[#C8733A]/12',
            text: 'text-[#C8733A] dark:text-[#D4956A]',
            border: 'border-[#C8733A]/18 dark:border-[#C8733A]/20'
        },
        // 前缀 - 青灰绿
        [PartOfSpeech.PREFIX]: {
            bg: 'bg-[#84A69D]/15 dark:bg-[#84A69D]/12',
            text: 'text-[#498B74] dark:text-[#84A69D]',
            border: 'border-[#84A69D]/20 dark:border-[#84A69D]/20'
        },
        // 后缀 - 青灰绿
        [PartOfSpeech.SUFFIX]: {
            bg: 'bg-[#84A69D]/15 dark:bg-[#84A69D]/12',
            text: 'text-[#498B74] dark:text-[#84A69D]',
            border: 'border-[#84A69D]/20 dark:border-[#84A69D]/20'
        },
        // 符号 - 透明
        [PartOfSpeech.SYMBOL]: {
            bg: 'bg-transparent',
            text: 'text-[#8A8A7A] dark:text-[#9A9A8A]',
            border: 'border-transparent'
        },
        // 其他 - 奶油灰
        [PartOfSpeech.OTHER]: {
            bg: 'bg-[#D4C9B0]/15 dark:bg-[#8A8070]/12',
            text: 'text-[#7A7060] dark:text-[#C4B9A0]',
            border: 'border-[#D4C9B0]/20 dark:border-[#8A8070]/20'
        },
    }
};

// Google Dark theme (Underline style) - 日系配色版
const GOOGLE_DARK_THEME: ColorScheme = {
    name: '下划线式',
    type: 'underline',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.VERB]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#C8733A]' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#3D5A6A]' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#C8733A]' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#3D5A6A]' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#C8733A]' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-transparent', text: 'text-gray-500 dark:text-gray-400', border: 'border-transparent' },
        [PartOfSpeech.OTHER]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#8A8070]' },
    }
};

export const COLOR_THEMES: Record<ThemeId, ColorScheme> = {
    standard: STANDARD_THEME,
    google_dark: GOOGLE_DARK_THEME,
};

// Glow colors for selection highlight (extracted from theme colors)
export const POS_GLOW_COLORS: Record<PartOfSpeech, string> = {
    [PartOfSpeech.NOUN]: '#498B74',          // 青灰绿
    [PartOfSpeech.VERB]: '#C8733A',          // 橘红
    [PartOfSpeech.ADJECTIVE]: '#B8956B',     // 暖棕
    [PartOfSpeech.PARTICLE]: '#9B8AA5',      // 藤紫
    [PartOfSpeech.AUXILIARY]: '#C8733A',     // 橘红
    [PartOfSpeech.ADVERB]: '#B8956B',        // 暖棕
    [PartOfSpeech.CONJUNCTION]: '#9B8AA5',   // 藤紫
    [PartOfSpeech.INTERJECTION]: '#C8733A',  // 橘红
    [PartOfSpeech.PREFIX]: '#498B74',        // 青灰绿
    [PartOfSpeech.SUFFIX]: '#498B74',        // 青灰绿
    [PartOfSpeech.SYMBOL]: '#8A8A7A',        // 灰色
    [PartOfSpeech.OTHER]: '#7A7060',         // 奶油灰
};
