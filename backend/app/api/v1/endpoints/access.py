"""
Access hub endpoints for remote connections
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List
import json
import asyncio
import time
import os
from app.core.database import get_db
from app.models.event import Event, EventType, EventSeverity
from app.services.access_hub import access_hub
from app.services.guacamole import GuacamoleTunnel
from app.utils.errors import handle_api_error

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

class FTPListRequest(BaseModel):
    """FTP list files request"""
    host: str = Field(..., description="Target host IP or hostname")
    port: int = Field(default=21, description="FTP port")
    username: str = Field(..., description="FTP username")
    password: Optional[str] = Field(default=None, description="FTP password")
    path: str = Field(default="/", description="Directory path")

class FTPDownloadRequest(BaseModel):
    """FTP download file request"""
    host: str = Field(..., description="Target host IP or hostname")
    port: int = Field(default=21, description="FTP port")
    username: str = Field(..., description="FTP username")
    password: Optional[str] = Field(default=None, description="FTP password")
    path: str = Field(..., description="File path")

class FTPUploadRequest(BaseModel):
    """FTP upload file request"""
    host: str = Field(..., description="Target host IP or hostname")
    port: int = Field(default=21, description="FTP port")
    username: str = Field(..., description="FTP username")
    password: Optional[str] = Field(default=None, description="FTP password")
    path: str = Field(..., description="File path")
    content: str = Field(..., description="File content (base64 encoded if binary)")
    is_binary: bool = Field(default=False, description="Is binary content")
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
async def test_ssh_connection(request: SSHConnectionTest, db: AsyncSession = Depends(get_db)):
    """Test SSH connection to a remote host"""
    try:
        result = await access_hub.test_ssh_connection(
            host=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            key_file=request.key_file
        )
        
        # Log event for SSH connection attempt
        event = Event(
            event_type=EventType.CREDENTIAL_ACCESSED,
            severity=EventSeverity.INFO if result["success"] else EventSeverity.WARNING,
            title="SSH Connection Test",
            description=f"SSH connection test to {request.host} for user {request.username}: {'Success' if result['success'] else 'Failed'}",
            source_ip=request.host,
            event_metadata={"host": request.host, "username": request.username, "success": result["success"]}
        )
        db.add(event)
        await db.commit()
        
        return result
    except Exception as e:
        handle_api_error(e)

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
        handle_api_error(e)

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
        handle_api_error(e)

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
        handle_api_error(e)

@router.get("/scan/services/{host}")
async def scan_common_services(host: str):
    """Scan for common services on a host"""
    try:
        result = await access_hub.scan_common_services(host)
        return result
    except Exception as e:
        handle_api_error(e)

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
        handle_api_error(e)

@router.post("/ftp/list")
async def list_ftp_files(request: FTPListRequest):
    """List files on FTP server"""
    try:
        result = await access_hub.list_ftp_files(
            host=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            path=request.path
        )
        return result
    except Exception as e:
        handle_api_error(e)

@router.post("/ftp/download")
async def download_ftp_file(request: FTPDownloadRequest):
    """Download file from FTP server"""
    try:
        result = await access_hub.download_ftp_file(
            host=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            path=request.path
        )
        return result
    except Exception as e:
        handle_api_error(e)

@router.post("/ftp/upload")
async def upload_ftp_file(request: FTPUploadRequest):
    """Upload file to FTP server"""
    try:
        result = await access_hub.upload_ftp_file(
            host=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            path=request.path,
            content=request.content,
            is_binary=request.is_binary
        )
        return result
    except Exception as e:
        handle_api_error(e)

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
        handle_api_error(e)

@router.get("/connections")
async def get_active_connections():
    """Get active connections"""
    try:
        connections = access_hub.get_active_connections()
        return connections
    except Exception as e:
        handle_api_error(e)

@router.post("/credentials")
async def save_asset_credential(request: dict, db: AsyncSession = Depends(get_db)):
    """Save credentials for an asset"""
    try:
        result = await access_hub.save_credential(db, request)
        return result
    except Exception as e:
        handle_api_error(e)

@router.get("/credentials/{asset_id}/{protocol}")
async def get_asset_credentials(asset_id: str, protocol: str, db: AsyncSession = Depends(get_db)):
    """Get credentials for a specific asset and protocol"""
    try:
        credentials = await access_hub.get_credentials_for_asset(db, asset_id, protocol)
        return {"credentials": credentials}
    except Exception as e:
        handle_api_error(e)

# Test endpoints for the test environment
@router.get("/test-environment/ssh")
async def test_environment_ssh():
    """Test SSH connection to test environment"""
    try:
        result = await access_hub.test_ssh_connection(
            host="172.21.0.69",  # Test SSH server
            port=22,
            username="testuser",
            password="testpassword"
        )
        return result
    except Exception as e:
        handle_api_error(e)

@router.get("/test-environment/services")
async def test_environment_services():
    """Scan services in test environment"""
    try:
        hosts = [
            "172.21.0.42",  # Web
            "172.21.0.69",  # SSH
            "172.21.0.123", # DB
            "172.21.0.200", # File
            "172.21.0.50",  # RDP
            "172.21.0.51",  # VNC
            "172.21.0.52"   # FTP
        ]
        results = []

        for host in hosts:
            result = await access_hub.scan_common_services(host)
            results.append(result)

        return {
            "test_environment": "172.21.0.0/24",
            "hosts_scanned": len(hosts),
            "results": results
        }
    except Exception as e:
        handle_api_error(e)

@router.websocket("/tunnel")
async def guacamole_tunnel(
    websocket: WebSocket,
    host: str,
    port: int,
    protocol: str,
    username: str,
    password: str = None,
    width: int = 1024,
    height: int = 768,
    dpi: int = 96,
    token: Optional[str] = None
):
    import logging
    logger = logging.getLogger(__name__)
    
    # Basic token validation
    if not token:
        logger.warning(f"[ACCESS-TUNNEL] Connection rejected: No token provided")
        await websocket.close(code=1008, reason="Authentication required")
        return

    logger.info(f"[ACCESS-TUNNEL] WebSocket connection request received")
    logger.info(f"[ACCESS-TUNNEL] Protocol: {protocol}, Host: {host}, Port: {port}, User: {username}")
    logger.info(f"[ACCESS-TUNNEL] Screen: {width}x{height}@{dpi}")
    
    # Handle localhost/127.0.0.1 by remapping to configured container names
    import os
    if host in ("localhost", "127.0.0.1"):
        if protocol == "vnc":
            host = os.environ.get("VNC_HOST", "nop-custom-vnc")
            logger.info(f"[ACCESS-TUNNEL] Remapped localhost to {host} for VNC")
        elif protocol == "rdp":
            host = os.environ.get("RDP_HOST", "nop-custom-rdp")
            logger.info(f"[ACCESS-TUNNEL] Remapped localhost to {host} for RDP")
    
    # Handle Guacamole subprotocol if requested
    subprotocol = None
    requested_protocols = websocket.headers.get("sec-websocket-protocol", "")
    if "guacamole" in requested_protocols:
        subprotocol = "guacamole"
        logger.debug(f"[ACCESS-TUNNEL] Accepting with subprotocol: {subprotocol}")
    
    await websocket.accept(subprotocol=subprotocol)
    logger.debug(f"[ACCESS-TUNNEL] WebSocket accepted")
    
    # Get guacd connection details from environment
    guacd_host = os.getenv("GUACD_HOST", "127.0.0.1")
    guacd_port = int(os.getenv("GUACD_PORT", "14822"))
    tunnel = GuacamoleTunnel(guacd_host, guacd_port)
    
    connection_args = {
        "hostname": host,
        "port": str(port),
        "username": username,
        "password": password if password else "",
        "width": str(width),
        "height": str(height),
        "dpi": str(dpi),
        "ignore-cert": "true",
        "security": "any"
    }
    
    logger.debug(f"[ACCESS-TUNNEL] Connection args prepared (password hidden)")
    
    import uuid
    conn_id = str(uuid.uuid4())
    logger.debug(f"[ACCESS-TUNNEL] Connection ID: {conn_id}")
    
    access_hub.add_connection(conn_id, {
        "host": host,
        "port": port,
        "protocol": protocol,
        "username": username
    })
    logger.info(f"[ACCESS-TUNNEL] Connection registered in access hub")

    try:
        logger.info(f"[ACCESS-TUNNEL] Attempting to connect to guacd...")
        if await tunnel.connect(websocket, protocol, connection_args):
            logger.info(f"[ACCESS-TUNNEL] ✓ Successfully connected, starting tunnel relay")
            await tunnel.run()
            logger.info(f"[ACCESS-TUNNEL] Tunnel relay completed")
        else:
            logger.error(f"[ACCESS-TUNNEL] ✗ Failed to connect to guacd")
            await websocket.close(code=1011, reason="Failed to connect to guacd")
    except Exception as e:
        logger.error(f"[ACCESS-TUNNEL] Exception in tunnel: {e}")
        logger.exception("Full exception details:")
        try:
            await websocket.close(code=1011, reason=f"Error: {str(e)}")
        except:
            pass
    finally:
        access_hub.remove_connection(conn_id)
        logger.info(f"[ACCESS-TUNNEL] Connection {conn_id} closed and removed from access hub")


# HTTP Tunnel for environments where WebSocket doesn't work (e.g., Codespaces HTTPS proxy)
# Uses Server-Sent Events for server->client and POST for client->server

from fastapi import Request, Response
from fastapi.responses import StreamingResponse
import uuid as uuid_module

# Store active HTTP tunnel sessions
http_tunnel_sessions = {}

class HTTPTunnelSession:
    def __init__(self, tunnel: GuacamoleTunnel, protocol: str, connection_args: dict):
        self.tunnel = tunnel
        self.protocol = protocol
        self.connection_args = connection_args
        self.connected = False
        self.read_buffer = asyncio.Queue()
        self.last_activity = time.time()
        
    async def connect(self):
        """Connect to guacd"""
        if self.connected:
            return True
        try:
            self.connected = await self.tunnel.connect_http(self.protocol, self.connection_args)
            return self.connected
        except Exception as e:
            logger.error(f"[HTTP-TUNNEL] Connection failed: {e}")
            return False


@router.post("/http-tunnel/connect")
async def http_tunnel_connect(
    host: str,
    port: int,
    protocol: str,
    username: str = "",
    password: str = "",
    width: int = 1024,
    height: int = 768,
    dpi: int = 96
):
    """
    Create a new HTTP tunnel session.
    Returns a session ID to use for read/write operations.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    session_id = str(uuid_module.uuid4())
    logger.info(f"[HTTP-TUNNEL] Creating session {session_id} for {protocol}://{host}:{port}")
    
    # Get guacd connection details from environment
    guacd_host = os.getenv("GUACD_HOST", "127.0.0.1")
    guacd_port = int(os.getenv("GUACD_PORT", "14822"))
    tunnel = GuacamoleTunnel(guacd_host, guacd_port)
    
    connection_args = {
        "hostname": host,
        "port": str(port),
        "username": username,
        "password": password if password else "",
        "width": str(width),
        "height": str(height),
        "dpi": str(dpi),
        "ignore-cert": "true",
        "security": "any"
    }
    
    try:
        connected = await tunnel.connect_http(protocol, connection_args)
        if connected:
            http_tunnel_sessions[session_id] = {
                "tunnel": tunnel,
                "last_activity": time.time()
            }
            logger.info(f"[HTTP-TUNNEL] Session {session_id} connected successfully")
            return {"session_id": session_id, "status": "connected"}
        else:
            logger.error(f"[HTTP-TUNNEL] Failed to connect session {session_id}")
            return Response(content='{"error": "Failed to connect to guacd"}', status_code=500)
    except Exception as e:
        logger.error(f"[HTTP-TUNNEL] Error creating session: {e}")
        return Response(content=f'{{"error": "{str(e)}"}}', status_code=500)


@router.get("/http-tunnel/read/{session_id}")
async def http_tunnel_read(session_id: str):
    """
    Read data from the tunnel using Server-Sent Events.
    This endpoint streams data from guacd to the client.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if session_id not in http_tunnel_sessions:
        return Response(content='{"error": "Session not found"}', status_code=404)
    
    session = http_tunnel_sessions[session_id]
    tunnel = session["tunnel"]
    session["last_activity"] = time.time()
    
    async def generate():
        try:
            while session_id in http_tunnel_sessions:
                data = await tunnel.read_http()
                if data:
                    # Send as SSE format
                    yield f"data: {data}\n\n"
                else:
                    await asyncio.sleep(0.01)
        except Exception as e:
            logger.error(f"[HTTP-TUNNEL] Read error: {e}")
            yield f"event: error\ndata: {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/http-tunnel/write/{session_id}")
async def http_tunnel_write(session_id: str, request: Request):
    """
    Write data to the tunnel.
    Client sends Guacamole instructions via POST body.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if session_id not in http_tunnel_sessions:
        return Response(content='{"error": "Session not found"}', status_code=404)
    
    session = http_tunnel_sessions[session_id]
    tunnel = session["tunnel"]
    session["last_activity"] = time.time()
    
    try:
        body = await request.body()
        data = body.decode('utf-8')
        await tunnel.write_http(data)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"[HTTP-TUNNEL] Write error: {e}")
        return Response(content=f'{{"error": "{str(e)}"}}', status_code=500)


@router.post("/http-tunnel/disconnect/{session_id}")
async def http_tunnel_disconnect(session_id: str):
    """Disconnect and clean up the HTTP tunnel session."""
    import logging
    logger = logging.getLogger(__name__)
    
    if session_id in http_tunnel_sessions:
        session = http_tunnel_sessions.pop(session_id)
        try:
            session["tunnel"].disconnect()
        except:
            pass
        logger.info(f"[HTTP-TUNNEL] Session {session_id} disconnected")
        return {"status": "disconnected"}
    return {"status": "not_found"}

