"""
Workflow Execution WebSocket Handler

Provides real-time execution updates to connected clients.
"""

import asyncio
import json
import logging
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

from ..services.workflow_executor import ExecutionState


logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for workflow execution updates."""
    
    def __init__(self):
        # execution_id -> set of connected websockets
        self._connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> set of subscribed execution_ids
        self._subscriptions: Dict[WebSocket, Set[str]] = {}
        # All connections (for broadcasting)
        self._all_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, execution_id: Optional[str] = None) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self._all_connections.add(websocket)
        self._subscriptions[websocket] = set()
        
        if execution_id:
            await self.subscribe(websocket, execution_id)
        
        logger.info(f"WebSocket connected, execution_id={execution_id}")
    
    def disconnect(self, websocket: WebSocket) -> None:
        """Handle WebSocket disconnection."""
        # Remove from all execution subscriptions
        subscriptions = self._subscriptions.pop(websocket, set())
        for exec_id in subscriptions:
            if exec_id in self._connections:
                self._connections[exec_id].discard(websocket)
                if not self._connections[exec_id]:
                    del self._connections[exec_id]
        
        self._all_connections.discard(websocket)
        logger.info("WebSocket disconnected")
    
    async def subscribe(self, websocket: WebSocket, execution_id: str) -> None:
        """Subscribe a websocket to execution updates."""
        if execution_id not in self._connections:
            self._connections[execution_id] = set()
        
        self._connections[execution_id].add(websocket)
        self._subscriptions[websocket].add(execution_id)
        
        await self._send_json(websocket, {
            "type": "subscribed",
            "executionId": execution_id,
            "timestamp": datetime.utcnow().isoformat(),
        })
    
    async def unsubscribe(self, websocket: WebSocket, execution_id: str) -> None:
        """Unsubscribe a websocket from execution updates."""
        if execution_id in self._connections:
            self._connections[execution_id].discard(websocket)
        
        if websocket in self._subscriptions:
            self._subscriptions[websocket].discard(execution_id)
        
        await self._send_json(websocket, {
            "type": "unsubscribed",
            "executionId": execution_id,
            "timestamp": datetime.utcnow().isoformat(),
        })
    
    async def send_to_execution(self, execution_id: str, message: Dict[str, Any]) -> None:
        """Send a message to all subscribers of an execution."""
        if execution_id not in self._connections:
            return
        
        message["timestamp"] = datetime.utcnow().isoformat()
        
        dead_connections = []
        for websocket in self._connections[execution_id]:
            try:
                await self._send_json(websocket, message)
            except Exception as e:
                logger.error(f"Error sending to websocket: {e}")
                dead_connections.append(websocket)
        
        # Clean up dead connections
        for ws in dead_connections:
            self.disconnect(ws)
    
    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Broadcast a message to all connected clients."""
        message["timestamp"] = datetime.utcnow().isoformat()
        
        dead_connections = []
        for websocket in self._all_connections:
            try:
                await self._send_json(websocket, message)
            except Exception as e:
                logger.error(f"Error broadcasting to websocket: {e}")
                dead_connections.append(websocket)
        
        # Clean up dead connections
        for ws in dead_connections:
            self.disconnect(ws)
    
    async def _send_json(self, websocket: WebSocket, data: Dict[str, Any]) -> None:
        """Send JSON data to a websocket."""
        await websocket.send_json(data)
    
    def get_subscriber_count(self, execution_id: str) -> int:
        """Get the number of subscribers for an execution."""
        return len(self._connections.get(execution_id, set()))
    
    def get_total_connections(self) -> int:
        """Get the total number of connected clients."""
        return len(self._all_connections)


# Global connection manager instance
connection_manager = ConnectionManager()


async def execution_event_handler(event_type: str, data: Dict[str, Any]) -> None:
    """
    Event handler to be passed to WorkflowExecutor.
    Forwards execution events to WebSocket subscribers.
    """
    execution_id = data.get("executionId")
    if not execution_id:
        return
    
    message = {
        "type": event_type,
        **data,
    }
    
    await connection_manager.send_to_execution(execution_id, message)


async def handle_websocket_connection(
    websocket: WebSocket,
    execution_id: Optional[str] = None
) -> None:
    """
    Handle a WebSocket connection for execution updates.
    
    Protocol:
    - Client can send: { "action": "subscribe", "executionId": "..." }
    - Client can send: { "action": "unsubscribe", "executionId": "..." }
    - Server sends: execution events as they happen
    """
    await connection_manager.connect(websocket, execution_id)
    
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_json()
            
            action = data.get("action")
            exec_id = data.get("executionId")
            
            if action == "subscribe" and exec_id:
                await connection_manager.subscribe(websocket, exec_id)
            
            elif action == "unsubscribe" and exec_id:
                await connection_manager.unsubscribe(websocket, exec_id)
            
            elif action == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat(),
                })
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown action: {action}",
                })
    
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket)
