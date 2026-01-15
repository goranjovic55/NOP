"""
Scanning endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.services.version_detection import VersionDetectionService
from app.services.scanner import NetworkScanner

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


class PortScanRequest(BaseModel):
    """Request for port scan"""
    host: str
    scanType: str = "standard"  # quick, standard, full, custom
    ports: Optional[str] = None  # For custom port ranges
    technique: str = "connect"  # syn, connect, udp


class PortScanResponse(BaseModel):
    """Response for port scan"""
    host: str
    open_ports: List[dict]
    scanned_ports: int
    scan_type: str


@router.get("/")
async def get_scans(db: AsyncSession = Depends(get_db)):
    """Get list of scans"""
    return {"scans": [], "total": 0}


@router.post("/")
async def create_scan(db: AsyncSession = Depends(get_db)):
    """Create a new scan"""
    return {"message": "Scan created", "scan_id": "placeholder"}


@router.post("/{scan_id}/port-scan", response_model=PortScanResponse)
async def run_port_scan(
    scan_id: str,
    request: PortScanRequest,
    db: AsyncSession = Depends(get_db)
) -> PortScanResponse:
    """
    Run port scan on a host
    
    Args:
        scan_id: Scan identifier (for tracking)
        request: Port scan parameters
        
    Returns:
        List of open ports with service info
    """
    try:
        scanner = NetworkScanner()
        
        # Determine port range based on scan type
        if request.scanType == "quick":
            ports = "21,22,23,25,53,80,110,143,443,3306,3389,5432,8080"
        elif request.scanType == "standard":
            ports = "1-1000"
        elif request.scanType == "full":
            ports = "1-65535"
        elif request.scanType == "custom" and request.ports:
            ports = request.ports
        else:
            ports = "1-1000"
        
        # Run port scan
        result = await scanner.port_scan(request.host, ports, request.technique)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return PortScanResponse(
            host=request.host,
            open_ports=result.get("open_ports", []),
            scanned_ports=result.get("scanned_ports", 0),
            scan_type=request.scanType
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Port scan failed: {str(e)}")


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


# Import sniffer service for passive scan
from app.services.SnifferService import sniffer_service


class PassiveScanToggleRequest(BaseModel):
    """Request to toggle passive scan"""
    enabled: bool


@router.get("/passive-scan")
async def get_passive_scan_status():
    """Get passive scan status and detected services"""
    return sniffer_service.get_detected_services()


@router.post("/passive-scan")
async def toggle_passive_scan(request: PassiveScanToggleRequest):
    """Enable or disable passive port scanning"""
    sniffer_service.set_passive_scan_enabled(request.enabled)
    return {
        "enabled": request.enabled,
        "message": f"Passive scan {'enabled' if request.enabled else 'disabled'}"
    }


@router.delete("/passive-scan/services")
async def clear_passive_scan_services():
    """Clear all detected services from passive scan"""
    sniffer_service.clear_detected_services()
    return {"message": "Detected services cleared"}