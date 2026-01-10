import fs from 'fs';
import path from 'path';

const INPUT_FILE = path.join(process.cwd(), 'dataset_grammar_distilled.jsonl');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'grammar', 'grammar_dict_zh.json');

async function main() {
    console.log('🚀 Starting Dataset Conversion...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found: ${INPUT_FILE}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const lines = fileContent.split('\n');

    const dictionary: Record<string, string> = {};
    let count = 0;

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);

            // Extract Term
            const userMsg = data.messages.find((m: any) => m.role === 'user')?.content || '';
            const match = userMsg.match(/语法「(.+)」的用法/);

            if (match && match[1]) {
                const term = match[1];
                // Extract Content
                const content = data.messages.find((m: any) => m.role === 'assistant')?.content || '';

                if (content) {
                    dictionary[term] = content;
                    count++;
                }
            }
        } catch (e) {
            console.warn('⚠️ Skipping invalid line:', line.substring(0, 50) + '...');
        }
    }

    // Write to public/data
    // Ensure dir exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dictionary, null, 2), 'utf-8');
    console.log(`✨ Converted ${count} entries.`);
    console.log(`💾 Saved to: ${OUTPUT_FILE}`);
}

main();
