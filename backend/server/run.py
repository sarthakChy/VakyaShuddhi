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
    sentence: str = Field(..., example="This is an example sentence.")

# Response schema
class ParaphraseResponse(BaseModel):
    original: str
    paraphrased: str


paraphraser = Paraphraser()

@app.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase_sentence(
    request: ParaphraseRequest,
    lang_tag: str = Query("hi", description="Language code (e.g., 'en', 'hi')")
):
    sentence = request.sentence.strip()

    if not sentence:
        raise HTTPException(status_code=400, detail="Sentence cannot be empty.")

    lang_code = f"<2{lang_tag}>"

    input_tokens = paraphraser.tokenize(sentence = sentence,lang_code = lang_code)

    output_tokens = paraphraser.generate_output_token(input_tokens)

    decoded_tokens = paraphraser.decode_output(output_tokens)

    return {"original": sentence, "paraphrased": decoded_tokens}
