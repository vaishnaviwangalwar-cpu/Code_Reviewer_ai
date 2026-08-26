import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

def get_client() -> genai.Client:
    load_dotenv(override=True)
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Please set the GEMINI_API_KEY environment variable or define it in a .env file."
        )
    return genai.Client(api_key=api_key)


# JSON schema that tells Gemini the exact structure to return
REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    # Each issue gets a category label
                    "category": {
                        "type": "string",
                        "enum": ["bug", "security", "performance", "style"],
                    },
                    # Severity helps the frontend color-code results
                    "severity": {
                        "type": "string",
                        "enum": ["critical", "warning", "info"],
                    },
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["category", "severity", "title", "description"],
            },
        }
    },
    "required": ["issues"],
}

# Instructions telling Gemini how to review code
SYSTEM_PROMPT = (
    "You are an expert code reviewer. Analyze the provided code snippet and "
    "identify issues across four categories: bug, security, performance, and style. "
    "For each issue, assign a severity level: critical (will cause failures or "
    "vulnerabilities), warning (should be fixed but not immediately dangerous), "
    "or info (suggestions for improvement). Be specific and actionable."
)

def review_code(code: str) -> str:
    # Send the code to Gemini with the system prompt
    client = get_client()
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=f"Review this code:\n\n```\n{code}\n```",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=REVIEW_SCHEMA,
        ),
    )
    return response.text

def review_code_stream(code: str):
    # Use generate_content_stream for real-time chunk delivery
    client = get_client()
    for chunk in client.models.generate_content_stream(
        model=MODEL_NAME,
        contents=f"Review this code:\n\n```\n{code}\n```",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=REVIEW_SCHEMA,
        ),
    ):
        # Yield each text chunk as it arrives from Gemini
        if chunk.text:
            yield chunk.text

FIX_SYSTEM_PROMPT = (
    "You are an expert code fixer. Given a code snippet and a specific issue, "
    "provide the corrected version of the code that fixes the described issue. "
    "Only output the corrected code, no explanations."
)

def fix_issue_stream(code: str, issue_title: str, issue_description: str):
    # Build a prompt with the original code and the specific issue
    client = get_client()
    prompt = (
        f"Original code:\n```\n{code}\n```\n\n"
        f"Issue: {issue_title}\n"
        f"Description: {issue_description}\n\n"
        f"Provide the corrected code:"
    )
    for chunk in client.models.generate_content_stream(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=FIX_SYSTEM_PROMPT,
        ),
    ):
        if chunk.text:
            yield chunk.text