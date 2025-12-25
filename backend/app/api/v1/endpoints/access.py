"""
Access hub endpoints for remote connections
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List
from app.core.database import get_db
from app.services.access_hub import access_hub

router = APIRouter()

class SSHConnectionTest(BaseModel):
    """SSH connection test request"""
    host: str = Field(..., description="Target host IP or hostname")
    port: int = Field(default=22, description="SSH port")
    username: str = Field(..., description="SSH username")
    password: Optional[str] = Field(default=None, description="SSH password")
    key_file: Optional[str] = Field(default=None, description="SSH private key file path")

class SSHCommandRequest(BaseModel):
    """SSH command execution request"""
    host: str = Field(..., description="Target host IP or hostname")
    port: int = Field(default=22, description="SSH port")
    username: str = Field(..., description="SSH username")
    command: str = Field(..., description="Command to execute")
    password: Optional[str] = Field(default=None, description="SSH password")
    key_file: Optional[str] = Field(default=None, description="SSH private key file path")

class TCPConnectionTest(BaseModel):
    """TCP connection test request"""
    host: str = Field(..., description="Target host IP or hostname")
    port: int = Field(..., description="Target port")
    timeout: int = Field(default=5, description="Connection timeout in seconds")

class RDPConnectionRequest(BaseModel):
    """RDP connection request"""
    host: str = Field(..., description="Target host IP or hostname")
    port: int = Field(default=3389, description="RDP port")
    username: str = Field(..., description="RDP username")
    password: Optional[str] = Field(default=None, description="RDP password")
    domain: Optional[str] = Field(default=None, description="RDP domain")

@router.get("/status")
async def get_access_hub_status():
    """Get access hub status"""
    active_connections = access_hub.get_active_connections()
    history_count = len(access_hub.get_connection_history())
    
    return {
        "status": "active",
        "active_connections": active_connections["active_count"],
        "total_history": history_count,
        "services": ["SSH", "TCP", "System Info"]
    }

@router.post("/test/ssh")
async def test_ssh_connection(request: SSHConnectionTest):
    """Test SSH connection to a remote host"""
    try:
        result = await access_hub.test_ssh_connection(
            host=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            key_file=request.key_file
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test/tcp")
async def test_tcp_connection(request: TCPConnectionTest):
    """Test TCP connection to a host and port"""
    try:
        result = await access_hub.test_tcp_connection(
            host=request.host,
            port=request.port,
            timeout=request.timeout
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test/rdp")
async def test_rdp_connection(request: RDPConnectionRequest):
    """Test RDP connection to a remote host"""
    try:
        # For now, we'll use TCP check as a proxy for RDP test
        result = await access_hub.test_tcp_connection(
            host=request.host,
            port=request.port,
            timeout=5
        )
        if result["success"]:
            return {
                "success": True,
                "host": request.host,
                "port": request.port,
                "username": request.username,
                "message": "RDP port is open and reachable"
            }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute/ssh")
async def execute_ssh_command(request: SSHCommandRequest):
    """Execute a command on a remote host via SSH"""
    try:
        result = await access_hub.execute_ssh_command(
            host=request.host,
            port=request.port,
            username=request.username,
            command=request.command,
            password=request.password,
            key_file=request.key_file
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scan/services/{host}")
async def scan_common_services(host: str):
    """Scan for common services on a host"""
    try:
        result = await access_hub.scan_common_services(host)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/info/system")
async def get_system_info(request: SSHConnectionTest):
    """Get system information via SSH"""
    try:
        result = await access_hub.get_system_info_ssh(
            host=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            key_file=request.key_file
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_connection_history(limit: int = 50):
    """Get connection history"""
    try:
        history = access_hub.get_connection_history(limit)
        return {
            "history": history,
            "total": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/connections")
async def get_active_connections():
    """Get active connections"""
    try:
        connections = access_hub.get_active_connections()
        return connections
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/credentials/{asset_id}/{protocol}")
async def get_asset_credentials(asset_id: str, protocol: str, db: AsyncSession = Depends(get_db)):
    """Get credentials for a specific asset and protocol"""
    try:
        credentials = await access_hub.get_credentials_for_asset(db, asset_id, protocol)
        return {"credentials": credentials}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoints for the test environment
@router.get("/test-environment/ssh")
async def test_environment_ssh():
    """Test SSH connection to test environment"""
    try:
        result = await access_hub.test_ssh_connection(
            host="172.19.0.11",  # Test SSH server
            port=2222,
            username="testuser",
            password="testpass"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-environment/services")
async def test_environment_services():
    """Scan services in test environment"""
    try:
        hosts = ["172.19.0.10", "172.19.0.11", "172.19.0.12", "172.19.0.13"]
        results = []
        
        for host in hosts:
            result = await access_hub.scan_common_services(host)
            results.append(result)
        
        return {
            "test_environment": "172.19.0.0/24",
            "hosts_scanned": len(hosts),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))