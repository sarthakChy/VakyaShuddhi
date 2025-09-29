from flask import Flask, request, jsonify
from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch

app = Flask(__name__)

# Load a public model and tokenizer (DistilGPT-2)
model_name = "distilgpt2"  # Publicly available model on Hugging Face
model = GPT2LMHeadModel.from_pretrained(model_name)
tokenizer = GPT2Tokenizer.from_pretrained(model_name)


@app.route('/api/get-completion', methods=['POST'])
def get_completion():
    try:
        # Get input text from the request
        data = request.json
        input_text = data.get('text', '').strip()

        if not input_text:
            return jsonify({"suggestion": ""})

        # Tokenize the input text
        inputs = tokenizer.encode(input_text, return_tensors="pt")

        # Generate the completion using the model
        with torch.no_grad():
            output = model.generate(
                inputs,
                max_length=50,  # Maximum length of the completion
                num_beams=5,  # Beam search for better results
                num_return_sequences=3,  # Return 3 different suggestions
                no_repeat_ngram_size=2,  # Avoid repetition
                early_stopping=True
            )

        # Decode the output to text
        completed_text = [tokenizer.decode(g, skip_special_tokens=True) for g in output]

        # Return the best suggestion
        return jsonify({"suggestion": completed_text})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Error generating suggestion"}), 500


if __name__ == '__main__':
    app.run(debug=True)
