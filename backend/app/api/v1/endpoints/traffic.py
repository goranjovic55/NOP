from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import FileResponse
from typing import List, Dict, Optional
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


class BurstCaptureRequest(BaseModel):
    duration_seconds: int = 1  # Default 1 second burst capture


@router.post("/burst-capture")
async def burst_capture(request: BurstCaptureRequest):
    """
    Perform a burst capture for the specified duration.
    This captures fresh traffic data for a short period (1-10 seconds).
    Useful for live topology updates that need recent traffic snapshots.
    """
    duration = max(1, min(10, request.duration_seconds))  # Clamp to 1-10 seconds
    
    try:
        # Start burst capture
        sniffer_service.start_burst_capture()
        
        # Wait for the specified duration
        await asyncio.sleep(duration)
        
        # Stop and get results
        result = sniffer_service.stop_burst_capture()
        
        return {
            "success": True,
            "duration": result["duration"],
            "connections": result["connections"],
            "connection_count": len(result["connections"]),
            "current_time": result.get("current_time")
        }
    except Exception as e:
        # Ensure burst capture is stopped on error
        try:
            sniffer_service.stop_burst_capture()
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


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
async def get_traffic_flows(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    protocol: Optional[str] = None
):
    """Get network traffic flows (POV aware - returns flows from agent or sniffer)"""
    from app.models.flow import Flow
    from sqlalchemy import select, desc
    
    agent_pov = get_agent_pov(request)
    
    try:
        query = select(Flow)
        
        if agent_pov:
            # Filter by agent when in POV mode
            query = query.where(Flow.agent_id == agent_pov)
        
        if protocol:
            query = query.where(Flow.protocol == protocol.upper())
        
        query = query.order_by(desc(Flow.last_seen)).limit(limit)
        
        result = await db.execute(query)
        flows = result.scalars().all()
        
        flows_list = [{
            "id": str(f.id),
            "src_ip": str(f.src_ip),
            "dst_ip": str(f.dst_ip),
            "src_port": f.src_port,
            "dst_port": f.dst_port,
            "protocol": f.protocol,
            "bytes": f.bytes_sent + f.bytes_received,
            "packets": f.packets_sent + f.packets_received,
            "first_seen": f.first_seen.isoformat() if f.first_seen else None,
            "last_seen": f.last_seen.isoformat() if f.last_seen else None,
            "agent_id": str(f.agent_id) if f.agent_id else None
        } for f in flows]
        
        return {"flows": flows_list, "total": len(flows_list)}
    except Exception as e:
        print(f"Error getting flows: {e}")
        return {"flows": [], "total": 0}

@router.get("/stats")
async def get_traffic_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    history_hours: int = 24  # Default to 24 hours of history
):
    """Get traffic statistics (agent POV aware) - includes connections from flows with timestamps"""
    from app.models.flow import Flow
    from sqlalchemy import select, func, desc
    from collections import defaultdict
    from datetime import datetime, timedelta
    
    agent_pov = get_agent_pov(request)
    
    # Calculate time window for filtering
    time_window_start = datetime.utcnow() - timedelta(hours=history_hours)
    
    if agent_pov:
        # Get connections from flows database for this agent
        try:
            # Aggregate flows into connections with last_seen timestamp
            query = select(
                Flow.src_ip,
                Flow.dst_ip,
                Flow.protocol,
                func.sum(Flow.bytes_sent + Flow.bytes_received).label('total_bytes'),
                func.sum(Flow.packets_sent + Flow.packets_received).label('total_packets'),
                func.max(Flow.last_seen).label('last_seen'),
                func.min(Flow.first_seen).label('first_seen')
            ).where(
                Flow.agent_id == agent_pov,
                Flow.last_seen >= time_window_start  # Only include flows within time window
            ).group_by(
                Flow.src_ip, Flow.dst_ip, Flow.protocol
            ).order_by(desc('last_seen')).limit(500)  # Increased limit, sorted by recency
            
            result = await db.execute(query)
            rows = result.fetchall()
            
            # Build connections list for topology with timestamps
            connections = []
            protocol_counts = defaultdict(int)
            total_bytes = 0
            total_packets = 0
            
            for row in rows:
                src_ip = str(row.src_ip)
                dst_ip = str(row.dst_ip)
                protocol = row.protocol or 'OTHER'
                bytes_val = row.total_bytes or 0
                packets_val = row.total_packets or 0
                last_seen = row.last_seen.isoformat() if row.last_seen else None
                first_seen = row.first_seen.isoformat() if row.first_seen else None
                
                connections.append({
                    "source": src_ip,
                    "target": dst_ip,
                    "value": bytes_val,
                    "protocols": [protocol],
                    "last_seen": last_seen,
                    "first_seen": first_seen
                })
                
                protocol_counts[protocol] += packets_val
                total_bytes += bytes_val
                total_packets += packets_val
            
            return {
                "total_packets": total_packets,
                "total_bytes": total_bytes,
                "packets_per_second": 0,
                "bytes_per_second": 0,
                "protocols": dict(protocol_counts),
                "top_talkers": [],
                "traffic_history": [],
                "connections": connections,
                "history_hours": history_hours,
                "note": f"Agent POV: {len(connections)} connections from last {history_hours}h",
                "agent_id": str(agent_pov)
            }
        except Exception as e:
            print(f"Error getting agent traffic stats: {e}")
            import traceback
            traceback.print_exc()
            return {
                "total_packets": 0,
                "total_bytes": 0,
                "packets_per_second": 0,
                "bytes_per_second": 0,
                "protocols": {},
                "top_talkers": [],
                "traffic_history": [],
                "connections": [],
                "note": f"Agent POV: Error fetching data - {str(e)}",
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

