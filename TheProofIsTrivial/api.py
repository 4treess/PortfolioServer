import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import project
import google.genai as genai
from google.genai.errors import APIError

from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

db = project.Database()
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class User(BaseModel):
    username: str

class Proof(BaseModel):
    proposition: str
    result: str
    creator: str


@app.get("/health")
async def health_check():
    try:
        db.check_connection()
    except RuntimeError as error:
        logging.exception("TiDB health check failed")
        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check the TIDB_* settings.",
        ) from error
    return {"status": "ok", "database": "connected"}


@app.get("/Proof/{proposition:path}")
async def get_proof(proposition: str):
    return db.retrieveProof({"proposition": proposition})

@app.get("/Proofs/{username}")
async def get_proof_by_creator(username: str):
    return db.retrieveProofs({"username": username})

@app.get("/Login/{username}")
async def login_to_website(username: str):
    return db.getUser({"username": username})

@app.post("/AddUser")
async def add_user(user: User):
    return db.addUser(user.dict())

@app.post("/Proof")
async def add_proof(proof: Proof):
    client = genai.Client(http_options=genai.types.HttpOptions(api_version="v1beta"))
    try:
        response = client.models.generate_content(model="gemini-flash-latest", contents='Please prove this following proof that I will provide to you in a formal mathematical proof notation. Do not repeat the proposition in the response! Do not say anything that isnt part of the mathematical proof and end the proof with a black box. Do not split the proof into a numbered list, you may split the proof into multiple cases or multiple paragraphs, but dont start a random numbered list in the middle of the proof. If you are using a specific proof technique please just state which one you are using ex: Proof (Contradiction) or Disproof (Counterexample) and please adhere to the format of that proof technique. If the provided proposition is false, provide a disproof of it. If the proposition is complete nonsense, ie it is not a mathematical statement at all, then please just say "The proof is so trivial It doesn`t even need to be explained" The proposition you have to prove is:' + proof.proposition)
    except APIError as error:
        if error.code not in (429, 503):
            raise
        if error.code == 429:
            detail = "Gemini is temporarily rate-limited. The request can be retried."
        else:
            detail = "Gemini is temporarily unavailable. The request can be retried."
        logging.warning(
            "Gemini returned retryable HTTP %s; returning a retryable response.",
            error.code,
        )
        raise HTTPException(
            status_code=error.code,
            detail=detail,
        ) from error
    proof.result = response.text          
    return db.addProof(proof.dict())

@app.post("/DelUser")
async def del_user(user: User):
    return db.deleteUser(user.dict())

@app.post("/DelProof")
async def del_proof(proof: Proof):
    return db.deleteProof(proof.dict())