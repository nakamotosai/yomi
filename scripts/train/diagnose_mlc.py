
import sys
import os
import importlib.util

print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")

print("\n--- Searching for mlc_llm ---")
try:
    import mlc_llm
    print(f"✅ Import successful: {mlc_llm.__file__}")
except ImportError as e:
    print(f"❌ Import failed: {e}")

print("\n--- Installed Packages (pip freeze) ---")
try:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'list'])
except Exception:
    print("Could not run pip list")

print("\n--- Site Packages Paths ---")
for p in sys.path:
    print(p)
