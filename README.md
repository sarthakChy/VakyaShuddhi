# VakyaShuddhi

## Project Guide

### Setup:

1. Create a new Python virtual environment:   
    python3 -m venv sample_env # Creates a new venv in current local directory with chosen name: sample_env (you'll see a new dir with this name appear in root dir)

2. Activate local enrionment:  
    source sample_env/bin/activate  (for linux)
    .\sample_env\Scripts\Activate.ps1 (for windows)

3. Install all requirements:  
    pip install -r requirements.txt

4. Run /utils/environment_check.py to ensure all libraries and packages are correctly installed and versions match

5. Run /utils/test_cuda.py to see if CUDA is available, or fall back to CPU (boo, slow)
    if cuda not available try using pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

