from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional, Dict, List
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from models.models import GrammarError
import re
import os
from dotenv import load_dotenv
from firebase_admin import auth as firebase_auth
from google.cloud import firestore
import logging

load_dotenv()

# Setup logger
logger = logging.getLogger("VakhyaShuddhi")

# Security
security = HTTPBearer()

# JWT Configuration
ACCESS_SECRET_KEY = os.getenv("ACCESS_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
if not ACCESS_SECRET_KEY or not REFRESH_SECRET_KEY:
    raise RuntimeError("Missing ACCESS_SECRET_KEY or REFRESH_SECRET_KEY in .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Usage limits
FREE_PLAN_LIMITS = {
    "paraphrase": 50,
    "grammar": 30
}

# In-memory revoked token store
revoked_refresh_tokens: Dict[str, datetime] = {}

# Firestore client (will be set from run.py)
db = None

def set_firestore_client(firestore_client):
    """Set the Firestore client from main app"""
    global db
    db = firestore_client

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
