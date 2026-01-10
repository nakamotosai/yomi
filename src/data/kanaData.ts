import { KanaChar } from '@/types';

// =============================================================================
// 完整假名数据 - 包含清音、浊音、半浊音、拗音
// =============================================================================

export const KANA_DATA: KanaChar[] = [
    // =========================================================================
    // 清音 (Seion) - 46个基础假名
    // =========================================================================

    // あ行 (A-row)
    { id: 'a', hiragana: 'あ', katakana: 'ア', romaji: 'a', type: 'seion', row: 'a' },
    { id: 'i', hiragana: 'い', katakana: 'イ', romaji: 'i', type: 'seion', row: 'a' },
    { id: 'u', hiragana: 'う', katakana: 'ウ', romaji: 'u', type: 'seion', row: 'a' },
    { id: 'e', hiragana: 'え', katakana: 'エ', romaji: 'e', type: 'seion', row: 'a' },
    { id: 'o', hiragana: 'お', katakana: 'オ', romaji: 'o', type: 'seion', row: 'a' },

    // か行 (K-row)
    { id: 'ka', hiragana: 'か', katakana: 'カ', romaji: 'ka', type: 'seion', row: 'k' },
    { id: 'ki', hiragana: 'き', katakana: 'キ', romaji: 'ki', type: 'seion', row: 'k' },
    { id: 'ku', hiragana: 'く', katakana: 'ク', romaji: 'ku', type: 'seion', row: 'k' },
    { id: 'ke', hiragana: 'け', katakana: 'ケ', romaji: 'ke', type: 'seion', row: 'k' },
    { id: 'ko', hiragana: 'こ', katakana: 'コ', romaji: 'ko', type: 'seion', row: 'k' },

    // さ行 (S-row)
    { id: 'sa', hiragana: 'さ', katakana: 'サ', romaji: 'sa', type: 'seion', row: 's' },
    { id: 'shi', hiragana: 'し', katakana: 'シ', romaji: 'shi', type: 'seion', row: 's' },
    { id: 'su', hiragana: 'す', katakana: 'ス', romaji: 'su', type: 'seion', row: 's' },
    { id: 'se', hiragana: 'せ', katakana: 'セ', romaji: 'se', type: 'seion', row: 's' },
    { id: 'so', hiragana: 'そ', katakana: 'ソ', romaji: 'so', type: 'seion', row: 's' },

    // た行 (T-row)
    { id: 'ta', hiragana: 'た', katakana: 'タ', romaji: 'ta', type: 'seion', row: 't' },
    { id: 'chi', hiragana: 'ち', katakana: 'チ', romaji: 'chi', type: 'seion', row: 't' },
    { id: 'tsu', hiragana: 'つ', katakana: 'ツ', romaji: 'tsu', type: 'seion', row: 't' },
    { id: 'te', hiragana: 'て', katakana: 'テ', romaji: 'te', type: 'seion', row: 't' },
    { id: 'to', hiragana: 'と', katakana: 'ト', romaji: 'to', type: 'seion', row: 't' },

    // な行 (N-row)
    { id: 'na', hiragana: 'な', katakana: 'ナ', romaji: 'na', type: 'seion', row: 'n' },
    { id: 'ni', hiragana: 'に', katakana: 'ニ', romaji: 'ni', type: 'seion', row: 'n' },
    { id: 'nu', hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu', type: 'seion', row: 'n' },
    { id: 'ne', hiragana: 'ね', katakana: 'ネ', romaji: 'ne', type: 'seion', row: 'n' },
    { id: 'no', hiragana: 'の', katakana: 'ノ', romaji: 'no', type: 'seion', row: 'n' },

    // は行 (H-row)
    { id: 'ha', hiragana: 'は', katakana: 'ハ', romaji: 'ha', type: 'seion', row: 'h' },
    { id: 'hi', hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi', type: 'seion', row: 'h' },
    { id: 'fu', hiragana: 'ふ', katakana: 'フ', romaji: 'fu', type: 'seion', row: 'h' },
    { id: 'he', hiragana: 'へ', katakana: 'ヘ', romaji: 'he', type: 'seion', row: 'h' },
    { id: 'ho', hiragana: 'ほ', katakana: 'ホ', romaji: 'ho', type: 'seion', row: 'h' },

    // ま行 (M-row)
    { id: 'ma', hiragana: 'ま', katakana: 'マ', romaji: 'ma', type: 'seion', row: 'm' },
    { id: 'mi', hiragana: 'み', katakana: 'ミ', romaji: 'mi', type: 'seion', row: 'm' },
    { id: 'mu', hiragana: 'む', katakana: 'ム', romaji: 'mu', type: 'seion', row: 'm' },
    { id: 'me', hiragana: 'め', katakana: 'メ', romaji: 'me', type: 'seion', row: 'm' },
    { id: 'mo', hiragana: 'も', katakana: 'モ', romaji: 'mo', type: 'seion', row: 'm' },

    // や行 (Y-row)
    { id: 'ya', hiragana: 'や', katakana: 'ヤ', romaji: 'ya', type: 'seion', row: 'y' },
    { id: 'yu', hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu', type: 'seion', row: 'y' },
    { id: 'yo', hiragana: 'よ', katakana: 'ヨ', romaji: 'yo', type: 'seion', row: 'y' },

    // ら行 (R-row)
    { id: 'ra', hiragana: 'ら', katakana: 'ラ', romaji: 'ra', type: 'seion', row: 'r' },
    { id: 'ri', hiragana: 'り', katakana: 'リ', romaji: 'ri', type: 'seion', row: 'r' },
    { id: 'ru', hiragana: 'る', katakana: 'ル', romaji: 'ru', type: 'seion', row: 'r' },
    { id: 're', hiragana: 'れ', katakana: 'レ', romaji: 're', type: 'seion', row: 'r' },
    { id: 'ro', hiragana: 'ろ', katakana: 'ロ', romaji: 'ro', type: 'seion', row: 'r' },

    // わ行 (W-row) + ん
    { id: 'wa', hiragana: 'わ', katakana: 'ワ', romaji: 'wa', type: 'seion', row: 'w' },
    { id: 'wo', hiragana: 'を', katakana: 'ヲ', romaji: 'wo', type: 'seion', row: 'w' },
    { id: 'n', hiragana: 'ん', katakana: 'ン', romaji: 'n', type: 'seion', row: 'w' },

    // =========================================================================
    // 浊音 (Dakuon) - 20个
    // =========================================================================

    // が行 (G-row)
    { id: 'ga', hiragana: 'が', katakana: 'ガ', romaji: 'ga', type: 'dakuon', row: 'g' },
    { id: 'gi', hiragana: 'ぎ', katakana: 'ギ', romaji: 'gi', type: 'dakuon', row: 'g' },
    { id: 'gu', hiragana: 'ぐ', katakana: 'グ', romaji: 'gu', type: 'dakuon', row: 'g' },
    { id: 'ge', hiragana: 'げ', katakana: 'ゲ', romaji: 'ge', type: 'dakuon', row: 'g' },
    { id: 'go', hiragana: 'ご', katakana: 'ゴ', romaji: 'go', type: 'dakuon', row: 'g' },

    // ざ行 (Z-row)
    { id: 'za', hiragana: 'ざ', katakana: 'ザ', romaji: 'za', type: 'dakuon', row: 'z' },
    { id: 'ji', hiragana: 'じ', katakana: 'ジ', romaji: 'ji', type: 'dakuon', row: 'z' },
    { id: 'zu', hiragana: 'ず', katakana: 'ズ', romaji: 'zu', type: 'dakuon', row: 'z' },
    { id: 'ze', hiragana: 'ぜ', katakana: 'ゼ', romaji: 'ze', type: 'dakuon', row: 'z' },
    { id: 'zo', hiragana: 'ぞ', katakana: 'ゾ', romaji: 'zo', type: 'dakuon', row: 'z' },

    // だ行 (D-row)
    { id: 'da', hiragana: 'だ', katakana: 'ダ', romaji: 'da', type: 'dakuon', row: 'd' },
    { id: 'di', hiragana: 'ぢ', katakana: 'ヂ', romaji: 'di', type: 'dakuon', row: 'd' },
    { id: 'du', hiragana: 'づ', katakana: 'ヅ', romaji: 'du', type: 'dakuon', row: 'd' },
    { id: 'de', hiragana: 'で', katakana: 'デ', romaji: 'de', type: 'dakuon', row: 'd' },
    { id: 'do', hiragana: 'ど', katakana: 'ド', romaji: 'do', type: 'dakuon', row: 'd' },

    // ば行 (B-row)
    { id: 'ba', hiragana: 'ば', katakana: 'バ', romaji: 'ba', type: 'dakuon', row: 'b' },
    { id: 'bi', hiragana: 'び', katakana: 'ビ', romaji: 'bi', type: 'dakuon', row: 'b' },
    { id: 'bu', hiragana: 'ぶ', katakana: 'ブ', romaji: 'bu', type: 'dakuon', row: 'b' },
    { id: 'be', hiragana: 'べ', katakana: 'ベ', romaji: 'be', type: 'dakuon', row: 'b' },
    { id: 'bo', hiragana: 'ぼ', katakana: 'ボ', romaji: 'bo', type: 'dakuon', row: 'b' },

    // =========================================================================
    // 半浊音 (Handakuon) - 5个
    // =========================================================================

    // ぱ行 (P-row)
    { id: 'pa', hiragana: 'ぱ', katakana: 'パ', romaji: 'pa', type: 'handakuon', row: 'p' },
    { id: 'pi', hiragana: 'ぴ', katakana: 'ピ', romaji: 'pi', type: 'handakuon', row: 'p' },
    { id: 'pu', hiragana: 'ぷ', katakana: 'プ', romaji: 'pu', type: 'handakuon', row: 'p' },
    { id: 'pe', hiragana: 'ぺ', katakana: 'ペ', romaji: 'pe', type: 'handakuon', row: 'p' },
    { id: 'po', hiragana: 'ぽ', katakana: 'ポ', romaji: 'po', type: 'handakuon', row: 'p' },

    // =========================================================================
    // 拗音 (Yoon) - 33个
    // =========================================================================

    // きゃ行
    { id: 'kya', hiragana: 'きゃ', katakana: 'キャ', romaji: 'kya', type: 'yoon', row: 'ky' },
    { id: 'kyu', hiragana: 'きゅ', katakana: 'キュ', romaji: 'kyu', type: 'yoon', row: 'ky' },
    { id: 'kyo', hiragana: 'きょ', katakana: 'キョ', romaji: 'kyo', type: 'yoon', row: 'ky' },

    // しゃ行
    { id: 'sha', hiragana: 'しゃ', katakana: 'シャ', romaji: 'sha', type: 'yoon', row: 'sh' },
    { id: 'shu', hiragana: 'しゅ', katakana: 'シュ', romaji: 'shu', type: 'yoon', row: 'sh' },
    { id: 'sho', hiragana: 'しょ', katakana: 'ショ', romaji: 'sho', type: 'yoon', row: 'sh' },

    // ちゃ行
    { id: 'cha', hiragana: 'ちゃ', katakana: 'チャ', romaji: 'cha', type: 'yoon', row: 'ch' },
    { id: 'chu', hiragana: 'ちゅ', katakana: 'チュ', romaji: 'chu', type: 'yoon', row: 'ch' },
    { id: 'cho', hiragana: 'ちょ', katakana: 'チョ', romaji: 'cho', type: 'yoon', row: 'ch' },

    // にゃ行
    { id: 'nya', hiragana: 'にゃ', katakana: 'ニャ', romaji: 'nya', type: 'yoon', row: 'ny' },
    { id: 'nyu', hiragana: 'にゅ', katakana: 'ニュ', romaji: 'nyu', type: 'yoon', row: 'ny' },
    { id: 'nyo', hiragana: 'にょ', katakana: 'ニョ', romaji: 'nyo', type: 'yoon', row: 'ny' },

    // ひゃ行
    { id: 'hya', hiragana: 'ひゃ', katakana: 'ヒャ', romaji: 'hya', type: 'yoon', row: 'hy' },
    { id: 'hyu', hiragana: 'ひゅ', katakana: 'ヒュ', romaji: 'hyu', type: 'yoon', row: 'hy' },
    { id: 'hyo', hiragana: 'ひょ', katakana: 'ヒョ', romaji: 'hyo', type: 'yoon', row: 'hy' },

    // みゃ行
    { id: 'mya', hiragana: 'みゃ', katakana: 'ミャ', romaji: 'mya', type: 'yoon', row: 'my' },
    { id: 'myu', hiragana: 'みゅ', katakana: 'ミュ', romaji: 'myu', type: 'yoon', row: 'my' },
    { id: 'myo', hiragana: 'みょ', katakana: 'ミョ', romaji: 'myo', type: 'yoon', row: 'my' },

    // りゃ行
    { id: 'rya', hiragana: 'りゃ', katakana: 'リャ', romaji: 'rya', type: 'yoon', row: 'ry' },
    { id: 'ryu', hiragana: 'りゅ', katakana: 'リュ', romaji: 'ryu', type: 'yoon', row: 'ry' },
    { id: 'ryo', hiragana: 'りょ', katakana: 'リョ', romaji: 'ryo', type: 'yoon', row: 'ry' },

    // ぎゃ行 (浊音拗音)
    { id: 'gya', hiragana: 'ぎゃ', katakana: 'ギャ', romaji: 'gya', type: 'yoon', row: 'gy' },
    { id: 'gyu', hiragana: 'ぎゅ', katakana: 'ギュ', romaji: 'gyu', type: 'yoon', row: 'gy' },
    { id: 'gyo', hiragana: 'ぎょ', katakana: 'ギョ', romaji: 'gyo', type: 'yoon', row: 'gy' },

    // じゃ行
    { id: 'ja', hiragana: 'じゃ', katakana: 'ジャ', romaji: 'ja', type: 'yoon', row: 'j' },
    { id: 'ju', hiragana: 'じゅ', katakana: 'ジュ', romaji: 'ju', type: 'yoon', row: 'j' },
    { id: 'jo', hiragana: 'じょ', katakana: 'ジョ', romaji: 'jo', type: 'yoon', row: 'j' },

    // びゃ行
    { id: 'bya', hiragana: 'びゃ', katakana: 'ビャ', romaji: 'bya', type: 'yoon', row: 'by' },
    { id: 'byu', hiragana: 'びゅ', katakana: 'ビュ', romaji: 'byu', type: 'yoon', row: 'by' },
    { id: 'byo', hiragana: 'びょ', katakana: 'ビョ', romaji: 'byo', type: 'yoon', row: 'by' },

    // ぴゃ行
    { id: 'pya', hiragana: 'ぴゃ', katakana: 'ピャ', romaji: 'pya', type: 'yoon', row: 'py' },
    { id: 'pyu', hiragana: 'ぴゅ', katakana: 'ピュ', romaji: 'pyu', type: 'yoon', row: 'py' },
    { id: 'pyo', hiragana: 'ぴょ', katakana: 'ピョ', romaji: 'pyo', type: 'yoon', row: 'py' },
];

// 按类型分组
export const SEION_KANA = KANA_DATA.filter(k => k.type === 'seion');
export const DAKUON_KANA = KANA_DATA.filter(k => k.type === 'dakuon');
export const HANDAKUON_KANA = KANA_DATA.filter(k => k.type === 'handakuon');
export const YOON_KANA = KANA_DATA.filter(k => k.type === 'yoon');

// 按行分组的辅助函数
export function getKanaByRow(row: string): KanaChar[] {
    return KANA_DATA.filter(k => k.row === row);
}

// 根据ID获取假名
export function getKanaById(id: string): KanaChar | undefined {
    return KANA_DATA.find(k => k.id === id);
}

// 根据假名字符获取数据
export function getKanaByChar(char: string): KanaChar | undefined {
    return KANA_DATA.find(k => k.hiragana === char || k.katakana === char);
}
