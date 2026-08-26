import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from database import init_db, save_review, get_all_reviews
from gemini_client import review_code, review_code_stream, fix_issue_stream
# Initialize the database
init_db()

# Create the FastAPI app
app = FastAPI(title="CodeLens API")

# Ensure http://localhost:5173 is in your allow_origins list!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Define the expected shape of incoming review requests
class ReviewRequest(BaseModel):
    code: str


# Initialize the database when the server starts
@app.on_event("startup")
def startup():
    init_db()


# Send code to Gemini, save the result, and return it
@app.post("/review")
def create_review(request: ReviewRequest):
    result = review_code(request.code)
    parsed = json.loads(result)
    review_id = save_review(request.code, parsed.get("issues", []))
    return {"id": review_id, "issues": parsed.get("issues", [])}

@app.post("/review/stream")
def stream_review(request: ReviewRequest):
    def event_generator():
        # Accumulate chunks to parse the full response at the end
        full_response = ""
        for chunk in review_code_stream(request.code):
            full_response += chunk
            # Send each chunk as an SSE event
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        try:
            # Parse the complete response and save to the database
            parsed = json.loads(full_response)
            issues = parsed.get("issues", [])
            save_review(request.code, issues)
            yield f"data: {json.dumps({'done': True, 'issues': issues})}\n\n"
        except json.JSONDecodeError:
            yield f"data: {json.dumps({'done': True, 'error': 'Failed to parse response'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

class FixRequest(BaseModel):
    code: str
    issue_title: str
    issue_description: str

@app.post("/review/fix")
def stream_fix(request: FixRequest):
    # Stream Gemini's fix response as SSE events
    def event_generator():
        for chunk in fix_issue_stream(
            request.code, request.issue_title, request.issue_description
        ):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")    

# Return all past reviews from the database
@app.get("/reviews")
def list_reviews():
    return get_all_reviews()