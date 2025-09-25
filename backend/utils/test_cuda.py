import torch

def get_device():
    print(f"\n🧳  PyTorch version: {torch.__version__}")

    if torch.cuda.is_available():
        print("\n🔥 CUDA is available - using NVIDIA GPU!")
        device = torch.device("cuda")
        print(f"🖥️  GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("\n🐌 CUDA not available - falling back to CPU...")
        device = torch.device("cpu")

    return device

if __name__ == "__main__":
    device = get_device()
    print(f"\n👉 Using device: {device}")
