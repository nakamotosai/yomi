'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Volume2, Star, BookOpen, ArrowRight } from 'lucide-react';
import { WordToken, PartOfSpeech, POS_COLORS, DictionaryEntry } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { getDeinflectedForm } from '@/lib/nlp/analyzer';
import { ttsManager } from '@/lib/tts/manager';
import clsx from 'clsx';
import PitchAccent from './PitchAccent';

interface InfoPanelProps {
    token: WordToken | null;
    onClose: () => void;
}

interface JishoJapanese {
    reading?: string;
    word?: string;
}

interface JishoSense {
    parts_of_speech: string[];
    english_definitions: string[];
}

interface JishoResult {
    slug: string;
    japanese: JishoJapanese[];
    senses: JishoSense[];
}

// Yomitan 词典结果类型
interface YomitanResult {
    term: string;
    reading: string;
    partOfSpeech: string;
    definitions: string[];
    source: string;
}

interface YomitanResponse {
    success: boolean;
    keyword: string;
    results: YomitanResult[];
    source: string;
}

// 翻译词性标签到对应语言
const translatePOS = (pos: string[], lang: 'en' | 'jp' | 'zh'): string[] => {
    if (lang === 'en') return pos;

    const posMap: Record<string, { jp: string; zh: string }> = {
        'Noun': { jp: '名詞', zh: '名词' },
        'Verb': { jp: '動詞', zh: '动词' },
        'Adjective': { jp: '形容詞', zh: '形容词' },
        'Adverb': { jp: '副詞', zh: '副词' },
        'Particle': { jp: '助詞', zh: '助词' },
        'Suru verb': { jp: 'する動詞', zh: 'する动词' },
        'I-adjective': { jp: 'い形容詞', zh: 'い形容词' },
        'Na-adjective': { jp: 'な形容詞', zh: 'な形容词' },
        'Intransitive verb': { jp: '自動詞', zh: '自动词' },
        'Transitive verb': { jp: '他動詞', zh: '他动词' },
        'Expression': { jp: '表現', zh: '表达' },
        'Wikipedia definition': { jp: 'Wikipedia定義', zh: 'Wikipedia定义' },
    };

    return pos.map(p => {
        for (const [key, value] of Object.entries(posMap)) {
            if (p.toLowerCase().includes(key.toLowerCase())) {
                return lang === 'jp' ? value.jp : value.zh;
            }
        }
        return p;
    });
};

export default function InfoPanel({ token, onClose }: InfoPanelProps) {
    const { currentSentence, settings } = useAppStore();
    const { addVocab, isWordSaved, removeVocab, vocabList } = useVocabStore();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingLineIndex, setSpeakingLineIndex] = useState<number | null>(null);
    const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
    const [yomitanEntry, setYomitanEntry] = useState<YomitanResult | null>(null);
    const [dictLang, setDictLang] = useState<'en' | 'jp' | 'zh'>('zh'); // 默认中文
    const [isLoadingDict, setIsLoadingDict] = useState(false);

    // 获取 Jisho 词典数据 (EN/JP)
    const fetchJishoDictionary = useCallback(async (word: string) => {
        try {
            const res = await fetch(`/api/proxy/dictionary?keyword=${encodeURIComponent(word)}`);
            const data = await res.json();

            if (data?.data && data.data.length > 0) {
                const firstMatch = data.data[0] as JishoResult;

                const kanjiList: string[] = [];
                const kanaList: string[] = [];

                firstMatch.japanese.forEach((j: JishoJapanese) => {
                    if (j.word) kanjiList.push(j.word);
                    if (j.reading) kanaList.push(j.reading);
                });

                const entry: DictionaryEntry = {
                    id: firstMatch.slug || word,
                    kanji: kanjiList.length > 0 ? kanjiList : [word],
                    kana: kanaList,
                    meanings: firstMatch.senses.map((sense: JishoSense) => ({
                        pos: sense.parts_of_speech,
                        glosses: sense.english_definitions
                    }))
                };

                return entry;
            }
            return null;
        } catch (error) {
            console.error('Jisho fetch error:', error);
            return null;
        }
    }, []);

    // 获取 Yomitan 词典数据 (ZH)
    const fetchYomitanDictionary = useCallback(async (word: string) => {
        try {
            const res = await fetch(`/api/dictionary/yomitan?keyword=${encodeURIComponent(word)}`);
            const data: YomitanResponse = await res.json();

            if (data.success && data.results.length > 0) {
                return data.results[0];
            }
            return null;
        } catch (error) {
            console.error('Yomitan fetch error:', error);
            return null;
        }
    }, []);

    // 加载词典数据
    useEffect(() => {
        let isMounted = true;

        if (!token) {
            setDictEntry(null);
            setYomitanEntry(null);
            return;
        }

        setIsLoadingDict(true);
        const base = getDeinflectedForm(token);

        // 根据语言选择不同的词典
        if (dictLang === 'zh') {
            // 中文模式：使用 Yomitan (明鏡日汉双解辞典)
            fetchYomitanDictionary(base).then(entry => {
                if (isMounted) {
                    setYomitanEntry(entry);
                    setDictEntry(null);
                    setIsLoadingDict(false);
                }
            });
        } else {
            // EN/JP 模式：使用 Jisho
            fetchJishoDictionary(base).then(entry => {
                if (isMounted) {
                    setDictEntry(entry);
                    setYomitanEntry(null);
                    setIsLoadingDict(false);
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [token, dictLang, fetchJishoDictionary, fetchYomitanDictionary]);

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
            let meaning = '(意味が見つかりませんでした)';
            if (yomitanEntry) {
                meaning = yomitanEntry.definitions.join('\n');
            } else if (dictEntry) {
                meaning = dictEntry.meanings.map(m => m.glosses.join(', ')).join('; ');
            }

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

    // 线性解析所有定义并渲染（Yomitan 中文模式）
    const renderYomitanDefinitions = () => {
        if (!yomitanEntry) {
            return (
                <div className="flex flex-col items-center justify-center h-24 text-gray-300">
                    <p className="text-xs">未找到释义</p>
                </div>
            );
        }

        // 1. 打散所有定义为单行
        const allLines: string[] = [];
        yomitanEntry.definitions.forEach(def => {
            def.split('\n').filter(line => line.trim()).forEach(line => allLines.push(line));
        });

        // 2. 解析每行并统计类型
        type ParsedLine = {
            type: 'definition' | 'example' | 'reference' | 'supplement' | 'etymology' | 'skip';
            content: string;
            primary: string;
            translation: string | null;
        };

        const parsedLines: ParsedLine[] = allLines.map(line => {
            // 过滤词头行
            if (line.includes('【') && line.includes('】')) {
                return { type: 'skip', content: '', primary: '', translation: null };
            }

            let type: ParsedLine['type'] = 'definition';
            let content = line.trim();

            // 识别引用/参考
            if (/^[⇨→]|^\(反\)|^\(同\)|^\(参\)/.test(content)) {
                type = 'reference';
                content = content.replace(/^[⇨→]\s*/, '').trim();
            }
            // 识别例句
            else if (content.startsWith('▲') || content.startsWith('・') || content.startsWith('「')) {
                type = 'example';
                content = content.replace(/^[▲・]\s*/, '').trim();
            }
            // 识别词源
            else if (content.startsWith('ᐅ') || content.startsWith('▷')) {
                type = 'etymology';
                content = content.replace(/^[ᐅ▷]\s*/, '').trim();
            }
            // 识别补充说明
            else if (content.startsWith('〔') || content.includes('〔')) {
                type = 'supplement';
            }
            // 默认定义
            else {
                type = 'definition';
                content = content.replace(/^[◯①-⑩]|^\d+[.、]\s*/, '').trim();
            }

            // 分离中日文
            let hasTranslationSplit = content.includes('。/');
            let parts = hasTranslationSplit ? content.split('。/') : [content];

            // For examples, also check for 「...」 pattern followed by Chinese
            if (type === 'example' && !hasTranslationSplit && content.includes('」')) {
                // Find the last 」 and split there
                const lastBracketIndex = content.lastIndexOf('」');
                if (lastBracketIndex > 0 && lastBracketIndex < content.length - 1) {
                    const japanesePart = content.substring(0, lastBracketIndex + 1).trim();
                    const chinesePart = content.substring(lastBracketIndex + 1).trim();
                    if (chinesePart.length > 0) {
                        hasTranslationSplit = true;
                        parts = [japanesePart, chinesePart];
                    }
                }
            }

            const primary = parts[0];
            const translation = parts.length > 1 ? parts.slice(1).join('。/') : null;
            const finalPrimary = (hasTranslationSplit && content.includes('。/')) ? `${primary}。` : primary;

            return { type, content, primary: finalPrimary, translation };
        });

        // 3. 统计定义数量
        const definitionCount = parsedLines.filter(p => p.type === 'definition').length;
        let defIndex = 0;

        // 颜色常量（与 PitchAccent 一致）
        const ACCENT_COLOR = '#f43f5e';

        // 渲染例句文本（内联高亮）
        const renderExampleWithHighlight = (text: string) => {
            const parts = text.split(/[～〜]/);
            if (parts.length === 1) return text;
            return parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && (
                        <span style={{ color: ACCENT_COLOR, fontWeight: 'bold', margin: '0 2px' }}>{baseForm}</span>
                    )}
                </React.Fragment>
            ));
        };

        // TTS helper for individual lines (only Japanese)
        const speakLine = (text: string, lineIndex: number) => {
            // Extract only Japanese text (remove Chinese characters)
            // Japanese text is in item.primary which contains the original Japanese
            setSpeakingLineIndex(lineIndex);
            ttsManager.speak(
                text.replace(/[～〜]/g, baseForm), // Replace placeholder with actual word
                settings,
                {
                    onStart: () => setSpeakingLineIndex(lineIndex),
                    onEnd: () => setSpeakingLineIndex(null)
                }
            );
        };

        // Play button component
        const PlayButton = ({ text, lineIndex }: { text: string; lineIndex: number }) => (
            <button
                onClick={() => speakLine(text, lineIndex)}
                style={{
                    flexShrink: 0,
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: speakingLineIndex === lineIndex ? '#e0e7ff' : 'transparent',
                    color: speakingLineIndex === lineIndex ? '#4f46e5' : '#9ca3af',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginLeft: '4px'
                }}
                title="朗读日文"
            >
                <Volume2 style={{ width: '14px', height: '14px' }} />
            </button>
        );

        return (
            <div className="space-y-3">
                {parsedLines.map((item, i) => {
                    if (item.type === 'skip') return null;

                    if (item.type === 'definition') {
                        defIndex++;
                        return (
                            <div key={i} className="flex gap-3 mb-3">
                                {/* 编号（多释义时显示）*/}
                                {definitionCount > 1 && (
                                    <span className="shrink-0 font-bold text-sm mt-[2px] font-mono select-none" style={{ color: '#9ca3af' }}>
                                        {defIndex}.
                                    </span>
                                )}
                                <div className="flex-1">
                                    {/* 中文翻译（在上，大/粗）*/}
                                    {item.translation ? (
                                        <>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', lineHeight: 1.4 }}>
                                                {item.translation}
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 'normal', color: '#6b7280', marginTop: '4px', opacity: 0.85, display: 'flex', alignItems: 'center' }}>
                                                <span>{item.primary}</span>
                                                <PlayButton text={item.primary} lineIndex={i} />
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', lineHeight: 1.4, display: 'flex', alignItems: 'center' }}>
                                            <span>{item.primary}</span>
                                            <PlayButton text={item.primary} lineIndex={i} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (item.type === 'example') {
                        return (
                            <div key={i} style={{ marginLeft: definitionCount > 1 ? '24px' : '0', marginTop: '8px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                {/* Yellow example badge */}
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: '#d97706',
                                    backgroundColor: '#fffbeb',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #fde68a',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}>
                                    例
                                </span>
                                <div style={{ flex: 1 }}>
                                    {/* Japanese example with play button */}
                                    <div style={{ fontSize: '14px', fontWeight: 400, color: '#374151', lineHeight: 1.6, display: 'flex', alignItems: 'center' }}>
                                        <span>{renderExampleWithHighlight(item.primary)}</span>
                                        <PlayButton text={item.primary} lineIndex={i} />
                                    </div>
                                    {/* Chinese translation on new line */}
                                    {item.translation && (
                                        <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 400, marginTop: '2px' }}>
                                            {item.translation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (item.type === 'reference') {
                        return (
                            <div key={i} style={{ fontSize: '13px', fontWeight: 400, color: '#6b7280', marginTop: '8px' }}>
                                ⇨ {item.primary}
                                {item.translation && <span style={{ marginLeft: '4px', color: '#9ca3af' }}>({item.translation})</span>}
                            </div>
                        );
                    }

                    if (item.type === 'etymology') {
                        return (
                            <div key={i} style={{ fontSize: '13px', fontWeight: 400, color: '#9ca3af', marginTop: '8px', lineHeight: 1.5 }}>
                                ᐅ {item.content}
                            </div>
                        );
                    }

                    if (item.type === 'supplement') {
                        return (
                            <div key={i} className="mt-1"
                                style={{ fontSize: '13px', fontWeight: 'normal', color: '#9ca3af', lineHeight: 1.5 }}>
                                {item.content}
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        );
    };

    // 渲染 Jisho 定义（EN/JP 模式）
    const renderJishoDefinitions = () => {
        if (!dictEntry) {
            return (
                <div className="flex flex-col items-center justify-center h-24 text-gray-300">
                    <p className="text-xs">
                        {dictLang === 'en' ? 'No definitions found.' : '定義が見つかりません'}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="space-y-3">
                    {dictEntry.meanings.map((sense, idx) => (
                        <div key={idx} className="flex gap-3 group">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <div className="flex-1">
                                <p className="text-gray-700 leading-relaxed text-sm">
                                    {sense.glosses.join('; ')}
                                </p>
                                {sense.pos.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                        {translatePOS(sense.pos, dictLang).map((p, pi) => (
                                            <span key={pi} className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
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
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={onClose}
            />

            <div
                className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-300 flex flex-col h-[45vh] md:h-[40vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
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


                        {/* Word Display */}
                        <div className="flex flex-col flex-1 justify-center items-center -mt-2">
                            <div className="relative pt-3 w-fit">
                                {token.pitch && token.pitch.length > 0 && (
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-80 scale-90">
                                        <PitchAccent pattern={token.pitch} />
                                    </div>
                                )}
                                <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-none text-center">
                                    {token.surface}
                                </h2>
                            </div>
                            <div className="flex flex-col items-center mt-1">
                                <span className="text-base font-medium leading-tight" style={{ color: '#f43f5e' }}>
                                    {token.reading || token.surface}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono tracking-wide uppercase mt-0.5">
                                    {token.romaji}
                                </span>
                                {/* POS Badge below romaji */}
                                <span className="mt-2 px-2 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 tracking-wider border border-blue-100">
                                    {translatePOS([token.pos], 'zh')[0]}
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
                                <Star className={clsx("w-4 h-4", isSaved && "fill-current")} />
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Definitions */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                        {/* Header with inflection info */}
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center bg-white sticky top-0 z-10 pr-12">
                            {isInflected && (
                                <button
                                    onClick={() => {
                                        // Create a mock token for the base form and trigger lookup
                                        const baseToken: WordToken = {
                                            ...token,
                                            surface: baseForm,
                                            reading: '',
                                            romaji: '',
                                        };
                                        // Use the existing useAppStore to set selected word
                                        useAppStore.getState().setSelectedToken(baseToken);
                                    }}
                                    className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                    <ArrowRight className="w-3 h-3" />
                                    <span className="font-bold">{baseForm}</span>
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {isLoadingDict ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                                    <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                                </div>
                            ) : (
                                renderYomitanDefinitions()
                            )}

                            {/* Pitch Footer */}
                            {token.accentMora !== undefined && (
                                <div className="mt-4 pt-4 border-t border-gray-50 text-[10px] text-gray-300 text-right">
                                    声调: {token.accentMora === 0 ? '平板型' : `${token.accentMora}型`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
