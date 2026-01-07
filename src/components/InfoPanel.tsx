'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Star, ArrowRight, BookOpen } from 'lucide-react';
import { WordToken, DictionaryEntry, PartOfSpeech } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
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

export default function InfoPanel() {
    const { selectedToken: token, currentSentence, settings } = useAppStore(); // Get token from store
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
    const isSaved = isWordSaved(token.surface, token.reading);

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

        // 颜色常量（与 PitchAccent 一致）
        // Updated to Blue to match theme
        const ACCENT_COLOR = '#60a5fa';

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
            <div className="space-y-3 pb-8">
                {parsedLines.map((item, i) => {
                    if (item.type === 'skip') return null;

                    if (item.type === 'definition') {
                        defIndex++;
                        return (
                            <div key={i} className="flex gap-3 mb-3">
                                {/* 编号（多释义时显示）*/}
                                {definitionCount > 1 && (
                                    <span className="shrink-0 font-bold text-sm mt-[2px] font-mono select-none" style={{ color: 'var(--text-faint)' }}>
                                        {defIndex}.
                                    </span>
                                )}
                                <div className="flex-1">
                                    {/* 中文翻译（在上，大/粗）*/}
                                    {item.translation ? (
                                        <>
                                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                                {item.translation}
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.85, display: 'flex', alignItems: 'center' }}>
                                                <span>{item.primary}</span>
                                                <PlayButton text={item.primary} lineIndex={i} />
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: 1.4, display: 'flex', alignItems: 'center' }}>
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
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: '#64748b',
                                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(148, 163, 184, 0.25)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                                    backdropFilter: 'blur(8px)',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}>
                                    例
                                </span>
                                <div style={{ flex: 1 }}>
                                    {/* Japanese example with play button */}
                                    <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.6, display: 'flex', alignItems: 'center' }}>
                                        <span>{renderExampleWithHighlight(item.primary)}</span>
                                        <PlayButton text={item.primary} lineIndex={i} />
                                    </div>
                                    {/* Chinese translation on new line */}
                                    {item.translation && (
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                                            {item.translation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (item.type === 'reference') {
                        return (
                            <div key={i} style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)', marginTop: '8px' }}>
                                ⇨ {item.primary}
                                {item.translation && <span style={{ marginLeft: '4px', color: 'var(--text-faint)' }}>({item.translation})</span>}
                            </div>
                        );
                    }

                    if (item.type === 'etymology') {
                        return (
                            <div key={i} style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                                ᐅ {item.content}
                            </div>
                        );
                    }

                    if (item.type === 'supplement') {
                        return (
                            <div key={i} className="mt-1"
                                style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)', lineHeight: 1.5 }}>
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
                                <p className="text-[var(--text-primary)] leading-relaxed text-sm">
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

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-elevated)' }}>
            {/* Header / Word Info - Compact Version for Right Column */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-muted)' }}>
                <div className="flex justify-between items-start">
                    <div>
                        {/* Pitch Accent & Word */}
                        {/* Pitch Accent & Word */}
                        <div className="flex flex-col items-start gap-1">
                            {token.pitch && token.pitch.length > 0 && (
                                <div className="opacity-80 scale-[0.9] origin-left h-4">
                                    <PitchAccent pattern={token.pitch} />
                                </div>
                            )}
                            <h2 className="text-3xl font-black tracking-tight leading-none text-[var(--text-primary)]">
                                {token.surface}
                            </h2>
                        </div>

                        {/* Reading & Meta */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium" style={{ color: '#60a5fa' }}>
                                {token.reading || token.surface}
                            </span>
                            <span className="text-[10px] font-mono tracking-wide uppercase" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                                {token.romaji}
                            </span>
                            {/* 使用统一的颜色系统 */}
                            <span className={clsx(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border",
                                colorScheme.bg,
                                colorScheme.text,
                                colorScheme.border
                            )}>
                                {translatePOS([token.pos], 'zh')[0]}
                            </span>
                        </div>
                    </div>

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
                        className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer w-full mb-4 justify-center"
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

                {/* Pitch Footer */}
                {token.accentMora !== undefined && (
                    <div className="mt-4 pt-4 border-t border-gray-50 text-[10px] text-gray-300 text-center">
                        声调: {token.accentMora === 0 ? '平板型' : `${token.accentMora}型`}
                    </div>
                )}
            </div>
        </div>
    );
}
