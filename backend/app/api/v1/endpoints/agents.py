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
    AgentGenerateResponse,
    AgentSourceResponse
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
    templates_only: bool = False,
    deployed_only: bool = False,
    template_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List agents with optional filtering
    
    - templates_only: Only return agent templates (is_template=True)
    - deployed_only: Only return deployed agents (is_template=False)
    - template_id: Filter deployed agents by their parent template
    """
    agents = await AgentService.get_agents(
        db, 
        skip=skip, 
        limit=limit,
        templates_only=templates_only,
        deployed_only=deployed_only,
        template_id=template_id
    )
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


@router.get("/{agent_id}/source", response_model=AgentSourceResponse)
async def get_agent_source(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agent source code (never compiled, always returns readable source)"""
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent.agent_type == AgentType.PYTHON:
        source_code = AgentService.generate_python_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_').lower()}.py"
        language = "python"
    elif agent.agent_type == AgentType.GO:
        source_code = AgentService.generate_go_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_').lower()}.go"
        language = "go"
    else:
        raise HTTPException(status_code=400, detail="Unknown agent type")
    
    return AgentSourceResponse(
        agent_id=agent.id,
        agent_type=agent.agent_type,
        source_code=source_code,
        filename=filename,
        language=language
    )


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


@router.get("/{agent_id}/source", response_model=AgentSourceResponse)
async def get_agent_source(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agent source code (never compiled)
    
    Returns the plain text source code for viewing, editing, or manual compilation.
    For Go agents, this returns the .go source file.
    For Python agents, this returns the .py script.
    """
    agent = await AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Generate source code based on type
    if agent.agent_type == AgentType.PYTHON:
        source_code = AgentService.generate_python_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_')}.py"
        language = "python"
        
    elif agent.agent_type == AgentType.GO:
        source_code = AgentService.generate_go_agent(agent)
        filename = f"nop_agent_{agent.name.replace(' ', '_')}.go"
        language = "go"
    else:
        raise HTTPException(status_code=400, detail="Unknown agent type")
    
    return AgentSourceResponse(
        agent_id=agent.id,
        agent_type=agent.agent_type,
        source_code=source_code,
        filename=filename,
        language=language
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
    deployed_agent = None
    
    try:
        # Get agent (could be template or deployed agent)
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            await websocket.close(code=1008, reason="Agent not found")
            return
        
        # Check if this is a template - if so, create a deployed agent instance
        if agent.is_template:
            # Create deployed agent from template
            deployed_agent = await AgentService.create_deployed_agent(db, agent)
            logger.info(f"Created deployed agent {deployed_agent.name} from template {agent.name}")
            # Use the deployed agent for this session
            working_agent = deployed_agent
        else:
            # Already a deployed agent, reuse it
            working_agent = agent
        
        # Verify auth token (should be in headers)
        # In real implementation, validate token from headers
        
        # Update agent status
        await AgentService.update_agent_status(db, working_agent.id, AgentStatus.ONLINE)
        connected_agents[str(working_agent.id)] = websocket
        
        # Create SOCKS proxy for this agent
        global next_socks_port
        socks_port = next_socks_port
        next_socks_port += 1
        
        socks_proxy = AgentSOCKSProxy(working_agent.id, websocket, socks_port)
        await socks_proxy.start()
        agent_socks_proxies[str(working_agent.id)] = socks_proxy
        
        # Store SOCKS port in agent metadata
        if not working_agent.agent_metadata:
            working_agent.agent_metadata = {}
        working_agent.agent_metadata["socks_proxy_port"] = socks_port
        flag_modified(working_agent, "agent_metadata")
        await db.commit()
        
        logger.info(f"Agent {working_agent.name} connected with SOCKS proxy on port {socks_port}")
        
        # Send welcome message
        await websocket.send_json({
            "type": "welcome",
            "message": f"Connected to NOP as agent {working_agent.name}",
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
                    # Agent registration - capture hostname if provided
                    system_info = message.get("system_info", {})
                    hostname = system_info.get("hostname", system_info.get("computer_name", ""))
                    
                    # Update deployed agent with hostname
                    if hostname and not working_agent.hostname:
                        working_agent.hostname = hostname
                        # Update name to include hostname for identification
                        template_name = agent.name if agent.is_template else (working_agent.name.split("@")[0] if "@" in working_agent.name else working_agent.name)
                        working_agent.name = f"{template_name}@{hostname}"
                        await db.commit()
                    
                    print(f"Agent {working_agent.name} registered: {message}")
                    
                    # Extract agent IP and auto-generate /24 network for discovery
                    # Prefer internal network IPs (10.x, 192.168.x) over Docker bridge IPs (172.x)
                    agent_ip = system_info.get("ip_address")
                    
                    # Check interfaces for better IP if available (from host_info)
                    host_info = working_agent.agent_metadata.get("host_info", {}) if working_agent.agent_metadata else {}
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
                            if "settings" not in working_agent.agent_metadata:
                                working_agent.agent_metadata["settings"] = {}
                            if "discovery" not in working_agent.agent_metadata["settings"]:
                                working_agent.agent_metadata["settings"]["discovery"] = {}
                            
                            # Set default network range from agent's subnet (always update to preferred IP)
                            working_agent.agent_metadata["settings"]["discovery"]["network_range"] = default_network
                            logger.info(f"Auto-configured discovery network {default_network} from agent IP {agent_ip}")
                            
                            # Store agent IP for reference
                            working_agent.agent_metadata["agent_ip"] = agent_ip
                            flag_modified(working_agent, "agent_metadata")
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
                        db, working_agent.id, AgentStatus.ONLINE, update_last_seen=True
                    )
                    
                elif msg_type == "asset_data":
                    # Handle discovered assets
                    assets = message.get('assets', [])
                    count = await AgentDataService.ingest_asset_data(db, working_agent.id, assets)
                    print(f"Agent {working_agent.name} discovered {count} assets")
                    await websocket.send_json({
                        "type": "asset_ack",
                        "count": count,
                        "status": "success"
                    })
                    
                elif msg_type == "traffic_data":
                    # Handle traffic statistics and flows
                    traffic = message.get('traffic', {})
                    # Include flows in traffic data for ingest
                    if 'flows' in message:
                        traffic['flows'] = message.get('flows', [])
                    success = await AgentDataService.ingest_traffic_data(db, working_agent.id, traffic)
                    print(f"Agent {working_agent.name} traffic data: {success}")
                    
                elif msg_type == "host_data":
                    # Handle host information
                    host_info = message.get('host', {})
                    success = await AgentDataService.ingest_host_data(db, working_agent.id, host_info)
                    print(f"Agent {working_agent.name} host data: {success}")
                    
                    # Store host_info in agent_metadata for POV interface access
                    if host_info and working_agent:
                        if not working_agent.agent_metadata:
                            working_agent.agent_metadata = {}
                        working_agent.agent_metadata["host_info"] = host_info
                        await db.commit()
                    
                elif msg_type == "pong":
                    # Pong response
                    pass
                
                # SOCKS proxy messages
                elif msg_type in ["socks_connected", "socks_data", "socks_error", "socks_close"]:
                    if socks_proxy:
                        await socks_proxy.handle_agent_message(message)
                
                # Terminal output from agent - relay to user websocket
                elif msg_type == "terminal_output":
                    from app.api.v1.endpoints.host import agent_terminal_sessions
                    session_id = message.get("session_id")
                    if session_id and session_id in agent_terminal_sessions:
                        user_ws = agent_terminal_sessions[session_id]["user_ws"]
                        try:
                            data = message.get("data", "")
                            is_binary = message.get("is_binary", False)
                            if is_binary:
                                import base64
                                await user_ws.send_bytes(base64.b64decode(data))
                            else:
                                await user_ws.send_text(data)
                        except Exception as e:
                            logger.error(f"Error relaying terminal output: {e}")
                
                # Filesystem response from agent
                elif msg_type == "filesystem_response":
                    from app.api.v1.endpoints.host import browse_filesystem
                    request_id = message.get("request_id")
                    if hasattr(browse_filesystem, '_pending_requests') and request_id in browse_filesystem._pending_requests:
                        future = browse_filesystem._pending_requests[request_id]
                        if not future.done():
                            future.set_result(message.get("data", {
                                "current_path": "/",
                                "parent_path": None,
                                "items": []
                            }))
                    
            except json.JSONDecodeError:
                print(f"Invalid JSON from agent {working_agent.name}")
                
    except WebSocketDisconnect:
        print(f"Agent {working_agent.name if working_agent else agent.name} disconnected")
    except Exception as e:
        print(f"WebSocket error for agent {working_agent.name if working_agent else agent.name}: {e}")
    finally:
        # Cleanup - use working_agent.id if available
        cleanup_agent_id = str(working_agent.id) if working_agent else str(agent_id)
        
        if cleanup_agent_id in connected_agents:
            del connected_agents[cleanup_agent_id]
        
        if socks_proxy:
            await socks_proxy.stop()
            if cleanup_agent_id in agent_socks_proxies:
                del agent_socks_proxies[cleanup_agent_id]
        
        if working_agent:
            await AgentService.update_agent_status(db, working_agent.id, AgentStatus.OFFLINE, update_last_seen=True)
        await websocket.close()


@router.get("/download/{download_token}")
async def download_agent_by_token(
    download_token: str,
    platform: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Download agent by token (no auth required for remote deployment)
    
    For Go agents, pass platform query param to get compiled binary:
    - platform=linux-amd64 (default)
    - platform=windows-amd64
    - platform=darwin-amd64
    - platform=linux-arm64
    
    Without platform param, returns source code.
    """
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
        return Response(
            content=content.encode('utf-8'),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    elif agent.agent_type == AgentType.GO:
        source_code = AgentService.generate_go_agent(agent)
        
        # If platform specified, compile to binary
        if platform:
            try:
                binary_data = await AgentService.compile_go_agent(
                    source_code,
                    platform=platform,
                    obfuscate=agent.obfuscate
                )
                
                # Set filename based on platform
                goos = platform.split('-')[0]
                filename = f"nop_agent_{agent.name.replace(' ', '_').lower()}"
                if goos == "windows":
                    filename += ".exe"
                
                return Response(
                    content=binary_data,
                    media_type="application/octet-stream",
                    headers={
                        "Content-Disposition": f"attachment; filename={filename}"
                    }
                )
            except Exception as e:
                # Log error and fall back to source
                import logging
                logging.getLogger(__name__).error(f"Compilation failed: {e}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Compilation failed: {str(e)}. Use without platform param for source code."
                )
        
        # No platform specified - return source code
        filename = f"nop_agent_{agent.name.replace(' ', '_').lower()}.go"
        media_type = "text/x-go"
        return Response(
            content=source_code.encode('utf-8'),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    else:
        raise HTTPException(status_code=400, detail="Unknown agent type")


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
            logger.info(f"Agent {agent.name} received message type: {msg_type}")
            
            if msg_type == "heartbeat":
                await AgentService.update_agent_status(
                    db, agent_id, AgentStatus.ONLINE, update_last_seen=True
                )
            
            elif msg_type == "asset_data":
                assets = message.get('assets', [])
                if assets:
                    await AgentDataService.ingest_asset_data(db, agent_id, assets)
            
            elif msg_type == "traffic_data":
                traffic = message.get('traffic', {})
                # Include flows in traffic data
                if 'flows' in message:
                    traffic['flows'] = message.get('flows', [])
                if traffic:
                    await AgentDataService.ingest_traffic_data(db, agent_id, traffic)
            
            elif msg_type == "host_data":
                # Support both 'host' (Go agent) and 'host_info' (Python agent) keys
                host_info = message.get('host_info') or message.get('host')
                if host_info:
                    agent.agent_metadata["host_info"] = host_info
                    agent.agent_metadata["last_host_update"] = datetime.utcnow().isoformat()
                    flag_modified(agent, "agent_metadata")
                    await db.commit()
                    logger.info(f"Agent {agent.name} host_info saved")
            
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
