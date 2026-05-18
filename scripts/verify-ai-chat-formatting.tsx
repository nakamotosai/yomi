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
    {
        name: 'second-level label strong does not swallow body',
        content: `直接对应表达

a. 哈哈：最通用的说法是呵呵（わらわら / warawara）或者直接用笑（わらう / warau）的变体。
b. **拟声词： 最常用的是ふふ **（fufu）表示轻笑，わはは（wahaha）表示开怀大笑。
c. **语境差异： 中文的“哈哈”有时带有敷衍或尴尬的含义，日语中的ふふ（fufu）通常带有一种含蓄 **、得意或觉得有趣的微妙语气。

使用场景与注意事项

a. **书面与网络 **：在 LINE、Twitter 等社交软件上，ww 是绝对的主流。
b. **口语表达： 面对面交流时，日本人通常直接发出笑声声音 **，或者用面白い代替“哈哈”。`,
        requiredStrongTexts: ['直接对应表达', '使用场景与注意事项', '拟声词：', '语境差异：', '书面与网络', '口语表达：'],
        forbiddenStrongTexts: [
            '拟声词： 最常用的是ふふ',
            '语境差异： 中文的“哈哈”有时带有敷衍或尴尬的含义，日语中的ふふ（fufu）通常带有一种含蓄',
            '口语表达： 面对面交流时，日本人通常直接发出笑声声音',
        ],
        forbiddenRawFragments: ['**拟声词', '**语境差异', '**书面与网络', '**口语表达'],
    },
];

const stripTags = (value: string) => value.replace(/<[^>]+>/g, '');

const results = screenshotRegressionSamples.map(({ name, content, requiredStrongTexts: sampleRequiredStrongTexts, forbiddenStrongTexts = [], forbiddenRawFragments = [] }) => {
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

    for (const text of forbiddenStrongTexts) {
        if (strongTexts.includes(text)) {
            throw new Error(`[${name}] Unexpected over-broad strong text "${text}". Got: ${JSON.stringify(strongTexts)}`);
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
