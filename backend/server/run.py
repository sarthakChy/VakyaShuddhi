from utils.hunspell import CandiateGenerator

def main():
    generator = CandiateGenerator()

    sentence = 'प्रदुषण की समस्या दिन-प्रतिदिन गम्भीर होती ज रह है।'

    for word in sentence.split(' '):
        if(generator.check_word(word)):
            print(f'correct word {word}')
        else:
            print(f"incorrect {word} : {generator.generate_candidates(word)}")


if(__name__ == '__main__'):
    main()