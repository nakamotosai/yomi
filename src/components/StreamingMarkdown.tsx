'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';

const MARKDOWN_DELIMITERS = ['***', '___', '**', '__', '*', '_'];
const AI_CHAT_HEADING_MARKER_START = '%%YOMI_AI_HEADING_START%%';
const AI_CHAT_HEADING_MARKER_END = '%%YOMI_AI_HEADING_END%%';
const LATEX_SYMBOLS: Array<[RegExp, string]> = [
    [/\$\s*\\(?:long)?rightarrow\s*\$/g, '→'],
    [/\$\s*(?:\\Rightarrow|\\Longrightarrow|\\implies)\s*\$/g, '⇒'],
    [/\$\s*\\(?:long)?leftarrow\s*\$/g, '←'],
    [/\$\s*(?:\\Leftarrow|\\Longleftarrow)\s*\$/g, '⇐'],
    [/\$\s*\\(?:long)?leftrightarrow\s*\$/g, '↔'],
    [/\$\s*(?:\\Leftrightarrow|\\Longleftrightarrow|\\iff)\s*\$/g, '⇔'],
    [/\\\(\s*\\(?:long)?rightarrow\s*\\\)/g, '→'],
    [/\\\(\s*(?:\\Rightarrow|\\Longrightarrow|\\implies)\s*\\\)/g, '⇒'],
    [/\\\(\s*\\(?:long)?leftarrow\s*\\\)/g, '←'],
    [/\\\(\s*(?:\\Leftarrow|\\Longleftarrow)\s*\\\)/g, '⇐'],
    [/\\\(\s*\\(?:long)?leftrightarrow\s*\\\)/g, '↔'],
    [/\\\(\s*(?:\\Leftrightarrow|\\Longleftrightarrow|\\iff)\s*\\\)/g, '⇔'],
    [/\\(?:long)?rightarrow\b/g, '→'],
    [/\\(?:Rightarrow|Longrightarrow)\b/g, '⇒'],
    [/\\(?:long)?leftarrow\b/g, '←'],
    [/\\(?:Leftarrow|Longleftarrow)\b/g, '⇐'],
    [/\\(?:long)?leftrightarrow\b/g, '↔'],
    [/\\(?:Leftrightarrow|Longleftrightarrow)\b/g, '⇔'],
    [/\\implies\b/g, '⇒'],
    [/\\iff\b/g, '⇔'],
    [/\\to\b/g, '→'],
];

function normalizeInlineEmphasisBoundaries(text: string) {
    const quoteWrapped = text.replace(/(\*{2,3})[「『“]([^*\n]+?)[」』”]\1/g, '$1$2$1');

    return quoteWrapped
        .replace(/([^\s*_`])(\*{2,3}[^*\n]+?\*{2,3})/g, '$1 $2');
}

function normalizeLatexSymbols(text: string) {
    return LATEX_SYMBOLS.reduce((current, [pattern, replacement]) => (
        current.replace(pattern, replacement)
    ), text);
}

export function normalizeMarkdownDisplay(text: string) {
    return normalizeInlineEmphasisBoundaries(normalizeLatexSymbols(text));
}

const AI_CHAT_HEADING_PREFIXES = [
    '核心含义与基本用法',
    '核心含义与用法',
    '核心含义与语用功能',
    '核心含义与使用场景',
    '核心含义',
    '核心用法',
    '基本用法',
    '主要用法',
    '用法说明',
    '特殊用法',
    '常见用法',
    '核心区别',
    '用法区别',
    '区别',
    '易错点与注意事项',
    '常见错误',
    '易错点',
    '易错用法',
    '注意事项',
    '使用场景',
    '语感差异',
    '常见搭配',
    '搭配限制',
    '接续与含义',
    '接续规则',
    '后续建议',
    '练习建议',
    '总结',
];
const AI_CHAT_HEADING_KEYWORDS = [
    '核心',
    '含义',
    '意味',
    '用法',
    '使い方',
    '区别',
    '差异',
    '差別',
    '相似语法',
    '相似表現',
    '特殊',
    '易错',
    '常见',
    '注意',
    '场景',
    '語感',
    '语感',
    '搭配',
    '接续',
    '接続',
    '结构',
    '構造',
    '限制',
    '关键限制',
    '重点',
    '规则',
    'まとめ',
    '总结',
    '總結',
    '建议',
    '練習',
    '练习',
];

function stripStrong(value: string) {
    const unwrapped = stripAIChatHeadingMarker(value)
        .trim()
        .replace(/^(\*{2,3}|_{2,3})([\s\S]+)\1$/, '$2')
        .trim();
    return stripInlineMarkdownEmphasisSyntax(unwrapped);
}

function getAIChatHeadingPrefix(value: string) {
    const plain = stripStrong(value);
    return AI_CHAT_HEADING_PREFIXES.find((prefix) => plain.startsWith(prefix)) || '';
}

function isAIChatContentLabel(value: string) {
    const plain = stripStrong(value);
    return /^(?:例|例句|示例|短语|短語|場景|场景|作谓语|作謂語|作定语|作定語|变形规则|變形規則|连用形|連用形|否定形|过去形|過去形|辞书形|辞書形|て形|た形|搭配|注意|补充|補充|避坑|避坑指南|提示|正确|錯誤|错误|正しい|誤り|接续|接続|含义|意味|语调|語調|读音|読み方|例文|中文|日文|区别|差异|差別|语感差异|語感差異|使用场景|使用場景|易混淆点|易混淆點|使用限制|搭配对象|搭配對象|语法结构|語法結構)(?:[（(][^）)]*[）)])?[:：]/.test(plain);
}

function isLikelyAIChatHeadingLabel(value: string) {
    const plain = stripStrong(value).replace(/^[#>\s]+/, '').trim();
    if (!plain || isAIChatContentLabel(plain)) return false;
    if (/[。！？!?；;]/.test(plain)) return false;
    if (/[:：]/.test(plain)) return false;

    const compact = plain.replace(/\s/g, '');
    if (compact.length < 2 || compact.length > 24) return false;
    if (/[「」『』"'“”]/.test(compact)) return false;

    return /^(?:第[一二三四五六七八九十\d]+(?:种|类)?|[一二三四五六七八九十\d]+\.?)/.test(compact)
        || AI_CHAT_HEADING_KEYWORDS.some((keyword) => compact.includes(keyword));
}

function splitAIChatHeading(value: string, allowInferredHeading = false) {
    const plain = stripStrong(value);
    if (!plain || isAIChatContentLabel(plain)) return null;

    if (allowInferredHeading) {
        const colonMatch = plain.match(/^([^：:]{2,24})([：:].*)$/);
        if (colonMatch && isLikelyAIChatHeadingLabel(colonMatch[1])) {
            return {
                heading: colonMatch[1].trim(),
                rest: colonMatch[2],
            };
        }

        const leadingSpaceMatch = plain.match(/^(\S{2,24})(\s+.+)$/);
        if (leadingSpaceMatch && isLikelyAIChatHeadingLabel(leadingSpaceMatch[1])) {
            return {
                heading: leadingSpaceMatch[1].trim(),
                rest: leadingSpaceMatch[2],
            };
        }

        if (isLikelyAIChatHeadingLabel(plain)) {
            return {
                heading: plain,
                rest: '',
            };
        }
    }

    const prefix = getAIChatHeadingPrefix(plain);
    if (prefix) {
        return {
            heading: prefix,
            rest: plain.slice(prefix.length),
        };
    }

    if (!allowInferredHeading) return null;

    return null;
}

function markAIChatHeading(heading: string) {
    const normalizedHeading = normalizeAIChatHeadingText(heading);
    return `**${AI_CHAT_HEADING_MARKER_START}${normalizedHeading}${AI_CHAT_HEADING_MARKER_END}**`;
}

function stripAIChatHeadingMarker(value: string) {
    return value
        .replaceAll(AI_CHAT_HEADING_MARKER_START, '')
        .replaceAll(AI_CHAT_HEADING_MARKER_END, '');
}

function stripInlineMarkdownEmphasisSyntax(value: string) {
    return value
        .replace(/(\*{1,3}|_{1,3})(?=\S)([\s\S]*?\S)\1/g, '$2')
        .replace(/[*_]{1,3}/g, '')
        .trim();
}

function normalizeAIChatHeadingText(value: string) {
    return stripInlineMarkdownEmphasisSyntax(stripAIChatHeadingMarker(value))
        .replace(/([\u3040-\u30ff\u3400-\u9fff])\s+(?=[\u3040-\u30ff\u3400-\u9fff])/g, '$1')
        .trim();
}

function getMarkedAIChatHeading(value: string) {
    const text = String(value).trim();
    if (!text.startsWith(AI_CHAT_HEADING_MARKER_START) || !text.endsWith(AI_CHAT_HEADING_MARKER_END)) {
        return '';
    }
    return text
        .slice(AI_CHAT_HEADING_MARKER_START.length, -AI_CHAT_HEADING_MARKER_END.length)
        .trim();
}

function normalizeAIChatNumberedStructure(text: string) {
    const normalized = normalizeMarkdownDisplay(text).replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const output: string[] = [];
    let inCodeFence = false;
    let secondLevelIndex = 0;
    const secondLevelLetters = 'abcdefghijklmnopqrstuvwxyz';

    const pushBlankBeforeHeading = () => {
        if (output.length > 0 && output[output.length - 1].trim() !== '') {
            output.push('');
        }
    };
    const pushAIChatHeading = (indent: string, heading: string, rest = '') => {
        secondLevelIndex = 0;
        pushBlankBeforeHeading();
        output.push(`${indent}${markAIChatHeading(heading)}`);
        output.push('');
        const cleanedRest = rest.trim().replace(/^[:：]\s*/, '');
        if (cleanedRest) {
            output.push(`${indent}${cleanedRest}`);
        }
    };

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (trimmed.startsWith('```')) {
            inCodeFence = !inCodeFence;
            output.push(rawLine);
            continue;
        }

        if (inCodeFence) {
            output.push(rawLine);
            continue;
        }

        const strongLineMatch = rawLine.match(/^(\s*)(\*{2}|_{2})(.+?)\2([^\n]*)$/);
        if (strongLineMatch) {
            const [, indent, , strongText, rest = ''] = strongLineMatch;
            const combined = `${strongText}${rest}`.trim();
            if (isAIChatContentLabel(combined)) {
                output.push(rawLine);
                continue;
            }
            const strongHeading = splitAIChatHeading(strongText, true);
            const heading = strongHeading || splitAIChatHeading(combined, true);
            if (heading) {
                pushAIChatHeading(indent, heading.heading, strongHeading ? rest : heading.rest);
                continue;
            }
        }

        const topLevelMatch = rawLine.match(/^(\s*)(\d+)\.\s*(\S.+?)\s*$/);
        if (topLevelMatch) {
            const [, indent, , title] = topLevelMatch;
            if (/^\d/.test(title.trim())) {
                output.push(rawLine);
                continue;
            }
            if (isAIChatContentLabel(title)) {
                pushBlankBeforeHeading();
                output.push(`${indent}${title.trim()}`);
                continue;
            }
            const heading = splitAIChatHeading(title, true);
            if (!heading) {
                output.push(`${indent}${title.trim()}`);
                continue;
            }
            pushAIChatHeading(indent, heading.heading, heading.rest);
            continue;
        }

        const bulletTopLevelMatch = rawLine.match(/^(\s*)[-*]\s+(?:\*\*)?(.+?)(?:\*\*)?\s*$/);
        if (bulletTopLevelMatch) {
            const [, indent, title] = bulletTopLevelMatch;
            const heading = splitAIChatHeading(title, true);
            if (!heading) {
                output.push(rawLine);
                continue;
            }
            pushAIChatHeading(indent, heading.heading, heading.rest);
            continue;
        }

        const secondLevelMatch = rawLine.match(/^(\s*)([a-z])\.\s*(\S.+?)\s*$/);
        if (secondLevelMatch) {
            const [, indent, , body] = secondLevelMatch;
            const letter = secondLevelLetters[secondLevelIndex] || secondLevelLetters[secondLevelLetters.length - 1];
            secondLevelIndex += 1;
            pushBlankBeforeHeading();
            output.push(`${indent}${letter}. ${body.trim()}`);
            continue;
        }

        output.push(rawLine);
    }

    return output.join('\n').replace(/\n{3,}/g, '\n\n').trimStart();
}

function escapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getNormalizedHighlightTerms(highlightTerms: string[]) {
    return [...new Set(highlightTerms.map((term) => term.trim()).filter(Boolean))]
        .sort((a, b) => b.length - a.length);
}

function applyHighlightTerms(text: string, highlightTerms: string[]) {
    const terms = getNormalizedHighlightTerms(highlightTerms);
    if (terms.length === 0) return text;

    const lines = text.split('\n');
    let inCodeFence = false;

    return lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            inCodeFence = !inCodeFence;
            return line;
        }
        if (inCodeFence || /^\s*\*\*.+\*\*\s*$/.test(line)) {
            return line;
        }

        return terms.reduce((current, term) => {
            const pattern = new RegExp(escapeRegExp(term), 'g');
            return current.replace(pattern, (match, offset, fullText) => {
                const before = fullText[offset - 1] || '';
                const after = fullText[offset + match.length] || '';
                if (before === '*' || after === '*') return match;
                return `**${match}**`;
            });
        }, line);
    }).join('\n');
}

function childrenToText(children: ReactNode): string {
    if (typeof children === 'string' || typeof children === 'number') {
        return String(children);
    }
    if (Array.isArray(children)) {
        return children.map(childrenToText).join('');
    }
    return '';
}

function renderUnderlinedEmphasis(text: string, highlightTerms: string[]) {
    const terms = getNormalizedHighlightTerms(highlightTerms);
    if (terms.length === 0) {
        return (
            <span className="underline decoration-[var(--accent-primary)]/60 underline-offset-4">
                {text}
            </span>
        );
    }

    const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'g');
    return text.split(pattern).filter(Boolean).map((part, index) => (
        terms.includes(part) ? (
            <strong key={index} className="font-bold text-[var(--text-primary)]">
                {part}
            </strong>
        ) : (
            <span key={index} className="underline decoration-[var(--accent-primary)]/60 underline-offset-4">
                {part}
            </span>
        )
    ));
}

function isHighlightTermText(text: string, highlightTerms: string[]) {
    const normalizedText = text.trim();
    return getNormalizedHighlightTerms(highlightTerms).includes(normalizedText);
}

function renderPlainTextWithBoldTerms(text: string, highlightTerms: string[]) {
    const terms = getNormalizedHighlightTerms(highlightTerms);
    if (terms.length === 0) return text;

    const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'g');
    return text.split(pattern).filter(Boolean).map((part, index) => (
        terms.includes(part) ? (
            <strong key={index} className="font-bold text-[var(--text-primary)]">
                {part}
            </strong>
        ) : (
            <span key={index}>{part}</span>
        )
    ));
}

function renderMarkdownHeading(children: ReactNode, highlightTerms: string[]) {
    const text = childrenToText(children).trim();
    const heading = splitAIChatHeading(text, true);

    if (heading) {
        return (
            <p className="my-3 leading-relaxed">
                <strong className="font-bold text-[var(--text-primary)]">
                    {heading.heading}
                </strong>
                {heading.rest && renderPlainTextWithBoldTerms(heading.rest, highlightTerms)}
            </p>
        );
    }

    return (
        <p className="my-2 leading-relaxed font-normal text-[var(--text-primary)]">
            {renderUnderlinedEmphasis(text, highlightTerms)}
        </p>
    );
}

function isEscaped(text: string, index: number) {
    let slashCount = 0;
    for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
        slashCount += 1;
    }
    return slashCount % 2 === 1;
}

function isAsciiWord(char: string | undefined) {
    return !!char && /[A-Za-z0-9]/.test(char);
}

function readMarkdownDelimiter(text: string, index: number) {
    if (isEscaped(text, index)) return '';

    for (const delimiter of MARKDOWN_DELIMITERS) {
        if (!text.startsWith(delimiter, index)) continue;

        if (delimiter === '_' && isAsciiWord(text[index - 1]) && isAsciiWord(text[index + 1])) {
            continue;
        }

        return delimiter;
    }

    return '';
}

export function prepareStreamingMarkdown(text: string) {
    text = normalizeLatexSymbols(text);
    const openDelimiters: Array<{ delimiter: string; index: number }> = [];
    let inlineCodeOpen = false;
    let codeFenceOpen = false;

    for (let index = 0; index < text.length;) {
        if (!isEscaped(text, index) && text.startsWith('```', index)) {
            codeFenceOpen = !codeFenceOpen;
            index += 3;
            continue;
        }

        if (!codeFenceOpen && !isEscaped(text, index) && text[index] === '`') {
            inlineCodeOpen = !inlineCodeOpen;
            index += 1;
            continue;
        }

        if (!inlineCodeOpen && !codeFenceOpen) {
            const delimiter = readMarkdownDelimiter(text, index);
            if (delimiter) {
                let existingIndex = -1;
                for (let i = openDelimiters.length - 1; i >= 0; i--) {
                    if (openDelimiters[i].delimiter === delimiter) {
                        existingIndex = i;
                        break;
                    }
                }
                if (existingIndex >= 0) {
                    openDelimiters.splice(existingIndex, 1);
                } else {
                    openDelimiters.push({ delimiter, index });
                }
                index += delimiter.length;
                continue;
            }
        }

        index += 1;
    }

    if (inlineCodeOpen || codeFenceOpen || openDelimiters.length === 0) {
        return normalizeInlineEmphasisBoundaries(text);
    }

    const trailingDelimiter = openDelimiters[openDelimiters.length - 1];
    if (trailingDelimiter.index + trailingDelimiter.delimiter.length === text.length) {
        return prepareStreamingMarkdown(text.slice(0, trailingDelimiter.index));
    }

    return normalizeInlineEmphasisBoundaries(text + [...openDelimiters].reverse().map((item) => item.delimiter).join(''));
}

export function StreamingMarkdown({
    content,
    isStreaming = false,
    className = '',
    highlightTerms = [],
}: {
    content: string;
    isStreaming?: boolean;
    className?: string;
    highlightTerms?: string[];
}) {
    const normalizedContent = normalizeAIChatNumberedStructure(content);
    const highlightedContent = applyHighlightTerms(normalizedContent, highlightTerms);
    const markdownContent = isStreaming ? prepareStreamingMarkdown(highlightedContent) : highlightedContent;

    return (
        <div className={`markdown-body prose dark:prose-invert prose-sm max-w-none break-words ${className}`}>
            <ReactMarkdown
                components={{
                    ol: ({ children }) => (
                        <ol className="my-3 ml-4 space-y-3 list-decimal marker:font-normal marker:text-[var(--text-primary)]">
                            {children}
                        </ol>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-3 ml-4 space-y-3 list-disc marker:text-[var(--text-primary)]">
                            {children}
                        </ul>
                    ),
                    li: ({ children }) => (
                        <li className="pl-1 leading-relaxed text-[var(--text-primary)]">
                            {children}
                        </li>
                    ),
                    p: ({ children }) => (
                        <p className="my-2 leading-relaxed">
                            {children}
                        </p>
                    ),
                    h1: ({ children }) => renderMarkdownHeading(children, highlightTerms),
                    h2: ({ children }) => renderMarkdownHeading(children, highlightTerms),
                    h3: ({ children }) => renderMarkdownHeading(children, highlightTerms),
                    h4: ({ children }) => renderMarkdownHeading(children, highlightTerms),
                    h5: ({ children }) => renderMarkdownHeading(children, highlightTerms),
                    h6: ({ children }) => renderMarkdownHeading(children, highlightTerms),
                    strong: ({ children }) => {
                        const text = childrenToText(children);
                        const markedHeading = getMarkedAIChatHeading(text);
                        if (markedHeading) {
                            return (
                                <strong className="font-bold text-[var(--text-primary)]">
                                    {markedHeading}
                                </strong>
                            );
                        }
                        return isHighlightTermText(text, highlightTerms) ? (
                            <strong className="font-bold text-[var(--text-primary)]">
                                {children}
                            </strong>
                        ) : (
                            <>{renderUnderlinedEmphasis(stripAIChatHeadingMarker(text), highlightTerms)}</>
                        );
                    },
                    em: ({ children }) => (
                        <>{renderUnderlinedEmphasis(childrenToText(children), highlightTerms)}</>
                    ),
                }}
            >
                {markdownContent}
            </ReactMarkdown>
            {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom rounded-sm bg-[var(--accent-primary)] animate-pulse" />
            )}
        </div>
    );
}

const AI_SECTION_TITLES = ['核心含义', '老师划重点', '场景例句', '接续与含义'];
const AI_INLINE_LABELS = ['语感差异', '使用场景', '避坑指南', '易混淆点', '使用限制', '区别于', '搭配对象', '语法结构'];

function normalizeAIExplanationMarkdown(text: string) {
    let normalized = normalizeMarkdownDisplay(text)
        .replace(/\r\n/g, '\n')
        .replace(/\*\*(核心含义|老师划重点|场景例句|接续与含义)\*\*/g, '$1')
        .replace(new RegExp(`(^|\\s)(${AI_SECTION_TITLES.join('|')})(?=\\s|[:：]|$)`, 'g'), '\n\n## $2\n')
        .replace(/(^|\s)语感上[，,]/g, '\n- **语感差异**：')
        .replace(/(^|\s)使用场景(多涉及|主要|通常|包括|是|为)/g, '\n- **使用场景**：$2')
        .replace(new RegExp(`(^|\\s)(${AI_INLINE_LABELS.join('|')})([:：])`, 'g'), '\n- **$2**：')
        .replace(/([。！？])\s+(-?\s*[\u4e00-\u9fff][^\n]*?。)(?=\s*(?:[-*]|\d+\.|$))/g, '$1\n  $2')
        .replace(/\n{3,}/g, '\n\n')
        .trimStart();

    normalized = normalized.replace(/^## (核心含义|老师划重点|场景例句|接续与含义)\s*[:：]?\s*/gm, '## $1\n');
    normalized = normalized.replace(/^\s*[-*]\s+## /gm, '## ');
    return normalized;
}

export function AIExplanationMarkdown({
    content,
    isStreaming = false,
    accentColor = 'var(--accent-primary)',
    className = '',
}: {
    content: string;
    isStreaming?: boolean;
    accentColor?: string;
    className?: string;
}) {
    const normalizedContent = normalizeAIExplanationMarkdown(content);
    const markdownContent = isStreaming ? prepareStreamingMarkdown(normalizedContent) : normalizedContent;

    return (
        <div className={`markdown-body ai-explanation-markdown max-w-none break-words ${className}`}>
            <ReactMarkdown
                components={{
                    h2: ({ children }) => (
                        <div
                            className="font-bold mt-4 first:mt-0 mb-2 text-[15px] tracking-wide"
                            style={{ color: accentColor }}
                        >
                            {children}
                        </div>
                    ),
                    p: ({ children }) => (
                        <p className="mb-2 text-[15px] leading-relaxed text-[var(--text-muted)]">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-2 ml-4 space-y-1.5 list-disc marker:text-[var(--text-muted)]">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-2 ml-4 space-y-1.5 list-decimal marker:text-[var(--text-muted)]">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="pl-1 text-[15px] leading-relaxed text-[var(--text-muted)]">
                            {children}
                        </li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-bold text-inherit">
                            {children}
                        </strong>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote
                            className="my-2 border-l-2 pl-3 text-[15px] leading-relaxed text-[var(--text-muted)]"
                            style={{ borderColor: `color-mix(in srgb, ${accentColor}, transparent 45%)` }}
                        >
                            {children}
                        </blockquote>
                    ),
                }}
            >
                {markdownContent}
            </ReactMarkdown>
            {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom rounded-sm bg-[var(--accent-primary)] animate-pulse" />
            )}
        </div>
    );
}
