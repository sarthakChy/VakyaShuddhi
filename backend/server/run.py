from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from utils.paraphraser import Paraphraser

app = FastAPI(
    title="VakhyaShuddhi",
    version="1.0.0",
    description="Backend APIs for VakhyaShuddhi",
    root_path="/api",
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

# Request schema
class ParaphraseRequest(BaseModel):
    message: str = Field(..., example="This is an example sentence.")
    language: str = Field(...,example="Hindi")

# Response schema
class ParaphraseResponse(BaseModel):
    original: str
    paraphrased: str


paraphraser = Paraphraser()

@app.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase_sentence(
    request: ParaphraseRequest,
):
    message = request.message.strip()
    language = request.language.strip()

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    lang_tag = paraphraser.get_langtag(language)

    lang_code = f"<2{lang_tag}>"

    input_tokens = paraphraser.tokenize(message = message,lang_code = lang_code)

    output_tokens = paraphraser.generate_output_token(input_tokens,lang_code = lang_code,max_length=256)

    decoded_tokens = paraphraser.decode_output(output_tokens)

    if lang_tag == "hi": 
        return {"original": message, "paraphrased": decoded_tokens}
    else:
        converted_text = paraphraser.translate(decoded_tokens,lang_tag)
        return {"original": message, "paraphrased": converted_text}
