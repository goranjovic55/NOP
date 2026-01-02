"""
Scanning endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.services.version_detection import VersionDetectionService

router = APIRouter()


class VersionDetectionRequest(BaseModel):
    """Request for version detection"""
    host: str
    ports: Optional[List[int]] = None


class VersionDetectionResponse(BaseModel):
    """Response for version detection"""
    host: str
    services: List[dict]
    scanned_ports: int


@router.get("/")
async def get_scans(db: AsyncSession = Depends(get_db)):
    """Get list of scans"""
    return {"scans": [], "total": 0}


@router.post("/")
async def create_scan(db: AsyncSession = Depends(get_db)):
    """Create a new scan"""
    return {"message": "Scan created", "scan_id": "placeholder"}


@router.post("/{scan_id}/version-detection", response_model=VersionDetectionResponse)
async def run_version_detection(
    scan_id: str,
    request: VersionDetectionRequest,
    db: AsyncSession = Depends(get_db)
) -> VersionDetectionResponse:
    """
    Run service version detection using nmap -sV
    
    Args:
        scan_id: Scan identifier (for tracking)
        request: Version detection parameters
        
    Returns:
        Detected services with version information
    """
    try:
        service = VersionDetectionService(db)
        result = await service.detect_versions(request.host, request.ports)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return VersionDetectionResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Version detection failed: {str(e)}")