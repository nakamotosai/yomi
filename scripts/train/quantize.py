
import os
import subprocess
import sys

# Paths
INPUT_MODEL = os.path.abspath("dist/qwen_merged_fp16")
OUTPUT_DIR = os.path.abspath("dist/qwen-mlc")
QUANTIZATION = "q4f16_1"
CONV_TEMPLATE = "qwen2"

def run_command(cmd):
    print(f"Executing: {cmd}")
    # Run command and pipe output to stdout
    process = subprocess.Popen(cmd, shell=True, stdout=sys.stdout, stderr=sys.stderr)
    process.wait()
    if process.returncode != 0:
        print(f"Error executing command: {cmd}")
        sys.exit(1)

def main():
    print("🚀 Starting MLC Quantization...")
    
    # Check if input exists
    if not os.path.exists(INPUT_MODEL):
        print(f"Error: Input model not found at {INPUT_MODEL}")
        return

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Generate Config
    print("\n[1/2] Generating MLC Config...")
    cmd_config = f"{sys.executable} -m mlc_llm gen_config {INPUT_MODEL} --quantization {QUANTIZATION} --conv-template {CONV_TEMPLATE} -o {OUTPUT_DIR}"
    run_command(cmd_config)

    # 2. Convert Weights
    print("\n[2/2] Converting Weights (force CPU for stability)...")
    cmd_convert = f"{sys.executable} -m mlc_llm convert_weight {INPUT_MODEL} --quantization {QUANTIZATION} --device cpu -o {OUTPUT_DIR}"
    run_command(cmd_convert)

    print("\n✨ Quantization Complete!")
    print(f"Model saved to: {OUTPUT_DIR}")
    print("Next step: Upload this folder to huggingface or host it locally for WebLLM.")

if __name__ == "__main__":
    main()
