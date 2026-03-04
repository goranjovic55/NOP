"""
LLM Chat Integration endpoints - MiniMax/OpenAI support with session management
"""

import asyncio
import uuid
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# In-memory storage
_sessions: dict[str, dict] = {}
_config: dict = {
    "provider": "minimax",
    "api_endpoint": "https://api.minimax.io/v1/text/chatcompletion_v2",
    "api_key": "",
    "model": "MiniMax-M2.5",
    "max_tokens": 4096,
    "temperature": 0.7,
    "available_functions": ["list_assets", "start_discovery", "add_route", "start_scan"]
}

# Pydantic Models
class LLMConfig(BaseModel):
    provider: str = "minimax"
    api_endpoint: str = "https://api.minimax.io/v1/text/chatcompletion_v2"
    api_key: str = ""
    model: str = "MiniMax-M2.5"
    max_tokens: int = 4096
    temperature: float = 0.7
    available_functions: list[str] = ["list_assets", "start_discovery", "add_route", "start_scan"]


class ChatMessage(BaseModel):
    role: str
    content: str


class LLMChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None


class LLMChatResponse(BaseModel):
    response: str
    session_id: str
    model: str
    function_calls: list[dict] = []


class Session(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class SessionListResponse(BaseModel):
    sessions: list[Session]


# Endpoints
@router.get("/config", response_model=LLMConfig)
async def get_llm_config():
    """Get current LLM configuration (API key hidden)"""
    config = _config.copy()
    if config.get("api_key"):
        config["api_key"] = "***" + config["api_key"][-4:]
    return config


@router.put("/config", response_model=LLMConfig)
async def update_llm_config(config: LLMConfig):
    """Update LLM configuration"""
    _config.update(config.model_dump())
    return await get_llm_config()


@router.post("/test")
async def test_llm_connection():
    """Test LLM connection with current config"""
    if not _config.get("api_key"):
        raise HTTPException(status_code=400, detail="API key not configured")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                _config["api_endpoint"],
                headers={
                    "Authorization": f"Bearer {_config['api_key']}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": _config["model"],
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 10
                }
            )
            if response.status_code == 200:
                return {"status": "connected", "provider": _config["provider"]}
            else:
                raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/chat", response_model=LLMChatResponse)
async def llm_chat(request: LLMChatRequest):
    """Send a chat message to LLM and get response"""
    session_id = request.session_id or str(uuid.uuid4())

    # Create or get session
    if session_id not in _sessions:
        _sessions[session_id] = {
            "id": session_id,
            "name": f"Session {len(_sessions) + 1}",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "messages": []
        }

    session = _sessions[session_id]
    session["updated_at"] = datetime.utcnow()

    # Add user message
    user_msg = {"role": "user", "content": request.message}
    session["messages"].append(user_msg)

    # Prepare API request
    if not _config.get("api_key"):
        # Fallback response when no API key
        response_text = "[ERROR] LLM not configured. Please set API key in settings."
        model = _config["model"]
    else:
        try:
            async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
                api_messages = session["messages"][-10:]  # Last 10 messages
                response = await client.post(
                    _config["api_endpoint"],
                    headers={
                        "Authorization": f"Bearer {_config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": request.model or _config["model"],
                        "messages": api_messages,
                        "max_tokens": _config["max_tokens"],
                        "temperature": _config["temperature"]
                    }
                )

                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=response.text)

                data = response.json()
                # Handle different API response formats
                if "choices" in data and len(data["choices"]) > 0:
                    response_text = data["choices"][0]["message"].get("content", "")
                elif "choices" in data and len(data["choices"]) == 0:
                    response_text = "[EMPTY] No response generated"
                else:
                    response_text = str(data)

                model = data.get("model", request.model or _config["model"])

        except httpx.TimeoutException:
            response_text = "[ERROR] Request timed out"
            model = _config["model"]
        except Exception as e:
            response_text = f"[ERROR] {str(e)}"
            model = _config["model"]

    # Add assistant message
    assistant_msg = {"role": "assistant", "content": response_text}
    session["messages"].append(assistant_msg)
    session["message_count"] = len(session["messages"])

    return LLMChatResponse(
        response=response_text,
        session_id=session_id,
        model=model,
        function_calls=[]
    )


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions():
    """List all chat sessions"""
    sessions = [
        Session(
            id=sid,
            name=info["name"],
            created_at=info["created_at"],
            updated_at=info["updated_at"],
            message_count=info["message_count"]
        )
        for sid, info in _sessions.items()
    ]
    sessions.sort(key=lambda x: x.updated_at, reverse=True)
    return SessionListResponse(sessions=sessions)


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session with messages"""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = _sessions[session_id]
    return {
        "id": session["id"],
        "name": session["name"],
        "created_at": session["created_at"],
        "updated_at": session["updated_at"],
        "messages": session["messages"]
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    del _sessions[session_id]
    return {"status": "deleted", "session_id": session_id}


@router.put("/sessions/{session_id}")
async def rename_session(session_id: str, name: str):
    """Rename a chat session"""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    _sessions[session_id]["name"] = name
    _sessions[session_id]["updated_at"] = datetime.utcnow()
    return {"status": "updated", "name": name}
