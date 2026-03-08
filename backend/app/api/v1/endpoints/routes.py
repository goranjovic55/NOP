"""
Routing table endpoints - fetch and manipulate routing tables on CTs via SSH
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
import subprocess
import time
import re
import ipaddress

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
    host: str = Field(..., description="Target CT (e.g., CT102) or IP")
    dest: str = Field(..., description="Destination CIDR (e.g., 10.0.0.0/8)")
    gateway: str = Field(..., description="Gateway IP (e.g., 10.10.10.1)")
    iface: Optional[str] = Field(None, description="Interface (e.g., eth0)")


class RouteDeleteRequest(BaseModel):
    """Delete a route on a target CT"""
    host: str = Field(..., description="Target CT (e.g., CT102) or IP")
    dest: str = Field(..., description="Destination CIDR to delete")


class DefaultGatewayRequest(BaseModel):
    """Change default gateway on a target CT"""
    host: str = Field(..., description="Target CT (e.g., CT102) or IP")
    gateway: str = Field(..., description="New gateway IP")


class RouteOpResponse(BaseModel):
    """Route operation response"""
    host: str
    status: str
    command: str
    output: Optional[str] = None
    error: Optional[str] = None


class AliasIPRequest(BaseModel):
    """Add/remove alias IP on a target CT"""
    host: str = Field(..., description="Target CT (e.g., CT102) or IP")
    interface: str = Field(..., description="Interface (e.g., eth0)")
    alias_ip: str = Field(..., description="Alias IP with CIDR (e.g., 10.10.10.200/24)")
    ttl_seconds: int = Field(300, description="TTL in seconds")


def resolve_host(host: str) -> str:
    """Resolve host string (CTxxx or raw IP) to IP address"""
    # Match CT number pattern (CT100-CT107, or any CTxxx)
    match = re.match(r"CT(\d+)", host.upper())
    if match:
        ct_num = int(match.group(1))
        return f"10.10.10.{ct_num}"
    
    # Try to parse as IP address
    try:
        ipaddress.ip_address(host)
        return host
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid host: {host}. Use CTxxx format (e.g., CT102) or raw IP address."
        )


def parse_routes(output: str) -> List[RouteEntry]:
    """Parse ip route show output"""
    routes = []
    for line in output.strip().split(n):
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


def run_ssh_command(ip: str, command: List[str], timeout: int = 10) -> subprocess.CompletedProcess:
    """Run a command via SSH on a target IP"""
    ssh_cmd = [
        ssh, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5",
        f"root@{ip}"
    ] + command
    return subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=timeout)


def get_ct_routes(ip: str, host_label: str) -> CtRoutes:
    """Get routing table from a specific IP"""
    try:
        result = run_ssh_command(ip, ["ip", "route", "show"], timeout=5)
        
        if result.returncode == 0:
            routes = parse_routes(result.stdout)
            return CtRoutes(host=host_label, routes=routes)
        else:
            return CtRoutes(host=host_label, error=f"ssh failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        return CtRoutes(host=host_label, error="timeout")
    except Exception as e:
        return CtRoutes(host=host_label, error=str(e))


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
        ip = f"10.10.10.{ct_num}"
        host_label = f"CT{ct_num}"
        ct_routes = get_ct_routes(ip, host_label)
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
    Or with IP: {"host": "10.10.10.102", "dest": "10.0.0.0/8", "gateway": "10.10.10.1"}
    """
    ip = resolve_host(request.host)
    
    # Build ip route add command
    cmd = ["ip", "route", "add", request.dest, "via", request.gateway]
    if request.iface:
        cmd.extend(["dev", request.iface])
    
    try:
        result = run_ssh_command(ip, cmd, timeout=10)
        
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
    Or with IP: {"host": "10.10.10.102", "dest": "10.0.0.0/8"}
    """
    ip = resolve_host(request.host)
    
    # Build ip route del command
    cmd = ["ip", "route", "del", request.dest]
    
    try:
        result = run_ssh_command(ip, cmd, timeout=10)
        
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
async def set_default_gateway(request: DefaultGatewayRequest):
    """
    Change default gateway on a target CT via SSH.
    Example: {"host": "CT102", "gateway": "10.10.10.1"}
    Or with IP: {"host": "10.10.10.102", "gateway": "10.10.10.1"}
    """
    ip = resolve_host(request.host)
    
    # Build ip route change command for default gateway
    cmd = ["ip", "route", "change", "default", "via", request.gateway]
    
    try:
        result = run_ssh_command(ip, cmd, timeout=10)
        
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


@router.post("/alias-ip/add", response_model=RouteOpResponse)
async def add_alias_ip(request: AliasIPRequest):
    """
    Add an alias IP address to an interface on a target CT.
    Example: {"host": "CT102", "interface": "eth0", "alias_ip": "10.10.10.200/24", "ttl_seconds": 300}
    Or with IP: {"host": "10.10.10.102", "interface": "eth0", "alias_ip": "10.10.10.200/24"}
    """
    ip = resolve_host(request.host)
    
    # Build ip addr add command
    cmd = ["ip", "addr", "add", request.alias_ip, "dev", request.interface]
    
    try:
        result = run_ssh_command(ip, cmd, timeout=10)
        
        if result.returncode == 0:
            return RouteOpResponse(
                host=request.host,
                status="success",
                command=" ".join(cmd),
                output=result.stdout if result.stdout else f"Alias IP {request.alias_ip} added successfully"
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


@router.delete("/alias-ip/remove", response_model=RouteOpResponse)
async def remove_alias_ip(request: AliasIPRequest):
    """
    Remove an alias IP address from an interface on a target CT.
    Example: {"host": "CT102", "interface": "eth0", "alias_ip": "10.10.10.200/24"}
    Or with IP: {"host": "10.10.10.102", "interface": "eth0", "alias_ip": "10.10.10.200/24"}
    """
    ip = resolve_host(request.host)
    
    # Build ip addr del command
    cmd = ["ip", "addr", "del", request.alias_ip, "dev", request.interface]
    
    try:
        result = run_ssh_command(ip, cmd, timeout=10)
        
        if result.returncode == 0:
            return RouteOpResponse(
                host=request.host,
                status="success",
                command=" ".join(cmd),
                output=result.stdout if result.stdout else f"Alias IP {request.alias_ip} removed successfully"
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
