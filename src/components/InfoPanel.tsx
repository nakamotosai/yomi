'use client';

import React, { useState } from 'react';
import { X, Volume2, Star, StarOff, BookOpen, ArrowRight } from 'lucide-react';
import { WordToken, PartOfSpeech, POS_COLORS } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { getDeinflectedForm } from '@/lib/nlp/analyzer';
import { ttsManager } from '@/lib/tts/manager';
import clsx from 'clsx';
import PitchAccent from './PitchAccent';

import { searchDictionary } from '@/lib/dictionary';
import { DictionaryEntry } from '@/types';

interface InfoPanelProps {
    token: WordToken | null;
    onClose: () => void;
}

export default function InfoPanel({ token, onClose }: InfoPanelProps) {
    const { currentSentence, settings } = useAppStore();
    const { addVocab, isWordSaved, removeVocab, vocabList } = useVocabStore();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
    const [dictLang, setDictLang] = useState<'en' | 'jp' | 'zh'>('jp');
    const [isLoadingDict, setIsLoadingDict] = useState(false);

    React.useEffect(() => {
        if (token) {
            setIsLoadingDict(true);
            const base = getDeinflectedForm(token);
            // Map lang to provider
            let provider: 'jisho' | 'weblio_jj' | 'weblio_cj' = 'weblio_jj';
            if (dictLang === 'en') provider = 'jisho';
            if (dictLang === 'zh') provider = 'weblio_cj';

            searchDictionary(base, provider).then(entry => {
                setDictEntry(entry);
            }).finally(() => {
                setIsLoadingDict(false);
            });
        } else {
            setDictEntry(null);
        }
    }, [token, dictLang]);

    if (!token) return null;

    const baseForm = getDeinflectedForm(token);
    const isInflected = baseForm !== token.surface;
    const isSaved = isWordSaved(token.surface, token.reading);
    const colorScheme = POS_COLORS[token.pos] || POS_COLORS[PartOfSpeech.OTHER];

    const handleSpeak = () => {
        setIsSpeaking(true);
        ttsManager.speak(
            token.surface,
            settings,
            {
                onStart: () => setIsSpeaking(true),
                onEnd: () => setIsSpeaking(false)
            }
        );
    };

    const handleSaveVocab = () => {
        if (isSaved) {
            const item = vocabList.find(v => v.word === token.surface && v.reading === token.reading);
            if (item) removeVocab(item.id);
        } else {
            const meaning = dictEntry
                ? dictEntry.meanings.map(m => m.glosses.join(', ')).join('; ')
                : '(意味が見つかりませんでした)';

            addVocab({
                word: token.surface,
                reading: token.reading || token.surface,
                baseForm,
                meaning,
                pos: token.pos,
                pitch: token.pitch,
                context: currentSentence,
            });
        }
    };

    return (
        <>
            {/* Backdrop for explicit click-outside dismissal */}
            <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={onClose}
            />

            <div
                className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-300 flex flex-col h-[40vh] md:h-[35vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Global Close Button (Top Right) */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors z-[60]"
                    title="閉じる"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="max-w-4xl mx-auto w-full flex flex-row h-full">

                    {/* Left Column: Word Info */}
                    <div className="p-5 md:w-1/3 flex flex-col gap-3 border-r border-gray-100 bg-gray-50/80 shrink-0">
                        {/* Header: POS */}
                        <div className="flex justify-between items-start">
                            <span className={clsx(
                                "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider shadow-sm",
                                colorScheme.bg, colorScheme.text
                            )}>
                                {token.pos}
                            </span>
                        </div>

                        {/* Word Display */}
                        <div className="flex flex-col flex-1 justify-center items-center -mt-2">
                            <div className="relative pt-3 w-fit">
                                {token.pitch && token.pitch.length > 0 && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-80 scale-90">
                                        <PitchAccent pattern={token.pitch} />
                                    </div>
                                )}
                                <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-none text-center">
                                    {token.surface}
                                </h2>
                            </div>
                            <div className="flex flex-col items-center mt-1">
                                <span className="text-base text-indigo-600 font-medium leading-tight">
                                    {token.reading || token.surface}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono tracking-wide uppercase mt-0.5">
                                    {token.romaji}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 justify-center mb-1">
                            <button
                                onClick={handleSpeak}
                                disabled={isSpeaking}
                                className={clsx(
                                    "flex items-center justify-center w-8 h-8 rounded-full transition-all shadow-sm border",
                                    isSpeaking
                                        ? "bg-indigo-100 text-indigo-600 border-indigo-200"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                                )}
                                title="発音"
                            >
                                <Volume2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleSaveVocab}
                                className={clsx(
                                    "flex items-center justify-center w-8 h-8 rounded-full transition-all shadow-sm border",
                                    isSaved
                                        ? "bg-amber-100 text-amber-600 border-amber-200"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600"
                                )}
                                title="保存"
                            >
                                {isSaved ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
                            </button>
                            <a
                                href={`https://jisho.org/search/${baseForm}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                                title="Jisho.org"
                            >
                                <BookOpen className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Definitions */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                        {/* Header: Tabs */}
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 pr-12">
                            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                                {[
                                    { id: 'en', label: 'EN' },
                                    { id: 'jp', label: 'JP' },
                                    { id: 'zh', label: 'ZH' }
                                ].map((lang) => (
                                    <button
                                        key={lang.id}
                                        onClick={() => setDictLang(lang.id as any)}
                                        className={clsx(
                                            "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                                            dictLang === lang.id
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-400 hover:text-gray-700"
                                        )}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                            {isInflected && (
                                <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                    <ArrowRight className="w-3 h-3" />
                                    <span className="font-bold">{baseForm}</span>
                                </div>
                            )}
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {isLoadingDict ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                                    <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                                </div>
                            ) : dictEntry ? (
                                <div className="space-y-4">
                                    {/* Meanings */}
                                    <div className="space-y-3">
                                        {dictEntry.meanings.map((sense, idx) => (
                                            <div key={idx} className="flex gap-3 group">
                                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-gray-700 leading-snug text-sm">
                                                        {sense.glosses.join('; ')}
                                                    </p>
                                                    {sense.pos.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                            {sense.pos.map((p, pi) => (
                                                                <span key={pi} className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-100">
                                                                    {p}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-24 text-gray-300">
                                    <p className="text-xs">
                                        {dictLang === 'en' ? 'No definitions found.' :
                                            dictLang === 'jp' ? '定義なし' :
                                                '无定义'}
                                    </p>
                                </div>
                            )}

                            {/* Pitch Footer */}
                            {token.accentMora !== undefined && (
                                <div className="mt-4 pt-4 border-t border-gray-50 text-[10px] text-gray-300 text-right">
                                    Accent: {token.accentMora === 0 ? 'Heiban' : `${token.accentMora}`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
