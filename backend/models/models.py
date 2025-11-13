from pydantic import BaseModel, Field
from typing import Optional, Dict, List

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
    context: Optional[str] = None

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