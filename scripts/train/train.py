
import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq
)
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training

# --- Configuration ---
MODEL_PATH = os.path.abspath("public/qwen") # User's local model path
DATA_PATH = os.path.abspath("scripts/train/train_data.json")
OUTPUT_DIR = os.path.abspath("dist/qwen_lora_checkpoints")
FINAL_MODEL_DIR = os.path.abspath("dist/qwen_finetuned")

# Hyperparameters
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.1  # Increased dropout to prevent overfitting
EPOCHS = 3
BATCH_SIZE = 2      # Reduced batch size for stability
GRAD_ACCUMULATION = 8 # Increased accumulation to compensate
LEARNING_RATE = 5e-5 # LOWERED: 2e-4 is too high for 1.7B, causes collapse!
MAX_SEQ_LENGTH = 1024

def formatting_func(example):
    # Format for Qwen-Instruct
    # <|im_start|>system\n...<|im_end|>\n<|im_start|>user\n...<|im_end|>\n<|im_start|>assistant\n...<|im_end|>
    instruction = example['instruction']
    output = example['output']
    
    # Updated System Prompt to match inference persona
    text = f"<|im_start|>system\n你是一位专业的日语语法老师。请用中文详细解释日语语法。<|im_end|>\n"
    text += f"<|im_start|>user\n{instruction}<|im_end|>\n"
    text += f"<|im_start|>assistant\n{output}<|im_end|>"
    return text

def main():
    print("🚀 Starting Qwen Fine-tuning...")
    print(f"Model Path: {MODEL_PATH}")
    
    # 1. Load Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token

    # 2. Load Dataset
    print("📂 Loading Data...")
    dataset = load_dataset('json', data_files=DATA_PATH, split='train')
    
    def preprocess_function(examples):
        inputs = [formatting_func(e) for e in dataset]
        model_inputs = tokenizer(inputs, max_length=MAX_SEQ_LENGTH, padding="max_length", truncation=True)
        # Shift labels for Causal LM
        model_inputs["labels"] = model_inputs["input_ids"].copy()
        return model_inputs

    # Just tokenize simple way for now or use SFTTrainer if installed
    # We will use mapped dataset for standard Trainer
    tokenized_datasets = dataset.map(
        lambda x: tokenizer(formatting_func(x), max_length=MAX_SEQ_LENGTH, padding="max_length", truncation=True),
        remove_columns=dataset.column_names
    )
    # Add labels
    tokenized_datasets = tokenized_datasets.map(lambda x: {"labels": x["input_ids"]})

    # 3. Load Model (BF16 for RTX 4090)
    print("🤖 Loading Model (BF16)...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )
    
    # Enable gradient checkpointing to save memory
    model.gradient_checkpointing_enable()

    # 4. Apply LoRA
    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        inference_mode=False,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"] # Target all linear for better results
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 5. Training Arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUMULATION,
        learning_rate=LEARNING_RATE,
        logging_steps=10,
        num_train_epochs=EPOCHS,
        save_steps=100,
        save_total_limit=2,
        bf16=False,
        fp16=True, # RTX 2080 Ti supports FP16, not BF16
        remove_unused_columns=True,
    )

    # 6. Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets,
        data_collator=DataCollatorForSeq2Seq(tokenizer, pad_to_multiple_of=8, return_tensors="pt", padding=True),
    )

    # 7. Train
    print("🏋️‍♂️ Training Started...")
    trainer.train()
    
    # 8. Save
    print("💾 Saving Model...")
    trainer.save_model(FINAL_MODEL_DIR)
    tokenizer.save_pretrained(FINAL_MODEL_DIR) # Save tokenizer too
    print(f"✨ Custom Model Saved to: {FINAL_MODEL_DIR}")

if __name__ == "__main__":
    main()
