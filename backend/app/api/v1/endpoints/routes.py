"""
Routing table endpoints - fetch routing tables from all CTs
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel
import subprocess
import time

ssh = "/usr/bin/ssh"

router = APIRouter()

# Simple cache for routing tables
_cache = {"data": None, "timestamp": 0}
CACHE_TTL = 30  # seconds

class RouteEntry(BaseModel):
    dest: str
    gateway: str
    iface: str
    proto: str

class CtRoutes(BaseModel):
    host: str
    routes: Optional[List[RouteEntry]] = None
    error: Optional[str] = None

def parse_routes(output: str) -> List[RouteEntry]:
    """Parse ip route show output"""
    routes = []
    for line in output.strip().split('\n'):
        if not line:
            continue
        parts = line.split()
        if not parts:
            continue
        
        # Parse destination (first element)
        dest = parts[0]
        gateway = ""
        iface = ""
        proto = "static"
        
        i = 1
        while i < len(parts):
            if parts[i] == "via" and i + 1 < len(parts):
                gateway = parts[i + 1]
                i += 2
            elif parts[i] == "dev" and i + 1 < len(parts):
                iface = parts[i + 1]
                i += 2
            elif parts[i] == "proto" and i + 1 < len(parts):
                proto = parts[i + 1]
                i += 2
            else:
                i += 1
        
        if dest:
            routes.append(RouteEntry(dest=dest, gateway=gateway, iface=iface, proto=proto))
    
    return routes

def get_ct_routes(ct_num: int) -> CtRoutes:
    """Get routing table from a specific CT"""
    host = f"CT{ct_num}"
    ip_suffix = ct_num
    
    try:
        result = subprocess.run(
            [ssh, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=3",
             f"root@10.10.10.{ip_suffix}", "ip", "route", "show"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            routes = parse_routes(result.stdout)
            return CtRoutes(host=host, routes=routes)
        else:
            return CtRoutes(host=host, error="unreachable")
    except subprocess.TimeoutExpired:
        return CtRoutes(host=host, error="timeout")
    except Exception as e:
        return CtRoutes(host=host, error=str(e))

@router.get("", response_model=List[CtRoutes])
async def get_all_routes():
    """Get routing tables from all CTs (100-107)"""
    global _cache
    
    # Check cache
    if _cache["data"] and (time.time() - _cache["timestamp"]) < CACHE_TTL:
        return _cache["data"]
    
    # Fetch from all CTs
    results = []
    for ct_num in range(100, 108):
        ct_routes = get_ct_routes(ct_num)
        results.append(ct_routes)
    
    # Update cache
    _cache["data"] = results
    _cache["timestamp"] = time.time()
    
    return results
