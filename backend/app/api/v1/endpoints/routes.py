"""
Routing table endpoints - fetch and manipulate routing tables on CTs via SSH
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
import subprocess
import time
import re

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


class RouteAddRequest(BaseModel):
    """Add a route on a target CT"""
    host: str = Field(..., description="Target CT (e.g., CT102)")
    dest: str = Field(..., description="Destination CIDR (e.g., 10.0.0.0/8)")
    gateway: str = Field(..., description="Gateway IP (e.g., 10.10.10.1)")
    iface: Optional[str] = Field(None, description="Interface (e.g., eth0)")


class RouteDeleteRequest(BaseModel):
    """Delete a route on a target CT"""
    host: str = Field(..., description="Target CT (e.g., CT102)")
    dest: str = Field(..., description="Destination CIDR to delete")


class DefaultGatewayRequest(BaseModel):
    """Change default gateway on a target CT"""
    host: str = Field(..., description="Target CT (e.g., CT102)")
    gateway: str = Field(..., description="New gateway IP")


class RouteOpResponse(BaseModel):
    """Route operation response"""
    host: str
    status: str
    command: str
    output: Optional[str] = None
    error: Optional[str] = None


def parse_ct_num(host: str) -> int:
    """Parse CT number from host string (CT102 -> 102)"""
    match = re.match(r"CT(\d+)", host.upper())
    if not match:
        raise HTTPException(status_code=400, detail=f"Invalid host format: {host}. Expected CT100-CT107")
    ct_num = int(match.group(1))
    if ct_num < 100 or ct_num > 107:
        raise HTTPException(status_code=400, detail=f"Invalid CT number: {ct_num}. Range is 100-107")
    return ct_num


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


def run_ssh_command(ct_num: int, command: List[str], timeout: int = 10) -> subprocess.CompletedProcess:
    """Run a command via SSH on a CT"""
    ssh_cmd = [
        ssh, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5",
        f"root@10.10.10.{ct_num}"
    ] + command
    return subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=timeout)


def get_ct_routes(ct_num: int) -> CtRoutes:
    """Get routing table from a specific CT"""
    host = f"CT{ct_num}"
    
    try:
        result = run_ssh_command(ct_num, ["ip", "route", "show"], timeout=5)
        
        if result.returncode == 0:
            routes = parse_routes(result.stdout)
            return CtRoutes(host=host, routes=routes)
        else:
            return CtRoutes(host=host, error=f"ssh failed: {result.stderr}")
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


@router.post("/add", response_model=RouteOpResponse)
async def add_route(request: RouteAddRequest):
    """
    Add a route on a target CT via SSH.
    Example: {"host": "CT102", "dest": "10.0.0.0/8", "gateway": "10.10.10.1", "iface": "eth0"}
    """
    ct_num = parse_ct_num(request.host)
    
    # Build ip route add command
    cmd = ["ip", "route", "add", request.dest, "via", request.gateway]
    if request.iface:
        cmd.extend(["dev", request.iface])
    
    try:
        result = run_ssh_command(ct_num, cmd, timeout=10)
        
        if result.returncode == 0:
            return RouteOpResponse(
                host=request.host,
                status="success",
                command=" ".join(cmd),
                output=result.stdout if result.stdout else "Route added successfully"
            )
        else:
            return RouteOpResponse(
                host=request.host,
                status="error",
                command=" ".join(cmd),
                error=result.stderr or "Unknown error"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH command failed: {str(e)}")


@router.delete("/delete", response_model=RouteOpResponse)
async def delete_route(request: RouteDeleteRequest):
    """
    Delete a route on a target CT via SSH.
    Example: {"host": "CT102", "dest": "10.0.0.0/8"}
    """
    ct_num = parse_ct_num(request.host)
    
    # Build ip route del command
    cmd = ["ip", "route", "del", request.dest]
    
    try:
        result = run_ssh_command(ct_num, cmd, timeout=10)
        
        if result.returncode == 0:
            return RouteOpResponse(
                host=request.host,
                status="success",
                command=" ".join(cmd),
                output=result.stdout if result.stdout else "Route deleted successfully"
            )
        else:
            return RouteOpResponse(
                host=request.host,
                status="error",
                command=" ".join(cmd),
                error=result.stderr or "Unknown error"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH command failed: {str(e)}")


@router.post("/default-gateway", response_model=RouteOpResponse)
async def change_default_gateway(request: DefaultGatewayRequest):
    """
    Change the default gateway on a target CT via SSH.
    Uses 'ip route replace default via <gateway>'.
    Example: {"host": "CT102", "gateway": "10.10.10.1"}
    """
    ct_num = parse_ct_num(request.host)
    
    # Build ip route replace default command
    cmd = ["ip", "route", "replace", "default", "via", request.gateway]
    
    try:
        result = run_ssh_command(ct_num, cmd, timeout=10)
        
        if result.returncode == 0:
            return RouteOpResponse(
                host=request.host,
                status="success",
                command=" ".join(cmd),
                output=result.stdout if result.stdout else "Default gateway changed successfully"
            )
        else:
            return RouteOpResponse(
                host=request.host,
                status="error",
                command=" ".join(cmd),
                error=result.stderr or "Unknown error"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH command failed: {str(e)}")
