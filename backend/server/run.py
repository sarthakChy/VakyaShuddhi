from fastapi import FastAPI, HTTPException, Depends, Cookie, Response, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
import jwt
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from google.cloud import firestore
from pydantic import BaseModel, Field
from utils.paraphraser import Paraphraser
from dotenv import load_dotenv
import os
import logging
from uuid import uuid4
import asyncio
from concurrent.futures import ThreadPoolExecutor
import hunspell
import re

# from indic_transliteration import sanscript
# from indic_transliteration.sanscript import transliterate

# ============================
# Setup
# ============================

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VakhyaShuddhi")

app = FastAPI(
    title="VakhyaShuddhi",
    version="1.1.0",
    description="Backend APIs for VakhyaShuddhi with token rotation",
    docs_url="/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    firebase_admin.initialize_app()
    db = firestore.Client(project="bharatwrite-8818b")
    logger.info("Firebase Admin initiaize")
except:
    logger.critical("Failed to initialize Firebase")

try:

    hobj = hunspell.HunSpell('/home/sarthak/Desktop/VakyaShuddhi/backend/data/hi_IN.dic', '/home/sarthak/Desktop/VakyaShuddhi/backend/data/hi_IN.aff')
    logger.info("Hunspell dictionary initialized")
except:
    logger.critical("Error initializing hunspell")

# JWT Configuration
ACCESS_SECRET_KEY = os.getenv("ACCESS_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
if not ACCESS_SECRET_KEY or not REFRESH_SECRET_KEY:
    raise RuntimeError("Missing ACCESS_SECRET_KEY or REFRESH_SECRET_KEY in .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
security = HTTPBearer()

executor = ThreadPoolExecutor(max_workers=4)


# In-memory revoked token store (replace with DB/Redis in prod)
revoked_refresh_tokens: Dict[str, datetime] = {}

# ============================
# Models
# ============================
class GrammarRequest(BaseModel):
    message: str
    language: str = "hindi"

class GrammarError(BaseModel):
    id: int
    type: str
    message: str
    original: str
    suggestion: str
    context: str

class GrammarResponse(BaseModel):
    errors: List[GrammarError]
    stats: dict


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access token expiry in seconds")

class UserInfo(BaseModel):
    uid: str
    email: Optional[str]
    name: Optional[str]

class ParaphraseRequest(BaseModel):
    message: str = Field(..., example="This is an example sentence.")
    language: str = Field(..., example="Hindi")

class ParaphraseResponse(BaseModel):
    original: str
    paraphrased: str
    language:str

# ============================
# JWT Helpers
# ============================

def create_access_token(user_data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_data["uid"],
        "email": user_data.get("email"),
        "name": user_data.get("name"),
        "exp": expire,
        "type": "access",
        "jti": str(uuid4())
    }
    return jwt.encode(payload, ACCESS_SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_data: dict) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_data["uid"],
        "email": user_data.get("email"),
        "name": user_data.get("name"),
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid4())
    }
    return jwt.encode(payload, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

def verify_access_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, ACCESS_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Access token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid access token")

def verify_refresh_token(refresh_token: str) -> dict:
    try:
        payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        jti = payload.get("jti")
        if jti in revoked_refresh_tokens:
            raise HTTPException(status_code=401, detail="Reused or revoked refresh token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

async def verify_firebase_token(firebase_token: str) -> dict:
    try:
        decoded_token = firebase_auth.verify_id_token(firebase_token)
        if "email" not in decoded_token:
            raise HTTPException(status_code=400, detail="Firebase user has no email.")
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name")
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")



# Usage limits
FREE_PLAN_LIMITS = {
    "paraphrase": 50,  # per month
    "grammar": 30      # per month
}

# ============================
# Firestore Helper Functions
# ============================

async def get_or_create_user(user_data: dict) -> dict:
    """Get user from Firestore or create if doesn't exist"""
    user_ref = db.collection('users').document(user_data['uid'])
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        # Create new user
        new_user = {
            'email': user_data['email'],
            'name': user_data.get('name', ''),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'plan': 'free',
            'usage': {
                'paraphraseCount': 0,
                'grammarCheckCount': 0,
                'lastReset': datetime.utcnow()
            },
            'totalParaphrases': 0,
            'totalGrammarChecks': 0
        }
        user_ref.set(new_user)
        logger.info(f"Created new user: {user_data['uid']}")
        return new_user
    
    return user_doc.to_dict()

async def check_usage_limit(uid: str, action_type: str) -> tuple[bool, int]:
    """
    Check if user has remaining usage for the action
    Returns: (can_use: bool, remaining: int)
    """
    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        return False, 0
    
    user_data = user_doc.to_dict()
    plan = user_data.get('plan', 'free')
    
    # Premium users have unlimited access
    if plan == 'premium':
        return True, -1  # -1 indicates unlimited
    
    # Check if usage needs to be reset (monthly)
    usage = user_data.get('usage', {})
    last_reset = usage.get('lastReset')
    
    if last_reset:
        if isinstance(last_reset, datetime):
            days_since_reset = (datetime.now(timezone.utc) - last_reset).days
        else:
            days_since_reset = 0
            
        if days_since_reset >= 30:
            # Reset usage
            user_ref.update({
                'usage.paraphraseCount': 0,
                'usage.grammarCheckCount': 0,
                'usage.lastReset': datetime.utcnow()
            })
            usage['paraphraseCount'] = 0
            usage['grammarCheckCount'] = 0
    
    # Check limits
    if action_type == 'paraphrase':
        current_count = usage.get('paraphraseCount', 0)
        limit = FREE_PLAN_LIMITS['paraphrase']
        remaining = limit - current_count
        return current_count < limit, remaining
    elif action_type == 'grammar':
        current_count = usage.get('grammarCheckCount', 0)
        limit = FREE_PLAN_LIMITS['grammar']
        remaining = limit - current_count
        return current_count < limit, remaining
    
    return False, 0

async def increment_usage(uid: str, action_type: str):
    """Increment usage count for user"""
    user_ref = db.collection('users').document(uid)
    
    if action_type == 'paraphrase':
        user_ref.update({
            'usage.paraphraseCount': firestore.Increment(1),
            'totalParaphrases': firestore.Increment(1)
        })
    elif action_type == 'grammar':
        user_ref.update({
            'usage.grammarCheckCount': firestore.Increment(1),
            'totalGrammarChecks': firestore.Increment(1)
        })

async def save_paraphrase_history(uid: str, original: str, paraphrased: str, language: str) -> str:
    """Save paraphrase to history"""
    paraphrase_ref = db.collection('paraphrases').document()
    paraphrase_data = {
        'userId': uid,
        'paraphrase_id':paraphrase_ref.id,
        'original': original,
        'paraphrased': paraphrased,
        'language': language,
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    print(paraphrase_ref.id)

    paraphrase_ref.set(paraphrase_data)

    print(paraphrase_data['paraphrase_id'])

    return paraphrase_ref.id

async def save_grammar_history(uid: str, original: str, errors: list, language: str) -> str:
    """Save grammar check to history"""
    grammar_ref = db.collection('grammarChecks').document()
    grammar_data = {
        'userId': uid,
        'original': original,
        'errors': errors,
        'language': language,
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    grammar_ref.set(grammar_data)
    return grammar_ref.id







# ============================
# Auth Routes
# ============================

@app.post("/auth/login", response_model=TokenResponse)
async def login(response: Response,firebase_token: str = Form(...)):
    user_data = await verify_firebase_token(firebase_token)

    await get_or_create_user(user_data)

    access_token = create_access_token(user_data)
    refresh_token = create_refresh_token(user_data)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # change to True in production
        samesite="lax", # none when in production and different domain
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return TokenResponse(access_token=access_token,expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60)

@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh_access_token(refresh_token: Optional[str] = Cookie(None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token found")

    payload = verify_refresh_token(refresh_token)

    user_data = {
        "uid": payload["sub"],
        "email": payload.get("email"),
        "name": payload.get("name")
    }

    new_access_token = create_access_token(user_data)

    # NO refresh rotation here
    return TokenResponse(
        access_token=new_access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@app.post("/auth/logout")
async def logout(response: Response, refresh_token: Optional[str] = Cookie(None)):
    """Invalidate refresh token and clear cookie"""
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
            jti = payload.get("jti")
            if jti:
                revoked_refresh_tokens[jti] = datetime.utcnow()
        except jwt.PyJWTError:
            pass  # ignore bad tokens

    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@app.get("/auth/me")
async def get_current_user(payload: dict = Depends(verify_access_token)):
    """Get current user profile"""
    uid = payload['sub']
    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    
    return {
        'uid': uid,
        'email': user_data.get('email'),
        'name': user_data.get('name'),
        'plan': user_data.get('plan', 'free'),
        'usage': user_data.get('usage', {}),
        'createdAt': user_data.get('createdAt')
    }

@app.get("/protected")
async def protected_route(payload: dict = Depends(verify_access_token)):
    return {"message": "Access granted", "user": payload["sub"]}

# ============================
# Paraphraser
# ============================

paraphraser = Paraphraser()

@app.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase_sentence(
    request: ParaphraseRequest,
    payload: dict = Depends(verify_access_token)
):
    uid = payload['sub']
    
    # Check usage limit
    can_use, remaining = await check_usage_limit(uid, 'paraphrase')
    if not can_use:
        raise HTTPException(
            status_code=403,
            detail="Monthly limit reached. Upgrade to premium for unlimited access."
        )
    
    message = request.message.strip()
    language = request.language.strip()

    lang_tag = paraphraser.get_langtag(language)
    lang_code = f"<2{lang_tag}>"

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    sentences = re.findall(r'[^।?!]+[।?!]?', message)

    def process(sentence):
        input_tokens = paraphraser.tokenize(message=sentence, lang_code=lang_code)
        output_tokens = paraphraser.generate_output_token(
            input_tokens, lang_code=lang_code, max_length=256
        )
        decoded_tokens = paraphraser.decode_output(output_tokens)

        if lang_tag == "hi":
            return decoded_tokens
        else:
            return paraphraser.translate(decoded_tokens, lang_tag)

    loop = asyncio.get_event_loop()

    tasks = [loop.run_in_executor(executor,process,s) for s in sentences if s.strip()]

    paraphrased_sentences = await asyncio.gather(*tasks)
    
    # Join paraphrased sentences back
    paraphrased = " ".join(paraphrased_sentences)

    await save_paraphrase_history(uid, message, paraphrased, language)
    await increment_usage(uid, 'paraphrase')
    
    return {
        "original": message,
        "paraphrased": paraphrased,
        "language":language
    }

# ============================
# New Routes for History & Stats
# ============================
@app.get("/history/paraphrases")
async def get_paraphrase_history(
    payload: dict = Depends(verify_access_token),
    limit: int = 20
):
    """Get user's paraphrase history"""
    uid = payload['sub']
    
    paraphrases = db.collection('paraphrases')\
        .where('userId', '==', uid)\
        .order_by('createdAt', direction=firestore.Query.DESCENDING)\
        .limit(limit)\
        .stream()
    
    history = []
    for doc in paraphrases:
        data = doc.to_dict()
        history.append({
            'id': doc.id,
            'type': 'paraphrase',
            'activity_id':data['paraphrase_id'],
            'original': data['original'],
            'paraphrased': data['paraphrased'],
            'language': data['language'],
            'createdAt': data['createdAt'].isoformat() if data.get('createdAt') else None
        })
    
    return history

@app.get("/history/grammar")
async def get_grammar_history(
    payload: dict = Depends(verify_access_token),
    limit: int = 20
):
    """Get user's grammar check history"""
    uid = payload['sub']
    
    checks = db.collection('grammarChecks')\
        .where('userId', '==', uid)\
        .order_by('createdAt', direction=firestore.Query.DESCENDING)\
        .limit(limit)\
        .stream()
    
    history = []
    for doc in checks:
        data = doc.to_dict()
        history.append({
            'id': doc.id,
            'type': 'grammar',
            'original': data['original'],
            'errors': data['errors'],
            'language': data['language'],
            'createdAt': data['createdAt'].isoformat() if data.get('createdAt') else None
        })
    
    return history

@app.get("/stats")
async def get_user_stats(payload: dict = Depends(verify_access_token)):
    """Get user statistics for dashboard"""
    uid = payload['sub']
    
    # Get user data
    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    
    paraphrase_count = user_data.get('totalParaphrases', 0)
    grammar_count = user_data.get('totalGrammarChecks', 0)

    usage = user_data.get('usage', {})
    
    return {
        'totalParaphrases': paraphrase_count,
        'totalGrammarChecks': grammar_count,
        'plan': user_data.get('plan', 'free'),
        'monthlyUsage': {
            'paraphrase': usage.get('paraphraseCount', 0),
            'grammar': usage.get('grammarCheckCount', 0)
        },
        'limits': FREE_PLAN_LIMITS,
        'remaining': {
            'paraphrase': FREE_PLAN_LIMITS['paraphrase'] - usage.get('paraphraseCount', 0),
            'grammar': FREE_PLAN_LIMITS['grammar'] - usage.get('grammarCheckCount', 0)
        }
    }


# Basic Hindi grammar rules
HINDI_RULES = {
    # Common mistakes
    'को को': {'suggestion': 'को', 'type': 'Repetition', 'message': 'Duplicate word found'},
    'ने ने': {'suggestion': 'ने', 'type': 'Repetition', 'message': 'Duplicate word found'},
    'है है': {'suggestion': 'है', 'type': 'Repetition', 'message': 'Duplicate word found'},
    
    # Common verb agreement issues (simplified)
    'लड़का गई': {'suggestion': 'लड़का गया', 'type': 'Gender Agreement', 'message': 'Verb gender should match subject'},
    'लड़की गया': {'suggestion': 'लड़की गई', 'type': 'Gender Agreement', 'message': 'Verb gender should match subject'},
}


def get_sentence_context(text: str, start_pos: int) -> Optional[str]:
    """
    Extracts the full sentence containing the word, based on common punctuation.
    We don't need 'word' or 'context_len' anymore.
    """
    # 1. Define sentence boundary pattern (., !, ?) followed by whitespace or end of string
    # This regex is a simple approach; real NLP uses more sophisticated models/tokenizers.
    sentence_pattern = r'[^.!?]*[.!?]\s*|$' 
    
    # 2. Find all sentence matches in the text
    matches = list(re.finditer(sentence_pattern, text))
    
    # 3. Locate the sentence that contains the start_pos
    for match in matches:
        # Check if the start_pos (where the misspelled word is) falls within this sentence match
        if match.start() <= start_pos < match.end():
            # Strip leading/trailing whitespace and return the full sentence
            return match.group(0).strip()
            
    # Fallback if no sentence is found (e.g., if the text is empty or unusual)
    return None


def check_spelling_improved(text: str) -> List[GrammarError]:
    """Check spelling using Hunspell (Improved with finditer)"""
    errors = []
    error_id = 1
    
    # Use finditer to get an iterator of match objects, each containing word and position
    matches = re.finditer(r'[\u0900-\u097F]+', text)
    
    for match in matches:
        word = match.group(0) # The matched word string
        word_start_pos = match.start() # The specific start index of this match
        
        if not hobj.spell(word):
            suggestions = hobj.suggest(word)
            if suggestions:
                errors.append(GrammarError(
                    id=error_id,
                    type="Spelling",
                    message=f"Possible spelling mistake",
                    original=word,
                    suggestion=suggestions[0],
                    context=get_sentence_context(text,word_start_pos)
                ))
                error_id += 1
    
    return errors

def check_grammar_rules(text: str) -> List[GrammarError]:
    """Check against predefined grammar rules (FIXED)"""
    errors = []
    error_id = 10000
    
    for pattern, rule in HINDI_RULES.items():
        # Use re.finditer to catch all occurrences of the pattern
        # re.escape is used to ensure special regex characters are treated literally
        for match in re.finditer(re.escape(pattern), text):
            pos = match.start()
            errors.append(GrammarError(
                id=error_id,
                type=rule['type'],
                message=rule['message'],
                original=pattern,
                suggestion=rule['suggestion'],
                context=get_sentence_context_improved(text, pos) #
            ))
            error_id += 1
    
    return errors

def check_repetitions(text: str) -> List[GrammarError]:
    """Check for repeated words (FIXED)"""
    errors = []
    words = text.split()
    error_id = 2000
    
    for i in range(len(words) - 1):
        if words[i] == words[i + 1] and len(words[i]) > 1:
            pattern = f"{words[i]} {words[i + 1]}" # The pattern to find
            
            # Use finditer to find this pattern's position iteratively
            for match in re.finditer(re.escape(pattern), text):
                pos = match.start()
                errors.append(GrammarError(
                    id=error_id,
                    type="Repetition",
                    message="Repeated word detected",
                    original=pattern,
                    suggestion=words[i],
                    context=get_sentence_context_improved(text, pos)
                ))
                error_id += 1
           
            i += 1 
            
    return errors

def calculate_stats(text: str, errors: List[GrammarError]) -> dict:
    """Calculate text quality statistics"""
    words = len(text.split())
    
    # Simple scoring (you can make this more sophisticated)
    spelling_errors = len([e for e in errors if e.type == "Spelling"])
    grammar_errors = len([e for e in errors if e.type != "Spelling"])
    
    grammar_score = max(0, 100 - (spelling_errors * 5) - (grammar_errors * 10))
    fluency_score = max(0, 100 - (len(errors) * 3))
    clarity_score = max(0, 100 - (len(errors) * 4))
    
    return {
        "grammar": min(100, grammar_score),
        "fluency": min(100, fluency_score),
        "clarity": min(100, clarity_score),
        "engagement": 85,  # Placeholder
        "total_words": words,
        "total_errors": len(errors)
    }

@app.post("/api/grammar", response_model=GrammarResponse)
async def check_grammar(request: GrammarRequest):
    """Main grammar checking endpoint"""
    try:
        text = request.message.strip()
        if not text:
            return GrammarResponse(errors=[], stats={
                "grammar": 100, "fluency": 100, "clarity": 100, 
                "engagement": 100, "total_words": 0, "total_errors": 0
            })
        
        # Run all checks
        all_errors = []
        all_errors.extend(check_spelling(text))
        all_errors.extend(check_grammar_rules(text))
        all_errors.extend(check_repetitions(text))
        
        # Remove duplicates based on position
        unique_errors = []
        seen_positions = set()
        for error in all_errors:
            key = (error.original, error.context)
            if key not in seen_positions:
                unique_errors.append(error)
                seen_positions.add(key)
        
        # Calculate stats
        stats = calculate_stats(text, unique_errors)
        
        return GrammarResponse(errors=unique_errors, stats=stats)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)