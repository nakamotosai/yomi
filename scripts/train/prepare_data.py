
import json
import os
import sys

# Paths
INPUT_PATH = os.path.join(os.getcwd(), 'dataset_grammar_distilled.jsonl')
OUTPUT_PATH = os.path.join(os.getcwd(), 'scripts', 'train', 'train_data.json')

def main():
    print(f"Loading data from {INPUT_PATH}...")
    
    if not os.path.exists(INPUT_PATH):
        print(f"Error: {INPUT_PATH} does not exist.")
        return

    training_data = []

    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                messages = data.get('messages', [])
                
                # Extract user query (Term) and assistant response (Explanation)
                user_content = next((m['content'] for m in messages if m['role'] == 'user'), None)
                assistant_content = next((m['content'] for m in messages if m['role'] == 'assistant'), None)

                if user_content and assistant_content:
                    # Parse term from "语法「X」的用法" if possible, otherwise use full query
                    term = user_content
                    import re
                    match = re.search(r'语法「(.+)」的用法', user_content)
                    if match:
                        term = match.group(1)

                    # Create Alpaca format entry
                    entry = {
                        "instruction": f"请像专业的日语老师一样，用中文详细解释日语语法「{term}」。包括核心含义、接续、用法和例句。",
                        "input": "",
                        "output": assistant_content
                    }
                    training_data.append(entry)
            except Exception as e:
                print(f"Skipping line due to error: {e}")

    # Save to JSON
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(training_data, f, ensure_ascii=False, indent=2)

    print(f"Successfully converted {len(training_data)} entries.")
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
