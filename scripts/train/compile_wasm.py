"""
WASM Compilation Script for Qwen Grammar Teacher Model
This script compiles the MLC-converted model to WebGPU WASM for browser use.

Prerequisites:
1. Install mlc-llm-nightly-cu122 (for CUDA) or mlc-llm-nightly-cpu
2. Install Emscripten SDK (emsdk) version 3.1.56
"""

import os
import subprocess
import sys

# Paths
MODEL_DIR = os.path.abspath("dist/qwen-mlc")
OUTPUT_WASM = os.path.abspath("dist/qwen-grammar-teacher-q4f16_1-webgpu.wasm")
TARGET = "webgpu"  # Target WebGPU for browser

def run_command(cmd):
    print(f"\n🔧 Executing: {cmd}")
    process = subprocess.Popen(cmd, shell=True, stdout=sys.stdout, stderr=sys.stderr)
    process.wait()
    if process.returncode != 0:
        print(f"❌ Error executing command: {cmd}")
        sys.exit(1)
    return True

def check_emscripten():
    """Check if Emscripten is available"""
    try:
        result = subprocess.run(["emcc", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Emscripten found:", result.stdout.split('\n')[0])
            return True
    except FileNotFoundError:
        pass
    print("❌ Emscripten (emcc) not found. Please install emsdk first.")
    print("   Instructions: https://emscripten.org/docs/getting_started/downloads.html")
    return False

def check_mlc_llm():
    """Check if mlc_llm is installed"""
    try:
        result = subprocess.run([sys.executable, "-m", "mlc_llm", "--help"], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ mlc_llm module found")
            return True
    except Exception:
        pass
    print("❌ mlc_llm not installed.")
    print("   Install with: pip install mlc-llm-nightly-cu122 mlc-ai-nightly-cu122")
    return False

def main():
    print("🚀 Starting WASM Compilation for WebLLM...")
    print(f"   Input Model: {MODEL_DIR}")
    print(f"   Output WASM: {OUTPUT_WASM}")
    print()

    # Check prerequisites
    if not check_mlc_llm():
        print("\n⚠️  Please install mlc_llm first:")
        print("   pip install mlc-llm-nightly-cu122 mlc-ai-nightly-cu122")
        return
    
    if not check_emscripten():
        print("\n⚠️  Please install Emscripten first:")
        print("   git clone https://github.com/emscripten-core/emsdk.git")
        print("   cd emsdk && ./emsdk install 3.1.56 && ./emsdk activate 3.1.56")
        print("   source ./emsdk_env.sh (Linux/Mac) or emsdk_env.bat (Windows)")
        return

    # Check if model exists
    if not os.path.exists(MODEL_DIR):
        print(f"❌ Model directory not found: {MODEL_DIR}")
        return

    # Create output directory
    os.makedirs(os.path.dirname(OUTPUT_WASM), exist_ok=True)

    # Compile to WebGPU WASM
    print("\n📦 Compiling model to WebGPU WASM...")
    cmd_compile = f"{sys.executable} -m mlc_llm compile {MODEL_DIR} --target {TARGET} -o {OUTPUT_WASM}"
    run_command(cmd_compile)

    print("\n✨ Compilation Complete!")
    print(f"   WASM saved to: {OUTPUT_WASM}")
    print("\n📋 Next steps:")
    print("   1. Copy the .wasm file to public/models/qwen-grammar-teacher/")
    print("   2. Update useWebLLM.ts to point to the local WASM file")

if __name__ == "__main__":
    main()
