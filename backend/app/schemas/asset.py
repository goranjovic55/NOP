"""
Asset schemas
"""

from pydantic import BaseModel, Field, IPvAnyAddress
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.asset import AssetType, AssetStatus


class AssetCreate(BaseModel):
    """Asset creation request"""
    ip_address: IPvAnyAddress
    mac_address: Optional[str] = Field(None, pattern=r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')
    hostname: Optional[str] = Field(None, max_length=255)
    asset_type: AssetType = AssetType.UNKNOWN
    vendor: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    os_name: Optional[str] = Field(None, max_length=100)
    os_version: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class AssetUpdate(BaseModel):
    """Asset update request"""
    hostname: Optional[str] = Field(None, max_length=255)
    asset_type: Optional[AssetType] = None
    vendor: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    os_name: Optional[str] = Field(None, max_length=100)
    os_version: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class AssetResponse(BaseModel):
    """Asset response model"""
    id: str
    ip_address: str
    mac_address: Optional[str]
    hostname: Optional[str]
    asset_type: AssetType
    status: AssetStatus
    confidence_score: float
    vendor: Optional[str]
    model: Optional[str]
    os_name: Optional[str]
    os_version: Optional[str]
    open_ports: Optional[List[int]]
    services: Optional[Dict[str, Any]]
    first_seen: datetime
    last_seen: datetime
    discovery_method: Optional[str]
    notes: Optional[str]
    tags: Optional[List[str]]
    custom_fields: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class AssetList(BaseModel):
    """Asset list response"""
    assets: List[AssetResponse]
    total: int
    page: int
    size: int
    pages: int


class AssetStats(BaseModel):
    """Asset statistics"""
    total_assets: int
    online_assets: int
    offline_assets: int
    by_type: Dict[str, int]
    by_vendor: Dict[str, int]
    recently_discovered: int