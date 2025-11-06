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


## data_preprocessing.py
Main encapsulated data-handling class managing: load, verify, shuffle, split, create, convert and save data in huggingface datasets.  
 Retrieves JSON training data input/output names and initialises class instance with correct tokenizer and pad_token/eos_token using  model_name and source_input_field / source_output_field from config.py

## prepare_data.py
Script to prepare and save data: loads, splits, creates, validates and saves dataset into arrow format. 

## train.py
Main training function.

## /utils
Contains various utility scripts for project pipeline: 

- environment_check : Test environment setup and library/package version match  
- test_cuda: Tests if CUDA is available and defaults to torch using CPU if not   
- inspect_dataset: converts .pt tensor dataset back to tokens and text for inspection  
- inspect_tensors: converts .pt tensor data back to preview of tensors for additional inspection  

## / upload
Scripts to merge fine-tuned model with base model, test merged model, generation spiece.model files if needed, upload a merged model to huggingface and test an uploaded model.
### merge_base_model
Script to merge base model with your fine-tuned model configs. Adjust lines 61 + 63. 
### test_merged_model
To test your merged model before pushing to huggingface. Adjust name and test input as needed. Uncomment generation_configs if needed to experiment with different parameters. 

### upload_to_huggingface
Update lines 63-66 of 'main' function accordginly. When running script you'll be prompted to enter a valid HF access token in CLI. 






export GOOGLE_APPLICATION_CREDENTIALS="/home/user/Downloads/service-account-file.json"