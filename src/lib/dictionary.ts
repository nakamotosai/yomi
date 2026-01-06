import axios from 'axios';
import { DictionaryEntry } from '@/types';

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

// Adapter to convert Jisho API response format to our internal DictionaryEntry format
function adaptJishoResponse(jishoData: JishoResult[], keyword: string): DictionaryEntry | null {
    if (!jishoData || jishoData.length === 0) return null;

    const firstMatch = jishoData[0]; // Take the best match

    // Extract kanji and kana from japanese array
    const kanjiList: string[] = [];
    const kanaList: string[] = [];

    firstMatch.japanese.forEach((j: JishoJapanese) => {
        if (j.word) kanjiList.push(j.word);
        if (j.reading) kanaList.push(j.reading);
    });

    return {
        id: firstMatch.slug || keyword,
        kanji: kanjiList.length > 0 ? kanjiList : [keyword],
        kana: kanaList,
        meanings: firstMatch.senses.map((sense: JishoSense) => ({
            pos: sense.parts_of_speech,
            glosses: sense.english_definitions
        }))
    };
}

// Adjusted to accept provider in the call or we update signature?
// Ideally searchDictionary should take the provider as an argument.
// We need to update usages of searchDictionary in InfoPanel.

export async function searchDictionary(word: string, provider: 'jisho' | 'weblio_jj' | 'weblio_cj' = 'jisho'): Promise<DictionaryEntry | null> {
    if (!word) return null;

    try {
        const res = await axios.get('/api/proxy/dictionary', {
            params: {
                keyword: word,
                provider: provider
            }
        });

        const data = res.data;
        if (data && data.data) {
            return adaptJishoResponse(data.data, word);
        }
        return null;

    } catch (error) {
        console.error('Dictionary Lookup Error:', error);
        return null;
    }
}
