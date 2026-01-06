import { PartOfSpeech } from '@/types';

export type ThemeId = 'standard' | 'pastel' | 'neon' | 'forest';

export interface ColorScheme {
    name: string;
    colors: Record<PartOfSpeech, { bg: string; text: string; border: string }>;
}

const STANDARD_THEME: ColorScheme = {
    name: '标准 (Standard)',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        [PartOfSpeech.VERB]: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
        [PartOfSpeech.OTHER]: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    }
};

const PASTEL_THEME: ColorScheme = {
    name: '马卡龙 (Pastel)',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-[#E0F7FA]', text: 'text-[#006064]', border: 'border-[#B2EBF2]' },
        [PartOfSpeech.VERB]: { bg: 'bg-[#FFEBEE]', text: 'text-[#B71C1C]', border: 'border-[#FFCDD2]' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-[#FFF8E1]', text: 'text-[#FF6F00]', border: 'border-[#FFECB3]' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-[#FCE4EC]', text: 'text-[#880E4F]', border: 'border-[#F8BBD0]' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-[#F3E5F5]', text: 'text-[#4A148C]', border: 'border-[#E1BEE7]' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-[#E8F5E9]', text: 'text-[#1B5E20]', border: 'border-[#C8E6C9]' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-[#F5F5F5]', text: 'text-[#616161]', border: 'border-[#E0E0E0]' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', border: 'border-[#FFE0B2]' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-[#E0F2F1]', text: 'text-[#004D40]', border: 'border-[#B2DFDB]' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-[#E0F2F1]', text: 'text-[#00695C]', border: 'border-[#B2DFDB]' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200' },
        [PartOfSpeech.OTHER]: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
    }
};

const NEON_THEME: ColorScheme = {
    name: '赛博 (Neon)',
    colors: {
        // High contrast for dark mode (though current app is light, these are vibrant)
        [PartOfSpeech.NOUN]: { bg: 'bg-slate-900', text: 'text-cyan-400', border: 'border-cyan-500' },
        [PartOfSpeech.VERB]: { bg: 'bg-slate-900', text: 'text-rose-400', border: 'border-rose-500' },
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-slate-900', text: 'text-yellow-400', border: 'border-yellow-500' },
        [PartOfSpeech.PARTICLE]: { bg: 'bg-slate-900', text: 'text-fuchsia-400', border: 'border-fuchsia-500' },
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-slate-900', text: 'text-violet-400', border: 'border-violet-500' },
        [PartOfSpeech.ADVERB]: { bg: 'bg-slate-900', text: 'text-emerald-400', border: 'border-emerald-500' },
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-slate-900', text: 'text-gray-400', border: 'border-gray-600' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-slate-900', text: 'text-orange-400', border: 'border-orange-500' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-slate-900', text: 'text-sky-400', border: 'border-sky-500' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-slate-900', text: 'text-teal-400', border: 'border-teal-500' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-slate-900', text: 'text-gray-500', border: 'border-gray-700' },
        [PartOfSpeech.OTHER]: { bg: 'bg-slate-900', text: 'text-white', border: 'border-gray-700' },
    }
};

const FOREST_THEME: ColorScheme = {
    name: '森系 (Forest)',
    colors: {
        [PartOfSpeech.NOUN]: { bg: 'bg-[#F1F8E9]', text: 'text-[#33691E]', border: 'border-[#DCEDC8]' }, // Light Green
        [PartOfSpeech.VERB]: { bg: 'bg-[#EFEBE9]', text: 'text-[#4E342E]', border: 'border-[#D7CCC8]' }, // Brown
        [PartOfSpeech.ADJECTIVE]: { bg: 'bg-[#FFFDE7]', text: 'text-[#F57F17]', border: 'border-[#FFF9C4]' }, // Yellow/Autumn
        [PartOfSpeech.PARTICLE]: { bg: 'bg-[#F9FBE7]', text: 'text-[#827717]', border: 'border-[#F0F4C3]' }, // Lime
        [PartOfSpeech.AUXILIARY]: { bg: 'bg-[#E0F2F1]', text: 'text-[#004D40]', border: 'border-[#B2DFDB]' }, // Teal
        [PartOfSpeech.ADVERB]: { bg: 'bg-[#E8F5E9]', text: 'text-[#1B5E20]', border: 'border-[#C8E6C9]' }, // Green
        [PartOfSpeech.CONJUNCTION]: { bg: 'bg-[#FAFAFA]', text: 'text-[#757575]', border: 'border-[#E0E0E0]' },
        [PartOfSpeech.INTERJECTION]: { bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', border: 'border-[#FFE0B2]' },
        [PartOfSpeech.PREFIX]: { bg: 'bg-[#E1F5FE]', text: 'text-[#01579B]', border: 'border-[#B3E5FC]' },
        [PartOfSpeech.SUFFIX]: { bg: 'bg-[#E0F7FA]', text: 'text-[#006064]', border: 'border-[#B2EBF2]' },
        [PartOfSpeech.SYMBOL]: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
        [PartOfSpeech.OTHER]: { bg: 'bg-[#F5F5F5]', text: 'text-[#212121]', border: 'border-[#E0E0E0]' },
    }
};

export const COLOR_THEMES: Record<ThemeId, ColorScheme> = {
    standard: STANDARD_THEME,
    pastel: PASTEL_THEME,
    neon: NEON_THEME,
    forest: FOREST_THEME,
};
