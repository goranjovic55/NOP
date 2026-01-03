"""
Agent management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
import json
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.agent import AgentStatus, AgentType
from app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
    AgentGenerateResponse
)
from app.services.agent_service import AgentService
from app.services.agent_data_service import AgentDataService

router = APIRouter()

# Connected agents tracking
connected_agents = {}


@router.get("/", response_model=AgentListResponse)
async def list_agents(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all agents"""
    agents = await AgentService.get_agents(db, skip=skip, limit=limit)
    return AgentListResponse(
        agents=[AgentResponse.model_validate(agent) for agent in agents],
        total=len(agents)
    )


@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_data: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new agent"""
    agent = await AgentService.create_agent(db, agent_data)
    return AgentResponse.model_validate(agent)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agent by ID"""
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse.model_validate(agent)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent_data: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update agent"""
    agent = await AgentService.update_agent(db, agent_id, agent_data)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse.model_validate(agent)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete agent"""
    success = await AgentService.delete_agent(db, agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")


@router.post("/{agent_id}/generate", response_model=AgentGenerateResponse)
async def generate_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate agent artifact for download"""
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Generate agent based on type
    if agent.agent_type == AgentType.PYTHON:
        content = AgentService.generate_python_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_')}.py"
    elif agent.agent_type == AgentType.GO:
        content = AgentService.generate_go_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_')}.go"
    else:
        raise HTTPException(status_code=400, detail="Unknown agent type")
    
    return AgentGenerateResponse(
        agent_id=agent.id,
        agent_type=agent.agent_type,
        content=content,
        filename=filename
    )


@router.websocket("/{agent_id}/connect")
async def agent_websocket(
    websocket: WebSocket,
    agent_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for agent connections"""
    await websocket.accept()
    
    try:
        # Get agent
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            await websocket.close(code=1008, reason="Agent not found")
            return
        
        # Verify auth token (should be in headers)
        # In real implementation, validate token from headers
        
        # Update agent status
        await AgentService.update_agent_status(db, agent_id, AgentStatus.ONLINE)
        connected_agents[str(agent_id)] = websocket
        
        # Send welcome message
        await websocket.send_json({
            "type": "welcome",
            "message": f"Connected to NOP as agent {agent.name}",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Message loop
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                msg_type = message.get("type")
                
                if msg_type == "register":
                    # Agent registration
                    print(f"Agent {agent.name} registered: {message}")
                    await websocket.send_json({
                        "type": "registered",
                        "status": "success"
                    })
                    
                elif msg_type == "heartbeat":
                    # Update last seen
                    await AgentService.update_agent_status(
                        db, agent_id, AgentStatus.ONLINE, update_last_seen=True
                    )
                    
                elif msg_type == "asset_data":
                    # Handle discovered assets
                    assets = message.get('assets', [])
                    count = await AgentDataService.ingest_asset_data(db, agent_id, assets)
                    print(f"Agent {agent.name} discovered {count} assets")
                    await websocket.send_json({
                        "type": "asset_ack",
                        "count": count,
                        "status": "success"
                    })
                    
                elif msg_type == "traffic_data":
                    # Handle traffic statistics
                    traffic = message.get('traffic', {})
                    success = await AgentDataService.ingest_traffic_data(db, agent_id, traffic)
                    print(f"Agent {agent.name} traffic data: {success}")
                    
                elif msg_type == "host_data":
                    # Handle host information
                    host_info = message.get('host', {})
                    success = await AgentDataService.ingest_host_data(db, agent_id, host_info)
                    print(f"Agent {agent.name} host data: {success}")
                    
                elif msg_type == "pong":
                    # Pong response
                    pass
                    
            except json.JSONDecodeError:
                print(f"Invalid JSON from agent {agent.name}")
                
    except WebSocketDisconnect:
        print(f"Agent {agent.name} disconnected")
    except Exception as e:
        print(f"WebSocket error for agent {agent.name}: {e}")
    finally:
        # Cleanup
        if str(agent_id) in connected_agents:
            del connected_agents[str(agent_id)]
        await AgentService.update_agent_status(db, agent_id, AgentStatus.OFFLINE, update_last_seen=True)
        await websocket.close()


@router.get("/download/{download_token}")
async def download_agent_by_token(
    download_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Download agent by token (no auth required for remote deployment)"""
    from sqlalchemy import select
    
    # Find agent by download token
    result = await db.execute(
        select(Agent).where(Agent.download_token == download_token)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Invalid download token")
    
    # Generate agent based on type
    if agent.agent_type == AgentType.PYTHON:
        content = AgentService.generate_python_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_').lower()}.py"
        media_type = "text/x-python"
    elif agent.agent_type == AgentType.GO:
        content = AgentService.generate_go_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_').lower()}.go"
        media_type = "text/x-go"
    else:
        raise HTTPException(status_code=400, detail="Unknown agent type")
    
    return Response(
        content=content.encode('utf-8'),
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/{agent_id}/status")
async def get_agent_status(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agent connection status"""
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    is_connected = str(agent_id) in connected_agents
    
    return {
        "agent_id": agent_id,
        "status": agent.status,
        "is_connected": is_connected,
        "last_seen": agent.last_seen,
        "connected_at": agent.connected_at
    }
