'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Star, ArrowRight, BookOpen } from 'lucide-react';
import { WordToken, DictionaryEntry, PartOfSpeech } from '@/types';
import { GrammarEntry } from '@/types/grammar';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { useGrammarStore } from '@/store/useGrammarStore';
import { getDeinflectedForm } from '@/lib/nlp/analyzer';
import { ttsManager } from '@/lib/tts/manager';
import { COLOR_THEMES } from '@/lib/colorThemes';

import clsx from 'clsx';
import PitchAccent from './PitchAccent';
import { translateText } from '@/lib/translate';

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

// 渲染语法详情
function GrammarPanel({ grammar, settings }: { grammar: GrammarEntry; settings: ReturnType<typeof useAppStore>['settings'] }) {
    const isDark = settings.theme === 'dark';
    const { addGrammar, removeGrammar, isGrammarSaved } = useGrammarStore();
    const isSaved = isGrammarSaved(grammar.id);

    const handleSpeak = (text: string) => {
        ttsManager.speak(text, settings, {
            onStart: () => { },
            onEnd: () => { }
        });
    };

    const handleSaveGrammar = () => {
        if (isSaved) {
            removeGrammar(grammar.id);
        } else {
            addGrammar(grammar);
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-elevated)' }}>
            {/* Header */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-2xl font-black tracking-tight leading-none break-words" style={{ color: '#5F7387' }}>
                            {grammar.title}
                        </h2>
                        {grammar.reading && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-[var(--text-muted)]">
                                    {grammar.reading}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        {/* Actions */}
                        <div className="flex gap-1">
                            <button
                                onClick={handleSaveGrammar}
                                className={clsx(
                                    "flex items-center justify-center w-7 h-7 rounded-md transition-all border",
                                    isSaved
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)] hover:border-amber-500 hover:text-amber-500 shadow-sm"
                                )}
                                title={isSaved ? "取消收藏" : "收藏"}
                            >
                                <Star className={clsx("w-3.5 h-3.5", isSaved && "fill-current")} />
                            </button>
                        </div>
                        <span className={clsx(
                            "px-2 py-1 rounded-md text-sm font-bold tracking-wider border text-center min-w-[3em]",
                            "bg-white/85 text-slate-500 border-slate-200/50",
                            "dark:bg-black/20 dark:text-gray-400 dark:border-white/10"
                        )}>
                            文法
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-4">
                {/* Meaning */}
                {grammar.meaning && (
                    <div>
                        <div className="text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">意味</div>
                        <div className="text-base text-[var(--text-primary)] leading-relaxed">
                            {grammar.meaning}
                        </div>
                    </div>
                )}

                {/* Example */}
                {grammar.example && (
                    <div>
                        <div className="text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">例文</div>
                        <div className="flex items-start gap-2 p-3 rounded-lg" style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            border: '1px solid var(--border-default)'
                        }}>
                            <div className="flex-1 text-base text-[var(--text-primary)] leading-relaxed">
                                {grammar.example}
                            </div>
                            <button
                                onClick={() => handleSpeak(grammar.example)}
                                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-[#5F7387] hover:bg-[#5F7387]/10 transition-colors"
                                title="朗读例句"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Category */}
                {grammar.category && (
                    <div>
                        <div className="text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">出典</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                            {grammar.category}
                        </div>
                    </div>
                )}

                {/* URL Link */}
                {grammar.url && (
                    <a
                        href={grammar.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#5F7387] hover:underline"
                    >
                        <ArrowRight className="w-3 h-3" />
                        詳細を見る
                    </a>
                )}
            </div>
        </div>
    );
}

export default function InfoPanel() {
    const { selectedToken: token, selectedGrammar: grammar, currentSentence, settings } = useAppStore();
    const isDark = settings.theme === 'dark';
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

            // Fallback: Google Translate
            // 格式化为 "原文。/译文" 以匹配渲染逻辑
            const translation = await translateText(word, 'zh-CN', 'ja');
            if (translation) {
                const fallbackEntry: YomitanResult = {
                    term: word,
                    reading: word,
                    partOfSpeech: 'Google Translate',
                    definitions: [`${word}。/${translation}`],
                    source: 'Google Translate'
                };
                return fallbackEntry;
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

    // 如果选中了语法，显示语法面板
    if (grammar && !token) {
        return <GrammarPanel grammar={grammar} settings={settings} />;
    }

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8" style={{ color: 'var(--text-faint)' }}>
                <BookOpen className="w-12 h-12 mb-3 stroke-1" />
                <p className="text-sm font-medium">単語を選択してください</p>
                <p className="text-xs text-center mt-1 w-32">
                    本文中の単語をクリックすると、ここに意味が表示されます
                </p>
            </div>
        );
    }

    const baseForm = getDeinflectedForm(token);
    const isInflected = baseForm !== token.surface;

    // Use effective reading (fallback to surface if empty) for consistent matching
    const effectiveReading = token.reading || token.surface;
    const isSaved = isWordSaved(token.surface, effectiveReading);

    // 获取当前词性的颜色配置
    const activeTheme = COLOR_THEMES[settings.colorTheme || 'standard'];
    const colorScheme = activeTheme.colors[token.pos as PartOfSpeech] || activeTheme.colors[PartOfSpeech.OTHER];

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
            // Find matched item using effective reading
            const item = vocabList.find(v => v.word === token.surface && v.reading === effectiveReading);
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
                reading: effectiveReading,
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
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
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

        // Resolve theme colors (Dynamic based on POS)
        const currentTheme = COLOR_THEMES[settings.colorTheme || 'standard'] || COLOR_THEMES.standard;
        const themeColors = currentTheme.colors[token.pos] || currentTheme.colors[PartOfSpeech.OTHER];
        const accentTextClass = themeColors.text;

        // 渲染例句文本（内联高亮）
        const renderExampleWithHighlight = (text: string) => {
            const parts = text.split(/[～〜]/);
            if (parts.length === 1) return text;
            return parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && (
                        <span className={clsx(accentTextClass, "font-bold")} style={{ margin: '0 2px' }}>{baseForm}</span>
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
                    color: speakingLineIndex === lineIndex ? '#437e6f' : '#9ca3af',
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
            <div className="space-y-3 pb-8">
                {parsedLines.map((item, i) => {
                    if (item.type === 'skip') return null;

                    if (item.type === 'definition') {
                        defIndex++;
                        return (
                            <div key={i} className="flex gap-3 mb-3">
                                {/* 编号（多释义时显示）*/}
                                {definitionCount > 1 && (
                                    <span className={clsx("shrink-0 font-bold text-base mt-[2px] font-mono select-none", accentTextClass)}>
                                        {defIndex}.
                                    </span>
                                )}
                                <div className="flex-1">
                                    {/* 中文翻译（在上，大/粗）*/}
                                    {item.translation ? (
                                        <>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                {item.translation}
                                            </div>
                                            <div style={{ fontSize: '16px', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.85, display: 'flex', alignItems: 'center' }}>
                                                <span>{item.primary}</span>
                                                <PlayButton text={item.primary} lineIndex={i} />
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)', lineHeight: 1.4, display: 'flex', alignItems: 'center' }}>
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
                                {/* 立体阴影白色毛玻璃胶囊 */}
                                <span className={clsx(
                                    "flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-[5px] border shadow-sm backdrop-blur-md mt-[2px] shrink-0",
                                    "bg-white/85 text-slate-500 border-slate-200/50",
                                    "dark:bg-black/20 dark:text-gray-400 dark:border-white/10"
                                )}>
                                    例
                                </span>
                                <div style={{ flex: 1 }}>
                                    {/* Japanese example with play button */}
                                    <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', alignItems: 'center' }}>
                                        <span>{renderExampleWithHighlight(item.primary)}</span>
                                        <PlayButton text={item.primary} lineIndex={i} />
                                    </div>
                                    {/* Chinese translation on new line */}
                                    {item.translation && (
                                        <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                                            {item.translation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (item.type === 'reference') {
                        return (
                            <div key={i} style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', marginTop: '8px' }}>
                                ⇨ {item.primary}
                                {item.translation && <span style={{ marginLeft: '4px', color: 'var(--text-faint)' }}>({item.translation})</span>}
                            </div>
                        );
                    }

                    if (item.type === 'etymology') {
                        return (
                            <div key={i} style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                                ᐅ {item.content}
                            </div>
                        );
                    }

                    if (item.type === 'supplement') {
                        return (
                            <div key={i} className="mt-1"
                                style={{ fontSize: '16px', fontWeight: 'normal', color: 'var(--text-muted)', lineHeight: 1.5 }}>
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
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bg-subtle)] text-[10px] font-bold text-[var(--text-muted)] shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <div className="flex-1">
                                <p className="text-[var(--text-muted)] leading-relaxed text-base">
                                    {sense.glosses.join('; ')}
                                </p>
                                {sense.pos.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                        {translatePOS(sense.pos, dictLang).map((p, pi) => (
                                            <span key={pi} className="text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
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

    // Resolve theme colors (Header)
    const currentTheme = COLOR_THEMES[settings.colorTheme || 'standard'] || COLOR_THEMES.standard;
    const themeColors = currentTheme.colors[token.pos] || currentTheme.colors[PartOfSpeech.OTHER];
    const isColorEnabled = (settings.activeColorPOS || []).includes(token.pos);
    const textClass = isColorEnabled ? themeColors.text : 'text-[var(--text-muted)]';

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-elevated)' }}>
            {/* Header / Word Info - Compact Version for Right Column */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="flex justify-between items-start gap-4">
                    {/* Left Content: Main Word Info */}
                    <div className="flex-1 min-w-0">
                        {/* Pitch Accent & Word */}
                        <div className="flex flex-col items-start gap-1">
                            {token.pitch && token.pitch.length > 0 && (
                                <div className="opacity-80 scale-[0.9] origin-left h-4" style={{ color: '#AA5555' }}>
                                    <PitchAccent pattern={token.pitch} />
                                </div>
                            )}
                            <h2 className={clsx("text-3xl font-black tracking-tight leading-none break-words w-full", textClass)}>
                                {token.surface}
                            </h2>
                        </div>

                        {/* Reading & Meta - Allow wrapping */}
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
                            <span className="text-sm font-medium text-[var(--text-muted)] opacity-90 leading-snug">
                                {token.reading || token.surface}
                            </span>
                            <span className="text-sm font-mono tracking-wide uppercase" style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: '11px' }}>
                                {token.romaji}
                            </span>
                        </div>
                    </div>

                    {/* Right Content: Actions & POS */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        {/* Actions */}
                        <div className="flex gap-1">
                            <button
                                onClick={handleSpeak}
                                disabled={isSpeaking}
                                className={clsx(
                                    "flex items-center justify-center w-7 h-7 rounded-md transition-all border",
                                    isSpeaking
                                        ? "bg-[var(--accent-primary-light)] text-[var(--accent-primary)] border-[var(--accent-primary)]"
                                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] shadow-sm"
                                )}
                                title="発音"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleSaveVocab}
                                className={clsx(
                                    "flex items-center justify-center w-7 h-7 rounded-md transition-all border",
                                    isSaved
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)] hover:border-amber-500 hover:text-amber-500 shadow-sm"
                                )}
                                title="保存"
                            >
                                <Star className={clsx("w-3.5 h-3.5", isSaved && "fill-current")} />
                            </button>
                        </div>

                        {/* POS Tag - Fixed on the right */}
                        <span className={clsx(
                            "px-2 py-1 rounded-md text-sm font-bold tracking-wider border text-center min-w-[3em]",
                            colorScheme.bg,
                            colorScheme.text,
                            colorScheme.border
                        )}>
                            {translatePOS([token.pos], 'zh')[0]}
                        </span>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">

                {/* Inflection Link */}
                {isInflected && (
                    <button
                        onClick={() => {
                            const baseToken: WordToken = {
                                ...token,
                                surface: baseForm,
                                reading: '',
                                romaji: '',
                            };
                            useAppStore.getState().setSelectedToken(baseToken);
                        }}
                        className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400/90 px-2 py-1 rounded border border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-colors cursor-pointer w-full mb-4 justify-center"
                    >
                        <ArrowRight className="w-3 h-3" />
                        <span>辞書形: <span className="font-bold">{baseForm}</span> を見る</span>
                    </button>
                )}

                {isLoadingDict ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                    </div>
                ) : (
                    renderYomitanDefinitions()
                )}

                {/* Pitch Footer Removed */}
            </div>
        </div>
    );
}
