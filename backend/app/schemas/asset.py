"""
Asset schemas
"""

from pydantic import BaseModel, Field, IPvAnyAddress, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.asset import AssetType, AssetStatus


class AssetCreate(BaseModel):
    """Asset creation request"""
    ip_address: str
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
    model_config = ConfigDict(from_attributes=True)

    id: str
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    asset_type: AssetType
    status: AssetStatus
    confidence_score: float
    vendor: Optional[str] = None
    model: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    open_ports: Optional[List[int]] = None
    services: Optional[Dict[str, Any]] = None
    first_seen: datetime
    last_seen: datetime
    discovery_method: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    vulnerable_count: int = 0
    has_been_accessed: bool = False
    has_been_exploited: bool = False


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
    scanned_assets: int = 0
    accessed_assets: int = 0
    vulnerable_assets: int = 0
    exploited_assets: int = 0
    active_scans: int
    active_connections: int
    by_type: Dict[str, int]
    by_vendor: Dict[str, int]
    recently_discovered: int
