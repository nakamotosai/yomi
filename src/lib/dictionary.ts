import axios from 'axios';
import { DictionaryEntry } from '@/types';

// Adapter to convert Jisho API response format to our internal DictionaryEntry format
function adaptJishoResponse(jishoData: any, keyword: string): DictionaryEntry | null {
    if (!jishoData || jishoData.length === 0) return null;

    const firstMatch = jishoData[0]; // Take the best match

    return {
        id: firstMatch.slug || keyword,
        word: firstMatch.slug, // roughly the word
        kana: firstMatch.japanese.map((j: any) => j.reading || j.word).filter(Boolean),
        meanings: firstMatch.senses.map((sense: any) => ({
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
