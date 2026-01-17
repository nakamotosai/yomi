'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WordToken, PartOfSpeech } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { ttsManager } from '@/lib/tts/manager';
import { Star } from 'lucide-react';
import { COLOR_THEMES } from '@/lib/colorThemes';
import clsx from 'clsx';
import { Collapsible } from './Collapsible';
import { useI18n } from '@/lib/i18n';

interface VocabTipProps {
    tokens: WordToken[];
}

interface VocabEntry {
    token: WordToken;
    shortMeaning: string;
}

const SKIP_WORDS = new Set([
    'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'へ', 'より', 'も', 'の',
    'です', 'ます', 'だ', 'ない', 'ある', 'いる', 'する', 'なる',
    'て', 'た', 'ている', 'てある', 'ておく',
    '。', '、', '！', '？', '（', '）', '「', '」', '・',
    'この', 'その', 'あの', 'こと', 'もの', 'ところ',
    'という', 'といった', 'とか', 'など',
]);

function filterWorthyVocab(tokens: WordToken[]): WordToken[] {
    const seen = new Set<string>();
    const worthy: WordToken[] = [];

    for (const token of tokens) {
        if (SKIP_WORDS.has(token.surface) || SKIP_WORDS.has(token.baseForm)) continue;
        if (token.pos === PartOfSpeech.SYMBOL || token.pos === PartOfSpeech.PARTICLE) continue;
        if (token.surface.length < 2) continue;
        if (seen.has(token.surface)) continue;
        seen.add(token.surface);
        if (/^[ぁ-ん]+$/.test(token.surface) && token.surface.length <= 2) continue;

        // 跳过纯英文/ASCII词汇（如 iPhone, SNS 等）
        if (/^[a-zA-Z0-9\s]+$/.test(token.surface)) continue;

        // 跳过数字、日期、时间相关 (e.g., 11月, 14日, 2023年, 3回, 1つ)
        if (/^[\d０-９一二三四五六七八九十百千万億兆]+(月|日|年|回|度|つ|個|本|枚|冊|台|歳|人|時間|分|秒|円|万|億)?$/.test(token.surface)) continue;

        // 跳过纯数字
        if (/^[\d０-９]+$/.test(token.surface)) continue;

        // 跳过常见的非实词或过于基础的词 (可扩展)
        if (['今回', '前回', '今日', '明日', '昨日', '去年', '今年', '来年'].includes(token.surface)) continue;

        worthy.push(token);
    }

    // 优先级排序：动词/形容词 > 名词 > 其他
    worthy.sort((a, b) => {
        const priority = (pos: PartOfSpeech) => {
            if (pos === PartOfSpeech.VERB) return 0;
            if (pos === PartOfSpeech.ADJECTIVE) return 1;
            if (pos === PartOfSpeech.NOUN) return 2;
            return 3;
        };
        return priority(a.pos) - priority(b.pos);
    });

    // 根据句子长度动态调整生词数量
    const totalLength = tokens.reduce((sum, t) => sum + t.surface.length, 0);
    let limit = 6;
    if (totalLength < 15) limit = 2;
    else if (totalLength < 30) limit = 3;
    else if (totalLength < 50) limit = 4;

    return worthy.slice(0, limit);
}

export default function VocabTip({ tokens }: VocabTipProps) {
    const { setSelectedToken, setCurrentSentence, settings, isSpeaking } = useAppStore();
    const { t } = useI18n();

    // Dynamic Noun Color Logic:
    const isMorandi = settings.colorScheme === 'morandi' || !settings.colorScheme;
    const nounBarColor = isMorandi ? '#498B74' : 'var(--color-noun)';

    const worthyTokens = useMemo(() => filterWorthyVocab(tokens), [tokens]);

    // 只要有生词就显示
    if (worthyTokens.length === 0) return null;

    const handleWordClick = (token: WordToken, e: React.MouseEvent) => {
        e.stopPropagation();
        const sentenceOriginal = tokens.map(t => t.surface).join('');
        setCurrentSentence(sentenceOriginal);
        setSelectedToken(token);

        if (settings.autoReadOnClick && !isSpeaking) {
            ttsManager.speak(token.surface, settings, {});
        }
    };

    return (
        <div className="py-1">
            <div className="flex items-start gap-3 group">
                <div className="shrink-0 w-12 flex items-center mt-1 select-none">
                    <span className="w-[3px] h-3 rounded-sm mr-2 block" style={{ backgroundColor: nounBarColor }}></span>
                    <h3 className="text-base font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {t('info.vocab_tag')}
                    </h3>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 items-center">
                        {worthyTokens.map((token, idx) => {
                            const currentTheme = COLOR_THEMES[settings.colorTheme || 'standard'] || COLOR_THEMES.standard;
                            const themeColors = currentTheme.colors[token.pos] || currentTheme.colors[PartOfSpeech.OTHER];
                            const isColorEnabled = (settings.activeColorPOS || []).includes(token.pos);
                            const isWafu = settings.colorScheme === 'wafu';

                            const bgClass = isColorEnabled ? themeColors.bg : 'bg-[var(--bg-elevated)]';
                            const textClass = isColorEnabled ? themeColors.text : 'text-[var(--text-secondary)]';
                            const borderClass = isColorEnabled
                                ? (themeColors.border || 'border-transparent')
                                : 'border-[var(--border-muted)]';

                            const wafuStyle = (() => {
                                const isMonochrome = settings.colorScheme === 'monochrome';
                                if ((!isWafu && !isMonochrome) || !isColorEnabled) return {};
                                const posKeyMap: Record<string, string> = {
                                    [PartOfSpeech.NOUN]: 'noun', [PartOfSpeech.PRONOUN]: 'noun', [PartOfSpeech.PROPER_NOUN]: 'noun',
                                    [PartOfSpeech.VERB]: 'verb', [PartOfSpeech.ADJECTIVE]: 'adjective', [PartOfSpeech.PARTICLE]: 'particle',
                                    [PartOfSpeech.AUXILIARY]: 'auxiliary', [PartOfSpeech.ADVERB]: 'adverb',
                                    [PartOfSpeech.CONJUNCTION]: 'conjunction', [PartOfSpeech.INTERJECTION]: 'conjunction',
                                    [PartOfSpeech.PREFIX]: 'noun', [PartOfSpeech.SUFFIX]: 'noun',
                                };
                                const key = posKeyMap[token.pos] || 'other';
                                return {
                                    backgroundColor: `var(--wafu-${key}-bg)`,
                                    color: `var(--wafu-${key}-text)`,
                                    borderColor: `var(--wafu-${key}-border)`
                                };
                            })();

                            return (
                                <span
                                    key={idx}
                                    onClick={(e) => handleWordClick(token, e)}
                                    className={clsx(
                                        "inline-flex items-center px-1.5 py-0.5 rounded text-base font-medium transition-all duration-200 border cursor-pointer",
                                        "hover:scale-105 hover:brightness-110 hover:shadow-sm active:scale-95",
                                        (!isWafu && settings.colorScheme !== 'monochrome') && bgClass,
                                        (!isWafu && settings.colorScheme !== 'monochrome') && textClass,
                                        (!isWafu && settings.colorScheme !== 'monochrome') && borderClass
                                    )}
                                    style={isWafu || settings.colorScheme === 'monochrome' ? wafuStyle : undefined}
                                >
                                    {token.surface}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
