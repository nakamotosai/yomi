import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StreamingMarkdown } from '../src/components/StreamingMarkdown';

const screenshotRegressionSamples = [
    {
        name: 'full heading bold',
        content: `1. **ながら的核心用法**
**ながら** ます形去掉ます，表示两个动作同时进行。
a. 动作的同时性：表示同一主体同时做两件事。
2. **使用时的关键限制**
c. 动作主体的统一性：前后动作通常由同一主体完成。
3. **与相似语法的区别**
**接续：** 动词ます形去掉ます + ながら`,
    },
    {
        name: 'target term bolded inside heading',
        content: `1. **ながら**的核心用法
**ながら** ます形去掉ます，表示两个动作同时进行。
2. 使用时的**关键限制**
动作主体通常要一致。
3. **与相似语法的区别**
**接续：** 动词ます形去掉ます + ながら`,
    },
    {
        name: 'spaced inner emphasis inside heading',
        content: `1. **ながら** 的核心用法
2. 使用时的 **关键限制**
3. **与相似语法的区别**`,
    },
    {
        name: 'markdown heading with nested emphasis',
        content: `## **ながら的核心用法**
**ながら** ます形去掉ます，表示两个动作同时进行。
## **使用时的关键限制**
动作主体通常要一致。
## 与相似语法的区别
**接续：** 动词ます形去掉ます + ながら`,
    },
    {
        name: 'standalone unnumbered heading lines',
        content: `ながら的核心用法
**ながら** 表示两个动作同时进行。
使用时的关键限制
动作主体通常要一致。
与相似语法的区别
**接续：** 动词ます形去掉ます + ながら`,
    },
    {
        name: 'cpa chinese letter labels with loose strong closing space',
        content: `学习路径规划

a. **夯实基础 **：首先必须彻底掌握五十音图。
b. **建立语法框架 **：日语语序与中文不同。
c. **词汇积累策略 **：利用汉字优势记忆名词和动词。`,
        requiredStrongTexts: ['学习路径规划', '夯实基础', '建立语法框架', '词汇积累策略'],
        forbiddenRawFragments: ['**夯实基础 **', '**建立语法框架 **', '**词汇积累策略 **'],
    },
];

const stripTags = (value: string) => value.replace(/<[^>]+>/g, '');

const results = screenshotRegressionSamples.map(({ name, content, requiredStrongTexts: sampleRequiredStrongTexts, forbiddenRawFragments = [] }) => {
    const html = renderToStaticMarkup(
        React.createElement(StreamingMarkdown, {
            content,
            highlightTerms: ['ながら'],
        }),
    );

    const strongTexts = [...html.matchAll(/<strong[^>]*>(.*?)<\/strong>/g)].map((match) => stripTags(match[1]));
    const underlineTexts = [...html.matchAll(/<span class="[^"]*underline[^"]*"[^>]*>(.*?)<\/span>/g)].map((match) => stripTags(match[1]));

    const requiredStrongTexts = sampleRequiredStrongTexts || [
        'ながら的核心用法',
        '使用时的关键限制',
        '与相似语法的区别',
    ];
    if (content.includes('**ながら** ます') || content.includes('+ ながら')) {
        requiredStrongTexts.push('ながら');
    }
    for (const text of requiredStrongTexts) {
        if (!strongTexts.includes(text)) {
            throw new Error(`[${name}] Expected strong text "${text}". Got: ${JSON.stringify(strongTexts)}`);
        }
    }

    for (const text of forbiddenRawFragments) {
        if (html.includes(text)) {
            throw new Error(`[${name}] Unexpected raw Markdown fragment "${text}". HTML: ${html}`);
        }
    }

    if (html.includes('**')) {
        throw new Error(`[${name}] Unexpected raw Markdown delimiter in HTML: ${html}`);
    }

    return {
        name,
        strongTexts,
        underlineTexts,
    };
});

console.log(JSON.stringify({
    status: 'PASS',
    results,
}, null, 2));
