import json
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

try:
    from backend.database import init_db, save_review, get_all_reviews
    from backend.gemini_client import review_code, review_code_stream, fix_issue_stream
except ImportError:
    from database import init_db, save_review, get_all_reviews
    from gemini_client import review_code, review_code_stream, fix_issue_stream

# Initialize the database
init_db()

# Create the FastAPI app
app = FastAPI(title="CodeLens API")

# Ensure http://localhost:5173 and 127.0.0.1:5173 are allowed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the expected shape of incoming review requests
class ReviewRequest(BaseModel):
    code: str

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "CodeLens API is running!"}

# Send code to Gemini, save the result, and return it
@app.post("/review")
def create_review(request: ReviewRequest):
    try:
        result = review_code(request.code)
        clean_result = result.strip()
        if clean_result.startswith("```json"):
            clean_result = clean_result[7:]
        if clean_result.startswith("```"):
            clean_result = clean_result[3:]
        if clean_result.endswith("```"):
            clean_result = clean_result[:-3]
        clean_result = clean_result.strip()

        parsed = json.loads(clean_result)
        issues = parsed.get("issues", [])
        review_id = save_review(request.code, issues)
        return {"id": review_id, "issues": issues}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/review/stream")
def stream_review(request: ReviewRequest):
    def event_generator():
        full_response = ""
        try:
            for chunk in review_code_stream(request.code):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            clean_response = full_response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            clean_response = clean_response.strip()

            try:
                parsed = json.loads(clean_response)
                issues = parsed.get("issues", [])
                save_review(request.code, issues)
                yield f"data: {json.dumps({'done': True, 'issues': issues})}\n\n"
            except json.JSONDecodeError:
                yield f"data: {json.dumps({'done': True, 'error': 'Failed to parse review JSON', 'raw': full_response})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'done': True, 'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

class FixRequest(BaseModel):
    code: str
    issue_title: str
    issue_description: str

@app.post("/review/fix")
def stream_fix(request: FixRequest):
    def event_generator():
        try:
            for chunk in fix_issue_stream(
                request.code, request.issue_title, request.issue_description
            ):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'done': True, 'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Return all past reviews from the database
@app.get("/reviews")
def list_reviews():
    return get_all_reviews()