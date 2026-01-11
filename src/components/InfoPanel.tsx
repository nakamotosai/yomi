'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Collapsible } from './Collapsible';
import { Volume2, Bookmark, ArrowRight, BookOpen, BookMarked, Sparkles, ChevronRight, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordToken, DictionaryEntry, PartOfSpeech, AppSettings } from '@/types';
import { GrammarEntry } from '@/types/grammar';
import { useAppStore } from '@/store/useAppStore';
import { useVocabStore } from '@/store/useVocabStore';
import { useGrammarStore } from '@/store/useGrammarStore';
import { getDeinflectedForm } from '@/lib/nlp/analyzer';
import { ttsManager } from '@/lib/tts/manager';
import { COLOR_THEMES, POS_GLOW_COLORS } from '@/lib/colorThemes';

import clsx from 'clsx';
import { useGeminiStore } from '@/store/useGeminiStore'; // Import hook
import PitchAccent from './PitchAccent';
import { translateText } from '@/lib/translate';
import { richGrammarLoader } from '@/lib/grammar/RichGrammarLoader';
import { yomitanLoader, DictionaryResult as YomitanResult } from '@/lib/dictionary/yomitanLoader';

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

// 核心文本高亮组件：支持多关键词自动识别、加粗并染色
function UnifiedHighlighter({ text, target, color, isChinese = false }: { text: string; target: string; color: string; isChinese?: boolean }) {
    if (!text || !target) return <>{text}</>;

    // 预处理目标词：移除 ～、括号注释、序号等
    const baseTarget = target.replace(/[～〜~]/g, '').replace(/[（(][^）)]*[）)]/g, '').replace(/[①-⑩]/g, '').trim();
    if (!baseTarget) return <>{text}</>;

    // 提取可能的关键词（处理含有 ・ 或中日文括号的情况）
    const keywords = [baseTarget];
    if (baseTarget.includes('・')) {
        keywords.push(...baseTarget.split('・').map(k => k.trim()));
    }

    // 排序：优先匹配长词
    const sortedKeywords = keywords.filter(k => k.length > 0).sort((a, b) => b.length - a.length);

    // 构建正则 (转义特殊字符)
    const escaped = sortedKeywords.map(k => k.replace(/[./*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escaped})`, 'g');

    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                const isMatch = sortedKeywords.some(k => k === part);
                if (isMatch) {
                    return <strong key={i} className="font-bold" style={{ color }}>{part}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

// 统一例句组件 (方案 3)：[例] + 播放键 + 日文 / > + 翻译
function UnifiedExampleItem({
    japanese,
    chinese,
    onSpeak,
    accentColor,
    targetWord,
    isSpeaking = false
}: {
    japanese: string;
    chinese?: string;
    onSpeak: (text: string) => void;
    accentColor: string;
    targetWord: string;
    isSpeaking?: boolean;
}) {
    return (
        <div className="mt-3 first:mt-1 mb-3 group animate-in slide-in-from-left-2 duration-300">
            {/* 日文行 */}
            <div className="flex items-start gap-2">
                {/* 播放按钮 */}
                <button
                    onClick={() => onSpeak(japanese)}
                    className={clsx(
                        "mt-[2px] p-1.5 rounded-full transition-all shrink-0",
                        isSpeaking ? "bg-[var(--scheme-primary-bg)]" : "bg-black/5 dark:bg-white/10 opacity-70 group-hover:opacity-100"
                    )}
                    style={{ color: accentColor }}
                >
                    <Volume2 className="w-3.5 h-3.5" />
                </button>

                {/* 文字内容 - 日文 */}
                <div className="flex-1 text-[16px] leading-relaxed break-words font-medium text-[var(--text-muted)]">
                    <UnifiedHighlighter text={japanese} target={targetWord} color={accentColor} />
                </div>
            </div>

            {/* 中文行 - 靠左对齐，去除多余缩进 */}
            {chinese && (
                <div className="flex items-start gap-1 mt-1 ml-[1px]">
                    <ChevronRight className="w-3.5 h-3.5 mt-[5px] shrink-0 opacity-40" style={{ color: accentColor }} />
                    <div className="flex-1 text-[14px] leading-snug text-[var(--text-muted)] opacity-90 italic">
                        <UnifiedHighlighter text={chinese} target={targetWord} color={accentColor} isChinese />
                    </div>
                </div>
            )}
        </div>
    );
}
// 渲染富文本语法解释（Distilled Data）
function RichGrammarContent({ grammar, grammarColor, onSpeak, isGlobalSpeaking }: { grammar: GrammarEntry, grammarColor: string, onSpeak: (text: string) => void, isGlobalSpeaking: boolean }) {
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

    useEffect(() => {
        if (!grammar.example) return;
        const translate = async () => {
            try {
                const res = await translateText(grammar.example!, 'zh-CN', 'ja');
                setExampleTranslation(res);
            } catch (e) { console.error(e); }
        };
        translate();
    }, [grammar.example]);

    if (!explanation) return null;

    const lines = explanation.split('\n').filter(line => line.trim());

    return (
        <div className="space-y-4 text-[16px] leading-relaxed cursor-default select-text" style={{ color: 'var(--text-primary)' }}>
            {/* 正文解读 - 应用全量高亮 */}
            {lines.map((line, idx) => (
                <div key={idx}>
                    <UnifiedHighlighter text={line.replace(/\*\*/g, '')} target={grammar.title} color={grammarColor} />
                </div>
            ))}

            {/* 例句部分 - 使用方案 3 */}
            {grammar.example && (
                <UnifiedExampleItem
                    japanese={grammar.example}
                    chinese={exampleTranslation}
                    onSpeak={onSpeak}
                    accentColor={grammarColor}
                    targetWord={grammar.title}
                />
            )}

            {/* 原日文释义 */}
            {grammar.meaning && (
                <div className="pt-2 border-t border-dashed border-[var(--border-muted)] opacity-80 text-[14px]">
                    <strong className="font-bold mr-1" style={{ color: grammarColor }}>日文义项:</strong>
                    <UnifiedHighlighter text={grammar.meaning} target={grammar.title} color={grammarColor} />
                </div>
            )}
        </div>
    );
}

// 渲染语法详情 - 样式与单词卡片保持一致
function GrammarPanel({ grammar, settings, isGlobalSpeaking }: { grammar: GrammarEntry; settings: AppSettings; isGlobalSpeaking: boolean }) {
    const { addGrammar, removeGrammar, isGrammarSaved } = useGrammarStore();
    const { generateText, isAnalysisGenerating, cancelGeneration } = useGeminiStore();
    const isSaved = isGrammarSaved(grammar.id);


    // 语法颜色使用 CSS 变量
    const isWafu = settings.colorScheme === 'wafu';
    const isMonochrome = settings.colorScheme === 'monochrome';
    const grammarColor = isMonochrome ? 'var(--text-muted)' : 'var(--scheme-grammar)';

    const [isSpeaking, setIsSpeaking] = useState(false);


    // AI State
    const [aiResult, setAiResult] = useState<string>('');
    const [aiResultTitle, setAiResultTitle] = useState<string>('');
    const [isCached, setIsCached] = useState(false);
    const [isAIExpanded, setIsAIExpanded] = useState(false);

    // Clear AI result when switching grammar (Auto-load cache)
    useEffect(() => {
        // Cancel any pending generation
        if (isAnalysisGenerating) cancelGeneration();
        setAiResult('');
        setAiResultTitle('');
        setIsCached(false);
        setIsAIExpanded(false);

        // Auto-check cache
        if (grammar.id) {
            const checkCache = async () => {
                try {
                    const cacheKey = `grammar:${grammar.title}`;
                    const res = await fetch(`/api/cache?key=${encodeURIComponent(cacheKey)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.text) {
                            setAiResult(data.text);
                            setAiResultTitle('AI老师在线解读');
                            setIsCached(true);
                            setIsAIExpanded(true);
                        }
                    }
                } catch (e) {
                    // Ignore silent failures
                }
            };
            checkCache();
        }
    }, [grammar.id]);

    // Resume TTS Handler
    const handleSpeak = (text: string) => {
        if (isGlobalSpeaking) return;
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

    const handleAIExplain = async (forceRefresh = false) => {
        if (isAnalysisGenerating) return;

        // Prepare context
        // Ensure model is loaded


        setAiResult('');
        setAiResultTitle('AI老师在线解读');
        setIsCached(false);
        setIsAIExpanded(true); // Auto-expand when manually triggering

        try {
            await richGrammarLoader.loadDictionary();
            const refData = richGrammarLoader.getExplanation(grammar.title, grammar.reading) || grammar.meaning || "暂无解释";

            // Debugging log
            console.log('[Grammar AI] Generating request for:', grammar.title);

            const systemPrompt = `你是一位说话风趣幽默的日语私教，同时也是精通日剧/动漫台词的编剧。正在讲解语法：${grammar.title}。

【重要风格指南】
- 严禁使用『』或「」来包裹目标语法。
- 内容必须通俗、接地气，像是在微信聊天。

【任务要求】
第1步 - 人话解读：
- 直接点出精髓，指出其“情绪潜台词”。
- 严禁使用任何标题。

第2步 - 换行：
- 解读写完后，**必须输出一个空行**。
- **紧接着输出一行标题：例句：** (不要加任何符号)。

第3步 - 场景例句：
- 创作 3 组**全新**的例句。
- 每一组必须包含：一行日文、一行中文。
- 格式如下：
  日文句子1
  *中文翻译1*
  日文句子2
  *中文翻译2*
  日文句子3
  *中文翻译3*

【警告】
如果没有输出3个例句，任务即为失败。不要输出任何“总结”或“注意”废话。`;

            // Use simple user prompt like Word Interpretation
            const { fromCache } = await generateText(
                `Target Grammar: ${grammar.title}`,
                systemPrompt,
                (text) => setAiResult(text),
                {
                    temperature: 0.85,
                    top_p: 0.95,
                    cacheKey: `grammar:${grammar.title}`,
                    forceRefresh
                }
            );

            setIsCached(fromCache);

        } catch (error) {
            console.error("AI Generation failed", error);
            setAiResult("AI 老师好像在休息，请稍后再试...");
        } finally {
            // isGenerating handled by store
        }
    };

    const handleAIToggle = () => {
        if (aiResult) {
            setIsAIExpanded(!isAIExpanded);
            return;
        }
        handleAIExplain();
    };

    return (
        <div className="flex flex-col h-full" style={{ background: 'transparent' }}>
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
                                style={isSpeaking ? { color: grammarColor, backgroundColor: `color-mix(in srgb, ${grammarColor}, transparent 90%)` } : {}}
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
                                style={isSaved ? { color: grammarColor, backgroundColor: `color-mix(in srgb, ${grammarColor}, transparent 90%)` } : {}}
                            >
                                <Bookmark className={clsx("w-5 h-5", isSaved && "fill-current")} />
                            </button>
                        </div>
                        {/* Tag - Grammar Badge */}
                        <span className={clsx(
                            "px-2.5 py-1 text-[16px] font-bold rounded-lg border shadow-sm backdrop-blur-sm",
                            (!isWafu && !isMonochrome) ? "bg-white/10 border-white/10" : ""
                        )}
                            style={{
                                color: grammarColor,
                                borderColor: `color-mix(in srgb, ${grammarColor}, transparent 70%)`,
                                backgroundColor: `color-mix(in srgb, ${grammarColor}, transparent 96%)`
                            }}>
                            文法
                        </span>
                    </div>
                </div>
            </div>

            {/* Content - 使用与单词卡片相同的内容样式 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 floating-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                {/* AI Teacher Trigger & Results - Moved to Top */}
                <div className="mb-4">
                    <button
                        onClick={handleAIToggle}
                        className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-80 active:scale-[0.98] border shadow-sm mb-4"
                        style={{
                            backgroundColor: aiResultTitle === 'AI老师在线解读' ? `color-mix(in srgb, ${grammarColor}, transparent 92%)` : `color-mix(in srgb, ${grammarColor}, transparent 96%)`,
                            borderColor: `color-mix(in srgb, ${grammarColor}, transparent 70%)`,
                            color: grammarColor,
                        }}
                        disabled={isAnalysisGenerating}
                    >
                        {isAnalysisGenerating ? (
                            <Sparkles className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span className="font-bold text-sm">AI老师在线解读</span>
                            </>
                        )}
                    </button>

                    {/* AI Results Section */}
                    <Collapsible isOpen={isAIExpanded && !!aiResult} variant="default">
                        <div className="p-4 rounded-xl border border-dashed"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${grammarColor}, transparent 96%)`,
                                borderColor: `color-mix(in srgb, ${grammarColor}, transparent 80%)`,
                            }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4" style={{ color: grammarColor }} />
                                <div className="flex-1 text-sm font-bold" style={{ color: grammarColor }}>{aiResultTitle}</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAIExplain(true);
                                    }}
                                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    style={{ color: grammarColor }}
                                    title="重新生成"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                {(() => {
                                    const lines = aiResult.split('\n');
                                    let isExampleSection = false;

                                    return lines.map((line, lineIdx) => {
                                        const trimmed = line.trim();
                                        if (trimmed.includes('例句：') || trimmed.includes('例句:')) {
                                            isExampleSection = true;
                                            return <div key={lineIdx} className="font-bold mt-4 mb-2 text-[var(--text-muted)]">{line}</div>;
                                        }

                                        // 如果是例句部分：检测日文和翻译对
                                        const nextLine = lines[lineIdx + 1]?.trim() || '';
                                        const isTranslation = trimmed.startsWith('*') && trimmed.endsWith('*');
                                        const nextIsTranslation = nextLine.startsWith('*');

                                        if (trimmed && !isTranslation && nextIsTranslation) {
                                            return (
                                                <UnifiedExampleItem
                                                    key={lineIdx}
                                                    japanese={trimmed}
                                                    chinese={nextLine.slice(1, -1)}
                                                    onSpeak={handleSpeak}
                                                    accentColor={grammarColor}
                                                    targetWord={grammar.title}
                                                />
                                            );
                                        }

                                        // 跳过已被包含在 UnifiedExampleItem 的翻译行
                                        if (isTranslation && lines[lineIdx - 1]?.trim() && !lines[lineIdx - 1]?.trim().startsWith('*')) return null;

                                        return (
                                            <div key={lineIdx} className={trimmed ? "mb-2" : "h-2"}>
                                                <UnifiedHighlighter text={trimmed} target={grammar.title} color={grammarColor} />
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </Collapsible>
                </div>

                <div className="space-y-3 pb-2">
                    {/* Rich AI Explanation (Dynamic) */}
                    <RichGrammarContent
                        grammar={grammar}
                        grammarColor={grammarColor}
                        onSpeak={handleSpeak}
                        isGlobalSpeaking={isGlobalSpeaking}
                    />
                </div>


            </div >
        </div >
    );
}

export default function InfoPanel() {
    const { selectedToken: token, selectedGrammar: grammar, currentSentence, settings, isSpeaking: isGlobalSpeaking } = useAppStore();
    const { addVocab, isWordSaved, removeVocab, vocabList } = useVocabStore();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingLineIndex, setSpeakingLineIndex] = useState<number | null>(null);
    const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
    const [yomitanEntry, setYomitanEntry] = useState<YomitanResult | null>(null);
    const [dictLang] = useState<'en' | 'jp' | 'zh'>('zh'); // 默认中文
    const [isLoadingDict, setIsLoadingDict] = useState(false);

    // AI State for Words
    const { generateText, isAnalysisGenerating, cancelGeneration } = useGeminiStore();
    const [aiResult, setAiResult] = useState<string>('');
    const [aiResultTitle, setAiResultTitle] = useState<string>('');
    const [isCached, setIsCached] = useState(false);
    const [isAIExpanded, setIsAIExpanded] = useState(false);

    // Clear AI result when switching words (Auto-load cache if available)
    useEffect(() => {
        // Cancel any pending generation
        if (isAnalysisGenerating) cancelGeneration();
        setAiResult('');
        setAiResultTitle('');
        setIsCached(false);
        setIsAIExpanded(false);

        // Auto-check cache
        if (token) {
            const checkCache = async () => {
                try {
                    const cacheKey = `word:${token.surface}`;
                    const res = await fetch(`/api/cache?key=${encodeURIComponent(cacheKey)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.text) {
                            setAiResult(data.text);
                            setAiResultTitle('AI老师在线解读');
                            setIsCached(true);
                            setIsAIExpanded(true);
                        }
                    }
                } catch (e) {
                    console.error('Silent cache check failed', e);
                }
            };
            checkCache();
        }
    }, [token?.surface, token?.reading]);

    const handleAIToggle = () => {
        if (aiResult) {
            setIsAIExpanded(!isAIExpanded);
            return;
        }
        handleAIExplain();
    };

    const handleAIExplain = async (forceRefresh = false) => {
        if (isAnalysisGenerating || !token) return;

        setAiResult('');
        setAiResultTitle('AI老师在线解读');
        setIsCached(false);
        setIsAIExpanded(true);

        try {
            // Fetch reference data from dictionary if possible
            const refDef = yomitanEntry?.definitions[0] || "";

            const systemPrompt = `你是一位说话风趣幽默的日语私教，同时也是精通日剧/动漫台词的编剧。正在讲解单词：${token.surface}。

【重要风格指南】
- 严禁使用『』或「」来包裹目标单词。
- 将这个词“翻译”成风趣的人话。

【任务要求】
第1步 - 人话解读：
- 解释单词的含义，并指出它的“语感”或“潜台词”。
- 严禁任何标题。
如果有特殊的“潜台词”一定要指出来。

第2步 - 换行：
- 解读写完后，只输出一个空行。
- **紧接着输出一行标题：例句：** (不要加任何符号)。

第3步 - 场景例句：
- 创作 5 个**全新**的生活化例句。
- 每一组必须包含：一行日文、一行中文（中文必须用 *斜体* 包裹）。
- **每组例句之间只空一行**。
- 格式如下：
  日文句子1
  *中文翻译1*
  (空一行)
  日文句子2
  *中文翻译2*

【警告】
严禁输出 <br>、--- 或其他分隔符，请直接使用换行符。
如果没有输出5个例句，任务即为失败。不要输出任何“总结”或“注意”废话。`;

            const { fromCache } = await generateText(
                `Target Word: ${token.surface}`,
                systemPrompt,
                (text) => setAiResult(text),
                {
                    temperature: 0.85,
                    top_p: 0.95,
                    cacheKey: `word:${token.surface}`,
                    forceRefresh
                }
            );

            setIsCached(fromCache);

        } catch (error) {
            console.error("AI Generation failed", error);
            setAiResult("AI 老师好像在休息，请稍后再试...");
        }
    };

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
            // Switch to client-side loader for better performance
            const results = await yomitanLoader.search(word);

            if (results && results.length > 0) {
                return results[0];
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
        return <GrammarPanel grammar={grammar} settings={settings} isGlobalSpeaking={isGlobalSpeaking} />;
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
        if (isGlobalSpeaking) return;
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

    // 统一渲染单词定义的逻辑
    const renderYomitanDefinitions = () => {
        if (!yomitanEntry) return null;

        const allLines: string[] = [];
        yomitanEntry.definitions.forEach(def => {
            def.split('\n').filter(line => line.trim()).forEach(line => allLines.push(line));
        });

        // 解析并渲染每一行
        return (
            <div className="space-y-4 pb-8">
                {allLines.map((line, i) => {
                    const trimmed = line.trim();
                    if (trimmed.includes('【') && trimmed.includes('】')) return null;

                    // 识别是否是例句：通常以 ▲, ・, 「 开头
                    const isExample = trimmed.startsWith('▲') || trimmed.startsWith('・') || trimmed.startsWith('「');

                    // 增强的分隔逻辑
                    let japanese = '';
                    let chinese = '';

                    if (isExample) {
                        // 1. 先剥离装饰符号
                        let content = trimmed.replace(/^[▲・◯]\s*/, '').trim();

                        // 2. 尝试多种分隔符
                        if (content.includes('。/')) {
                            const p = content.split('。/');
                            japanese = p[0].trim();
                            chinese = p.slice(1).join('。/').trim();
                        } else if (content.includes('」 ')) {
                            // 针对 「...」 翻译 模式：右引号+空格通常是界限
                            const sepIdx = content.indexOf('」 ');
                            japanese = content.substring(0, sepIdx + 1).trim();
                            chinese = content.substring(sepIdx + 1).trim();
                        } else if (content.includes(' ')) {
                            // 最后的手段：普通空格分隔
                            const firstSpaceIdx = content.indexOf(' ');
                            japanese = content.substring(0, firstSpaceIdx).trim();
                            chinese = content.substring(firstSpaceIdx + 1).trim();
                        } else {
                            japanese = content;
                        }

                        // 如果拆分失败（比如 chinese 还是空的，但 japanese 包含了很多空格）
                        // 这种处理是为了容错
                        if (japanese && !chinese && japanese.length > 10 && japanese.includes(' ')) {
                            const lastSpace = japanese.lastIndexOf(' ');
                            chinese = japanese.substring(lastSpace + 1);
                            japanese = japanese.substring(0, lastSpace);
                        }

                        return (
                            <UnifiedExampleItem
                                key={i}
                                japanese={japanese}
                                chinese={chinese}
                                onSpeak={(text) => {
                                    setSpeakingLineIndex(i);
                                    ttsManager.speak(text.replace(/[～〜]/g, baseForm), settings, {
                                        onStart: () => setSpeakingLineIndex(i),
                                        onEnd: () => setSpeakingLineIndex(null)
                                    });
                                }}
                                accentColor={wordAccentColor}
                                targetWord={token.surface}
                                isSpeaking={speakingLineIndex === i}
                            />
                        );
                    }

                    // 普通正文行
                    return (
                        <div key={i} className="text-[16px] leading-relaxed text-[var(--text-muted)]">
                            <UnifiedHighlighter text={trimmed} target={token.surface} color={wordAccentColor} />
                        </div>
                    );
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
    const isMonochrome = settings.colorScheme === 'monochrome';

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

    // Resolve accent color for UI elements (like AI button)
    // Use the glow color as the base brand color for this POS
    const wordAccentColor = isMonochrome
        ? 'var(--text-muted)'
        : isWafu
            ? `var(--wafu-${posKey}-text)`
            : (POS_GLOW_COLORS[token.pos] || POS_GLOW_COLORS[PartOfSpeech.OTHER]);

    const wafuStyle = (isWafu || isMonochrome) ? {
        background: `var(--wafu-${posKey}-bg)`,
        color: `var(--wafu-${posKey}-text)`,
        border: `1px solid var(--wafu-${posKey}-border)`
    } : {};

    return (
        <div className="flex flex-col h-full" style={{ background: 'transparent' }}>
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
                            <div className="flex flex-wrap items-end gap-x-3 w-full">
                                <h2
                                    onClick={handleSpeak}
                                    title="点击朗读"
                                    className={clsx("text-3xl font-black tracking-tight leading-none break-words cursor-pointer hover:opacity-80 transition-opacity", (!isWafu && !isMonochrome) && textClass)} style={(isWafu || isMonochrome) ? { color: `var(--wafu-${posKey}-text)` } : {}}
                                >
                                    {token.surface}
                                </h2>
                            </div>
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

                        {/* Base Form Link (Capsule Style) */}
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
                                className="flex items-center gap-1 mt-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all hover:opacity-80 active:scale-[0.95]"
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${wordAccentColor}, transparent 92%)`,
                                    borderColor: `color-mix(in srgb, ${wordAccentColor}, transparent 70%)`,
                                    color: wordAccentColor
                                }}
                            >
                                <span>原形: {baseForm}</span>
                                <span className="opacity-60 ml-0.5">→</span>
                            </button>
                        )}
                    </div>

                    {/* Right Content: Actions & POS */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        {/* Actions */}
                        <div className="flex gap-1">
                            <button
                                onClick={handleSpeak}
                                className={clsx(
                                    "p-2 rounded-lg transition-all duration-300 active:scale-95",
                                    !isSpeaking && "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                                style={isSpeaking ? {
                                    backgroundColor: `color-mix(in srgb, ${wordAccentColor}, transparent 85%)`,
                                    color: wordAccentColor,
                                    boxShadow: `0 0 10px ${wordAccentColor}33`
                                } : {}}
                                title="朗读"
                            >
                                <Volume2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSaveVocab}
                                className={clsx(
                                    "p-2 rounded-lg transition-all duration-300 active:scale-95",
                                    !isSaved && "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                                style={isSaved ? {
                                    backgroundColor: `color-mix(in srgb, ${wordAccentColor}, transparent 85%)`,
                                    color: wordAccentColor,
                                    boxShadow: `0 0 10px ${wordAccentColor}33`
                                } : {}}
                                title={isSaved ? "已收藏" : "收藏单词"}
                            >
                                <Bookmark className={clsx("w-5 h-5", isSaved && "fill-current")} />
                            </button>
                        </div>

                        {/* POS Tag - Fixed at bottom-right of header */}
                        <span className={clsx(
                            "px-2.5 py-1 text-[16px] font-bold rounded-lg border shadow-sm backdrop-blur-sm",
                            (!isWafu && !isMonochrome) ? "bg-white/10 border-white/10" : ""
                        )}
                            style={{
                                color: wordAccentColor,
                                borderColor: `color-mix(in srgb, ${wordAccentColor}, transparent 70%)`,
                                backgroundColor: `color-mix(in srgb, ${wordAccentColor}, transparent 96%)`
                            }}>
                            {token.pos}
                        </span>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 floating-scrollbar" style={{ scrollbarGutter: 'stable' }}>

                {/* AI Section for Words */}
                <div className="mb-4">
                    <button
                        onClick={handleAIToggle}
                        className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-80 active:scale-[0.98] border shadow-sm mb-4"
                        style={{
                            backgroundColor: aiResultTitle === 'AI老师在线解读' ? `color-mix(in srgb, ${wordAccentColor}, transparent 92%)` : `color-mix(in srgb, ${wordAccentColor}, transparent 96%)`,
                            borderColor: `color-mix(in srgb, ${wordAccentColor}, transparent 70%)`,
                            color: wordAccentColor,
                        }}
                        disabled={isAnalysisGenerating}
                    >
                        {isAnalysisGenerating ? (
                            <Sparkles className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span className="font-bold text-sm">AI老师在线解读</span>
                            </>
                        )}
                    </button>

                    {/* AI Results Section */}
                    {/* AI Results Section */}
                    <Collapsible isOpen={isAIExpanded && !!aiResult} variant="default">
                        <div className="p-4 rounded-xl border border-dashed"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${wordAccentColor}, transparent 96%)`,
                                borderColor: `color-mix(in srgb, ${wordAccentColor}, transparent 80%)`,
                            }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4" style={{ color: wordAccentColor }} />
                                <div className="flex-1 text-sm font-bold" style={{ color: wordAccentColor }}>{aiResultTitle}</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAIExplain(true);
                                    }}
                                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    style={{ color: wordAccentColor }}
                                    title="重新生成"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                {(() => {
                                    const lines = aiResult.split('\n');
                                    let isExampleSection = false;

                                    return lines.map((line, lineIdx) => {
                                        const trimmed = line.trim();

                                        if (trimmed.includes('例句：') || trimmed.includes('例句:')) {
                                            isExampleSection = true;
                                            return <div key={lineIdx} className="font-bold mt-4 mb-2 text-[var(--text-muted)]">{line}</div>;
                                        }

                                        // 检测例句模式
                                        const nextLine = lines[lineIdx + 1]?.trim() || '';
                                        const isTranslation = trimmed.startsWith('*') && trimmed.endsWith('*');
                                        const nextIsTranslation = nextLine.startsWith('*');

                                        if (trimmed && !isTranslation && nextIsTranslation) {
                                            return (
                                                <UnifiedExampleItem
                                                    key={lineIdx}
                                                    japanese={trimmed}
                                                    chinese={nextLine.slice(1, -1)}
                                                    onSpeak={handleSpeak}
                                                    accentColor={wordAccentColor}
                                                    targetWord={token.surface}
                                                />
                                            );
                                        }

                                        if (isTranslation && lines[lineIdx - 1]?.trim() && !lines[lineIdx - 1]?.trim().startsWith('*')) return null;

                                        return (
                                            <div key={lineIdx} className={trimmed ? "mb-2" : "h-2"}>
                                                <UnifiedHighlighter text={trimmed} target={token.surface} color={wordAccentColor} />
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </Collapsible>
                </div>

                <div>
                    {isLoadingDict ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                        </div>
                    ) : (
                        renderYomitanDefinitions()
                    )}
                </div>

                {/* Pitch Footer Removed */}
            </div>
        </div >
    );
}
