from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from indicnlp.transliterate.unicode_transliterate import UnicodeIndicTransliterator

# भारत एक तेज़ी से बदलता हुआ देश है जहाँ तकनीक, शिक्षा और उद्योग लगातार नए स्तर पर पहुँच रहे हैं। आज का युवा वर्ग डिजिटल कौशल, नवाचार और स्टार्ट-अप संस्कृति की ओर तेज़ी से बढ़ रहा है। शहरों में रोजगार और अवसर बढ़ रहे हैं, जबकि ग्रामीण क्षेत्रों में भी विकास की रफ़्तार पहले से बेहतर दिखाई देती है। फिर भी समस्याएँ मौजूद हैं—शिक्षा की गुणवत्ता, बेरोज़गारी, प्रदूषण और अव्यवस्थित शहरीकरण जैसे मुद्दे आज भी चुनौती बने हुए हैं। सरकार और निजी क्षेत्र दोनों इन चुनौतियों को कम करने के लिए कई योजनाएँ और परियोजनाएँ चला रहे हैं। यदि विकास की यह गति बनी रहती है, तो आने वाले वर्षों में भारत वैश्विक स्तर पर और भी मजबूत स्थिति में दिखाई देगा।


class Paraphraser():

    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("ai4bharat/MultiIndicParaphraseGeneration", do_lower_case=False, use_fast=False, keep_accents=True)
        self.model = AutoModelForSeq2SeqLM.from_pretrained("ai4bharat/MultiIndicParaphraseGeneration")

        self.bos_id = self.tokenizer._convert_token_to_id_with_added_voc("<s>")
        self.eos_id = self.tokenizer._convert_token_to_id_with_added_voc("</s>")
        self.pad_id = self.tokenizer._convert_token_to_id_with_added_voc("<pad>")
        self.lang_mapping = {
            "hindi":"hi",
            "tamil":"ta",
            "telugu":"te",
            "bengali":"bn",
            "assamese":"as",
            "gujarati":"gu",
            "kannada":"kn",
            "malayalam":"ml",
            "marathi":"mr",
            "punjabi":"pa",
            "oriya":"or"
        }
    # To get lang_id use any of ['<2as>', '<2bn>', '<2en>', '<2gu>', '<2hi>', '<2kn>', '<2ml>', '<2mr>', '<2or>', '<2pa>', '<2ta>', '<2te>']
    # Input should be "Sentence </s> <2xx>" where xx is the language code. Similarly, the output should be "<2yy> Sentence </s>".
    def get_langtag(self, language:str):
        return self.lang_mapping[language]
        
    def tokenize(self,message:str,lang_code:str ="<2hi>"):
        formated_input = f"{message.strip()} </s> {lang_code}"
        return self.tokenizer(formated_input,add_special_tokens=False,return_tensors="pt",padding=True).input_ids

    def generate_output_token(self,input_tokens,no_repeat_ngram_size=3,
                    encoder_no_repeat_ngram_size=3,num_beams=4,max_length=20,
                    min_length=1,early_stopping=True,lang_code="<2hi>"):

        return self.model.generate(
                                input_tokens, 
                                use_cache=True,
                                no_repeat_ngram_size=no_repeat_ngram_size,
                                encoder_no_repeat_ngram_size=encoder_no_repeat_ngram_size,
                                num_beams=num_beams,
                                max_length=max_length, 
                                min_length=min_length,
                                early_stopping=early_stopping,
                                pad_token_id=self.pad_id,
                                bos_token_id=self.bos_id,
                                eos_token_id=self.eos_id,
                                   decoder_start_token_id=self.tokenizer._convert_token_to_id_with_added_voc(lang_code))

    def decode_output(self,output_tokens, skip_special_tokens=True,clean_up_tokenization_spaces=True):
        return self.tokenizer.decode(output_tokens[0], skip_special_tokens=skip_special_tokens, clean_up_tokenization_spaces=clean_up_tokenization_spaces)
        
    def translate(self,text_in_devanagari:str,lang_tag:str):
        return UnicodeIndicTransliterator.transliterate(text_in_devanagari, "hi", lang_tag)

