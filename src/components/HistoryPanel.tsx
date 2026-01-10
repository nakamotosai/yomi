'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { WordToken, PartOfSpeech } from '@/types';
import { COLOR_THEMES } from '@/lib/colorThemes';
import { ttsManager } from '@/lib/tts/manager';
import { Clock, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function HistoryPanel() {
    const history = useAppStore(state => state.history) || [];
    const setSelectedToken = useAppStore(state => state.setSelectedToken);
    const clearHistory = useAppStore(state => state.clearHistory); // Get action
    const settings = useAppStore(state => state.settings);
    const isSpeaking = useAppStore(state => state.isSpeaking);

    if (history.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full p-8"
                style={{
                    color: 'var(--text-faint)',
                    background: 'var(--bg-muted)'
                }}
            >
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">履歴はまだありません</p>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col h-full relative group/panel"
            style={{ background: 'var(--bg-elevated)' }}
        >
            {/* Floating Clear Button */}
            <button
                onClick={clearHistory}
                className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full transition-all bg-white/50 dark:bg-white/5 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 hover:text-rose-500 text-[var(--text-muted)] dark:text-slate-500 backdrop-blur-sm"
                title="履歴を削除"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {/* Spacer for Floating Button (Float Right) */}
                <div className="float-right w-8 h-8 mb-1 ml-1 pointer-events-none" />

                <div className="hidden">
                    {/* Hack to ensure Tailwind classes for all POS colors are generated */}
                    <span className="text-rose-600 bg-rose-50 border-rose-100"></span>
                    <span className="text-blue-600 bg-blue-50 border-blue-100"></span>
                    <span className="text-emerald-600 bg-emerald-50 border-emerald-100"></span>
                    <span className="text-amber-600 bg-amber-50 border-amber-100"></span>
                    <span className="text-purple-600 bg-purple-50 border-purple-100"></span>
                    <span className="text-slate-600 bg-slate-50 border-slate-100"></span>
                </div>

                {history.map((token: WordToken, index: number) => {
                    const activeTheme = COLOR_THEMES[settings.colorTheme || 'standard'];
                    const colorScheme = activeTheme.colors[token.pos as PartOfSpeech] || activeTheme.colors[PartOfSpeech.OTHER];

                    const isWafu = settings.colorScheme === 'wafu';
                    // Helper to map POS to safe CSS variable key
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

                    const posKey = getWafuPosKey(token.pos);
                    const isMonochrome = settings.colorScheme === 'monochrome';

                    const wafuStyle = (isWafu || isMonochrome) ? {
                        background: `var(--wafu-${posKey}-bg)`,
                        color: `var(--wafu-${posKey}-text)`,
                        border: `1px solid var(--wafu-${posKey}-border)`
                    } : {
                        border: '1px solid var(--border-default)',
                    };

                    return (
                        <button
                            key={`${token.id}-${index}`}
                            onClick={() => {
                                setSelectedToken(token);
                                if (settings.autoReadOnClick && !isSpeaking) {
                                    ttsManager.speak(token.surface, settings, {});
                                }
                            }}
                            className={clsx(
                                "inline-flex items-center px-3 py-1.5 mr-2 mb-2 rounded-lg transition-all text-base font-medium hover:scale-105 hover:brightness-95",
                                (!isWafu && !isMonochrome) && [colorScheme.bg, colorScheme.text]
                            )}
                            style={wafuStyle}
                            title={`${token.pos} - ${token.reading || token.surface}`}
                        >
                            {/* <span className="mr-1 opacity-50 text-[10px] uppercase">{token.pos.slice(0,1)}</span> */}
                            {token.surface}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

