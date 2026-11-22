from fastapi import FastAPI
from pydantic import BaseModel
from . import project
import google.api_core
import google.genai as genai
import os

from fastapi.middleware.cors import CORSMiddleware

db = project.Database(os.getenv("TIDB_USER"), os.getenv("TIDB_PASSWORD"))
app = FastAPI()

# Website: http://192.168.18.191/~declarkt/index.html
# Alternate Link: http://dolphin.csci.viu.ca/~declarkt/index.html
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials = True, allow_methods = ["*"], allow_headers = ["*"])

class User(BaseModel):
    username: str

class Proof(BaseModel):
    proposition: str
    result: str
    creator: str
    

@app.get("/Proof/{proposition}")
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
    client = genai.Client()
    response = client.models.generate_content(model="gemini-3-flash-preview", contents='Please prove this following proof that I will provide to you in a formal mathematical proof notation. Do not repeat the proposition in the response! Do not say anything that isnt part of the mathematical proof and end the proof with a black box. Do not split the proof into a numbered list, you may split the proof into multiple cases or multiple paragraphs, but dont start a random numbered list in the middle of the proof. If you are using a specific proof technique please just state which one you are using ex: Proof (Contradiction) or Disproof (Counterexample) and please adhere to the format of that proof technique. If the provided proposition is false, provide a disproof of it. If the proposition is complete nonsense, ie it is not a mathematical statement at all, then please just say "The proof is so trivial It doesn`t even need to be explained" The proposition you have to prove is:' + proof.proposition)
    proof.result = response.text          
    return db.addProof(proof.dict())

@app.post("/DelUser")
async def del_user(user: User):
    return db.deleteUser(user.dict())

@app.post("/DelProof")
async def del_proof(proof: Proof):
    return db.deleteProof(proof.dict())