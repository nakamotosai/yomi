
import os
import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

# Configuration
BASE_MODEL_PATH = os.path.abspath("public/qwen")
ADAPTER_PATH = os.path.abspath("dist/qwen_finetuned")
OUTPUT_PATH = os.path.abspath("dist/qwen_merged_fp16")

def main():
    print(f"🚀 Starting LoRA Merge...")
    print(f"Base Model: {BASE_MODEL_PATH}")
    print(f"Adapter: {ADAPTER_PATH}")
    
    # 1. Load Base Model
    print("Loading base model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_PATH,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )
    
    # 2. Load Adapter
    print("Loading LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
    
    # 3. Merge and Unload
    print("Merging weights...")
    model = model.merge_and_unload()
    
    # 4. Save
    print(f"Saving merged model to {OUTPUT_PATH}...")
    model.save_pretrained(OUTPUT_PATH)
    
    # Save tokenizer as well
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_PATH, trust_remote_code=True)
    tokenizer.save_pretrained(OUTPUT_PATH)
    
    print("✨ Merge Complete!")

if __name__ == "__main__":
    main()
