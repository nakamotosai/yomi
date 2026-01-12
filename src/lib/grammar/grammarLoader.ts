import { GrammarEntry } from '@/types/grammar';
import { useDictionaryStore } from '@/store/useDictionaryStore';

// 语法词典索引
const grammarIndex: Map<string, GrammarEntry[]> = new Map();
let isLoaded = false;
let loadingPromise: Promise<void> | null = null;

// 从JSON内容中提取【意味】
function extractMeaning(content: unknown[]): string {
    const text = extractPlainText(content);
    const meaningMatch = text.match(/【意味】\n?([^\n【]+)/);
    return meaningMatch ? meaningMatch[1].trim() : '';
}

// 从JSON内容中提取第一个【例文】
function extractExample(content: unknown[]): string {
    const text = extractPlainText(content);
    const exampleMatch = text.match(/【例文】\n?①([^\n②③④⑤]+)/);
    return exampleMatch ? exampleMatch[1].trim().replace(/→.+$/, '').trim() : '';
}

// 从JSON内容中提取URL
function extractUrl(content: unknown[]): string | undefined {
    for (const item of content) {
        if (typeof item === 'object' && item !== null && 'tag' in item) {
            const obj = item as { tag: string; href?: string };
            if (obj.tag === 'a' && obj.href) {
                return obj.href;
            }
        }
    }
    return undefined;
}

// 将结构化内容转为纯文本
function extractPlainText(content: unknown[]): string {
    let result = '';
    for (const item of content) {
        if (typeof item === 'string') {
            result += item;
        } else if (typeof item === 'object' && item !== null && 'content' in item) {
            const obj = item as { content: unknown };
            if (typeof obj.content === 'string') {
                result += obj.content;
            } else if (Array.isArray(obj.content)) {
                result += extractPlainText(obj.content);
            }
        }
    }
    return result;
}

// 解析单个term_bank JSON文件
async function parseTermBank(url: string): Promise<GrammarEntry[]> {
    const entries: GrammarEntry[] = [];
    const cacheName = 'yomi-grammar-cache-v1';

    try {
        let response: Response | undefined;
        let cache: Cache | undefined;

        // Try to get from Cache API first
        if (typeof window !== 'undefined' && 'caches' in window) {
            cache = await caches.open(cacheName);
            response = await cache.match(url);
        }

        if (!response) {
            console.log(`[Grammar] Downloading bank ${url}...`);
            response = await fetch(url);
            if (!response.ok) return entries;

            const blob = await response.clone().blob();
            useDictionaryStore.getState().addDownloadedBytes(blob.size);
            useDictionaryStore.getState().incrementDownloadedUnits();

            if (cache) {
                await cache.put(url, response.clone());
            }
        } else {
            console.log(`[Grammar] Loading bank ${url} from cache...`);
            const blob = await response.blob();
            useDictionaryStore.getState().addDownloadedBytes(blob.size);
        }

        const data = await response.json();
        if (!Array.isArray(data)) return entries;

        for (const item of data) {
            if (!Array.isArray(item) || item.length < 8) continue;

            const [term, reading, title, , , definitions, , category] = item;

            if (!term || !title) continue;

            // 提取内容
            let meaning = '';
            let example = '';
            let url: string | undefined;

            if (Array.isArray(definitions) && definitions[0]) {
                const def = definitions[0];
                if (def.type === 'structured-content' && Array.isArray(def.content)) {
                    meaning = extractMeaning(def.content);
                    example = extractExample(def.content);
                    url = extractUrl(def.content);
                }
            }

            // 跳过过短或过于通用的条目
            if (term.length < 2) continue;

            entries.push({
                id: `${term}-${title}`,
                term,
                reading,
                title,
                meaning,
                example,
                category,
                url
            });
        }
    } catch (error) {
        console.error(`Failed to load grammar bank: ${url}`, error);
    }

    return entries;
}

// 加载所有语法文件
export async function loadGrammar(): Promise<void> {
    if (isLoaded) return;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const bankUrls = [
            '/grammar/term_bank_1.json',
            '/grammar/term_bank_2.json',
            '/grammar/term_bank_3.json',
            '/grammar/term_bank_4.json',
        ];

        const allEntries: GrammarEntry[] = [];

        console.log('[Grammar] Starting background loading...');
        for (const url of bankUrls) {
            const entries = await parseTermBank(url);
            allEntries.push(...entries);
            useDictionaryStore.getState().incrementLoadedUnits();
            // Small delay between banks
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 构建索引：按term分组
        for (const entry of allEntries) {
            const existing = grammarIndex.get(entry.term) || [];
            // 去重：同一个title只保留一个
            if (!existing.some(e => e.title === entry.title)) {
                existing.push(entry);
                grammarIndex.set(entry.term, existing);
            }

            // 【新增】同时建立 Reading 索引 (如果 reading 和 term 不同)
            if (entry.reading && entry.reading !== entry.term) {
                const existingReading = grammarIndex.get(entry.reading) || [];
                if (!existingReading.some(e => e.title === entry.title)) {
                    existingReading.push(entry);
                    grammarIndex.set(entry.reading, existingReading);
                }
            }
        }

        isLoaded = true;
        console.log(`[Grammar] Loaded ${grammarIndex.size} unique grammar patterns`);
    })();

    return loadingPromise;
}

// 预热加载 (用于全局初始化)
export async function prefetchGrammar(): Promise<void> {
    return loadGrammar();
}

// 获取语法索引
export function getGrammarIndex(): Map<string, GrammarEntry[]> {
    return grammarIndex;
}

// 检查是否已加载
export function isGrammarLoaded(): boolean {
    return isLoaded;
}
