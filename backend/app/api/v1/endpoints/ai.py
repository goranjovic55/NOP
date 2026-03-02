"""
AI Chat endpoints - Falke relay to OpenClaw
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import uuid

router = APIRouter()

OPENCLAW_URL = "https://10.10.10.101:28790/v1/messages"
DEFAULT_MODEL = "claude-sonnet-4-6"

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    
    payload = {
        "model": DEFAULT_MODEL,
        "messages": [{"role": "user", "content": request.message}],
        "max_tokens": 1024
    }
    
    async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
        try:
            response = await client.post(OPENCLAW_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            
            reply = data.get("response", data.get("content", "No response"))
            if isinstance(reply, list):
                reply = " ".join([r.get("text", str(r)) for r in reply])
            
            return ChatResponse(response=reply, session_id=session_id)
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"OpenClaw error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Chat relay failed: {str(e)}")
