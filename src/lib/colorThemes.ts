import { PartOfSpeech } from '@/types';

export type ThemeId = 'standard' | 'google_dark';

export interface ColorScheme {
    name: string;
    colors: Record<PartOfSpeech, { bg: string; text: string; border: string }>;
    type: 'box' | 'underline';
}

// Standard theme - 日系暖调配色（更淡的背景）
// Standard theme - 日系暖调配色（更淡的背景）
// Standard theme - 日系暖调配色（更淡的背景）
// Standard theme - 日系暖调配色（更淡的背景）
const STANDARD_THEME: ColorScheme = {
    name: '方块式',
    type: 'box',
    colors: {
        // --- Group 1: 名词组 (Noun Group) - Green Series ---
        // Includes: Noun, Pronoun, Proper Noun, Prefix, Suffix
        [PartOfSpeech.NOUN]: {
            bg: 'bg-[#498B74]/15 dark:bg-[#498B74]/12',
            text: 'text-[#498B74] dark:text-[#72C4A5]',
            border: 'border-[#498B74]/20 dark:border-[#498B74]/20'
        },
        [PartOfSpeech.PRONOUN]: {
            bg: 'bg-[#498B74]/15 dark:bg-[#498B74]/12',
            text: 'text-[#498B74] dark:text-[#72C4A5]',
            border: 'border-[#498B74]/20 dark:border-[#498B74]/20'
        },
        [PartOfSpeech.PROPER_NOUN]: {
            bg: 'bg-[#498B74]/15 dark:bg-[#498B74]/12',
            text: 'text-[#498B74] dark:text-[#72C4A5]',
            border: 'border-[#498B74]/20 dark:border-[#498B74]/20'
        },
        [PartOfSpeech.PREFIX]: {
            bg: 'bg-[#498B74]/15 dark:bg-[#498B74]/12',
            text: 'text-[#498B74] dark:text-[#72C4A5]',
            border: 'border-[#498B74]/20 dark:border-[#498B74]/20'
        },
        [PartOfSpeech.SUFFIX]: {
            bg: 'bg-[#498B74]/15 dark:bg-[#498B74]/12',
            text: 'text-[#498B74] dark:text-[#72C4A5]',
            border: 'border-[#498B74]/20 dark:border-[#498B74]/20'
        },

        // --- Group 2: 动词组 (Verb Group) - Orange Series ---
        // Includes: Verb, Auxiliary
        [PartOfSpeech.VERB]: {
            bg: 'bg-[#C8733A]/15 dark:bg-[#C8733A]/12',
            text: 'text-[#C8733A] dark:text-[#FFB570]',
            border: 'border-[#C8733A]/20 dark:border-[#C8733A]/20'
        },
        [PartOfSpeech.AUXILIARY]: {
            bg: 'bg-[#C8733A]/15 dark:bg-[#C8733A]/12',
            text: 'text-[#C8733A] dark:text-[#FFB570]',
            border: 'border-[#C8733A]/20 dark:border-[#C8733A]/20'
        },

        // --- Group 3: 修饰组 (Adj/Adv Group) - Red Series ---
        // Includes: Adjective, Adverb
        [PartOfSpeech.ADJECTIVE]: {
            bg: 'bg-[#B7282E]/12 dark:bg-[#B7282E]/12',
            text: 'text-[#B7282E] dark:text-[#E05A60]',
            border: 'border-[#B7282E]/18 dark:border-[#B7282E]/20'
        },
        [PartOfSpeech.ADVERB]: {
            bg: 'bg-[#B7282E]/12 dark:bg-[#B7282E]/12',
            text: 'text-[#B7282E] dark:text-[#E05A60]',
            border: 'border-[#B7282E]/18 dark:border-[#B7282E]/20'
        },

        // --- Group 4: 虚词组 (Particle/Conj Group) - Purple Series ---
        // Includes: Particle, Conjunction, Interjection
        [PartOfSpeech.PARTICLE]: {
            bg: 'bg-[#89729E]/15 dark:bg-[#89729E]/12',
            text: 'text-[#89729E] dark:text-[#B7A6C6]',
            border: 'border-[#89729E]/20 dark:border-[#89729E]/20'
        },
        [PartOfSpeech.CONJUNCTION]: {
            bg: 'bg-[#89729E]/15 dark:bg-[#89729E]/12',
            text: 'text-[#89729E] dark:text-[#B7A6C6]',
            border: 'border-[#89729E]/20 dark:border-[#89729E]/20'
        },
        [PartOfSpeech.INTERJECTION]: {
            bg: 'bg-[#89729E]/15 dark:bg-[#89729E]/12',
            text: 'text-[#89729E] dark:text-[#B7A6C6]',
            border: 'border-[#89729E]/20 dark:border-[#89729E]/20'
        },

        // --- Group 5: 其他组 (Other Group) - Blue Series ---
        // Includes: Symbol, Other
        [PartOfSpeech.SYMBOL]: {
            bg: 'bg-transparent',
            text: 'text-[#2D6D8B] dark:text-[#58B2DC]',
            border: 'border-transparent' // Symbols usually don't need border
        },
        [PartOfSpeech.OTHER]: {
            bg: 'bg-[#2D6D8B]/12 dark:bg-[#2D6D8B]/15',
            text: 'text-[#2D6D8B] dark:text-[#58B2DC]',
            border: 'border-[#2D6D8B]/20 dark:border-[#2D6D8B]/20'
        },
    }
};

// Google Dark theme (Underline style) - 日系配色版
const GOOGLE_DARK_THEME: ColorScheme = {
    name: '下划线式',
    type: 'underline',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.PRONOUN]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.PROPER_NOUN]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.VERB]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#C8733A]' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#A67C7C]' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#C8733A]' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#498B74]' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200', border: 'border-[#A67C7C]' },
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
// Updated to match New Morandi (Green, Orange, Red, Purple, Blue)
export const POS_GLOW_COLORS: Record<PartOfSpeech, string> = {
    // Group 1: Noun (Green)
    [PartOfSpeech.NOUN]: '#498B74',
    [PartOfSpeech.PRONOUN]: '#498B74',
    [PartOfSpeech.PROPER_NOUN]: '#498B74',
    [PartOfSpeech.PREFIX]: '#498B74',
    [PartOfSpeech.SUFFIX]: '#498B74',

    // Group 2: Verb (Orange)
    [PartOfSpeech.VERB]: '#C8733A',
    [PartOfSpeech.AUXILIARY]: '#C8733A',

    // Group 3: Adj/Adv (Red)
    [PartOfSpeech.ADJECTIVE]: '#B7282E',
    [PartOfSpeech.ADVERB]: '#B7282E',

    // Group 4: Particle/Conj (Purple)
    [PartOfSpeech.PARTICLE]: '#89729E',
    [PartOfSpeech.CONJUNCTION]: '#89729E',
    [PartOfSpeech.INTERJECTION]: '#89729E',

    // Group 5: Other (Blue)
    [PartOfSpeech.SYMBOL]: '#2D6D8B',
    [PartOfSpeech.OTHER]: '#2D6D8B',
};
