'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Collapsible } from './Collapsible';
import { Volume2, Bookmark, BookOpen, Sparkles, ChevronRight, RotateCw, Search, Send } from 'lucide-react';
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
// 核心文本高亮组件：支持多关键词自动识别、加粗并染色
function UnifiedHighlighter({ text, target, color, isChinese = false, replaceTilde = false }: { text: string; target: string; color: string; isChinese?: boolean, replaceTilde?: boolean }) {
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
    // 根据开关决定是否匹配波浪号
    const escaped = sortedKeywords.map(k => k.replace(/[./*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const pattern = replaceTilde ? `(${escaped}|[～〜~])` : `(${escaped})`;
    const regex = new RegExp(pattern, 'g');

    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                const isTilde = replaceTilde && /[～〜~]/.test(part);
                const isMatch = sortedKeywords.some(k => k === part) || isTilde;

                if (isMatch) {
                    // 如果是波浪号且开启了替换，显示为目标词 (baseTarget)
                    return <strong key={i} className="font-bold" style={{ color }}>{isTilde ? baseTarget : part}</strong>;
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
    isSpeaking = false,
    replaceTilde = false
}: {
    japanese: string;
    chinese?: string;
    onSpeak: (text: string) => void;
    accentColor: string;
    targetWord: string;
    isSpeaking?: boolean;
    replaceTilde?: boolean;
}) {
    return (
        <div className="mt-3 first:mt-1 mb-3 group animate-in slide-in-from-left-2 duration-300">
            {/* 日文行 */}
            <div className="flex items-start gap-2">
                {/* 播放按钮 */}
                {/* 播放按钮 (无背景，顶对齐) */}
                <button
                    onClick={() => onSpeak(japanese)}
                    className={clsx(
                        "p-0.5 rounded transition-all shrink-0 mt-[3px] opacity-70 group-hover:opacity-100",
                        isSpeaking && "animate-pulse"
                    )}
                    style={{ color: accentColor }}
                    title="播放"
                >
                    <Volume2 className="w-4 h-4" />
                </button>

                {/* 文字内容 - 日文 */}
                <div className="flex-1 text-[16px] leading-relaxed break-words font-medium text-[var(--text-muted)]">
                    <UnifiedHighlighter text={japanese} target={targetWord} color={accentColor} replaceTilde={replaceTilde} />
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
                    replaceTilde={true} // 原字典示例，开启波浪号替换
                />
            )}

            {/* 原日文释义 */}
            {grammar.meaning && (
                <div className="pt-2 border-t border-dashed border-[var(--border-muted)] opacity-80 text-[14px] flex items-baseline gap-1">
                    <strong className="font-bold shrink-0" style={{ color: grammarColor }}>日文义项:</strong>
                    <div className="flex-1">
                        <UnifiedHighlighter text={grammar.meaning} target={grammar.title} color={grammarColor} />
                    </div>
                </div>
            )}
        </div>
    );
}

// 渲染语法详情 - 样式与单词卡片保持一致
function GrammarPanel({ grammar, settings, isGlobalSpeaking }: { grammar: GrammarEntry; settings: AppSettings; isGlobalSpeaking: boolean }) {
    const { addGrammar, removeGrammar, isGrammarSaved } = useGrammarStore();
    const { generateText, streamedResults, cancelGeneration } = useGeminiStore();
    const isSaved = isGrammarSaved(grammar.id);
    const grammarCacheKey = `grammar:${grammar.title}`;
    const streamedContent = streamedResults.get(grammarCacheKey);
    const isGenerating = streamedContent !== undefined;


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

    // Clear AI result when switching grammar
    useEffect(() => {
        setAiResult('');
        setAiResultTitle('');
        setIsCached(false);
        setIsAIExpanded(false);
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
        if (isGenerating) return;

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

            const systemPrompt = `你是一位拥有20年教学经验的资深日语老师。
**必须全程使用中文进行讲解。**
正在讲解语法：${grammar.title}

【输出规则】
- **严禁使用Emoji表情符号**。
- **严禁使用拼音**。
- **严禁任何开场白（如“你好”、“作为...”），直接输出第一个对应板块。**
- 所有日文汉字必须标注假名，格式为：漢字（かんじ）。
- 保持Markdown格式，总字数控制在500字以内。

【输出格式】
请严格按照以下三个板块输出（板块标题加粗，但不要使用Markdown星号）：

接续与含义
- 清晰列出接续方式（例如：动词它形 + ほうがいい）。
- 用简洁的中文解释该语法的核心含义。

老师划重点
这里是关键部分。请重点讲解：
- “情绪潜台词”：这个语法包含了什么样的情感（建议、后悔、强迫、客观描述等）？
- 易混淆点：它和相似语法有什么区别？
- 使用限制：只能对长辈用？还是只能用于消极结果？
- 语言风格需通俗易懂，像私教面对面点拨一样。

场景例句
提供3个地道的日文例句，展示该语法的典型用法。
格式：
- 日文句子（汉字带注音）
- 中文翻译`;

            // Use simple user prompt like Word Interpretation
            const currentGrammarId = grammar.id; // Capture ID for validation
            const { fromCache, text } = await generateText(
                `Target Grammar: ${grammar.title}`,
                systemPrompt,
                undefined, // Use Store for streaming
                {
                    temperature: 0.85,
                    top_p: 0.95,
                    cacheKey: `grammar:${grammar.title}`,
                    forceRefresh
                }
            );

            // Simple Validation: Are we still on the same grammar?
            if (currentGrammarId === grammar.id) {
                setAiResult(text);
                setIsCached(fromCache);
            }


        } catch (error: any) {
            console.error("AI Generation failed", error);
            setAiResult(error.message || "AI 老师好像在休息，请稍后再试...");
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
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Sparkles className="w-4 h-4 animate-spin" />
                                <span className="font-bold text-sm">AI正在解读中...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span className="font-bold text-sm">AI老师在线解读</span>
                            </>
                        )}
                    </button>

                    {/* AI Results Section */}
                    <Collapsible isOpen={isAIExpanded && (!!aiResult || isGenerating)} variant="default">
                        <div className="p-4 rounded-xl border border-dashed"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${grammarColor}, transparent 96%)`,
                                borderColor: `color-mix(in srgb, ${grammarColor}, transparent 80%)`,
                            }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4" style={{ color: grammarColor }} />
                                <div className="flex-1 text-sm font-bold flex items-center gap-2" style={{ color: grammarColor }}>
                                    {aiResultTitle}
                                    {aiResult && (
                                        <span className="text-[10px] font-normal opacity-60">
                                            ({aiResult.length} 字)
                                        </span>
                                    )}
                                </div>
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
                                    // Prefer streaming content, fallback to aiResult (which is actively updated via onUpdate callback)
                                    // This dual-source approach ensures responsiveness
                                    const displayText = (isGenerating ? (streamedContent || aiResult) : aiResult) || "正在思考中...";
                                    const lines = displayText.split('\n');

                                    return lines.map((line, lineIdx) => {
                                        const trimmed = line.trim();
                                        if (trimmed.includes('场景例句') || trimmed.includes('接续与含义') || trimmed.includes('老师划重点')) {
                                            return <div key={lineIdx} className="font-bold mt-4 mb-2 text-[var(--accent-primary)]" style={{ color: grammarColor }}>{line.replace(/\*+/g, '')}</div>;
                                        }

                                        // 重新适配例句检测
                                        const nextLine = (lines[lineIdx + 1] || '').trim();
                                        // 简单识别：如果当前行是日文（含汉字/假名）且下一行是纯中文，且当前行不是标题
                                        const cleanTrimmed = trimmed.replace(/^[-*]\s*/, '').replace(/\*+/g, '');
                                        const cleanNext = nextLine.replace(/^[-*]\s*/, '').replace(/\*+/g, '');

                                        const isJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleanTrimmed);
                                        // 宽松的中文判定：允许所有全角字符范围，确保问号 ？ (FF1F) 等能被匹配
                                        const isChinese = /^[\u4e00-\u9faf\uff00-\uffef\u3000-\u303f（）\(\)a-zA-Z0-9\s]+$/.test(cleanNext);

                                        if (trimmed && isJapanese && nextLine && isChinese && !trimmed.startsWith('**') && !trimmed.includes('：')) {
                                            return (
                                                <UnifiedExampleItem
                                                    key={lineIdx}
                                                    japanese={cleanTrimmed}
                                                    chinese={cleanNext}
                                                    onSpeak={handleSpeak}
                                                    accentColor={grammarColor}
                                                    targetWord={grammar.title}
                                                />
                                            );
                                        }

                                        // 跳过已被包含在 UnifiedExampleItem 的翻译行
                                        const prevLine = (lines[lineIdx - 1] || '').trim();
                                        const cleanPrev = prevLine.replace(/^[-*]\s*/, '').replace(/\*+/g, '');
                                        const prevIsJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleanPrev);
                                        const currentIsChinese = /^[\u4e00-\u9faf\uff00-\uffef\u3000-\u303f（）\(\)a-zA-Z0-9\s]+$/.test(trimmed.replace(/^[-*]\s*/, '').replace(/\*+/g, ''));

                                        if (currentIsChinese && prevIsJapanese && !prevLine.startsWith('**') && !prevLine.includes('：')) return null;

                                        return (
                                            <div key={lineIdx} className={trimmed ? "mb-2" : "h-2"}>
                                                <UnifiedHighlighter text={trimmed.replace(/\*+/g, '')} target={grammar.title} color={grammarColor} />
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
    const { selectedToken: token, selectedGrammar: grammar, currentSentence, settings, isSpeaking: isGlobalSpeaking, setSelectedToken, setSelectedGrammar, layout } = useAppStore();
    const [panelInput, setPanelInput] = useState('');
    const { addVocab, isWordSaved, removeVocab, vocabList } = useVocabStore();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingLineIndex, setSpeakingLineIndex] = useState<number | null>(null);
    const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
    const [yomitanEntry, setYomitanEntry] = useState<YomitanResult | null>(null);
    const [dictLang] = useState<'en' | 'jp' | 'zh'>('zh'); // 默认中文
    const [isLoadingDict, setIsLoadingDict] = useState(false);

    // No more complex refs needed
    // const tokenRef = React.useRef(token);
    // useEffect(() => { tokenRef.current = token; }, [token]);

    // AI State for Words
    const { generateText, streamedResults, cancelGeneration } = useGeminiStore();
    const wordCacheKey = token ? `word:${token.surface}` : '';
    const streamedContent = streamedResults.get(wordCacheKey);
    const isGenerating = streamedContent !== undefined;
    const [aiResult, setAiResult] = useState<string>('');
    const [aiResultTitle, setAiResultTitle] = useState<string>('');
    const [isCached, setIsCached] = useState(false);
    const [isAIExpanded, setIsAIExpanded] = useState(false);

    const handlePanelLookup = (text: string) => {
        if (!text.trim()) return;
        setPanelInput(''); // Clear input

        // Create a manual token
        const token: WordToken = {
            id: `manual-${Date.now()}`,
            surface: text,
            reading: '',
            romaji: '',
            pos: PartOfSpeech.OTHER,
            baseForm: text,
        };
        setSelectedGrammar(null); // 1. 先清除语法状态 (这会副作用把 token 设为 null)
        setSelectedToken(token);  // 2. 再设置新的 Token
    };

    const renderLookupInput = () => {
        return (
            <div className="shrink-0 p-4 pt-2 border-t border-[var(--border-default)] bg-transparent">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handlePanelLookup(panelInput);
                    }}
                    className="flex items-center gap-2 p-1.5 pl-4 pr-1.5 rounded-xl bg-[var(--bg-muted)] transition-all focus-within:bg-[var(--bg-elevated)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/10"
                >
                    <input
                        type="text"
                        value={panelInput}
                        onChange={(e) => setPanelInput(e.target.value)}
                        placeholder="输入单词或语法进行查询..."
                        className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none !border-none !ring-0 !outline-none text-[15px] placeholder-[var(--text-muted)] text-[var(--text-primary)] min-w-0"
                    />
                    <button
                        type="submit"
                        disabled={!panelInput.trim()}
                        className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </form>
            </div>
        );
    };

    // Clear AI result when switching words
    useEffect(() => {
        // If we switch to an item that is ALREADY generating, auto-expand
        if (isGenerating) {
            setTimeout(() => {
                setAiResult('');
                setAiResultTitle('AI老师在线解读');
                setIsAIExpanded(true);
            }, 0);
            return;
        }

        // Always reset local state when switching words
        setTimeout(() => {
            setAiResult('');
            setAiResultTitle('');
            setIsCached(false);
            setIsAIExpanded(false);
        }, 0);
    }, [token?.surface, token?.reading]);

    const handleAIToggle = () => {
        if (aiResult) {
            setIsAIExpanded(!isAIExpanded);
            return;
        }
        handleAIExplain();
    };

    const handleAIExplain = async (forceRefresh = false) => {
        if (isGenerating || !token) return;

        setAiResult('');
        setAiResultTitle('AI老师在线解读');
        setIsCached(false);
        setIsAIExpanded(true);

        try {
            // Fetch reference data from dictionary if possible
            const refDef = yomitanEntry?.definitions[0] || "";

            const systemPrompt = `你是一位拥有20年教学经验的资深日语老师。
**必须全程使用中文进行讲解。**
当前输入的词汇是：${token.surface}

【逻辑判断与预处理】
1. **中文识别**：如果用户输入的是中文词汇（且不是标准日语汉字），请先将其翻译成最常用的日语单词。
   - 例如：输入“冰箱”，转为“冷蔵庫”进行讲解。
   - 例如：输入“先生”，直接按日语“先生”讲解。
2. **目标锁定**：接下来的所有讲解，必须针对这个**日语单词**进行。

【输出规则】
- **严禁使用Emoji表情符号**。
- **严禁使用拼音**。
- **严禁任何开场白（如“你好”、“作为...”），直接输出第一个对应板块。**
- 所有日文汉字必须标注假名，格式为：漢字（かんじ）。
- 保持Markdown格式，总字数控制在500字以内。

【输出格式】
请严格按照以下三个板块输出（板块标题加粗，但不要使用Markdown星号）：

核心含义
(如果输入是中文，先在第一行写：对应的日语是「单词（假名）」)
第一行：列出单词、假名读音、声调（如有）。
第二行：用简洁的中文解释核心意思。

老师划重点
这里是比字典更详细的部分。请解释：
- 语感差异（它是书面语还是口语？）。
- 使用场景（是对上级用还是朋友用？）。
- 避坑指南（中国学生容易错的地方，或近义词辨析）。
- 语言风格需通俗易懂，直击要点，不要啰嗦。

场景例句
提供3个地道的日文例句，涵盖不同生活场景。
格式：
- 日文句子（汉字带注音）
- 中文翻译`;
            // Start Generation
            const currentTokenSurface = token.surface; // Capture for validation
            const { fromCache, text } = await generateText(
                `Target Word: ${token.surface}\nContext: ${currentSentence || "No context provided."}`,
                systemPrompt,
                undefined, // Use Store for streaming
                {
                    temperature: 0.85,
                    top_p: 0.95,
                    cacheKey: `word:${token.surface}`,
                    forceRefresh
                }
            );

            // Validation without Refs
            if (token.surface === currentTokenSurface) {
                setAiResult(text);
                setIsCached(fromCache);
            }

        } catch (error: any) {
            console.error("AI Generation failed", error);
            setAiResult(error.message || "AI 老师好像在休息，请稍后再试...");
        }
    };

    // 当 token 变化时，重置朗读状态（不停止 TTS，让自动朗读正常工作）
    // 当 token 变化时，重置朗读状态（不停止 TTS，让自动朗读正常工作）
    useEffect(() => {
        setTimeout(() => {
            setIsSpeaking(false);
            setSpeakingLineIndex(null);
        }, 0);
    }, [token]);

    // 自动触发 manual 查询的 AI 解读
    useEffect(() => {
        if (token?.id?.startsWith('manual-')) {
            // 延迟 300ms，确保 reset 逻辑（timeout 0）执行完毕后再触发
            const timer = setTimeout(() => {
                console.log("Triggering manual AI explain for", token.surface);
                setIsAIExpanded(true); // 强制展开
                handleAIExplain(false); // Default to cache first for manual lookup
            }, 300);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token?.id]);

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
    const fetchYomitanDictionary = useCallback(async (word: string, fallbackWord?: string) => {
        try {
            // Helpers
            const tryFetch = async (query: string): Promise<YomitanResult[] | null> => {
                // 1. Try Local Loader (Non-blocking check)
                const resLocal = await yomitanLoader.search(query);
                if (resLocal && resLocal.length > 0) return resLocal;

                // 2. Try API Fallback
                try {
                    const resApi = await fetch(`/api/dictionary/yomitan?keyword=${encodeURIComponent(query)}`);
                    const data = await resApi.json();
                    if (data.success && data.results && data.results.length > 0) {
                        return data.results;
                    }
                } catch (e) {
                    console.warn('API fallback error', e);
                }
                return null;
            };

            // Strategy: 
            // 1. Try Primary Word (Base Form)
            let results = await tryFetch(word);

            // 2. Try Fallback Word (Surface) if primary failed
            if (!results && fallbackWord && fallbackWord !== word) {
                results = await tryFetch(fallbackWord);
            }

            if (results && results.length > 0) {
                return results[0];
            }

            // 3. Fallback: Google Translate (with timeout to prevent hanging)
            // 格式化为 "原文。/译文" 以匹配渲染逻辑
            const translation = await Promise.race([
                translateText(word, 'zh-CN', 'ja'),
                new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Translation Timeout')), 5000))
            ]).catch((err) => {
                console.warn('Translation fallback skipped:', err);
                return '';
            });

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
            setTimeout(() => {
                setDictEntry(null);
                setYomitanEntry(null);
            }, 0);
            return;
        }

        setTimeout(() => {
            setIsLoadingDict(true);
        }, 0);
        const base = getDeinflectedForm(token);

        // 根据语言选择不同的词典
        if (dictLang === 'zh') {
            // 中文模式：使用 Yomitan (明鏡日汉双解辞典)
            fetchYomitanDictionary(base, token.surface).then(entry => {
                if (isMounted) {
                    setYomitanEntry(entry);
                    setDictEntry(null);
                    setIsLoadingDict(false);
                }
            }).catch(() => {
                if (isMounted) setIsLoadingDict(false);
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
        return (
            <div className="flex flex-col h-full" style={{ background: 'transparent' }}>
                <div className="flex-1 overflow-hidden relative w-full h-full">
                    <GrammarPanel grammar={grammar} settings={settings} isGlobalSpeaking={isGlobalSpeaking} />
                </div>
                {renderLookupInput()}
            </div>
        );
    }

    if (!token) {
        return (
            <div className="flex flex-col h-full" style={{ background: 'transparent' }}>
                <div className="flex-1 overflow-hidden relative w-full h-full flex flex-col items-center justify-center p-8" style={{ color: 'var(--text-faint)' }}>
                    <BookOpen className="w-12 h-12 mb-3 stroke-1" />
                    <p className="text-sm font-medium">単語を選択してください</p>
                    <p className="text-xs text-center mt-1 w-32">
                        本文中の単語をクリックすると、ここに意味が表示されます
                    </p>
                </div>
                {renderLookupInput()}
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

    const handleSpeak = (textOrEvent?: string | React.MouseEvent | React.KeyboardEvent) => {
        if (isGlobalSpeaking) return;

        // Determine what to speak: 
        // If it's a string, use it (from example items). 
        // Otherwise use token.surface (from header icon).
        const textToSpeak = typeof textOrEvent === 'string' ? textOrEvent : token.surface;

        setIsSpeaking(true);
        ttsManager.speak(
            textToSpeak,
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
        if (!yomitanEntry) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] opacity-60 px-4 text-center">
                    <Search className="w-8 h-8 mb-2 opacity-50" />
                    <p className="font-medium text-sm">未找到「{token.surface}」的释义</p>
                    <p className="text-xs mt-1 opacity-70">请检查输入或尝试搜索其他形式</p>
                </div>
            );
        }

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
                        const content = trimmed.replace(/^[▲・◯]\s*/, '').trim();

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
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 floating-scrollbar overscroll-y-none" style={{ scrollbarGutter: 'stable' }}>

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
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Sparkles className="w-4 h-4 animate-spin" />
                                <span className="font-bold text-sm">AI正在解读中...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span className="font-bold text-sm">AI老师在线解读</span>
                            </>
                        )}
                    </button>

                    {/* AI Results Section */}
                    {/* AI Results Section */}
                    <Collapsible isOpen={isAIExpanded && (!!aiResult || isGenerating)} variant="default">
                        <div className="p-4 rounded-xl border border-dashed"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${wordAccentColor}, transparent 96%)`,
                                borderColor: `color-mix(in srgb, ${wordAccentColor}, transparent 80%)`,
                            }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4" style={{ color: wordAccentColor }} />
                                <div className="flex-1 text-sm font-bold flex items-center gap-2" style={{ color: wordAccentColor }}>
                                    {aiResultTitle}
                                    {aiResult && (
                                        <span className="text-[10px] font-normal opacity-60">
                                            ({aiResult.length} 字)
                                        </span>
                                    )}
                                </div>
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
                                    const displayText = (isGenerating ? (streamedContent || aiResult) : aiResult) || "正在思考中...";
                                    const lines = displayText.split('\n');
                                    return lines.map((line, lineIdx) => {
                                        const trimmed = line.trim();

                                        if (trimmed.includes('场景例句') || trimmed.includes('核心含义') || trimmed.includes('老师划重点')) {
                                            return <div key={lineIdx} className="font-bold mt-4 mb-2 text-[var(--accent-primary)]" style={{ color: wordAccentColor }}>{line.replace(/\*+/g, '')}</div>;
                                        }
                                        if (trimmed.includes('例句：') || trimmed.includes('例句:')) {
                                            return <div key={lineIdx} className="font-bold mt-4 mb-2 text-[var(--text-primary)]">{line}</div>;
                                        }

                                        // 重新适配例句检测 (支持 - 开头或普通文本对)
                                        const nextLine = (lines[lineIdx + 1] || '').trim();
                                        // 简单识别：如果当前行是日文（含汉字/假名）且下一行是纯中文，且当前行不是标题
                                        const cleanTrimmed = trimmed.replace(/^[-*]\s*/, '').replace(/\*+/g, '');
                                        const cleanNext = nextLine.replace(/^[-*]\s*/, '').replace(/\*+/g, '');

                                        // 宽松的日语判定：包含日文字符即可
                                        const isJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleanTrimmed);
                                        // 宽松的中文判定：允许所有全角字符范围，确保问号 ？ (FF1F) 等能被匹配
                                        const isChinese = /^[\u4e00-\u9faf\uff00-\uffef\u3000-\u303f（）\(\)a-zA-Z0-9\s]+$/.test(cleanNext);

                                        if (trimmed && isJapanese && nextLine && isChinese && !trimmed.startsWith('**') && !trimmed.includes('：')) {
                                            return (
                                                <UnifiedExampleItem
                                                    key={lineIdx}
                                                    japanese={cleanTrimmed}
                                                    chinese={cleanNext}
                                                    onSpeak={handleSpeak}
                                                    accentColor={wordAccentColor}
                                                    targetWord={token.surface}
                                                />
                                            );
                                        }

                                        // 跳过已被包含在 UnifiedExampleItem 的翻译行
                                        const prevLine = (lines[lineIdx - 1] || '').trim();
                                        const cleanPrev = prevLine.replace(/^[-*]\s*/, '').replace(/\*+/g, '');
                                        const prevIsJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleanPrev);
                                        // 重复使用同样的中文判定逻辑
                                        const currentIsChinese = /^[\u4e00-\u9faf\uff00-\uffef\u3000-\u303f（）\(\)a-zA-Z0-9\s]+$/.test(trimmed.replace(/^[-*]\s*/, '').replace(/\*+/g, ''));

                                        if (currentIsChinese && prevIsJapanese && !prevLine.startsWith('**') && !prevLine.includes('：')) return null;

                                        return (
                                            <div key={lineIdx} className={trimmed ? "mb-2" : "h-2"}>
                                                <UnifiedHighlighter text={trimmed.replace(/\*+/g, '')} target={token.surface} color={wordAccentColor} />
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

            {/* Bottom Lookup Input */}
            {renderLookupInput()}
        </div >
    );
}
