import hunspell

class CandiateGenerator:
    def __init__(self):
        # Initialize the Hunspell object with the dictionary and affix files
        self.generator = hunspell.HunSpell(
            '/home/sarthak/Desktop/VakyaShuddhi/backend/data/hi_IN.dic', 
            '/home/sarthak/Desktop/VakyaShuddhi/backend/data/hi_IN.aff'
        )

    def check_word(self, word):
        # Check if the word is correctly spelled
        return self.generator.spell(word)

    def generate_candidates(self, word):
        # Generate candidate corrections for the given word
        return self.generator.suggest(word)
    
    def add_word(self, word):
        # Add a new word to the Hunspell dictionary
        self.generator.add(word)
    
    def remove_word(self, word):
        # Remove a word from the Hunspell dictionary
        self.generator.remove(word)

    def analyze_word(self, word):
        # Analyze the word and return its morphological information
        return self.generator.analyze(word)
    
