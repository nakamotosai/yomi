import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local explicitly as this is a standalone script, not Next.js
dotenv.config({ path: '.env.local' });

// Data types based on grammar JSON structure
type GrammarEntry = [
    string, // 0: Term
    string, // 1: Reading
    string, // 2: Connection rule string
    string, // 3: Empty?
    number, // 4: Rank/Level?
    any[],  // 5: Structured content (The main definition)
    number, // 6: ID
    string  // 7: Category
];

// Configuration
const OUTPUT_FILE_PATH = path.join(process.cwd(), 'dataset_grammar_distilled.jsonl');
const API_URL = 'https://api.deepseek.com/chat/completions';
const API_KEY = process.env.DEEPSEEK_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: DEEPSEEK_API_KEY is not found in environment variables.');
    console.error('Please create a .env.local file and add DEEPSEEK_API_KEY=sk-...');
    process.exit(1);
}

// Helper to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callDeepSeek(term: string, meaning: string, example: string): Promise<string | null> {
    const prompt = `
你是一位精通中日对比语言学的资深日语教师。请针对日语初学者，对语法点「${term}」进行深度剖析。

【输入信息】
- 语法：${term}
- 含义：${meaning}
- 例句：${example}

【思维链要求（Internal Thought）】
在生成最终讲解前，请先在内心思考逻辑：接续规则 -> 核心语感（日本人使用的真实心理） -> 易错辨析（与近似语法的本质区别）。

【最终输出要求（Output）】
请输出一段**干练、直击要害**的口语讲解。
1. **风格**：不要废话！不要使用“大家看”、“其实很简单”等无效垫话。像一位高效率的名师，三言两语点透本质。
2. **结构**：
   - **核心**：一句话说明它在中文里对应的感觉（语感）。
   - **用法**：紧接着说明接续和场景。
   - **避坑**：直白点出最容易混淆的语法区别。
3. **篇幅**：控制在 200 字以内，句句干货。
4. **格式**：必须使用 Markdown 格式。请**加粗**（使用 **...**）文中的核心概念和出现的语法词，以便前端自动高亮显示。
`.trim();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-reasoner',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 8000
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.error(`⏳ Rate limited (429). Waiting 10s...`);
                await sleep(10000); // Wait 10s on 429
                return "RATE_LIMIT";
            }
            const err = await response.text();
            console.error(`API Error for ${term}:`, err);
            return null;
        }

        const data = await response.json();

        // Debug: Log the output to see if content is empty
        if (!data.choices?.[0]?.message?.content) {
            console.log('⚠️ Debug: No content in response:', JSON.stringify(data, null, 2));
        }

        return data.choices[0].message.content;

    } catch (error) {
        console.error(`Network Error for ${term}:`, error);
        return null;
    }
}

// Concurrency limit
const CONCURRENCY_LIMIT = 5;

async function processEntry(term: string, index: number, total: number, stream: fs.WriteStream) {
    // Retry logic
    let retries = 5;
    while (retries > 0) {
        try {
            const explanation = await callDeepSeek(term, "（请基于公认的语法含义）", "（请自行举一个简单例句）");

            if (explanation === "RATE_LIMIT") {
                // Specific retry for rate limit is handled by outer loop, but we need to ensure not to burn retries too fast
                // The delay is already inside callDeepSeek
                retries--;
                continue;
            }

            if (explanation) {
                const datasetLine = JSON.stringify({
                    messages: [
                        { role: "user", content: `老师，请教一下语法「${term}」的用法。` },
                        { role: "assistant", content: explanation }
                    ]
                });
                stream.write(datasetLine + '\n');
                console.log(`✅ [${index}/${total}] Saved: ${term}`);
                return;
            }
        } catch (error) {
            console.error(`⚠️ [${index}/${total}] Failed: ${term}, retrying...`);
        }
        retries--;
        await sleep(2000);
    }
    console.error(`❌ [${index}/${total}] Give up: ${term}`);
}

async function main() {
    console.log('🚀 Starting Full Grammar Distillation...');

    // 1. Gather all entries from all files
    const allEntries: { term: string, original: GrammarEntry }[] = [];
    const files = ['term_bank_1.json', 'term_bank_2.json', 'term_bank_3.json', 'term_bank_4.json'];

    for (const file of files) {
        const p = path.join(process.cwd(), 'public', 'grammar', file);
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf-8');
            const entries: GrammarEntry[] = JSON.parse(content);
            entries.forEach(e => allEntries.push({ term: e[0], original: e }));
        }
    }

    console.log(`📚 Total vocabulary found: ${allEntries.length}`);

    // Check existing progress to SKIP
    const processedTerms = new Set<string>();
    if (fs.existsSync(OUTPUT_FILE_PATH)) {
        const fileContent = fs.readFileSync(OUTPUT_FILE_PATH, 'utf-8');
        const lines = fileContent.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const json = JSON.parse(line);
                // Try to extract term from user message
                const text = json.messages[0].content;
                const match = text.match(/语法「(.+)」的用法/);
                if (match) {
                    processedTerms.add(match[1]);
                }
            } catch (e) {
                // ignore broken lines
            }
        }
        console.log(`⏭️  Found ${processedTerms.size} already processed terms. Skipping them.`);
    }

    // Filter out processed ones
    const remainingEntries = allEntries.filter(e => !processedTerms.has(e.term));
    console.log(`📉 Remaining to process: ${remainingEntries.length}`);

    if (remainingEntries.length === 0) {
        console.log("🎉 Everything is already distilled!");
        return;
    }

    // Open write stream (append mode)
    const stream = fs.createWriteStream(OUTPUT_FILE_PATH, { flags: 'a' });

    // 2. Process with concurrency
    // Simple pool
    const total = remainingEntries.length;

    // Process all remaining
    for (let i = 0; i < total; i += CONCURRENCY_LIMIT) {
        const chunk = remainingEntries.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`🔄 Processing batch ${i}/${total}...`);

        await Promise.all(chunk.map((item, idx) =>
            processEntry(item.term, i + idx + 1, total, stream)
        ));

        await sleep(500);
    }

    console.log('✨ All Done! Output saved to', OUTPUT_FILE_PATH);
}

main();
