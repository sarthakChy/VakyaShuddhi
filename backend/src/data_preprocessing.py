import json
from typing import List, Dict
from pathlib import Path
from transformers import AutoTokenizer
from datasets import Dataset, DatasetDict
from .config import TrainingConfig
import torch

class DataPreprocessorHF:
    """
    Preprocessing using Hugging Face Datasets.
    Handles tokenization, train/val split, and disk saving efficiently.
    """
    def __init__(self, tokenizer_name: str, config: TrainingConfig):
        self.config = config
        self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

    def load_and_verify_data(self, file_path: str) -> List[Dict]:
        """Load and verify the raw JSON data."""
        print(f"📦 Loading raw data from {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)

        for idx, item in enumerate(raw_data):
            if self.config.source_input_field not in item or self.config.source_target_field not in item:
                raise ValueError(f"Missing required fields at index {idx}: {item}")
            if not item[self.config.source_input_field] or not item[self.config.source_target_field]:
                raise ValueError(f"Empty input/target at index {idx}: {item}")

        print(f"🗂 Successfully loaded and verified {len(raw_data)} examples.")
        return raw_data

    def tokenize_batch(self, examples):
        """Tokenize inputs and targets in batch."""
        inputs = [self.config.input_prompt_template.format(x) for x in examples[self.config.source_input_field]]
        targets = examples[self.config.source_target_field]

        tokenized = self.tokenizer(
            inputs,
            max_length=self.config.max_input_length,
            padding="max_length",
            truncation=True,
        )
        target_enc = self.tokenizer(
            targets,
            max_length=self.config.max_target_length,
            padding="max_length",
            truncation=True,
        )
        tokenized["labels"] = target_enc["input_ids"]
        return tokenized

    def prepare_and_save(self):
        # Load and verify data
        data = self.load_and_verify_data(self.config.data_path)

        # Convert to HF Dataset
        dataset = Dataset.from_list(data)

        # Split into train/validation
        split = dataset.train_test_split(test_size=1 - self.config.train_ratio, seed=42)
        dataset_dict = DatasetDict({
            "train": split["train"],
            "validation": split["test"]
        })

        # Tokenize with parallelization
        print("⚙ Tokenizing dataset...")
        tokenized_dataset = dataset_dict.map(
            self.tokenize_batch,
            batched=True,
            remove_columns=[self.config.source_input_field, self.config.source_target_field],
            num_proc=4  # adjust based on CPU cores
        )

        # Save tokenized dataset to disk
        output_dir = Path(self.config.output_dir) / "hf_tokenized_dataset"
        output_dir.mkdir(parents=True, exist_ok=True)
        print(f"💾 Saving tokenized datasets to {output_dir}...")
        tokenized_dataset.save_to_disk(str(output_dir))
        print("✅ Done. Ready for training!")

# Optional: wrap HF Dataset as PyTorch Dataset for DataLoader
class HFDatasetWrapper(torch.utils.data.Dataset):
    def __init__(self, hf_dataset):
        self.dataset = hf_dataset

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, idx):
        item = self.dataset[idx]
        return {
            "input_ids": torch.tensor(item["input_ids"], dtype=torch.long),
            "attention_mask": torch.tensor(item["attention_mask"], dtype=torch.long),
            "labels": torch.tensor(item["labels"], dtype=torch.long)
        }
