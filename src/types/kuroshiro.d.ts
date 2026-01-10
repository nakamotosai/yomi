// Type declarations for kuroshiro and kuroshiro-analyzer-kuromoji

declare module 'kuroshiro' {
    interface KuroshiroOptions {
        mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana';
        to?: 'hiragana' | 'katakana' | 'romaji';
        romajiSystem?: 'nippon' | 'passport' | 'hepburn';
    }

    class Kuroshiro {
        init(analyzer: unknown): Promise<void>;
        convert(text: string, options?: KuroshiroOptions): Promise<string>;
        _analyzer: {
            parse(text: string): Promise<unknown[]>;
        };
    }

    export default Kuroshiro;
}

declare module 'kuroshiro-analyzer-kuromoji' {
    interface AnalyzerOptions {
        dictPath?: string;
    }

    class Analyzer {
        constructor(options?: AnalyzerOptions);
        init(): Promise<void>;
        parse(text: string): Promise<unknown[]>;
    }

    export default Analyzer;
}
