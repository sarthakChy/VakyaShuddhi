from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(

    title='VakshyaShuddi',
    version='1.0',
    root_path="/api",
    docs_url="/docs",
)

origins = [
    
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InputSentence(BaseModel):
    sentence: str


@app.get("/")
async def root():
    return {"message":"VakshyaShuddi backend"}

@app.post("/paraphrase")
async def paraphrase(data: InputSentence):
    paraphrased = data.sentence[::-1]

    return {"original":data,"paraphrased":paraphrased}

@app.post("/autocomplete")
async def autocomplete(data: InputSentence):

    autocomplete = data.sentence[0]

    return {"original":data,"paraphrased":autocomplete}

