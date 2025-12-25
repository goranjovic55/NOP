"""
Network discovery endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List
from app.core.database import get_db
from app.services.scanner import scanner
import uuid
import asyncio

router = APIRouter()

class DiscoveryRequest(BaseModel):
    """Discovery scan request"""
    network: str = Field(..., description="Network to scan (e.g., 192.168.1.0/24)")
    scan_type: str = Field(default="basic", description="Scan type: basic, comprehensive, ping_only")
    ports: Optional[str] = Field(default="1-1000", description="Port range to scan")

class HostScanRequest(BaseModel):
    """Individual host scan request"""
    host: str = Field(..., description="Host IP address to scan")
    scan_type: str = Field(default="comprehensive", description="Scan type")
    ports: Optional[str] = Field(default="1-65535", description="Port range to scan")

# Store active scans
active_scans = {}

@router.get("/status")
async def get_discovery_status(db: AsyncSession = Depends(get_db)):
    """Get discovery service status"""
    return {
        "status": "active", 
        "mode": "active", 
        "last_scan": None,
        "active_scans": len(active_scans),
        "scanner_available": True
    }

@router.post("/scan")
async def start_discovery_scan(
    request: DiscoveryRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Start network discovery scan"""
    scan_id = str(uuid.uuid4())
    
    # Store scan info
    active_scans[scan_id] = {
        "status": "running",
        "network": request.network,
        "scan_type": request.scan_type,
        "started_at": None,
        "results": None
    }
    
    # Start scan in background
    background_tasks.add_task(run_network_discovery, scan_id, request)
    
    return {
        "message": "Discovery scan started",
        "scan_id": scan_id,
        "network": request.network,
        "scan_type": request.scan_type
    }

@router.post("/scan/host")
async def start_host_scan(
    request: HostScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Start individual host scan"""
    scan_id = str(uuid.uuid4())
    
    # Store scan info
    active_scans[scan_id] = {
        "status": "running",
        "host": request.host,
        "scan_type": request.scan_type,
        "started_at": None,
        "results": None
    }
    
    # Start scan in background
    background_tasks.add_task(run_host_scan, scan_id, request)
    
    return {
        "message": "Host scan started",
        "scan_id": scan_id,
        "host": request.host,
        "scan_type": request.scan_type
    }

@router.get("/scans")
async def get_discovery_scans(db: AsyncSession = Depends(get_db)):
    """Get discovery scan results"""
    scans = []
    for scan_id, scan_info in active_scans.items():
        scans.append({
            "scan_id": scan_id,
            "status": scan_info["status"],
            "network": scan_info.get("network"),
            "host": scan_info.get("host"),
            "scan_type": scan_info.get("scan_type"),
            "started_at": scan_info.get("started_at")
        })
    
    return {"scans": scans, "total": len(scans)}

@router.get("/scans/{scan_id}")
async def get_discovery_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Get specific discovery scan results"""
    if scan_id not in active_scans:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    scan_info = active_scans[scan_id]
    return {
        "scan_id": scan_id,
        "status": scan_info["status"],
        "network": scan_info.get("network"),
        "host": scan_info.get("host"),
        "scan_type": scan_info.get("scan_type"),
        "started_at": scan_info.get("started_at"),
        "results": scan_info.get("results")
    }

@router.post("/ping/{host}")
async def ping_host(host: str):
    """Ping a specific host"""
    try:
        hosts = await scanner.ping_sweep(host)
        is_alive = host in hosts
        return {
            "host": host,
            "alive": is_alive,
            "response_time": None  # Could implement actual ping timing
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/port-scan/{host}")
async def scan_host_ports(host: str, ports: str = "1-1000"):
    """Scan ports on a specific host"""
    try:
        results = await scanner.port_scan(host, ports)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-environment")
async def discover_test_environment():
    """Discover the test environment network"""
    try:
        # Scan the test network
        results = await scanner.discover_network("172.19.0.0/16")
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.services.discovery_service import DiscoveryService
from app.core.database import AsyncSessionLocal

async def run_network_discovery(scan_id: str, request: DiscoveryRequest):
    """Run network discovery scan in background"""
    try:
        active_scans[scan_id]["started_at"] = "now"
        
        if request.scan_type == "ping_only":
            hosts = await scanner.ping_sweep(request.network)
            results = {
                "network": request.network,
                "live_hosts": hosts,
                "total_hosts": len(hosts)
            }
        else:
            results = await scanner.discover_network(request.network)
        
        active_scans[scan_id]["results"] = results
        active_scans[scan_id]["status"] = "completed"

        # Process results and update assets
        async with AsyncSessionLocal() as db:
            discovery_service = DiscoveryService(db)
            await discovery_service.process_scan_results(results)
        
    except Exception as e:
        active_scans[scan_id]["status"] = "failed"
        active_scans[scan_id]["error"] = str(e)

async def run_host_scan(scan_id: str, request: HostScanRequest):
    """Run host scan in background"""
    try:
        active_scans[scan_id]["started_at"] = "now"
        
        if request.scan_type == "comprehensive":
            results = await scanner.comprehensive_scan(request.host)
        elif request.scan_type == "ports":
            results = await scanner.port_scan(request.host, request.ports)
        elif request.scan_type == "services":
            # First scan ports, then detect services
            port_results = await scanner.port_scan(request.host, request.ports)
            if "hosts" in port_results and port_results["hosts"]:
                open_ports = [
                    int(p["portid"]) for p in port_results["hosts"][0].get("ports", [])
                    if p.get("state") == "open"
                ]
                if open_ports:
                    results = await scanner.service_detection(request.host, open_ports)
                else:
                    results = port_results
            else:
                results = port_results
        else:
            results = await scanner.port_scan(request.host, request.ports)
        
        active_scans[scan_id]["results"] = results
        active_scans[scan_id]["status"] = "completed"

        # Process results and update assets
        async with AsyncSessionLocal() as db:
            discovery_service = DiscoveryService(db)
            await discovery_service.process_scan_results(results)
        
    except Exception as e:
        active_scans[scan_id]["status"] = "failed"
        active_scans[scan_id]["error"] = str(e)