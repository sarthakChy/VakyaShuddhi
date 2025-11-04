from fastapi import FastAPI, HTTPException, Depends, Cookie, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional, Dict
import jwt
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from pydantic import BaseModel, Field
from utils.paraphraser import Paraphraser
from dotenv import load_dotenv
import os
import logging
from uuid import uuid4

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase
cred_path = os.getenv("SERVICE_ACCOUNT")
if not cred_path:
    raise RuntimeError("SERVICE_ACCOUNT path missing in .env")

cred = credentials.Certificate(cred_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
    logger.info("Initialized Firebase app")

# JWT Configuration
ACCESS_SECRET_KEY = os.getenv("ACCESS_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
if not ACCESS_SECRET_KEY or not REFRESH_SECRET_KEY:
    raise RuntimeError("Missing ACCESS_SECRET_KEY or REFRESH_SECRET_KEY in .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
security = HTTPBearer()

# In-memory revoked token store (replace with DB/Redis in prod)
revoked_refresh_tokens: Dict[str, datetime] = {}

# ============================
# Models
# ============================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

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
# Auth Routes
# ============================

@app.post("/auth/login", response_model=TokenResponse)
async def login(firebase_token: str, response: Response):
    user_data = await verify_firebase_token(firebase_token)

    access_token = create_access_token(user_data)
    refresh_token = create_refresh_token(user_data)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # change to True in production
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return TokenResponse(access_token=access_token)

@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh_access_token(refresh_token: Optional[str] = Cookie(None), response: Response = None):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not found")

    payload = verify_refresh_token(refresh_token)
    jti = payload["jti"]
    uid = payload["sub"]

    # Invalidate old token
    revoked_refresh_tokens[jti] = datetime.utcnow()

    # Generate new tokens
    user_data = {"uid": uid}
    new_access_token = create_access_token(user_data)
    new_refresh_token = create_refresh_token(user_data)

    # Set new cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,  # change to True in production
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return TokenResponse(access_token=new_access_token)

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
    return {
        "uid": payload["sub"],
        "email": payload.get("email"),
        "name": payload.get("name")
    }

@app.get("/protected")
async def protected_route(payload: dict = Depends(verify_access_token)):
    return {"message": "Access granted", "user": payload["sub"]}

# ============================
# Paraphraser
# ============================

paraphraser = Paraphraser()

@app.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase_sentence(request: ParaphraseRequest):
    message = request.message.strip()
    language = request.language.strip()

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    lang_tag = paraphraser.get_langtag(language)
    lang_code = f"<2{lang_tag}>"

    input_tokens = paraphraser.tokenize(message=message, lang_code=lang_code)
    output_tokens = paraphraser.generate_output_token(input_tokens, lang_code=lang_code, max_length=256)
    decoded_tokens = paraphraser.decode_output(output_tokens)

    if lang_tag == "hi":
        return {"original": message, "paraphrased": decoded_tokens}
    else:
        converted_text = paraphraser.translate(decoded_tokens, lang_tag)
        return {"original": message, "paraphrased": converted_text}
