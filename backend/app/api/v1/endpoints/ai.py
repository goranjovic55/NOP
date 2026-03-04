"""
AI Chat endpoints - Direct MiniMax API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import uuid

router = APIRouter()

MINIMAX_URL = "https://api.minimax.io/v1/text/chatcompletion_v2"
MINIMAX_API_KEY = "sk-cp-chBYNqqOz4Mf6oWdB5myyC_SlkKuecP-rBSrEz_3HCslvk07FxlMB0zeq-WSF9A0LJORTBRwn5ZdOl_aBeM5Mczd9AdcQz-cJvPky30MVS4soqz5UXna4DM"
DEFAULT_MODEL = "MiniMax-M2.5"

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
    
    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(MINIMAX_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # MiniMax response format: choices[0].message.content
            choices = data.get("choices", [])
            if choices and len(choices) > 0:
                reply = choices[0].get("message", {}).get("content", "No response")
            else:
                reply = data.get("content", "No response")
            
            return ChatResponse(response=reply, session_id=session_id)
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"MiniMax error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
