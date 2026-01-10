'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Bookmark, ArrowRight, BookOpen } from 'lucide-react';
import { WordToken, DictionaryEntry, PartOfSpeech, AppSettings } from '@/types';
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
import { richGrammarLoader } from '@/lib/grammar/RichGrammarLoader';

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

// 语法例句组件 - 带翻译和关键词高亮功能
function ExampleWithTranslation({
    example,
    onSpeak,
    grammarColor,
    grammarPattern
}: {
    example: string;
    onSpeak: (text: string) => void;
    grammarColor: string;
    settings: AppSettings;
    grammarPattern?: string; // 语法标题/读音，用于高亮匹配
}) {
    const [translation, setTranslation] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const translate = async () => {
            setIsTranslating(true);
            try {
                const result = await translateText(example, 'zh-CN', 'ja');
                if (!cancelled) {
                    setTranslation(result);
                }
            } catch (error) {
                console.error('翻译失败:', error);
            } finally {
                if (!cancelled) {
                    setIsTranslating(false);
                }
            }
        };
        translate();
        return () => { cancelled = true; };
    }, [example]);

    // 从语法模式中提取可能的关键词进行匹配
    const extractKeywords = (pattern: string): string[] => {
        if (!pattern) return [];
        const results: string[] = [];

        // 移除序号等
        const cleaned = pattern
            .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')
            .replace(/[（()][^）)]*[）)]/g, '') // 移除括号及其内容
            .trim();

        // 处理 ～XXX 格式 - 保留核心部分
        // 例如: ～によると・～によれば → によると, によれば
        // 例如: ～以上・～以上は → 以上, 以上は
        // 例如: ～ままに～する → ままに

        // 按 ・、 分割成多个变体
        const variants = cleaned.split(/[・、]/);

        for (const variant of variants) {
            // 移除开头和结尾的 ～〜~ 
            const core = variant.trim().replace(/^[～〜~]+/, '').replace(/[～〜~]+$/, '');
            // 如果中间有 ～ (如 ～ままに～する), 取第一部分
            if (core.includes('～') || core.includes('〜')) {
                const parts = core.split(/[～〜]/);
                for (const part of parts) {
                    if (part.trim().length > 1) {
                        results.push(part.trim());
                    }
                }
            } else if (core.length > 1) {
                results.push(core);
            }
        }

        // 去重并按长度排序（优先匹配较长的）
        const unique = [...new Set(results)].sort((a, b) => b.length - a.length);
        return unique;
    };

    // 高亮渲染例句中的语法关键词
    const renderHighlightedExample = (text: string, keywords: string[]): React.ReactNode => {
        if (keywords.length === 0) return text;

        // 尝试在文本中找到任意一个关键词
        for (const keyword of keywords) {
            const index = text.indexOf(keyword);
            if (index !== -1) {
                const before = text.substring(0, index);
                const match = text.substring(index, index + keyword.length);
                const after = text.substring(index + keyword.length);
                return (
                    <>
                        {before}
                        <strong style={{ color: grammarColor }}>{match}</strong>
                        {after}
                    </>
                );
            }
        }
        // 没找到匹配，返回原文
        return text;
    };

    const keywords = extractKeywords(grammarPattern || '');

    return (
        <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span className={clsx(
                "flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-[5px] border shadow-sm backdrop-blur-md mt-[2px] shrink-0",
                "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]",
                "dark:bg-black/20 dark:text-gray-400 dark:border-white/10"
            )}>
                例
            </span>
            <div style={{ flex: 1 }}>
                {/* 日语例句 - 带关键词高亮 */}
                <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <span>{renderHighlightedExample(example, keywords)}</span>
                    <button
                        onClick={() => onSpeak(example)}
                        style={{
                            flexShrink: 0,
                            width: '20px',
                            height: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            marginLeft: '4px',
                            verticalAlign: 'middle'
                        }}
                        title="朗读例句"
                    >
                        <Volume2 style={{ width: '14px', height: '14px' }} />
                    </button>
                </div>
                {/* 中文翻译 */}
                <div style={{ fontSize: '14px', color: grammarColor, marginTop: '4px', opacity: 0.85 }}>
                    {isTranslating ? (
                        <span style={{ color: 'var(--text-faint)' }}>翻译中...</span>
                    ) : translation ? (
                        translation
                    ) : null}
                </div>
            </div>
        </div >
    );
}
// 渲染富文本语法解释（Distilled Data）
function RichGrammarContent({ grammar, grammarColor, onSpeak }: { grammar: GrammarEntry, grammarColor: string, onSpeak: (text: string) => void }) {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [exampleTranslation, setExampleTranslation] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            await richGrammarLoader.loadDictionary();
            const exp = richGrammarLoader.getExplanation(grammar.title, grammar.reading);
            setExplanation(exp);
        };
        load();
    }, [grammar.title]);

    // Example translation effect
    useEffect(() => {
        if (!grammar.example) return;
        const translate = async () => {
            try {
                const res = await translateText(grammar.example!, 'zh-CN', 'ja');
                setExampleTranslation(res);
            } catch (e) {
                console.error(e);
            }
        };
        translate();
    }, [grammar.example]);


    if (!explanation) return null;

    // Split by newlines to handle paragraph breaks naturally
    const lines = explanation.split('\n').filter(line => line.trim());

    const handleContentClick = (e: React.MouseEvent) => {
        // Prevent triggering if clicking the example speaker button or a specific interactive element
        if ((e.target as HTMLElement).closest('button')) return;

        // Speak the explanations (lines joined)
        const textToSpeak = lines.join(' ').replace(/\*\*/g, '');
        onSpeak(textToSpeak);
    };

    // Helper to highlight grammar in example
    const renderExample = () => {
        if (!grammar.example) return null;

        let titleParts = [grammar.title];
        // Clean title for matching (remove ~, parens etc)
        const cleanTitle = grammar.title.replace(/[~～]/g, '').replace(/[（(].*?[）)]/g, '').trim();
        titleParts.push(cleanTitle);

        // Also try reading if available (sometimes example uses hiragana instead of kanji)
        if (grammar.reading) {
            titleParts.push(grammar.reading.replace(/[~～]/g, ''));
        }

        // Filter unique and valid parts, sort by length desc to match longest first
        titleParts = [...new Set(titleParts)].filter(t => t && t.length > 0).sort((a, b) => b.length - a.length);

        // Escape regex special characters
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Create a combined regex pattern
        const pattern = new RegExp(`(${titleParts.map(escapeRegExp).join('|')})`, 'g');

        // Simple split by the term
        const parts = grammar.example.split(pattern);

        return (
            <span>
                {parts.map((part, i) => {
                    // Check if this part matches any of our target titles
                    if (titleParts.includes(part)) {
                        return <strong key={i} style={{ color: grammarColor }}>{part}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                })}
            </span>
        );
    };

    return (
        <div
            onClick={handleContentClick}
            className="space-y-4 text-[16px] leading-relaxed animate-in fade-in zoom-in-95 duration-300 cursor-pointer hover:opacity-95 transition-opacity select-text"
            style={{ color: 'var(--text-primary)' }}
            title="点击朗读讲解"
        >
            {lines.map((line, idx) => {
                // Parse bold **text**
                const parts = line.split(/(\*\*.*?\*\*)/g);

                // Prepare highlighting logic (same as renderExample but scoped here for reuse if needed, 
                // or we can just compute it once outside loop if optimized, but this is fine for small text)
                let titleParts = [grammar.title];
                const cleanTitle = grammar.title.replace(/[~～]/g, '').replace(/[（(].*?[）)]/g, '').trim();
                titleParts.push(cleanTitle);
                if (grammar.reading) {
                    titleParts.push(grammar.reading.replace(/[~～]/g, ''));
                }
                // Filter and sort for regex
                titleParts = [...new Set(titleParts)].filter(t => t && t.length > 0).sort((a, b) => b.length - a.length);
                const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`(${titleParts.map(escapeRegExp).join('|')})`, 'g');

                return (
                    <div key={idx}>
                        {parts.map((part, i) => {
                            // If it's effectively a bold block (**...**)
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="font-bold" style={{ color: grammarColor }}>{part.slice(2, -2)}</strong>;
                            }

                            // If plain text, try to highlight grammar terms inside it
                            const subParts = part.split(pattern);
                            return (
                                <span key={i}>
                                    {subParts.map((subPart, j) => {
                                        if (titleParts.includes(subPart)) {
                                            // Auto-highlight recognized grammar term
                                            return <strong key={j} style={{ color: grammarColor }}>{subPart}</strong>;
                                        }
                                        return <span key={j}>{subPart}</span>;
                                    })}
                                </span>
                            );
                        })}
                    </div>
                );
            })}

            {/* Example Section */}
            {grammar.example && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-1">
                        <div className="flex items-center gap-2 mb-1">
                            <strong className="font-bold shrink-0" style={{ color: grammarColor }}>例句：</strong>
                            <button
                                onClick={() => onSpeak(grammar.example!)}
                                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
                                style={{ color: grammarColor }}
                                title="朗读例句"
                            >
                                <Volume2 className="w-4 h-4" />
                            </button>
                        </div>
                        {renderExample()}
                    </div>
                    {exampleTranslation && (
                        <div className="opacity-80 text-[15px] mt-1">
                            {exampleTranslation}
                        </div>
                    )}
                </div>
            )}

            {/* Original Meaning Section */}
            {grammar.meaning && (
                <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                    <strong className="font-bold" style={{ color: grammarColor }}>日文：</strong>
                    <span>{grammar.meaning}</span>
                </div>
            )}
        </div>
    );
}

// 渲染语法详情 - 样式与单词卡片保持一致
function GrammarPanel({ grammar, settings }: { grammar: GrammarEntry; settings: AppSettings }) {
    const { addGrammar, removeGrammar, isGrammarSaved } = useGrammarStore();
    const isSaved = isGrammarSaved(grammar.id);

    // 语法颜色使用 CSS 变量
    const isMonochrome = settings.colorScheme === 'monochrome';
    // For monochrome, we use the grayscale variable, but --scheme-grammar is already set to gray in globals.css
    // However, if we want to ensure it uses the variable and not some hardcoded fallback
    const grammarColor = 'var(--scheme-grammar)';

    const [isSpeaking, setIsSpeaking] = useState(false);

    // Resume TTS Handler
    const handleSpeak = (text: string) => {
        setIsSpeaking(true);
        ttsManager.speak(text, settings, {
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false)
        });
    };

    const handleSpeakTitle = () => {
        // User request: Read the "reading" (subtitle) if available.
        // If not, use the "term" (main title).
        // NEVER use 'grammar.title' (Index 2) as it contains metadata/rules like '③（勧め）'.
        let textToRead = grammar.reading || grammar.term;

        // Nuclear option: Truncate at the first sign of metadata (brackets, numbers)
        // This is safer than regex replacement which might miss unmatched brackets.
        // Split by: ( （ [ 【 〔 ①-⑳
        textToRead = textToRead.split(/[（(【\[〔①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/)[0];

        // Remove ~ and ～
        textToRead = textToRead.replace(/[~～]/g, '');

        handleSpeak(textToRead.trim());
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
            {/* Header - 与单词卡片相同布局 */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="flex justify-between items-start gap-4">
                    {/* Left Content: Title & Reading */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col items-start gap-1">
                            <h2
                                onClick={handleSpeakTitle}
                                className="text-3xl font-black tracking-tight leading-none break-words w-full cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ color: grammarColor }}
                                title="点击朗读"
                            >
                                {grammar.title
                                    .replace(/[（(][^）)]*[）)]/g, '')
                                    .replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g, '')
                                    .split('・')
                                    .map((part, i) => (
                                        <div key={i} className={i > 0 ? "mt-1" : ""}>
                                            {part.trim()}
                                        </div>
                                    ))}
                            </h2>
                        </div>
                        {grammar.reading && (
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
                                <span className="text-sm font-medium text-[var(--text-muted)] opacity-90 leading-snug">
                                    {grammar.reading}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right Content: Actions & Tag */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        {/* Actions */}
                        <div className="flex gap-1">
                            <button
                                onClick={handleSpeakTitle}
                                className={clsx(
                                    "p-2 rounded-lg transition-all duration-300",
                                    "hover:bg-[var(--scheme-grammar)]/10 hover:text-[var(--scheme-grammar)]",
                                    isSpeaking ? "bg-[var(--scheme-grammar)]/10 text-[var(--scheme-grammar)] scale-95" : "bg-transparent text-[var(--text-muted)]"
                                )}
                                title="朗读"
                                style={isSpeaking ? { color: grammarColor, backgroundColor: `${grammarColor}1a` } : {}}
                            >
                                <Volume2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSaveGrammar}
                                className={clsx(
                                    "p-2 rounded-lg transition-all duration-300",
                                    "hover:bg-[var(--scheme-grammar)]/10 hover:text-[var(--scheme-grammar)]",
                                    isSaved ? "bg-[var(--scheme-grammar)]/10 text-[var(--scheme-grammar)]" : "bg-transparent text-[var(--text-muted)]"
                                )}
                                title={isSaved ? "取消收藏" : "收藏"}
                                style={isSaved ? { color: grammarColor, backgroundColor: `${grammarColor}1a` } : {}}
                            >
                                <Bookmark className={clsx("w-5 h-5", isSaved && "fill-current")} />
                            </button>
                        </div>
                        {/* Tag - AI Grammar Badge */}
                        <span className={clsx(
                            "px-2 py-0.5 text-xs font-bold rounded-md border shadow-sm backdrop-blur-sm",
                            "bg-white/10 border-white/10"
                        )}
                            style={{
                                color: grammarColor,
                                borderColor: `${grammarColor}30`,
                                backgroundColor: `${grammarColor}10`
                            }}>
                            AI 文法
                        </span>
                    </div>
                </div>
            </div>

            {/* Content - 使用与单词卡片相同的内容样式 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                <div className="space-y-3 pb-8">
                    {/* Rich AI Explanation (Dynamic) */}
                    <RichGrammarContent
                        grammar={grammar}
                        grammarColor={grammarColor}
                        onSpeak={handleSpeak}
                    />
                </div>
            </div>
        </div>
    );
}

export default function InfoPanel() {
    const { selectedToken: token, selectedGrammar: grammar, currentSentence, settings } = useAppStore();
    const { addVocab, isWordSaved, removeVocab, vocabList } = useVocabStore();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingLineIndex, setSpeakingLineIndex] = useState<number | null>(null);
    const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
    const [yomitanEntry, setYomitanEntry] = useState<YomitanResult | null>(null);
    const [dictLang] = useState<'en' | 'jp' | 'zh'>('zh'); // 默认中文
    const [isLoadingDict, setIsLoadingDict] = useState(false);

    // 当 token 变化时，重置朗读状态（不停止 TTS，让自动朗读正常工作）
    useEffect(() => {
        setIsSpeaking(false);
        setSpeakingLineIndex(null);
    }, [token]);

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
                onEnd: () => setIsSpeaking(false),
                onError: () => setIsSpeaking(false)
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
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-faint)' }}>
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
        const isMonochrome = settings.colorScheme === 'monochrome';
        const themeColors = currentTheme.colors[token.pos] || currentTheme.colors[PartOfSpeech.OTHER];

        // Use monochrome gray for accent text if in monochrome mode
        const accentTextClass = isMonochrome ? 'text-[var(--text-primary)]' : themeColors.text;

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
                    backgroundColor: speakingLineIndex === lineIndex ? 'var(--scheme-primary-bg)' : 'transparent',
                    color: speakingLineIndex === lineIndex ? 'var(--scheme-primary)' : 'var(--text-muted)',
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
                                    "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]",
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _renderJishoDefinitions = () => {
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
    } : {};

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
                                <div className="opacity-80 scale-[0.9] origin-left h-4" style={{ color: 'var(--scheme-accent)' }}>
                                    <PitchAccent pattern={token.pitch} />
                                </div>
                            )}
                            <h2
                                onClick={handleSpeak}
                                title="点击朗读"
                                className={clsx("text-3xl font-black tracking-tight leading-none break-words w-full cursor-pointer hover:opacity-80 transition-opacity", (!isWafu && !isMonochrome) && textClass)} style={(isWafu || isMonochrome) ? { color: `var(--wafu-${posKey}-text)` } : {}}
                            >
                                {token.surface}
                            </h2>
                        </div>

                        {/* Reading & Meta - Allow wrapping */}
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
                            <span className="text-sm font-medium text-[var(--text-muted)] opacity-90 leading-snug">
                                {token.reading || token.surface}
                            </span>
                            <span className="text-sm font-mono tracking-wide uppercase text-[var(--text-muted)]" style={{ fontSize: '11px' }}>
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
                                className={clsx(
                                    "p-2 rounded-lg transition-all duration-300",
                                    "hover:bg-[var(--scheme-accent-bg)] hover:text-[var(--scheme-accent)]",
                                    isSpeaking ? "bg-[var(--scheme-accent-bg)] text-[var(--scheme-accent)] scale-95" : "bg-transparent text-[var(--text-muted)]"
                                )}
                                title="朗读"
                            >
                                <Volume2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSaveVocab}
                                className={clsx(
                                    "p-2 rounded-lg transition-all duration-300",
                                    "hover:bg-[var(--scheme-accent-bg)] hover:text-[var(--scheme-accent)]",
                                    isSaved ? "bg-[var(--scheme-accent-bg)] text-[var(--scheme-accent)]" : "bg-transparent text-[var(--text-muted)]"
                                )}
                                title={isSaved ? "已收藏" : "收藏单词"}
                            >
                                <Bookmark className={clsx("w-5 h-5", isSaved && "fill-current")} />
                            </button>
                        </div>

                        {/* POS Tag - Minimalist */}
                        <div className="flex flex-col items-end">
                            <span className={clsx(
                                "text-xs font-bold px-2 py-0.5 rounded border tracking-wide",
                                !isWafu && "bg-[var(--bg-subtle)]"
                            )} style={isWafu ? wafuStyle : { color: textClass, borderColor: `${textClass}40` }}>
                                {token.pos}
                            </span>
                            {token.posDetail && !['*', 'Common'].includes(token.posDetail) && (
                                <span className="text-[10px] text-[var(--text-faint)] mt-0.5 text-right max-w-[100px] leading-tight opacity-70">
                                    {token.posDetail}
                                </span>
                            )}
                        </div>
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
                        className={clsx(
                            "flex items-center gap-2 text-[16px] px-4 py-2 rounded-lg border transition-colors cursor-pointer w-full mb-4 justify-center",
                            (!isWafu && !isMonochrome) && [colorScheme.text, colorScheme.bg, colorScheme.border],
                            "hover:brightness-95"
                        )}
                        style={(isWafu || isMonochrome) ? wafuStyle : {}}
                    >
                        <ArrowRight className="w-4 h-4" />
                        <span>查看原形: <span className="font-bold">{baseForm}</span></span>
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
