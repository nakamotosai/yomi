import { PartOfSpeech } from '@/types';

export type ThemeId = 'standard' | 'pastel' | 'neon' | 'forest';

export interface ColorScheme {
    name: string;
    colors: Record<PartOfSpeech, { bg: string; text: string; border: string }>;
}

// Standard theme with high contrast colors
const STANDARD_THEME: ColorScheme = {
    name: '标准 (Standard)',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
        [PartOfSpeech.VERB]: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-300' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-300' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-300' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-300' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-300' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-300' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
        [PartOfSpeech.OTHER]: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    }
};

// Pastel theme with softer colors
const PASTEL_THEME: ColorScheme = {
    name: '马卡龙 (Pastel)',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-[#E3F2FD]', text: 'text-[#1565C0]', border: 'border-[#90CAF9]' },
        [PartOfSpeech.VERB]: { bg: 'bg-[#FCE4EC]', text: 'text-[#C2185B]', border: 'border-[#F48FB1]' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-[#FFF8E1]', text: 'text-[#F57F17]', border: 'border-[#FFE082]' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-[#EDE7F6]', text: 'text-[#7B1FA2]', border: 'border-[#B39DDB]' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-[#F3E5F5]', text: 'text-[#6A1B9A]', border: 'border-[#CE93D8]' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', border: 'border-[#A5D6A7]' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-[#F5F5F5]', text: 'text-[#616161]', border: 'border-[#E0E0E0]' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-[#FFF3E0]', text: 'text-[#EF6C00]', border: 'border-[#FFCC80]' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-[#E0F7FA]', text: 'text-[#00838F]', border: 'border-[#80DEEA]' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-[#E0F2F1]', text: 'text-[#00796B]', border: 'border-[#80CBC4]' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200' },
        [PartOfSpeech.OTHER]: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
    }
};

// Neon theme for dark mode or high contrast preference
const NEON_THEME: ColorScheme = {
    name: '赛博 (Neon)',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-slate-800', text: 'text-cyan-400', border: 'border-cyan-500' },
        [PartOfSpeech.VERB]: { bg: 'bg-slate-800', text: 'text-rose-400', border: 'border-rose-500' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-slate-800', text: 'text-yellow-400', border: 'border-yellow-500' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-slate-800', text: 'text-violet-400', border: 'border-violet-500' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-slate-800', text: 'text-fuchsia-400', border: 'border-fuchsia-500' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-slate-800', text: 'text-emerald-400', border: 'border-emerald-500' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-slate-800', text: 'text-gray-400', border: 'border-gray-600' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-slate-800', text: 'text-orange-400', border: 'border-orange-500' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-slate-800', text: 'text-sky-400', border: 'border-sky-500' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-slate-800', text: 'text-teal-400', border: 'border-teal-500' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-slate-800', text: 'text-gray-500', border: 'border-gray-600' },
        [PartOfSpeech.OTHER]: { bg: 'bg-slate-800', text: 'text-white', border: 'border-gray-600' },
    }
};

// Forest theme with natural colors
const FOREST_THEME: ColorScheme = {
    name: '森系 (Forest)',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-[#F1F8E9]', text: 'text-[#558B2F]', border: 'border-[#AED581]' },
        [PartOfSpeech.VERB]: { bg: 'bg-[#EFEBE9]', text: 'text-[#5D4037]', border: 'border-[#BCAAA4]' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-[#FFF8E1]', text: 'text-[#FF8F00]', border: 'border-[#FFD54F]' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-[#F9FBE7]', text: 'text-[#9E9D24]', border: 'border-[#DCE775]' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-[#E0F2F1]', text: 'text-[#00897B]', border: 'border-[#80CBC4]' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-[#E8F5E9]', text: 'text-[#43A047]', border: 'border-[#81C784]' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-[#FAFAFA]', text: 'text-[#757575]', border: 'border-[#E0E0E0]' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-[#FFF3E0]', text: 'text-[#EF6C00]', border: 'border-[#FFCC80]' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-[#E1F5FE]', text: 'text-[#0288D1]', border: 'border-[#81D4FA]' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-[#E0F7FA]', text: 'text-[#00ACC1]', border: 'border-[#80DEEA]' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
        [PartOfSpeech.OTHER]: { bg: 'bg-[#F5F5F5]', text: 'text-[#424242]', border: 'border-[#E0E0E0]' },
    }
};

export const COLOR_THEMES: Record<ThemeId, ColorScheme> = {
    standard: STANDARD_THEME,
    pastel: PASTEL_THEME,
    neon: NEON_THEME,
    forest: FOREST_THEME,
};
