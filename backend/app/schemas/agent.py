"""
Agent schemas for API validation
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.agent import AgentType, AgentStatus, StartupMode, PersistenceLevel


class AgentCreate(BaseModel):
    """Agent creation request"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    agent_type: AgentType = AgentType.PYTHON
    connection_url: str = Field(..., min_length=1, max_length=255)
    capabilities: Dict[str, bool] = Field(default_factory=lambda: {
        "asset": True,
        "traffic": True,
        "host": True,
        "access": False
    })
    obfuscate: bool = Field(default=True, description="Use Garble obfuscation for Go agents")
    startup_mode: StartupMode = Field(default=StartupMode.AUTO, description="Auto-startup or single run")
    persistence_level: PersistenceLevel = Field(default=PersistenceLevel.MEDIUM, description="Persistence and stealth level")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AgentUpdate(BaseModel):
    """Agent update request"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    connection_url: Optional[str] = Field(None, min_length=1, max_length=255)
    capabilities: Optional[Dict[str, bool]] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[AgentStatus] = None


class AgentResponse(BaseModel):
    """Agent response model"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    agent_type: AgentType
    status: AgentStatus
    connection_url: str
    auth_token: str
    capabilities: Dict[str, bool]
    obfuscate: bool
    startup_mode: StartupMode
    persistence_level: PersistenceLevel
    metadata: Optional[Dict[str, Any]] = None
    last_seen: Optional[datetime] = None
    connected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class AgentListResponse(BaseModel):
    """List of agents"""
    agents: list[AgentResponse]
    total: int


class AgentGenerateRequest(BaseModel):
    """Request to generate agent artifact"""
    agent_id: UUID


class AgentGenerateResponse(BaseModel):
    """Response with generated agent"""
    agent_id: UUID
    agent_type: AgentType
    content: str  # Base64 encoded content or script
    filename: str
