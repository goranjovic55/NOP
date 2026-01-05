"""
Agent-specific settings endpoints

Each agent can have its own configuration stored in agent_metadata['settings']
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from typing import Dict, Any
from uuid import UUID

from app.core.database import get_db
from app.core.pov_middleware import get_agent_pov
from app.services.agent_service import AgentService
from pydantic import BaseModel

router = APIRouter()


class AgentSettingsUpdate(BaseModel):
    """Agent-specific settings - full settings structure"""
    discovery_interface: str | None = None
    discovery_enabled: bool | None = None
    scan_interval: int | None = None
    traffic_capture: bool | None = None
    custom_networks: list[str] | None = None
    # Full settings support
    scan: Dict[str, Any] | None = None
    discovery: Dict[str, Any] | None = None
    access: Dict[str, Any] | None = None
    system: Dict[str, Any] | None = None


@router.get("/{agent_id}/settings")
async def get_agent_settings(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get settings for a specific agent"""
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get settings from agent_metadata
    if agent.agent_metadata and "settings" in agent.agent_metadata:
        return agent.agent_metadata["settings"]
    
    # Return default settings (full structure for Settings page)
    return {
        "discovery_interface": "auto",
        "discovery_enabled": True,
        "scan_interval": 300,
        "traffic_capture": True,
        "custom_networks": [],
        "scan": {
            "port_scan_enabled": True,
            "port_scan_type": "quick",
            "vuln_scan_enabled": True,
            "max_concurrent_scans": 5
        },
        "discovery": {
            "discovery_enabled": True,
            "discovery_method": "arp",
            "network_range": "",
            "discovery_interval": 300,
            "interface_name": "",
            "passive_discovery": False,
            "track_source_only": False
        },
        "access": {
            "session_timeout": 3600,
            "enable_credential_vault": True
        },
        "system": {
            "timezone": "UTC",
            "enable_caching": True,
            "enable_notifications": False
        }
    }


@router.put("/{agent_id}/settings")
async def update_agent_settings(
    agent_id: UUID,
    settings: AgentSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update settings for a specific agent"""
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Initialize agent_metadata if needed
    if not agent.agent_metadata:
        agent.agent_metadata = {}
    
    # Get current settings or create new
    if "settings" not in agent.agent_metadata:
        agent.agent_metadata["settings"] = {}
    
    # Update only provided fields
    updates = settings.dict(exclude_unset=True)
    agent.agent_metadata["settings"].update(updates)
    
    # Mark as modified for SQLAlchemy
    flag_modified(agent, "agent_metadata")
    await db.commit()
    
    # Send settings update to connected agent
    from app.api.v1.endpoints.agents import connected_agents
    agent_id_str = str(agent_id)
    if agent_id_str in connected_agents:
        try:
            websocket = connected_agents[agent_id_str]
            await websocket.send_json({
                "type": "settings_update",
                "settings": agent.agent_metadata["settings"]
            })
        except:
            pass  # Agent will sync on next heartbeat
    
    return agent.agent_metadata["settings"]


@router.get("/current/settings")
async def get_current_agent_settings(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get settings for the current agent POV (convenience endpoint)"""
    agent_pov = get_agent_pov(request)
    if not agent_pov:
        raise HTTPException(status_code=400, detail="No agent POV active")
    
    agent_id = UUID(agent_pov)
    return await get_agent_settings(agent_id, db)


@router.put("/current/settings")
async def update_current_agent_settings(
    request: Request,
    settings: AgentSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update settings for the current agent POV (convenience endpoint)"""
    agent_pov = get_agent_pov(request)
    if not agent_pov:
        raise HTTPException(status_code=400, detail="No agent POV active")
    
    agent_id = UUID(agent_pov)
    return await update_agent_settings(agent_id, settings, db)
