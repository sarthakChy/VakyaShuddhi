import torch
from transformers import AlbertTokenizer, AutoModelForSeq2SeqLM
import difflib
import string
from typing import List, Optional
from models.models import (
    GrammarRequest,
    GrammarError,
    GrammarResponse,
)
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HindiGrammarChecker")

# राम और सीता बाजार गया। वे सब्जी खरीदा और घर आये। बच्चे खेल रहा है। मुजे उनका किताब चाहिए था।
# लड़की स्कूल गया। उसने अपना काम किया। टीचर बहुत खुश था। सब बच्चा अच्छा है।
# मैं कल दिल्ली जा। वह खाना खा। हम फिल्म देख। तुम कहा रहते?
# वह लड़का को पुस्तक दिया। मै आप से मिलना चाहता हु। राधा का घर मे है। यह बहुत सुंदर किताब है।
# आज मौसम बहुत अच्छा है। मैं पार्क मे गया और दोस्तो से मिला। हमने क्रिकेट खेला और बहुत मजा आया। शाम को हम सब घर आ गया। मुजे आज का दिन बहुत पसंद आई।
# मै जा रहा हु। तुम कहा हो? वह अच्छा लड़का है। किताब मेज पर है।
# प्रधानमंत्री ने देश को संबोधित किया। उन्होने कहा कि हमे मिलकर काम करना चाहिए। सरकार नए योजना शुरू करेगी। यह देश के विकास के लिए बहुत जरुरी है।

class HindiGrammarChecker:
    """Grammar checker using fine-tuned IndicBART + Hunspell"""
    
    def __init__(self, model_path: str, hunspell_dic: str, hunspell_aff: str):
        import hunspell
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Grammar checker using device: {self.device}")
        
        # Load Hunspell
        self.hobj = hunspell.HunSpell(hunspell_dic, hunspell_aff)
        logger.info("Hunspell loaded")
        
        # Load fine-tuned model
        self.tokenizer = AlbertTokenizer.from_pretrained(
            model_path,
            do_lower_case=False,
            use_fast=False,
            keep_accents=True
        )
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_path).to(self.device)
        self.model.eval()
        logger.info("Fine-tuned model loaded")
        
        self.correction_cache = {}
    
    def get_corrected_text(self, text: str) -> str:
        """Get grammar-corrected text from model"""
        if text in self.correction_cache:
            return self.correction_cache[text]
        
        inference_text = f"{text} </s> <2hi>"
        inputs = self.tokenizer(
            inference_text,
            return_tensors="pt",
            padding=True,
            max_length=128,
            truncation=True
        ).to(self.device)
        
        with torch.no_grad():
            output_ids = self.model.generate(
                inputs["input_ids"],
                max_length=128,
                num_beams=5,
                early_stopping=True
            )
        
        corrected = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
        self.correction_cache[text] = corrected
        return corrected
    
    def get_sentence_context(self, text: str, start_pos: int) -> Optional[str]:
        """Extract sentence context"""
        sentence_pattern = r'[^।.!?]*[।.!?]\s*|$'
        matches = list(re.finditer(sentence_pattern, text))
        
        for match in matches:
            if match.start() <= start_pos < match.end():
                return match.group(0).strip()
        return text
    
    def check_spelling(self, text: str) -> List[GrammarError]:
        """Hunspell spelling check"""
        errors = []
        error_id = 1
        matches = re.finditer(r'[\u0900-\u097F]+', text)
        
        for match in matches:
            word = match.group(0)
            if not self.hobj.spell(word):
                suggestions = self.hobj.suggest(word)
                if suggestions:
                    errors.append(GrammarError(
                        id=error_id,
                        type="Spelling",
                        message="Possible spelling mistake",
                        original=word,
                        suggestion=suggestions[0],
                        context=self.get_sentence_context(text, match.start())
                    ))
                    error_id += 1
        return errors
    
    def is_common_spelling_error(self, orig: str, corr: str) -> bool:
        """Detect common Hindi spelling mistakes"""
        # Common confusions: जे/झे, का/के, etc.
        common_pairs = [
            ('जे', 'झे'), ('का', 'के'), ('की', 'के'),
            ('मुजे', 'मुझे'), ('आप', 'आप'), 
        ]
        
        for wrong, right in common_pairs:
            if wrong in orig and right in corr:
                return True
            if right in orig and wrong in corr:
                return True
        
        return False

    def is_verb_form_change(self, orig: str, corr: str) -> bool:
        """Check if this is a verb form/tense change"""
        verb_markers = ['है', 'हैं', 'था', 'थी', 'थे', 'रहा', 'रही', 'रहे']
        
        orig_has_verb = any(marker in orig for marker in verb_markers)
        corr_has_verb = any(marker in corr for marker in verb_markers)
        
        return orig_has_verb or corr_has_verb

    def find_grammar_errors(self, original: str, corrected: str) -> List[GrammarError]:
        """Compare original vs corrected to find errors"""
        errors = []
        error_id = 10000
        
        translator = str.maketrans('', '', string.punctuation + '।')
        original_clean = original.translate(translator)
        corrected_clean = corrected.translate(translator)
        
        original_words = original_clean.split()
        corrected_words = corrected_clean.split()
        
        if original_words == corrected_words:
            return errors
        
        matcher = difflib.SequenceMatcher(None, original_words, corrected_words)
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                continue
            
            original_chunk = " ".join(original_words[i1:i2])
            suggestion_chunk = " ".join(corrected_words[j1:j2])
            
            if tag == 'replace':
                message = "Grammar correction suggested"
                error_type = "Grammar"
                
                # Detect specific error types
                if len(original_words[i1:i2]) == 1 and len(corrected_words[j1:j2]) == 1:
                    orig = original_words[i1]
                    corr = corrected_words[j1]
                    
                    # Gender agreement detection
                    if (orig.endswith('ई') and corr.endswith('ा')) or \
                       (orig.endswith('गई') and corr.endswith('गया')) or \
                       (orig.endswith('ा') and corr.endswith('ी')) or \
                       (orig.endswith('ी') and corr.endswith('ा')):
                        error_type = "Gender Agreement"
                        message = "Verb gender should match subject"
                    # Number agreement detection
                    elif ('ें' in corr and 'ें' not in orig) or \
                         ('ों' in corr and 'ों' not in orig):
                        error_type = "Number Agreement"
                        message = "Plural form should be used"
                    # Common spelling mistakes (जे vs झे, etc)
                    elif self.is_common_spelling_error(orig, corr):
                        error_type = "Spelling"
                        message = "Spelling correction"
                    # Other grammar changes
                    elif self.is_verb_form_change(orig, corr):
                        error_type = "Grammar"
                        message = "Verb form correction"

                errors.append(GrammarError(
                    id=error_id,
                    type=error_type,
                    message=message,
                    original=original_chunk,
                    suggestion=suggestion_chunk,
                    context=original
                ))
                error_id += 1
            
            elif tag == 'delete':
                suggestion_chunk = ""
                message = "Word(s) may be unnecessary"
                error_type = "Deletion"

                errors.append(GrammarError(
                    id=error_id,
                    type=error_type,
                    message=message,
                    original=original_chunk,
                    suggestion=suggestion_chunk,
                    context=original
                ))
                error_id += 1
            
            elif tag == 'insert':
                message = "Missing word suggested"
                error_type = "Insertion"
                original_chunk = f"after '{original_words[i1-1]}'" if i1 > 0 else "at start"

                if i1 > 0 and i1 < len(original_words):
                    # Word was inserted between existing words
                    original_chunk = f"{original_words[i1-1]} {original_words[i1]}"
                    suggestion_chunk = f"{original_words[i1-1]} {' '.join(corrected_words[j1:j2])} {original_words[i1]}"
                elif i1 == 0:
                    # Insertion at the beginning
                    if len(original_words) > 0:
                        original_chunk = original_words[0]
                        suggestion_chunk = f"{' '.join(corrected_words[j1:j2])} {original_words[0]}"
                    else:
                        original_chunk = "(empty)"
                        suggestion_chunk = ' '.join(corrected_words[j1:j2])
                elif i1 >= len(original_words):
                    # Insertion at the end
                    original_chunk = original_words[-1] if original_words else "(empty)"
                    suggestion_chunk = f"{original_chunk} {' '.join(corrected_words[j1:j2])}"
                else:
                    # Fallback
                    original_chunk = " ".join(original_words[max(0, i1-1):min(len(original_words), i1+2)])
                    # Reconstruct with insertion
                    before = original_words[max(0, i1-1):i1]
                    after = original_words[i1:min(len(original_words), i1+2)]
                    suggestion_chunk = " ".join(before + corrected_words[j1:j2] + after)

                errors.append(GrammarError(
                    id=error_id,
                    type=error_type,
                    message=message,
                    original=original_chunk,
                    suggestion=suggestion_chunk,
                    context=original
                ))
                error_id += 1
            else:
                continue

        return errors
    
    def check_text(self, text: str) -> tuple[List[GrammarError], str]:
        """Main check method"""
        all_errors = []
        sentences = re.findall(r'[^।.!?]+[।.!?]?', text)
        corrected_sentences = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # 1. Check spelling with Hunspell
            spelling_errors = self.check_spelling(sentence)
            all_errors.extend(spelling_errors)
            
            # 2. Get grammar correction from model
            corrected_sentence = self.get_corrected_text(sentence)
            corrected_sentences.append(corrected_sentence)
            
            # 3. Find grammar errors by comparing original vs corrected
            grammar_errors = self.find_grammar_errors(sentence, corrected_sentence)
            all_errors.extend(grammar_errors)
        
        # Join corrected sentences
        corrected_text = " ".join(corrected_sentences)
        
        # 🔥 CRITICAL: Remove spelling errors for words AI already corrected
        grammar_words = {
            e.original.strip().rstrip('।.,!?') 
            for e in all_errors 
            if e.type != "Spelling"
        }
        
        all_errors = [
            e for e in all_errors 
            if not (e.type == "Spelling" and e.original.strip().rstrip('।.,!?') in grammar_words)
        ]
        
        # Remove remaining duplicates
        unique_errors = []
        seen = set()
        for error in all_errors:
            key = (error.original, error.type)
            if key not in seen:
                seen.add(key)
                unique_errors.append(error)
        
        # Renumber errors
        for idx, error in enumerate(unique_errors, 1):
            error.id = idx
        
        return unique_errors, corrected_text
    
    def calculate_stats(self, text: str, errors: List[GrammarError]) -> dict:
        """Calculate quality stats"""
        words = len(text.split())
        if words == 0:
            return {
                "grammar": 100, "fluency": 100, "clarity": 100,
                "engagement": 100, "total_words": 0, "total_errors": 0
            }
        
        spelling = len([e for e in errors if e.type == "Spelling"])
        grammar = len([e for e in errors if e.type in ["Grammar", "Gender Agreement", "Number Agreement"]])
        insertion = len([e for e in errors if e.type == "Insertion"])
        deletion = len([e for e in errors if e.type == "Deletion"])
        
        total = len(errors)
        grammar_score = max(0, 100 - (spelling * 5) - (grammar * 8))
        fluency_score = max(0, 100 - (grammar * 5) - (insertion * 4) - (deletion * 3))
        clarity_score = max(0, 100 - (total * 4))
        engagement_score = max(70, 100 - (total * 3))
        
        return {
            "grammar": min(100, grammar_score),
            "fluency": min(100, fluency_score),
            "clarity": min(100, clarity_score),
            "engagement": min(100, engagement_score),
            "total_words": words,
            "total_errors": total
        }