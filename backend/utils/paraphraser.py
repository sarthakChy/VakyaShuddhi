from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

class Paraphraser():

    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("ai4bharat/MultiIndicParaphraseGeneration", do_lower_case=False, use_fast=False, keep_accents=True)
        self.model = AutoModelForSeq2SeqLM.from_pretrained("ai4bharat/MultiIndicParaphraseGeneration")

        self.bos_id = self.tokenizer._convert_token_to_id_with_added_voc("<s>")
        self.eos_id = self.tokenizer._convert_token_to_id_with_added_voc("</s>")
        self.pad_id = self.tokenizer._convert_token_to_id_with_added_voc("<pad>")
  
    # To get lang_id use any of ['<2as>', '<2bn>', '<2en>', '<2gu>', '<2hi>', '<2kn>', '<2ml>', '<2mr>', '<2or>', '<2pa>', '<2ta>', '<2te>']
    # Input should be "Sentence </s> <2xx>" where xx is the language code. Similarly, the output should be "<2yy> Sentence </s>".

    def tokenize(self,sentence:str,lang_code:str ="<2hi>"):
        formated_input = f"{sentence.strip()} </s> {lang_code}"
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
        
