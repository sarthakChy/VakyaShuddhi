from fastapi import FastAPI, HTTPException, Depends, Cookie, Response, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from google.cloud import firestore
from utils.paraphraser import Paraphraser
from utils.grammar_checker import HindiGrammarChecker

from utils.utils import (
    set_firestore_client,
    create_access_token,
    create_refresh_token,
    verify_access_token,
    verify_refresh_token,
    verify_firebase_token,
    get_or_create_user,
    check_usage_limit,
    increment_usage,
    save_paraphrase_history,
    save_grammar_history,
)

from models.models import (
    GrammarRequest,
    GrammarError,
    GrammarResponse,
    TokenResponse,
    UserInfo,
    ParaphraseRequest,
    ParaphraseResponse,
)

from datetime import datetime, timedelta, timezone
from typing import Dict,List,Optional
from dotenv import load_dotenv
import os
import logging
from uuid import uuid4
import asyncio
from concurrent.futures import ThreadPoolExecutor
import hunspell
import re


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
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    
    firebase_admin.initialize_app()
    
    db = firestore.Client(project="bharatwrite-8818b")
    
    set_firestore_client(db)
    
    logger.info("✓ Firebase Admin initialized successfully")
    logger.info("✓ Firestore client initialized")
except Exception as e:
    logger.critical(f"Failed to initialize Firebase: {e}", exc_info=True)
    raise RuntimeError("Firebase initialization failed") from e


grammar_checker = None

@app.on_event("startup")
async def load_grammar_checker():
    """Load the grammar checker at startup"""
    global grammar_checker
    try:
        MODEL_PATH = "sarthak2314/indicbart-hindi-gec-v1"
        DIC_PATH = "/home/sarthak/Desktop/VakyaShuddhi/backend/data/hi_IN.dic"
        AFF_PATH = "/home/sarthak/Desktop/VakyaShuddhi/backend/data/hi_IN.aff"
        
        grammar_checker = HindiGrammarChecker(
            model_path=MODEL_PATH,
            hunspell_dic=DIC_PATH,
            hunspell_aff=AFF_PATH
        )
        logger.info("✓ Grammar checker initialized successfully")
    except Exception as e:
        logger.error(f"✗ Failed to load grammar checker: {e}")
        logger.warning("Grammar checking will use fallback mode")


# JWT Configuration
ACCESS_SECRET_KEY = os.getenv("ACCESS_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
if not ACCESS_SECRET_KEY or not REFRESH_SECRET_KEY:
    raise RuntimeError("Missing ACCESS_SECRET_KEY or REFRESH_SECRET_KEY in .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

executor = ThreadPoolExecutor(max_workers=4)


# In-memory revoked token store (replace with DB/Redis in prod)
revoked_refresh_tokens: Dict[str, datetime] = {}

# Usage limits
FREE_PLAN_LIMITS = {
    "paraphrase": 50,  # per month
    "grammar": 30      # per month
}

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
# History & Stats
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


@app.post("/grammar_check", response_model=GrammarResponse)
async def check_grammar(
    request: GrammarRequest,
    payload: dict = Depends(verify_access_token),
):
    """Grammar check with fine-tuned AI model"""
    try:
        text = request.message.strip()
        
        if not text:
            return GrammarResponse(
                errors=[],
                stats={
                    "grammar": 100, "fluency": 100, "clarity": 100,
                    "engagement": 100, "total_words": 0, "total_errors": 0
                }
            )
        
        # Check usage limits
        uid = payload['sub']
        can_use, remaining = await check_usage_limit(uid, 'grammar')
        if not can_use:
            raise HTTPException(
                status_code=403,
                detail="Monthly limit reached. Upgrade to premium for unlimited access."
            )
        
        # If model not loaded, fall back to Hunspell only
        if grammar_checker is None:
            logger.warning("Grammar checker not available, using Hunspell fallback")
            errors = grammar_checker.check_spelling(text)  # Your old function
            stats = grammar_checker.calculate_stats(text, errors)  # Your old function
        else:
            # Use the AI model + Hunspell
            errors, corrected_text = grammar_checker.check_text(text)
            stats = grammar_checker.calculate_stats(text, errors)
            logger.info(f"Found {len(errors)} errors. Corrected: {corrected_text[:50]}...")
        
        # Save to history
        await save_grammar_history(uid, text, [e.dict() for e in errors], request.language)
        
        # Increment usage
        await increment_usage(uid, 'grammar')
        
        return GrammarResponse(errors=errors, stats=stats)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Grammar check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "hunspell_loaded": grammar_checker is not None,
        "model_loaded": grammar_checker is not None,
        "device": grammar_checker.device if grammar_checker else "N/A"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)