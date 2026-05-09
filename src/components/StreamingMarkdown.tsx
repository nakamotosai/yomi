'use client';

import ReactMarkdown from 'react-markdown';

const MARKDOWN_DELIMITERS = ['***', '___', '**', '__', '*', '_'];
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
}: {
    content: string;
    isStreaming?: boolean;
    className?: string;
}) {
    const markdownContent = isStreaming ? prepareStreamingMarkdown(content) : normalizeMarkdownDisplay(content);

    return (
        <div className={`markdown-body prose dark:prose-invert prose-sm max-w-none break-words ${className}`}>
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
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
