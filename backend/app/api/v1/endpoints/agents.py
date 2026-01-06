"""
Agent management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from uuid import UUID
import json
import asyncio
import logging
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.agent import Agent, AgentStatus, AgentType
from app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
    AgentGenerateResponse
)
from app.services.agent_service import AgentService
from app.services.agent_data_service import AgentDataService
from app.services.agent_socks_proxy import AgentSOCKSProxy

logger = logging.getLogger(__name__)

router = APIRouter()

# Connected agents tracking
connected_agents = {}
agent_socks_proxies = {}  # agent_id -> AgentSOCKSProxy
SOCKS_PORT_START = 10080
next_socks_port = SOCKS_PORT_START


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


@router.post("/{agent_id}/terminate")
async def terminate_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send terminate command to agent"""
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Send kill command if agent is connected
    agent_id_str = str(agent_id)
    if agent_id_str in connected_agents:
        try:
            websocket = connected_agents[agent_id_str]
            await websocket.send_json({
                "type": "terminate",
                "message": "Shutdown requested by C2"
            })
            return {"status": "terminate_sent", "agent_id": str(agent_id)}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    return {"status": "offline", "message": "Agent not connected"}


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete agent (sends terminate command first if online)"""
    # Try to send terminate command if agent is connected
    agent_id_str = str(agent_id)
    if agent_id_str in connected_agents:
        try:
            websocket = connected_agents[agent_id_str]
            await websocket.send_json({
                "type": "terminate",
                "message": "Agent deleted from C2"
            })
            await asyncio.sleep(0.5)  # Give agent time to process
        except:
            pass  # Continue with deletion even if terminate fails
    
    success = await AgentService.delete_agent(db, agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")


@router.post("/{agent_id}/kill")
async def kill_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Kill agent process and delete from database (forceful termination)"""
    agent_id_str = str(agent_id)
    
    # Forcefully close websocket connection
    if agent_id_str in connected_agents:
        try:
            websocket = connected_agents[agent_id_str]
            await websocket.send_json({
                "type": "kill",
                "message": "Self-destruct command - terminate and delete"
            })
            await websocket.close()
            del connected_agents[agent_id_str]
        except:
            pass
    
    # Clean up SOCKS proxy
    if agent_id_str in agent_socks_proxies:
        try:
            proxy = agent_socks_proxies[agent_id_str]
            proxy.stop()
            del agent_socks_proxies[agent_id_str]
        except:
            pass
    
    # Delete from database
    success = await AgentService.delete_agent(db, agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {"status": "killed", "agent_id": str(agent_id), "message": "Agent terminated and removed"}


@router.post("/kill-all")
async def kill_all_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Kill all agents and remove them from database"""
    agents = await AgentService.get_agents(db)
    killed_count = 0
    
    for agent in agents:
        agent_id_str = str(agent.id)
        
        # Forcefully close websocket
        if agent_id_str in connected_agents:
            try:
                websocket = connected_agents[agent_id_str]
                await websocket.send_json({"type": "terminate", "message": "Mass termination"})
                await websocket.close()
                del connected_agents[agent_id_str]
            except:
                pass
        
        # Clean up SOCKS proxy
        if agent_id_str in agent_socks_proxies:
            try:
                agent_socks_proxies[agent_id_str].stop()
                del agent_socks_proxies[agent_id_str]
            except:
                pass
        
        # Delete from database
        await AgentService.delete_agent(db, agent.id)
        killed_count += 1
    
    return {"status": "success", "killed": killed_count, "message": f"Terminated and removed {killed_count} agents"}


@router.post("/{agent_id}/generate", response_model=AgentGenerateResponse)
async def generate_agent(
    agent_id: UUID,
    platform: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate agent artifact for download
    
    For Go agents:
    - platform: linux-amd64, windows-amd64, darwin-amd64, darwin-arm64, linux-arm64
    - Returns compiled binary (base64 encoded)
    
    For Python agents:
    - platform parameter ignored
    - Returns Python source code
    """
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Generate agent based on type
    if agent.agent_type == AgentType.PYTHON:
        content = AgentService.generate_python_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_')}.py"
        is_binary = False
        actual_platform = None
        
    elif agent.agent_type == AgentType.GO:
        source_code = AgentService.generate_go_agent(agent)
        
        # Default platform if not specified
        if not platform:
            platform = "linux-amd64"
        
        try:
            # Compile to binary
            binary_data = await AgentService.compile_go_agent(
                source_code, 
                platform=platform,
                obfuscate=agent.obfuscate
            )
            
            # Base64 encode binary
            import base64
            content = base64.b64encode(binary_data).decode('utf-8')
            
            # Set filename based on platform
            goos = platform.split('-')[0]
            filename = f"nop_agent_{agent.name.replace(' ', '_')}"
            if goos == "windows":
                filename += ".exe"
            
            is_binary = True
            actual_platform = platform
            
        except Exception as e:
            # Fallback to source code if compilation fails
            print(f"Compilation failed: {e}, falling back to source")
            content = source_code
            filename = f"nop_agent_{agent.name.replace(' ', '_')}.go"
            is_binary = False
            actual_platform = None
    else:
        raise HTTPException(status_code=400, detail="Unknown agent type")
    
    return AgentGenerateResponse(
        agent_id=agent.id,
        agent_type=agent.agent_type,
        content=content,
        filename=filename,
        is_binary=is_binary,
        platform=actual_platform
    )


@router.websocket("/{agent_id}/connect")
async def agent_websocket(
    websocket: WebSocket,
    agent_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for agent connections with SOCKS proxy support"""
    await websocket.accept()
    socks_proxy = None
    
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
        
        # Create SOCKS proxy for this agent
        global next_socks_port
        socks_port = next_socks_port
        next_socks_port += 1
        
        socks_proxy = AgentSOCKSProxy(agent_id, websocket, socks_port)
        await socks_proxy.start()
        agent_socks_proxies[str(agent_id)] = socks_proxy
        
        # Store SOCKS port in agent metadata
        if not agent.agent_metadata:
            agent.agent_metadata = {}
        agent.agent_metadata["socks_proxy_port"] = socks_port
        flag_modified(agent, "agent_metadata")
        await db.commit()
        
        logger.info(f"Agent {agent.name} connected with SOCKS proxy on port {socks_port}")
        
        # Send welcome message
        await websocket.send_json({
            "type": "welcome",
            "message": f"Connected to NOP as agent {agent.name}",
            "timestamp": datetime.utcnow().isoformat(),
            "socks_port": socks_port
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
                    
                    # Extract agent IP and auto-generate /24 network for discovery
                    # Prefer internal network IPs (10.x, 192.168.x) over Docker bridge IPs (172.x)
                    system_info = message.get("system_info", {})
                    agent_ip = system_info.get("ip_address")
                    
                    # Check interfaces for better IP if available (from host_info)
                    host_info = agent.agent_metadata.get("host_info", {})
                    interfaces = host_info.get("interfaces", [])
                    if interfaces:
                        for iface in interfaces:
                            ip = iface.get("ip")
                            if ip and iface.get("status") == "up" and iface.get("name") != "lo":
                                # Prefer 10.x or 192.168.x networks
                                if ip.startswith("10.") or ip.startswith("192.168."):
                                    agent_ip = ip
                                    break
                    
                    if agent_ip:
                        try:
                            import ipaddress
                            ip_obj = ipaddress.ip_address(agent_ip)
                            # Calculate /24 subnet from agent IP
                            network = ipaddress.ip_network(f"{agent_ip}/24", strict=False)
                            default_network = str(network)
                            
                            # Store in settings if not already set
                            if "settings" not in agent.agent_metadata:
                                agent.agent_metadata["settings"] = {}
                            if "discovery" not in agent.agent_metadata["settings"]:
                                agent.agent_metadata["settings"]["discovery"] = {}
                            
                            # Set default network range from agent's subnet (always update to preferred IP)
                            agent.agent_metadata["settings"]["discovery"]["network_range"] = default_network
                            logger.info(f"Auto-configured discovery network {default_network} from agent IP {agent_ip}")
                            
                            # Store agent IP for reference
                            agent.agent_metadata["agent_ip"] = agent_ip
                            flag_modified(agent, "agent_metadata")
                            await db.commit()
                        except Exception as e:
                            logger.warning(f"Could not parse agent IP {agent_ip}: {e}")
                    
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
                    
                    # Store host_info in agent_metadata for POV interface access
                    if host_info and agent:
                        if not agent.agent_metadata:
                            agent.agent_metadata = {}
                        agent.agent_metadata["host_info"] = host_info
                        await db.commit()
                    
                elif msg_type == "pong":
                    # Pong response
                    pass
                
                # SOCKS proxy messages
                elif msg_type in ["socks_connected", "socks_data", "socks_error", "socks_close"]:
                    if socks_proxy:
                        await socks_proxy.handle_agent_message(message)
                    
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
        
        if socks_proxy:
            await socks_proxy.stop()
            if str(agent_id) in agent_socks_proxies:
                del agent_socks_proxies[str(agent_id)]
        
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
    socks_proxy_port = None
    if agent.agent_metadata:
        socks_proxy_port = agent.agent_metadata.get("socks_proxy_port")
    
    return {
        "agent_id": agent_id,
        "status": agent.status,
        "is_connected": is_connected,
        "last_seen": agent.last_seen,
        "connected_at": agent.connected_at,
        "socks_proxy_port": socks_proxy_port
    }


@router.websocket("/ws")
async def agent_websocket_endpoint(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for agent connections - supports SOCKS proxy"""
    
    await websocket.accept()
    agent_id = None
    socks_proxy = None
    
    try:
        # Wait for registration
        data = await websocket.receive_text()
        message = json.loads(data)
        
        if message.get("type") != "register":
            await websocket.close(code=1008, reason="Expected register message")
            return
        
        agent_id_str = message.get("agent_id")
        auth_token = message.get("auth_token")
        
        if not agent_id_str or not auth_token:
            await websocket.close(code=1008, reason="Missing credentials")
            return
        
        agent_id = UUID(agent_id_str)
        agent = await AgentService.get_agent(db, agent_id)
        
        if not agent or agent.auth_token != auth_token:
            await websocket.close(code=1008, reason="Invalid credentials")
            return
        
        # Update agent status
        await AgentService.update_agent_status(db, agent_id, AgentStatus.ONLINE)
        connected_agents[agent_id_str] = websocket
        
        # Create SOCKS proxy for this agent
        global next_socks_port
        socks_port = next_socks_port
        next_socks_port += 1
        
        socks_proxy = AgentSOCKSProxy(agent_id, websocket, socks_port)
        await socks_proxy.start()
        agent_socks_proxies[agent_id_str] = socks_proxy
        
        # Store SOCKS port in agent metadata
        if not agent.agent_metadata:
            agent.agent_metadata = {}
        agent.agent_metadata["socks_proxy_port"] = socks_port
        
        # Extract agent IP and auto-generate /24 network for discovery
        system_info = message.get("system_info", {})
        agent_ip = system_info.get("ip_address")
        logger.info(f"Agent registration - system_info: {system_info}, agent_ip: {agent_ip}")
        if agent_ip:
            try:
                import ipaddress
                ip_obj = ipaddress.ip_address(agent_ip)
                # Calculate /24 subnet from agent IP
                network = ipaddress.ip_network(f"{agent_ip}/24", strict=False)
                default_network = str(network)
                logger.info(f"Calculated network {default_network} from IP {agent_ip}")
                
                # Store in settings if not already set
                if "settings" not in agent.agent_metadata:
                    agent.agent_metadata["settings"] = {}
                if "discovery" not in agent.agent_metadata["settings"]:
                    agent.agent_metadata["settings"]["discovery"] = {}
                
                # Set default network range from agent's subnet
                if not agent.agent_metadata["settings"]["discovery"].get("network_range"):
                    agent.agent_metadata["settings"]["discovery"]["network_range"] = default_network
                    logger.info(f"Auto-configured discovery network {default_network} from agent IP {agent_ip}")
                
                # Store agent IP for reference
                agent.agent_metadata["agent_ip"] = agent_ip
            except Exception as e:
                logger.warning(f"Could not parse agent IP {agent_ip}: {e}")
        
        flag_modified(agent, "agent_metadata")  # Tell SQLAlchemy JSON was modified
        await db.commit()
        
        logger.info(f"Agent {agent.name} connected with SOCKS proxy on port {socks_port}")
        
        # Send registration confirmation
        await websocket.send_json({
            "type": "registered",
            "status": "success",
            "socks_port": socks_port
        })
        
        # Message loop
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "heartbeat":
                await AgentService.update_agent_status(
                    db, agent_id, AgentStatus.ONLINE, update_last_seen=True
                )
            
            elif msg_type == "asset_data":
                assets = message.get('assets', [])
                if assets:
                    await AgentDataService.process_assets(db, agent_id, assets)
            
            elif msg_type == "traffic_data":
                traffic = message.get('traffic', [])
                if traffic:
                    await AgentDataService.process_traffic(db, agent_id, traffic)
            
            elif msg_type == "host_data":
                host_info = message.get('host_info')
                if host_info:
                    agent.agent_metadata["host_info"] = host_info
                    agent.agent_metadata["last_host_update"] = datetime.utcnow().isoformat()
                    await db.commit()
            
            # SOCKS proxy messages
            elif msg_type in ["socks_connected", "socks_data", "socks_error", "socks_close"]:
                if socks_proxy:
                    await socks_proxy.handle_agent_message(message)
    
    except WebSocketDisconnect:
        logger.info(f"Agent {agent_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for agent {agent_id}: {e}")
    finally:
        # Cleanup
        if agent_id:
            agent_id_str = str(agent_id)
            if agent_id_str in connected_agents:
                del connected_agents[agent_id_str]
            
            if socks_proxy:
                await socks_proxy.stop()
                if agent_id_str in agent_socks_proxies:
                    del agent_socks_proxies[agent_id_str]
            
            # Update agent status
            try:
                await AgentService.update_agent_status(db, agent_id, AgentStatus.OFFLINE)
            except:
                pass
