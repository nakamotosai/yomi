import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'dataset_grammar_distilled.jsonl');

if (!fs.existsSync(FILE_PATH)) {
    console.log('No file to deduplicate.');
    process.exit(0);
}

console.log('🧹 Deduplicating dataset...');

const content = fs.readFileSync(FILE_PATH, 'utf-8');
const lines = content.split('\n');
const uniqueLines = new Map<string, string>();
const termCounts = new Map<string, number>();

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const json = JSON.parse(line);
        const userMsg = json.messages.find((m: any) => m.role === 'user')?.content || '';
        const match = userMsg.match(/语法「(.+)」的用法/);

        if (match && match[1]) {
            const term = match[1];
            // Keep the last occurrence (most recent) or first? Doesn't matter much if identical.
            // Let's keep the last one.
            uniqueLines.set(term, line);
            termCounts.set(term, (termCounts.get(term) || 0) + 1);
        }
    } catch (e) {
        // ignore
    }
}

// Write back
const output = Array.from(uniqueLines.values()).join('\n') + '\n';
fs.writeFileSync(FILE_PATH, output, 'utf-8');

console.log(`✅ Done. Reduced from ${lines.length} lines to ${uniqueLines.size} unique terms.`);
const duplicates = Array.from(termCounts.entries()).filter(([k, v]) => v > 1);
console.log(`🗑️  Removed duplicates for ${duplicates.length} terms.`);
