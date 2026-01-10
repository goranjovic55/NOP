"""
WebSocket router for real-time communication
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Optional
import json
import asyncio
from app.api.v1.websockets.exploit import router as exploit_ws_router
from app.api.websocket import handle_websocket_connection

websocket_router = APIRouter()

# Include exploit WebSocket routes
websocket_router.include_router(exploit_ws_router)

# Store active connections
active_connections: list[WebSocket] = []


async def connect_websocket(websocket: WebSocket):
    """Accept WebSocket connection"""
    await websocket.accept()
    active_connections.append(websocket)


def disconnect_websocket(websocket: WebSocket):
    """Remove WebSocket connection"""
    if websocket in active_connections:
        active_connections.remove(websocket)


async def broadcast_message(message: dict):
    """Broadcast message to all connected clients"""
    if active_connections:
        message_str = json.dumps(message)
        for connection in active_connections.copy():
            try:
                await connection.send_text(message_str)
            except:
                # Remove disconnected clients
                disconnect_websocket(connection)


@websocket_router.websocket("/topology")
async def topology_websocket(websocket: WebSocket):
    """WebSocket endpoint for topology updates"""
    await connect_websocket(websocket)
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Echo back for now (implement topology logic later)
            await websocket.send_text(json.dumps({
                "type": "topology_update",
                "data": {"nodes": [], "edges": []}
            }))
            
    except WebSocketDisconnect:
        disconnect_websocket(websocket)


@websocket_router.websocket("/events")
async def events_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time events"""
    await connect_websocket(websocket)
    try:
        while True:
            # Send periodic updates
            await asyncio.sleep(5)
            await websocket.send_text(json.dumps({
                "type": "system_status",
                "data": {
                    "timestamp": "2025-12-24T16:00:00Z",
                    "status": "healthy",
                    "active_scans": 0,
                    "discovered_assets": 0
                }
            }))
            
    except WebSocketDisconnect:
        disconnect_websocket(websocket)


@websocket_router.websocket("/workflow/execution")
async def workflow_execution_websocket(websocket: WebSocket, execution_id: Optional[str] = None):
    """
    WebSocket endpoint for workflow execution updates.
    
    Connect with optional execution_id to subscribe immediately.
    Send { "action": "subscribe", "executionId": "..." } to subscribe to updates.
    """
    await handle_websocket_connection(websocket, execution_id)