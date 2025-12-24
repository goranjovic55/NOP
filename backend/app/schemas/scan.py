"""
Scan schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.scan import ScanType, ScanStatus


class ScanCreate(BaseModel):
    """Scan creation request"""
    name: str = Field(..., max_length=100)
    scan_type: ScanType
    targets: List[str] = Field(..., min_items=1)
    ports: Optional[str] = None
    scan_profile: Optional[str] = "medium"
    timing: str = "T3"
    options: Optional[Dict[str, Any]] = None


class ScanResponse(BaseModel):
    """Scan response model"""
    id: str
    name: str
    scan_type: ScanType
    status: ScanStatus
    targets: List[str]
    ports: Optional[str]
    scan_profile: Optional[str]
    timing: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[int]
    hosts_discovered: int
    ports_discovered: int
    services_discovered: int
    vulnerabilities_found: int
    created_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ScanResultResponse(BaseModel):
    """Scan result response model"""
    id: str
    scan_id: str
    host: str
    port: Optional[int]
    protocol: Optional[str]
    service: Optional[str]
    version: Optional[str]
    state: Optional[str]
    banner: Optional[str]
    confidence: Optional[int]
    cve_ids: Optional[List[str]]
    severity: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True