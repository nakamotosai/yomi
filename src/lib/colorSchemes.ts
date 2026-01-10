/**
 * 统一配色方案定义
 * 
 * 所有配色方案的语义化 token 定义
 * 与 globals.css 中的 CSS 变量 (--scheme-*) 对应
 */

import { PartOfSpeech } from '@/types';

// 配色方案 ID 类型
export type ColorSchemeId = 'morandi' | 'wafu';

// 配色方案 Token 接口
export interface ColorSchemeTokens {
    // 主强调色 (图标/激活按钮)
    primary: string;
    primaryHover: string;
    primaryBg: string;

    // 次强调色 (动作按钮)
    accent: string;
    accentHover: string;
    accentBg: string;

    // 静默状态
    muted: string;
    mutedHover: string;
    mutedBg: string;

    // 输入框
    inputBg: string;
    inputBorder: string;
    inputBgPattern?: string; // 可选背景纹理

    // 语法颜色
    grammar: string;

    // POS 词性颜色 (用于高亮)
    pos: Record<PartOfSpeech, {
        text: string;
        bg: string;
        border: string;
    }>;
}

// 莫兰迪配色方案
const MORANDI_SCHEME: ColorSchemeTokens = {
    // 主强调色 - Sage Green
    primary: '#437E6F',
    primaryHover: '#356659',
    primaryBg: 'rgba(67, 126, 111, 0.15)',

    // 次强调色 - Sage Green (Same as primary for Morandi)
    accent: '#556B58',
    accentHover: '#455647',
    accentBg: 'rgba(85, 107, 88, 0.15)',

    // 静默状态 - Sage Muted
    muted: '#8F9E8B',
    mutedHover: '#7A8A76',
    mutedBg: 'rgba(143, 158, 139, 0.15)',

    // 输入框
    inputBg: 'white',
    inputBorder: '#e2e8f0',

    // 语法颜色 - Morandi Purple
    grammar: '#9B8AA5',

    // POS 词性颜色
    pos: {
        [PartOfSpeech.NOUN]: { text: '#498B74', bg: 'rgba(132, 166, 157, 0.15)', border: 'rgba(132, 166, 157, 0.20)' },
        [PartOfSpeech.PRONOUN]: { text: '#498B74', bg: 'rgba(132, 166, 157, 0.15)', border: 'rgba(132, 166, 157, 0.20)' },
        [PartOfSpeech.PROPER_NOUN]: { text: '#498B74', bg: 'rgba(132, 166, 157, 0.15)', border: 'rgba(132, 166, 157, 0.20)' },
        [PartOfSpeech.VERB]: { text: '#C8733A', bg: 'rgba(200, 115, 58, 0.12)', border: 'rgba(200, 115, 58, 0.18)' },
        [PartOfSpeech.ADJECTIVE]: { text: '#8B6914', bg: 'rgba(184, 149, 107, 0.15)', border: 'rgba(184, 149, 107, 0.20)' },
        [PartOfSpeech.PARTICLE]: { text: '#8B5A5A', bg: 'rgba(166, 124, 124, 0.15)', border: 'rgba(166, 124, 124, 0.20)' },
        [PartOfSpeech.AUXILIARY]: { text: '#C8733A', bg: 'rgba(200, 115, 58, 0.12)', border: 'rgba(200, 115, 58, 0.18)' },
        [PartOfSpeech.ADVERB]: { text: '#8B6914', bg: 'rgba(184, 149, 107, 0.15)', border: 'rgba(184, 149, 107, 0.20)' },
        [PartOfSpeech.CONJUNCTION]: { text: '#8B5A5A', bg: 'rgba(166, 124, 124, 0.15)', border: 'rgba(166, 124, 124, 0.20)' },
        [PartOfSpeech.INTERJECTION]: { text: '#C8733A', bg: 'rgba(200, 115, 58, 0.12)', border: 'rgba(200, 115, 58, 0.18)' },
        [PartOfSpeech.PREFIX]: { text: '#498B74', bg: 'rgba(132, 166, 157, 0.15)', border: 'rgba(132, 166, 157, 0.20)' },
        [PartOfSpeech.SUFFIX]: { text: '#498B74', bg: 'rgba(132, 166, 157, 0.15)', border: 'rgba(132, 166, 157, 0.20)' },
        [PartOfSpeech.SYMBOL]: { text: '#8A8A7A', bg: 'transparent', border: 'transparent' },
        [PartOfSpeech.OTHER]: { text: '#7A7060', bg: 'rgba(212, 201, 176, 0.15)', border: 'rgba(212, 201, 176, 0.20)' },
    }
};

// 和风配色方案
const WAFU_SCHEME: ColorSchemeTokens = {
    // 主强调色 - Koke (苔色)
    primary: '#556B2F',
    primaryHover: '#445624',
    primaryBg: 'rgba(85, 107, 47, 0.15)',

    // 次强调色 - Akane (茜色)
    accent: '#B7282E',
    accentHover: '#9A2226',
    accentBg: 'rgba(183, 40, 46, 0.12)',

    // 静默状态 - Kuchiba (朽叶)
    muted: '#8C7063',
    mutedHover: '#745C50',
    mutedBg: 'rgba(140, 112, 99, 0.15)',

    // 输入框 - Washi texture
    inputBg: '#F4F2EB',
    inputBorder: '#CCC5B9',
    inputBgPattern: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,

    // 语法颜色 - Fuji (藤色)
    grammar: '#89729E',

    // POS 词性颜色
    pos: {
        [PartOfSpeech.NOUN]: { text: '#2D6D8B', bg: 'rgba(51, 166, 184, 0.15)', border: 'rgba(51, 166, 184, 0.30)' },
        [PartOfSpeech.PRONOUN]: { text: '#58B2DC', bg: 'rgba(88, 178, 220, 0.15)', border: 'rgba(88, 178, 220, 0.30)' },
        [PartOfSpeech.PROPER_NOUN]: { text: '#6A4C9C', bg: 'rgba(106, 76, 156, 0.15)', border: 'rgba(106, 76, 156, 0.30)' },
        [PartOfSpeech.VERB]: { text: '#B7282E', bg: 'rgba(183, 40, 46, 0.12)', border: 'rgba(183, 40, 46, 0.25)' },
        [PartOfSpeech.ADJECTIVE]: { text: '#BF783A', bg: 'rgba(202, 120, 83, 0.15)', border: 'rgba(202, 120, 83, 0.30)' },
        [PartOfSpeech.PARTICLE]: { text: '#D05A6E', bg: 'rgba(244, 167, 185, 0.15)', border: 'rgba(244, 167, 185, 0.30)' },
        [PartOfSpeech.AUXILIARY]: { text: '#89729E', bg: 'rgba(137, 114, 158, 0.15)', border: 'rgba(137, 114, 158, 0.25)' },
        [PartOfSpeech.ADVERB]: { text: '#556B2F', bg: 'rgba(85, 107, 47, 0.15)', border: 'rgba(85, 107, 47, 0.25)' },
        [PartOfSpeech.CONJUNCTION]: { text: '#6A6E75', bg: 'rgba(145, 152, 159, 0.15)', border: 'rgba(145, 152, 159, 0.30)' },
        [PartOfSpeech.INTERJECTION]: { text: '#FFA400', bg: 'rgba(255, 164, 0, 0.15)', border: 'rgba(255, 164, 0, 0.30)' },
        [PartOfSpeech.PREFIX]: { text: '#7EBEA5', bg: 'rgba(126, 190, 165, 0.15)', border: 'rgba(126, 190, 165, 0.30)' },
        [PartOfSpeech.SUFFIX]: { text: '#A8BF93', bg: 'rgba(168, 191, 147, 0.15)', border: 'rgba(168, 191, 147, 0.30)' },
        [PartOfSpeech.SYMBOL]: { text: '#303133', bg: 'rgba(48, 49, 51, 0.08)', border: 'rgba(48, 49, 51, 0.15)' },
        [PartOfSpeech.OTHER]: { text: '#8C7063', bg: 'rgba(140, 112, 99, 0.10)', border: 'rgba(140, 112, 99, 0.20)' },
    }
};

// 配色方案集合
export const COLOR_SCHEMES: Record<ColorSchemeId, ColorSchemeTokens> = {
    morandi: MORANDI_SCHEME,
    wafu: WAFU_SCHEME,
};

// 获取当前配色方案
export function getColorScheme(id: ColorSchemeId): ColorSchemeTokens {
    return COLOR_SCHEMES[id] || COLOR_SCHEMES.morandi;
}

// 配色方案元数据 (用于设置面板展示)
export const COLOR_SCHEME_META: Record<ColorSchemeId, { label: string; desc: string; preview: string[] }> = {
    morandi: {
        label: '莫兰迪',
        desc: '现代高级灰',
        preview: ['#9B8AA5', '#437E6F'],
    },
    wafu: {
        label: '和风',
        desc: '传统日式色',
        preview: ['#c5e1a5', '#B7282E'],
    },
};
