"""
Credential schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.credential import CredentialType


class CredentialCreate(BaseModel):
    """Credential creation request"""
    asset_id: str
    name: str = Field(..., max_length=100)
    credential_type: CredentialType
    protocol: Optional[str] = None
    port: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    private_key: Optional[str] = None
    additional_data: Optional[dict] = None
    description: Optional[str] = None
    tags: Optional[str] = None


class CredentialResponse(BaseModel):
    """Credential response model (without sensitive data)"""
    id: str
    asset_id: str
    name: str
    credential_type: CredentialType
    protocol: Optional[str]
    port: Optional[str]
    username: Optional[str]
    is_valid: bool
    last_validated: Optional[datetime]
    last_used: Optional[datetime]
    use_count: int
    description: Optional[str]
    tags: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True