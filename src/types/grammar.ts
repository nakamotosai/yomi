// Grammar types
export interface GrammarEntry {
    id: string;
    term: string;        // 检索词 e.g. "ため"
    reading: string;     // 读音
    title: string;       // 语法标题 e.g. "〜ため（に）"
    meaning: string;     // 意味
    example: string;     // 例文（第一条）
    category: string;    // 分类 e.g. "絵でわかる中級文法"
    url?: string;        // 原文链接
}

export interface GrammarMatch {
    entry: GrammarEntry;
    matchedText: string;
    position: number;
}
