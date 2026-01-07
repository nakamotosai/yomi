// Core type definitions for YOMI
import { ThemeId } from '@/lib/colorThemes';

export enum PartOfSpeech {
  NOUN = '名词',
  VERB = '动词',
  ADJECTIVE = '形容词',
  PARTICLE = '助词',
  AUXILIARY = '助动词',
  ADVERB = '副词',
  CONJUNCTION = '连词',
  INTERJECTION = '感叹词',
  PREFIX = '前缀',
  SUFFIX = '后缀',
  SYMBOL = '符号',
  OTHER = '其他'
}

// Pitch accent pattern: 0 = Low, 1 = High
export type PitchPattern = number[];

export interface WordToken {
  id: string;
  surface: string;       // The text as displayed
  reading: string;       // Hiragana reading
  romaji: string;        // Romanized reading
  pos: PartOfSpeech;     // Part of speech
  posDetail?: string;    // Detailed POS info
  baseForm: string;      // Dictionary form (lemma)
  pitch?: PitchPattern;  // Pitch accent pattern
  accentMora?: number;   // Position of pitch drop (0 = heiban)
  isCommon?: boolean;    // Whether word is in common vocabulary list
  conjugation?: string;  // Conjugation type if verb/adjective
}

export interface SentenceAnalysis {
  id: string;
  original: string;
  tokens: WordToken[];
}

export interface AnalysisResult {
  sentences: SentenceAnalysis[];
}

export interface DictionaryEntry {
  id: string;
  kanji: string[];
  kana: string[];
  meanings: {
    pos: string[];
    glosses: string[];
  }[];
}

export interface VocabItem {
  id: string;
  word: string;
  reading: string;
  baseForm: string;
  meaning: string;
  pos: string;
  pitch?: PitchPattern;
  context: string;      // Original sentence
  createdAt: number;
}

export interface AppSettings {
  showFurigana: boolean;
  hideCommonFurigana: boolean;
  showPitchAccent: boolean;
  hideParticles: boolean;
  karaokeMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'sans' | 'serif';
  theme: 'light' | 'dark';
  // TTS Settings
  ttsProvider: 'native' | 'voicevox' | 'online';
  nativeVoiceURI: string;
  voicevoxSpeakerId: number;
  voicevoxUrl: string;
  playbackSpeed: number;

  // Dictionary Settings
  dictionaryProvider: 'jisho' | 'weblio_jj' | 'weblio_cj';

  // Visual Settings
  activeColorPOS: PartOfSpeech[];
  colorTheme: ThemeId;

  // Translation Settings
  showTranslation: boolean;

  // Kana Instrument Settings
  showRomaji: boolean;
  kanaCharType: 'hiragana' | 'katakana';
}

export type AppMode = 'reader' | 'kana';

export interface KanaChar {
  id: string;        // e.g., 'a', 'ka'
  hiragana: string;  // 'あ'
  katakana: string;  // 'ア'
  romaji: string;    // 'a'
  type: 'seion' | 'dakuon' | 'yoon'; // 清音/浊音/拗音
  svgPath?: string;  // SVG Path data
}

// POS color mapping
export const POS_COLORS: Record<PartOfSpeech, { bg: string; text: string; border: string }> = {
  [PartOfSpeech.NOUN]: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  [PartOfSpeech.VERB]: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200'
  },
  [PartOfSpeech.ADJECTIVE]: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  [PartOfSpeech.PARTICLE]: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200'
  },
  [PartOfSpeech.AUXILIARY]: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200'
  },
  [PartOfSpeech.ADVERB]: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  [PartOfSpeech.CONJUNCTION]: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200'
  },
  [PartOfSpeech.INTERJECTION]: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200'
  },
  [PartOfSpeech.PREFIX]: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200'
  },
  [PartOfSpeech.SUFFIX]: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200'
  },
  [PartOfSpeech.SYMBOL]: {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200'
  },
  [PartOfSpeech.OTHER]: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200'
  },
};

// Common N5/N4 words for difficulty filtering
export const COMMON_WORDS = new Set([
  '私', '僕', '彼', '彼女', '人', '男', '女', '子供', '友達', '先生',
  '日本', '語', '英語', '言葉', '名前', '時間', '今日', '明日', '昨日',
  '年', '月', '日', '週', '朝', '昼', '夜', '分', '時', '秒',
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万',
  '大きい', '小さい', '新しい', '古い', '良い', '悪い', '高い', '安い', '長い', '短い',
  '食べる', '飲む', '見る', '聞く', '話す', '読む', '書く', '行く', '来る', '帰る',
  'する', 'なる', 'ある', 'いる', '思う', '考える', '知る', '分かる', '教える', '学ぶ',
  'これ', 'それ', 'あれ', 'ここ', 'そこ', 'あそこ', 'この', 'その', 'あの',
  'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'へ', 'より', 'も', 'の',
  'です', 'ます', 'だ', 'である', 'ない', 'ません', 'でした', 'ました',
  'て', 'た', 'ている', 'ていた', 'てある', 'ておく', 'てしまう',
  'でも', 'しかし', 'そして', 'だから', 'けど', 'が', 'ので', 'のに',
  '何', '誰', 'どこ', 'いつ', 'どう', 'なぜ', 'どれ', 'どの', 'どちら',
  '家', '部屋', '学校', '会社', '駅', '店', '道', '国', '町', '村',
  '本', '車', '電車', '水', '食べ物', '飲み物', '金', '仕事', '勉強'
]);
