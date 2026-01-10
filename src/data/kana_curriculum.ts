// =============================================================================
// 假名课程数据结构
// =============================================================================

export type LessonType = 'intro' | 'lesson' | 'quiz';
export type LessonStatus = 'locked' | 'unlocked' | 'completed';

// 单个课程定义
export interface KanaLesson {
    id: string;           // 唯一标识，如 'L1', 'L2'
    title: string;        // 课程标题
    subtitle: string;     // 副标题/描述
    type: LessonType;     // 课程类型
    order: number;        // 排序

    // 内容
    content: {
        // 介绍页内容
        introText?: string;
        introImage?: string;

        // 学习页内容：假名ID列表
        kanaIds?: string[];

        // 测试题库
        quizPool?: QuizQuestion[];
    };

    // 解锁条件
    unlockRequirement?: {
        lessonId: string;  // 需要先完成的课程
        minScore?: number; // 最低分数要求 (0-100)
    };
}

// 测验题目
export interface QuizQuestion {
    id: string;
    type: 'listen' | 'read' | 'write'; // 听音选字 / 看字选音 / 书写
    kanaId: string;           // 关联的假名
    correctAnswer: string;    // 正确答案
    options?: string[];       // 选项（选择题）
}

// =============================================================================
// 完整课程编排
// =============================================================================

export const KANA_CURRICULUM: KanaLesson[] = [
    // =========================================================================
    // 第一部分：平假名基础
    // =========================================================================

    {
        id: 'L1',
        title: '日语文字入门',
        subtitle: '了解平假名、片假名与汉字',
        type: 'intro',
        order: 1,
        content: {
            introText: `
# 日语的三种文字

日语使用三种文字系统：

## 平假名 (ひらがな)
圆润流畅的字形，用于书写日语原生词汇和语法成分。
例如：あいうえお

## 片假名 (カタカナ)  
棱角分明的字形，主要用于外来语、拟声词和强调。
例如：アイウエオ

## 汉字 (漢字)
从中国传入的表意文字，表示词汇的核心意义。
例如：日本語

本课程将从平假名开始，带你掌握日语书写的基础！
            `.trim()
        }
    },

    {
        id: 'L2',
        title: '元音五兄弟',
        subtitle: 'あ行：a, i, u, e, o',
        type: 'lesson',
        order: 2,
        content: {
            kanaIds: ['a', 'i', 'u', 'e', 'o']
        },
        unlockRequirement: { lessonId: 'L1' }
    },

    {
        id: 'L3',
        title: 'K行清音',
        subtitle: 'か行：ka, ki, ku, ke, ko',
        type: 'lesson',
        order: 3,
        content: {
            kanaIds: ['ka', 'ki', 'ku', 'ke', 'ko']
        },
        unlockRequirement: { lessonId: 'L2', minScore: 80 }
    },

    {
        id: 'L4',
        title: 'S行清音',
        subtitle: 'さ行：sa, shi, su, se, so',
        type: 'lesson',
        order: 4,
        content: {
            kanaIds: ['sa', 'shi', 'su', 'se', 'so']
        },
        unlockRequirement: { lessonId: 'L3', minScore: 80 }
    },

    {
        id: 'L5',
        title: 'T行清音',
        subtitle: 'た行：ta, chi, tsu, te, to',
        type: 'lesson',
        order: 5,
        content: {
            kanaIds: ['ta', 'chi', 'tsu', 'te', 'to']
        },
        unlockRequirement: { lessonId: 'L4', minScore: 80 }
    },

    {
        id: 'L6',
        title: 'N行清音',
        subtitle: 'な行：na, ni, nu, ne, no',
        type: 'lesson',
        order: 6,
        content: {
            kanaIds: ['na', 'ni', 'nu', 'ne', 'no']
        },
        unlockRequirement: { lessonId: 'L5', minScore: 80 }
    },

    {
        id: 'L7',
        title: 'H行清音',
        subtitle: 'は行：ha, hi, fu, he, ho',
        type: 'lesson',
        order: 7,
        content: {
            kanaIds: ['ha', 'hi', 'fu', 'he', 'ho']
        },
        unlockRequirement: { lessonId: 'L6', minScore: 80 }
    },

    {
        id: 'L8',
        title: 'M行清音',
        subtitle: 'ま行：ma, mi, mu, me, mo',
        type: 'lesson',
        order: 8,
        content: {
            kanaIds: ['ma', 'mi', 'mu', 'me', 'mo']
        },
        unlockRequirement: { lessonId: 'L7', minScore: 80 }
    },

    {
        id: 'L9',
        title: 'Y行清音',
        subtitle: 'や行：ya, yu, yo',
        type: 'lesson',
        order: 9,
        content: {
            kanaIds: ['ya', 'yu', 'yo']
        },
        unlockRequirement: { lessonId: 'L8', minScore: 80 }
    },

    {
        id: 'L10',
        title: 'R行清音',
        subtitle: 'ら行：ra, ri, ru, re, ro',
        type: 'lesson',
        order: 10,
        content: {
            kanaIds: ['ra', 'ri', 'ru', 're', 'ro']
        },
        unlockRequirement: { lessonId: 'L9', minScore: 80 }
    },

    {
        id: 'L11',
        title: 'W行与拨音',
        subtitle: 'わ行：wa, wo, n',
        type: 'lesson',
        order: 11,
        content: {
            kanaIds: ['wa', 'wo', 'n']
        },
        unlockRequirement: { lessonId: 'L10', minScore: 80 }
    },

    // =========================================================================
    // 第二部分：浊音与半浊音
    // =========================================================================

    {
        id: 'L12',
        title: '浊音入门',
        subtitle: 'が行 & ざ行',
        type: 'lesson',
        order: 12,
        content: {
            introText: `
# 浊音 (濁音)

在清音假名右上角添加两点「゛」(浊点) 就变成浊音。

か → が (ka → ga)
さ → ざ (sa → za)

浊音的发音更重、更浑浊。
            `.trim(),
            kanaIds: ['ga', 'gi', 'gu', 'ge', 'go', 'za', 'ji', 'zu', 'ze', 'zo']
        },
        unlockRequirement: { lessonId: 'L11', minScore: 80 }
    },

    {
        id: 'L13',
        title: '浊音进阶',
        subtitle: 'だ行 & ば行',
        type: 'lesson',
        order: 13,
        content: {
            kanaIds: ['da', 'di', 'du', 'de', 'do', 'ba', 'bi', 'bu', 'be', 'bo']
        },
        unlockRequirement: { lessonId: 'L12', minScore: 80 }
    },

    {
        id: 'L14',
        title: '半浊音',
        subtitle: 'ぱ行：pa, pi, pu, pe, po',
        type: 'lesson',
        order: 14,
        content: {
            introText: `
# 半浊音 (半濁音)

在は行假名右上角添加小圆圈「゜」(半浊点) 就变成半浊音。

は → ぱ (ha → pa)

半浊音只存在于ぱ行！
            `.trim(),
            kanaIds: ['pa', 'pi', 'pu', 'pe', 'po']
        },
        unlockRequirement: { lessonId: 'L13', minScore: 80 }
    },

    {
        id: 'L15',
        title: '促音',
        subtitle: '小写的つ (tsu)',
        type: 'lesson',
        order: 15,
        content: {
            introText: `
# 促音 (そくおん)

促音由小写的「っ」(tsu) 表示。

它不发音，而是表示一个节拍的停顿。
通常出现在か行、さ行、た行、ぱ行之前。

例如：
- ざっし (zasshi - 杂志)
- きっぷ (kippu - 票)
            `.trim(),
            kanaIds: ['tsu_small']
        },
        unlockRequirement: { lessonId: 'L14', minScore: 80 }
    },

    // =========================================================================
    // 第三部分：拗音
    // =========================================================================

    {
        id: 'L16',
        title: '拗音入门',
        subtitle: 'きゃ行 & しゃ行 & ちゃ行',
        type: 'lesson',
        order: 16,
        content: {
            introText: `
# 拗音 (拗音)

拗音由「い段假名 + 小写や/ゆ/よ」组成。

き + ゃ → きゃ (kya)
し + ゅ → しゅ (shu)
ち + ょ → ちょ (cho)

注意：第二个假名要写成小号！
            `.trim(),
            kanaIds: ['kya', 'kyu', 'kyo', 'sha', 'shu', 'sho', 'cha', 'chu', 'cho']
        },
        unlockRequirement: { lessonId: 'L15', minScore: 80 }
    },

    {
        id: 'L17',
        title: '拗音进阶',
        subtitle: 'にゃ行 & ひゃ行 & みゃ行 & りゃ行',
        type: 'lesson',
        order: 17,
        content: {
            kanaIds: ['nya', 'nyu', 'nyo', 'hya', 'hyu', 'hyo', 'mya', 'myu', 'myo', 'rya', 'ryu', 'ryo']
        },
        unlockRequirement: { lessonId: 'L16', minScore: 80 }
    },

    {
        id: 'L18',
        title: '浊音拗音',
        subtitle: 'ぎゃ行 & じゃ行 & びゃ行 & ぴゃ行',
        type: 'lesson',
        order: 18,
        content: {
            kanaIds: ['gya', 'gyu', 'gyo', 'ja', 'ju', 'jo', 'bya', 'byu', 'byo', 'pya', 'pyu', 'pyo']
        },
        unlockRequirement: { lessonId: 'L17', minScore: 80 }
    },

    // =========================================================================
    // 第四部分：片假名速成
    // =========================================================================

    // =========================================================================
    // 第四部分：片假名速成
    // =========================================================================

    {
        id: 'L19',
        title: '片假名入门',
        subtitle: '片假名文字系统介绍',
        type: 'intro',
        order: 19,
        content: {
            introText: `
# 片假名 (カタカナ)

片假名与平假名一一对应，但字形更加棱角分明。

**主要用途：**
- 外来语：コーヒー (coffee)
- 拟声词：ワンワン (汪汪)
- 强调表达
- 科学术语

接下来我们将学习与平假名对应的片假名写法！
            `.trim()
        },
        unlockRequirement: { lessonId: 'L18', minScore: 80 }
    },

    {
        id: 'L20',
        title: '片假名：元音与K行',
        subtitle: 'ア行 & カ行',
        type: 'lesson',
        order: 20,
        content: {
            introText: '学习片假名时，与对应的平假名进行对比记忆！',
            kanaIds: ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko']
        },
        unlockRequirement: { lessonId: 'L19' }
    },

    {
        id: 'L21',
        title: '片假名：S行与T行',
        subtitle: 'サ行 & タ行',
        type: 'lesson',
        order: 21,
        content: {
            kanaIds: ['sa', 'shi', 'su', 'se', 'so', 'ta', 'chi', 'tsu', 'te', 'to']
        },
        unlockRequirement: { lessonId: 'L20', minScore: 80 }
    },

    {
        id: 'L22',
        title: '片假名：N行与H行',
        subtitle: 'ナ行 & ハ行',
        type: 'lesson',
        order: 22,
        content: {
            kanaIds: ['na', 'ni', 'nu', 'ne', 'no', 'ha', 'hi', 'fu', 'he', 'ho']
        },
        unlockRequirement: { lessonId: 'L21', minScore: 80 }
    },

    {
        id: 'L23',
        title: '片假名：M行与Y行',
        subtitle: 'マ行 & ヤ行',
        type: 'lesson',
        order: 23,
        content: {
            kanaIds: ['ma', 'mi', 'mu', 'me', 'mo', 'ya', 'yu', 'yo']
        },
        unlockRequirement: { lessonId: 'L22', minScore: 80 }
    },

    {
        id: 'L24',
        title: '片假名：R行与W行',
        subtitle: 'ラ行 & ワ行',
        type: 'lesson',
        order: 24,
        content: {
            kanaIds: ['ra', 'ri', 'ru', 're', 'ro', 'wa', 'wo', 'n']
        },
        unlockRequirement: { lessonId: 'L23', minScore: 80 }
    },

    {
        id: 'L25',
        title: '恭喜通关！',
        subtitle: '你已掌握全部假名',
        type: 'intro',
        order: 25,
        content: {
            introText: `
# 🎉 恭喜你！

你已经成功学习了：

- ✅ 46个平假名清音
- ✅ 25个浊音/半浊音
- ✅ 33个拗音
- ✅ 1个促音
- ✅ 对应的全部片假名

**总计105个假名！**

现在你可以去练习场挑战自己，
或者回到读解模式开始阅读日语文章！

がんばって！(加油！)
            `.trim()
        },
        unlockRequirement: { lessonId: 'L24', minScore: 80 }
    }
];

// 获取课程列表
export function getLessonById(id: string): KanaLesson | undefined {
    return KANA_CURRICULUM.find(l => l.id === id);
}

// 获取下一课
export function getNextLesson(currentId: string): KanaLesson | undefined {
    const current = KANA_CURRICULUM.find(l => l.id === currentId);
    if (!current) return undefined;
    return KANA_CURRICULUM.find(l => l.order === current.order + 1);
}
