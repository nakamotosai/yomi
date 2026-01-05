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

    React.useEffect(() => {
        if (token) {
            const base = getDeinflectedForm(token);
            searchDictionary(base, settings.dictionaryProvider).then(entry => {
                setDictEntry(entry);
            });
        } else {
            setDictEntry(null);
        }
    }, [token, settings.dictionaryProvider]);

    if (!token) return null;

    const baseForm = getDeinflectedForm(token);
    const isInflected = baseForm !== token.surface;
    const isSaved = isWordSaved(token.surface, token.reading);
    const colorScheme = POS_COLORS[token.pos] || POS_COLORS[PartOfSpeech.OTHER];

    const handleSpeak = () => {
        setIsSpeaking(true);
        ttsManager.speak(
            token.surface,
            settings, // Use global settings, but we might want to override speed?
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
            // Use dictionary meaning if available, otherwise fallback
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
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="max-w-4xl mx-auto p-4 md:p-6 pb-8">

                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <span className={clsx(
                            "px-2 py-1 text-xs font-bold rounded uppercase tracking-wider",
                            colorScheme.bg, colorScheme.text
                        )}>
                            {token.pos}
                        </span>
                        {token.posDetail && (
                            <span className="text-xs text-gray-400">{token.posDetail}</span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-6 items-start">
                    {/* Main Word Display */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-4 flex-wrap">
                            <div className="relative">
                                {/* Pitch accent on the word */}
                                {token.pitch && token.pitch.length > 0 && (
                                    <div className="absolute -top-5 left-0">
                                        <PitchAccent pattern={token.pitch} />
                                    </div>
                                )}
                                <h2 className="text-3xl font-bold text-gray-900">{token.surface}</h2>
                            </div>
                            <span className="text-xl text-gray-500">{token.reading || token.surface}</span>
                            <span className="text-sm text-gray-400 font-mono">{token.romaji}</span>
                        </div>

                        {/* De-inflection Info */}
                        {isInflected && (
                            <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>辞書形: <span className="font-bold">{baseForm}</span></span>
                                {token.conjugation && (
                                    <span className="text-amber-500 ml-2">({token.conjugation})</span>
                                )}
                            </div>
                        )}

                        {/* Dictionary Definition */}
                        <div className="mt-4 space-y-3">
                            {dictEntry ? (
                                <>
                                    <div className="flex gap-2">
                                        <span className="text-gray-400 font-medium text-sm border border-gray-200 px-1.5 rounded">{dictEntry.kana.join(', ')}</span>
                                    </div>
                                    {dictEntry.meanings.map((sense, idx) => (
                                        <div key={idx} className="flex gap-3 text-sm">
                                            <span className="font-bold text-gray-400 select-none shrink-0">{idx + 1}.</span>
                                            <div className="text-gray-700">
                                                <span className="text-xs text-gray-400 mr-2 bg-gray-100 px-1 rounded">{sense.pos.join(', ')}</span>
                                                <span>{sense.glosses.join('; ')}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-2 text-xs text-right">
                                        <a
                                            href={`https://jisho.org/search/${baseForm}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline flex items-center justify-end gap-1"
                                        >
                                            Jisho.org でもっと見る <BookOpen className="w-3 h-3" />
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-gray-500 text-sm mb-2">辞書に一致する項目が見つかりませんでした</p>
                                    <a
                                        href={`https://jisho.org/search/${baseForm}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline text-sm inline-flex items-center gap-1"
                                    >
                                        Jisho.org で検索 <ArrowRight className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Pitch Accent Label */}
                        {token.accentMora !== undefined && (
                            <div className="mt-3 text-xs text-gray-400">
                                アクセント: {token.accentMora === 0 ? '平板型' : `第${token.accentMora}拍`}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <button
                            onClick={handleSpeak}
                            disabled={isSpeaking}
                            className={clsx(
                                "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                                isSpeaking
                                    ? "bg-indigo-100 text-indigo-600 animate-pulse"
                                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            )}
                            title="発音を聞く"
                        >
                            <Volume2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSaveVocab}
                            className={clsx(
                                "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                                isSaved
                                    ? "bg-yellow-100 text-yellow-600"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            )}
                            title={isSaved ? "単語帳から削除" : "単語帳に保存"}
                        >
                            {isSaved ? <StarOff className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                        </button>
                        <button
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                            title="辞書で調べる"
                        >
                            <BookOpen className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
