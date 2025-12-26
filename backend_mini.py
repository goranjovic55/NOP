#!/usr/bin/env python3
"""
Minimal backend server for demonstrating VNC connection
This runs without Docker to avoid network/SSL issues
"""

import sys
import os

# Add the app directory to path
sys.path.insert(0, '/home/runner/work/NOP/NOP/backend')

print("Installing minimal dependencies...")
os.system("pip3 install --quiet fastapi uvicorn websockets paramiko 2>&1 | grep -v 'Requirement already satisfied' || true")

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio

# Import our guacamole service
from app.services.guacamole import GuacamoleTunnel

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple connection tracking
active_connections = {}

@app.get("/")
async def root():
    return {"status": "ok", "message": "NOP Backend Mini - VNC Demo"}

@app.get("/api/v1/access/status")
async def get_status():
    return {
        "status": "active",
        "active_connections": len(active_connections),
        "services": ["VNC"]
    }

@app.post("/api/v1/auth/login")
async def login(request: dict):
    # Simple mock authentication for demo
    username = request.get("username", "")
    password = request.get("password", "")
    
    if username == "admin" and password == "admin123":
        return {
            "access_token": "demo_token_12345",
            "token_type": "bearer",
            "user": {
                "username": "admin",
                "email": "admin@nop.local",
                "role": "admin"
            }
        }
    return {"detail": "Invalid credentials"}, 401

@app.websocket("/api/v1/access/tunnel")
async def guacamole_tunnel(
    websocket: WebSocket,
    host: str,
    port: int,
    protocol: str,
    username: str = "",
    password: str = "",
    width: int = 1024,
    height: int = 768,
    dpi: int = 96
):
    import logging
    import uuid
    
    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.DEBUG)
    
    logger.info(f"[ACCESS-TUNNEL] WebSocket connection request received")
    logger.info(f"[ACCESS-TUNNEL] Protocol: {protocol}, Host: {host}, Port: {port}")
    
    await websocket.accept()
    logger.debug(f"[ACCESS-TUNNEL] WebSocket accepted")
    
    # Get guacd container IP - it's on the same network
    import subprocess
    result = subprocess.run(
        ["docker", "network", "inspect", "nop_nop-internal", 
         "--format", "{{range .Containers}}{{if eq .Name \"nop-guacd-1\"}}{{.IPv4Address}}{{end}}{{end}}"],
        capture_output=True,
        text=True
    )
    guacd_ip = result.stdout.strip().split('/')[0]
    logger.info(f"[ACCESS-TUNNEL] guacd IP: {guacd_ip}")
    
    tunnel = GuacamoleTunnel(guacd_ip, 4822)
    
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
    
    conn_id = str(uuid.uuid4())
    active_connections[conn_id] = {"host": host, "protocol": protocol}
    logger.info(f"[ACCESS-TUNNEL] Connection {conn_id} registered")

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
        if conn_id in active_connections:
            del active_connections[conn_id]
        logger.info(f"[ACCESS-TUNNEL] Connection {conn_id} closed")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*80)
    print("Starting NOP Backend Mini Server for VNC Demo")
    print("="*80)
    print("Server will be available at: http://localhost:8000")
    print("WebSocket tunnel at: ws://localhost:8000/api/v1/access/tunnel")
    print("="*80 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
