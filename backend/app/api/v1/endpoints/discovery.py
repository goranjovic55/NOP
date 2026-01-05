"""
Network discovery endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from uuid import UUID
from app.core.database import get_db
from app.models.event import Event, EventType, EventSeverity
from app.models.agent import Agent
from app.services.scanner import scanner
from app.services.SnifferService import sniffer_service
import uuid
import asyncio
import logging
import time

logger = logging.getLogger(__name__)

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


async def get_agent_pov(agent_id_str: Optional[str], db: AsyncSession) -> Optional[int]:
    """Get SOCKS proxy port for agent POV mode"""
    if not agent_id_str:
        return None
    
    try:
        from sqlalchemy import select
        agent_id = UUID(agent_id_str)
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalar_one_or_none()
        
        if agent and agent.agent_metadata:
            return agent.agent_metadata.get("socks_proxy_port")
    except Exception as e:
        logger.warning(f"Failed to get agent POV: {e}")
    
    return None


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
    x_agent_pov: Optional[str] = Header(None),
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
    
    # Log event for scan started
    async def log_scan_started():
        async with AsyncSessionLocal() as db:
            event = Event(
                event_type=EventType.SCAN_STARTED,
                severity=EventSeverity.INFO,
                title="Network Scan Started",
                description=f"Network discovery scan started for {request.network}",
                event_metadata={"scan_id": scan_id, "network": request.network, "scan_type": request.scan_type}
            )
            db.add(event)
            await db.commit()
    
    background_tasks.add_task(log_scan_started)
    
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
async def ping_host(
    host: str,
    x_agent_pov: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Ping a specific host"""
    try:
        proxy_port = await get_agent_pov(x_agent_pov, db)
        hosts = await scanner.ping_sweep(host, proxy_port=proxy_port)
        is_alive = host in hosts
        return {
            "host": host,
            "alive": is_alive,
            "response_time": None  # Could implement actual ping timing
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/port-scan/{host}")
async def scan_host_ports(
    host: str,
    ports: str = "1-1000",
    x_agent_pov: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Scan ports on a specific host"""
    try:
        proxy_port = await get_agent_pov(x_agent_pov, db)
        results = await scanner.port_scan(host, ports, proxy_port=proxy_port)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/passive-discovery")
async def get_passive_discovery(db: AsyncSession = Depends(get_db)):
    """Get hosts discovered passively from network traffic"""
    try:
        discovered_hosts = sniffer_service.get_discovered_hosts()
        return {
            "hosts": discovered_hosts,
            "total": len(discovered_hosts),
            "discovery_method": "passive"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/passive-discovery/import")
async def import_passive_discovery(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Import passively discovered hosts into asset database"""
    try:
        discovered_hosts = sniffer_service.get_discovered_hosts()
        
        # Process in background
        background_tasks.add_task(process_passive_discovery, discovered_hosts)
        
        return {
            "message": "Passive discovery import started",
            "hosts_found": len(discovered_hosts)
        }
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
        
        # Determine discovery method based on scan type
        if request.scan_type == "ping_only" or request.scan_type == "ping":
            discovery_method = "ping"
        elif request.scan_type == "arp":
            discovery_method = "arp"
        elif request.scan_type == "comprehensive":
            discovery_method = "comprehensive"
        else:
            discovery_method = request.scan_type or "nmap"
        
        # Check if this is a single host or a network
        is_single_host = "/" not in request.network
        
        if request.scan_type == "ping_only":
            hosts = await scanner.ping_sweep(request.network)
            results = {
                "network": request.network,
                "live_hosts": hosts,
                "total_hosts": len(hosts)
            }
        elif is_single_host:
            # Single host scan - use port_scan directly with appropriate port range
            port_range = "1-65535" if request.scan_type == "comprehensive" else "1-1000"
            logger.info(f"Single host scan on {request.network} with ports {port_range}")
            host_result = await scanner.port_scan(request.network, port_range)
            
            results = {
                "network": request.network,
                "scan_time": host_result.get("scan_time"),
                "total_hosts": len(host_result.get("hosts", [])),
                "hosts": host_result.get("hosts", [])
            }
        else:
            # Network scan
            results = await scanner.discover_network(request.network)
        
        active_scans[scan_id]["results"] = results
        active_scans[scan_id]["status"] = "completed"

        # Process results and update assets
        async with AsyncSessionLocal() as db:
            discovery_service = DiscoveryService(db)
            await discovery_service.process_scan_results(results, discovery_method=discovery_method)
            
            # Log event for scan completed
            event = Event(
                event_type=EventType.SCAN_COMPLETED,
                severity=EventSeverity.INFO,
                title="Network Scan Completed",
                description=f"Network discovery scan completed for {request.network}. Found {len(results.get('hosts', []))} hosts.",
                event_metadata={"scan_id": scan_id, "network": request.network, "hosts_found": len(results.get("hosts", []))}
            )
            db.add(event)
            await db.commit()
            logger.info(f"Scan completed event logged for {scan_id}")
        
    except Exception as e:
        active_scans[scan_id]["status"] = "failed"
        active_scans[scan_id]["error"] = str(e)

async def run_host_scan(scan_id: str, request: HostScanRequest):
    """Run host scan in background"""
    try:
        active_scans[scan_id]["started_at"] = "now"
        
        # Determine discovery method
        discovery_method = request.scan_type if request.scan_type == "comprehensive" else "nmap"
        
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
            await discovery_service.process_scan_results(results, is_full_network_scan=False, discovery_method=discovery_method)
        
    except Exception as e:
        active_scans[scan_id]["status"] = "failed"
        active_scans[scan_id]["error"] = str(e)

async def process_passive_discovery(discovered_hosts: List[Dict]):
    """Process passively discovered hosts and add them to the database"""
    try:
        async with AsyncSessionLocal() as db:
            from app.models.asset import Asset, AssetStatus
            from sqlalchemy import select, cast
            from sqlalchemy.dialects.postgresql import INET
            from datetime import datetime
            
            for host_data in discovered_hosts:
                ip_address = host_data.get("ip_address")
                if not ip_address:
                    continue
                
                # Check if asset already exists - cast string to INET for comparison
                result = await db.execute(
                    select(Asset).where(Asset.ip_address == cast(ip_address, INET))
                )
                asset = result.scalar_one_or_none()
                
                if asset:
                    # Update existing asset with passive discovery info
                    asset.last_seen = datetime.now()
                    # Don't change status - passive discovery doesn't confirm reachability
                    if host_data.get("mac_address") and not asset.mac_address:
                        asset.mac_address = host_data.get("mac_address")
                    # Add discovery method if not already set
                    if not asset.discovery_method or asset.discovery_method == "unknown":
                        asset.discovery_method = "passive"
                else:
                    # Create new asset with passive discovery
                    new_asset = Asset(
                        ip_address=ip_address,
                        mac_address=host_data.get("mac_address"),
                        status=AssetStatus.UNKNOWN,  # Status unknown until active scan
                        discovery_method="passive",
                        first_seen=datetime.fromtimestamp(host_data.get("first_seen", time.time())),
                        last_seen=datetime.fromtimestamp(host_data.get("last_seen", time.time()))
                    )
                    db.add(new_asset)
                
            await db.commit()
            logger.info(f"Processed {len(discovered_hosts)} passively discovered hosts")
            
    except Exception as e:
        logger.error(f"Error processing passive discovery: {e}")