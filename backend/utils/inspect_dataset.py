# import sys
# from pathlib import Path

# # Add the parent directory to the Python path
# current_dir = Path(__file__).resolve().parent
# parent_dir = current_dir.parent
# sys.path.append(str(parent_dir))

# import torch
# from transformers import AutoTokenizer
# from src.config import TrainingConfig

# def inspect_dataset(dataset_path):
#     """Load and inspect a saved dataset"""
#     print(f"\n🔎 Inspecting dataset: {dataset_path}")
    
#     # Load dataset
#     dataset = torch.load(dataset_path)
#     print(f"\n📏 Dataset length: {len(dataset)}")
    
#     # Get first example
#     example = dataset[0]
#     print("\nFirst example contents:")
#     print(f"Keys: {example.keys()}")
    
#     # Load tokenizer
#     tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
    
#     # Detailed token analysis
#     input_tokens = example['input_ids'].tolist()
#     print("\n👀 Input Analysis:")
#     print(f"Number of tokens: {len(input_tokens)}")
#     print(f"Number of padding tokens: {input_tokens.count(tokenizer.pad_token_id)}")
#     print(f"First 50 tokens decoded individually:")
#     for i, token_id in enumerate(input_tokens[:50]):
#         if token_id != tokenizer.pad_token_id:
#             token = tokenizer.decode([token_id])
#             print(f"Token {i}: {token_id} -> '{token}'")
    
#     # Full text decoding
#     print("\n📒 Full decoded text:")
#     input_text = tokenizer.decode(example['input_ids'], skip_special_tokens=True)
#     print("\n📏 Input text length:", len(input_text))
#     print("Input:", input_text)
    
#     target_text = tokenizer.decode(example['labels'], skip_special_tokens=True)
#     print("\n📏 Target text length:", len(target_text))
#     print("Target:", target_text)

# if __name__ == "__main__":
#     config = TrainingConfig()

#     """ Select dataset to inspect """
#     inspect_dataset(config.train_dataset_path)
#     # inspect_dataset(config.val_dataset_path)

from pathlib import Path
from datasets import load_from_disk
from transformers import AutoTokenizer
from src.data_preprocessing import HFDatasetWrapper
from src.config import TrainingConfig
import torch

def inspect_hf_dataset(dataset_path):
    print(f"\n🔎 Inspecting HF dataset: {dataset_path}")
    
    # Load dataset
    dataset = load_from_disk(str(dataset_path))
    print(f"📏 Dataset length: {len(dataset)}")

    # Wrap for PyTorch if needed
    dataset = HFDatasetWrapper(dataset)

    # Show first example
    example = dataset[0]
    print("\nFirst example keys:", example.keys())
    
    tokenizer = AutoTokenizer.from_pretrained("ai4bharat/indicbart")
    
    input_ids = example["input_ids"].tolist() if isinstance(example["input_ids"], torch.Tensor) else example["input_ids"]
    labels = example["labels"].tolist() if isinstance(example["labels"], torch.Tensor) else example["labels"]

    print("\n👀 Input IDs length:", len(input_ids))
    print("First 50 tokens decoded:")
    for i, token_id in enumerate(input_ids[:50]):
        print(f"{token_id} -> {tokenizer.decode([token_id])}")
    
    print("\n📒 Full input text:")
    print(tokenizer.decode(input_ids, skip_special_tokens=True))
    print("\n📒 Target text:")
    print(tokenizer.decode(labels, skip_special_tokens=True))

if __name__ == "__main__":
    config = TrainingConfig()
    inspect_hf_dataset(config.train_dataset_path)
    inspect_hf_dataset(config.val_dataset_path)
