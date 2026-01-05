from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import FileResponse
from typing import List, Dict
from app.services.SnifferService import sniffer_service
from app.services.PingService import ping_service
from app.schemas.traffic import StormConfig, PingRequest as AdvancedPingRequest
from app.core.pov_middleware import get_agent_pov
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from pydantic import BaseModel
import asyncio
import json
import os
import subprocess
import time

router = APIRouter()

class PingRequest(BaseModel):
    host: str

@router.get("/interfaces")
async def get_interfaces(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get available network interfaces (agent POV aware)"""
    agent_pov = get_agent_pov(request)
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[INTERFACES] POV header: {request.headers.get('X-Agent-POV')}, agent_pov: {agent_pov}")
    
    # If viewing from agent POV, return agent's interfaces with activity data
    if agent_pov:
        from app.services.agent_service import AgentService
        agent = await AgentService.get_agent(db, agent_pov)  # agent_pov is already a UUID
        logger.info(f"[INTERFACES] Agent found: {agent.name if agent else None}, has metadata: {bool(agent and agent.agent_metadata)}")
        if agent and agent.agent_metadata and "host_info" in agent.agent_metadata:
            host_info = agent.agent_metadata["host_info"]
            if "interfaces" in host_info:
                # Get C2 interface activity history to enrich agent interfaces
                c2_interfaces = sniffer_service.get_interfaces()
                c2_activity_map = {iface['name']: iface.get('activity', [0]*30) for iface in c2_interfaces}
                
                # Add activity data to agent interfaces
                agent_interfaces = host_info["interfaces"]
                for iface in agent_interfaces:
                    iface_name = iface.get('name')
                    # Use C2's activity data if available, otherwise use zeros
                    iface['activity'] = c2_activity_map.get(iface_name, [0]*30)
                
                logger.info(f"[INTERFACES] Returning {len(agent_interfaces)} agent interfaces with activity")
                return agent_interfaces
        # POV mode but no agent data - return empty list, don't fallback to C2
        logger.info("[INTERFACES] POV mode active but no agent data available, returning empty list")
        return []
    
    # Default: return C2 server's interfaces
    logger.info("[INTERFACES] No POV mode, returning C2 interfaces")
    return sniffer_service.get_interfaces()

@router.websocket("/ws")
async def traffic_ws(websocket: WebSocket):
    await websocket.accept()

    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def packet_callback(packet_data):
        # Use call_soon_threadsafe to put data into the async queue from the sniffer thread
        loop.call_soon_threadsafe(queue.put_nowait, packet_data)

    try:
        # Wait for initial configuration message
        data = await websocket.receive_text()
        config = json.loads(data)
        interface = config.get("interface", "eth0")
        filter_str = config.get("filter", "")

        sniffer_service.start_sniffing(interface, packet_callback, filter_str)

        while True:
            # Get packet from queue and send to websocket
            packet = await queue.get()
            await websocket.send_json(packet)

    except WebSocketDisconnect:
        print("Traffic WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        sniffer_service.stop_sniffing()
        try:
            await websocket.close()
        except:
            pass

@router.post("/export")
async def export_traffic():
    """Export captured traffic to PCAP"""
    try:
        filepath = sniffer_service.export_pcap()
        if os.path.exists(filepath):
            return FileResponse(
                filepath,
                media_type="application/vnd.tcpdump.pcap",
                filename="capture.pcap"
            )
        else:
            raise HTTPException(status_code=404, detail="PCAP file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flows")
async def get_traffic_flows():
    """Get network traffic flows (Placeholder for ntopng integration)"""
    return {"flows": [], "total": 0}

@router.get("/stats")
async def get_traffic_stats(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get traffic statistics (agent POV aware)"""
    agent_pov = get_agent_pov(request)
    
    if agent_pov:
        # Get agent's traffic data from metadata
        from app.services.agent_service import AgentService
        agent = await AgentService.get_agent(db, agent_pov)
        if agent and agent.agent_metadata and "traffic_stats" in agent.agent_metadata:
            # Return cached agent traffic stats
            stats = agent.agent_metadata["traffic_stats"]
            stats["note"] = "Agent POV: Traffic data from agent's network"
            stats["agent_id"] = str(agent_pov)
            return stats
        else:
            # Return empty stats if no data available
            return {
                "total_packets": 0,
                "total_bytes": 0,
                "packets_per_second": 0,
                "bytes_per_second": 0,
                "protocols": {},
                "top_talkers": [],
                "traffic_history": [],
                "connections": [],
                "note": "Agent POV: No traffic data available (agent may not be connected)",
                "agent_id": str(agent_pov)
            }
    
    return sniffer_service.get_stats()

@router.post("/craft")
async def craft_packet(packet_config: Dict):
    """Craft and send a custom packet"""
    try:
        result = sniffer_service.craft_and_send_packet(packet_config)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/storm/start")
async def start_storm(storm_config: StormConfig):
    """Start packet storm"""
    try:
        result = sniffer_service.start_storm(storm_config.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/storm/stop")
async def stop_storm():
    """Stop packet storm"""
    try:
        result = sniffer_service.stop_storm()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/storm/metrics")
async def get_storm_metrics():
    """Get current storm metrics"""
    try:
        return sniffer_service.get_storm_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ping")
async def ping_host(request: PingRequest):
    """Ping a host to check reachability"""
    try:
        start_time = time.time()
        result = subprocess.run(
            ['ping', '-c', '1', '-W', '1', request.host],
            capture_output=True,
            text=True,
            timeout=2
        )
        latency = (time.time() - start_time) * 1000  # Convert to ms
        
        reachable = result.returncode == 0
        
        return {
            "host": request.host,
            "reachable": reachable,
            "latency": latency if reachable else None,
            "last_check": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except subprocess.TimeoutExpired:
        return {
            "host": request.host,
            "reachable": False,
            "latency": None,
            "last_check": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ping/advanced")
async def advanced_ping(
    request: AdvancedPingRequest,
    req: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced ping with support for multiple protocols (ICMP, TCP, UDP, HTTP, DNS)
    and optional route tracing (agent POV aware via SOCKS proxy)
    """
    try:
        # Check for agent POV mode
        agent_pov = None
        if req:
            agent_pov = get_agent_pov(req)
        
        if agent_pov:
            # Get agent's SOCKS proxy port
            from app.services.agent_service import AgentService
            agent = await AgentService.get_agent(db, agent_pov)
            if agent and agent.agent_metadata and "socks_proxy_port" in agent.agent_metadata:
                proxy_port = agent.agent_metadata["socks_proxy_port"]
                # Route through SOCKS proxy (agent executes the ping)
                # For now, indicate this would use SOCKS proxy
                return {
                    "target": request.target,
                    "protocol": request.protocol,
                    "success": False,
                    "note": f"Agent POV: Would route via SOCKS proxy on port {proxy_port} - agent executes ping",
                    "agent_pov": str(agent_pov),
                    "socks_port": proxy_port
                }
            else:
                return {
                    "target": request.target,
                    "protocol": request.protocol,
                    "success": False,
                    "note": "Agent POV: Agent not connected or SOCKS proxy not available",
                    "agent_pov": str(agent_pov)
                }
        
        # Run advanced ping with optional route tracing
        if request.include_route:
            # Use parallel ping which includes traceroute
            result = await ping_service.parallel_ping(
                target=request.target,
                protocol=request.protocol,
                port=request.port,
                count=request.count,
                timeout=request.timeout,
                packet_size=request.packet_size,
                use_https=request.use_https,
                include_route=True
            )
        else:
            # Run simple advanced ping without traceroute
            result = await ping_service.advanced_ping(
                target=request.target,
                protocol=request.protocol,
                port=request.port,
                count=request.count,
                timeout=request.timeout,
                packet_size=request.packet_size,
                use_https=request.use_https
            )
        
        return result
    
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

