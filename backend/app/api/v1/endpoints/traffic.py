from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Dict
from app.services.SnifferService import sniffer_service
from app.services.PingService import ping_service
from app.schemas.traffic import StormConfig, PingRequest
from pydantic import BaseModel
import asyncio
import json
import os
import subprocess
import time

router = APIRouter()

@router.get("/interfaces")
async def get_interfaces():
    """Get available network interfaces"""
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
async def get_traffic_stats():
    """Get traffic statistics"""
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
    """Advanced ping supporting multiple protocols (ICMP, TCP, UDP, HTTP, DNS)"""
    try:
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/traceroute")
async def traceroute(target: str, max_hops: int = 30, timeout: int = 5, protocol: str = 'icmp'):
    """Perform traceroute to show network path to target"""
    try:
        result = await ping_service.traceroute(
            target=target,
            max_hops=max_hops,
            timeout=timeout,
            protocol=protocol
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ping/stream")
async def ping_stream(request: PingRequest):
    """Stream ping results in real-time as packets arrive"""
    
    async def generate():
        try:
            # If include_route is requested, first do a traceroute
            route_info = None
            if getattr(request, 'include_route', False):
                route_info = await ping_service.traceroute(
                    target=request.target,
                    max_hops=30,
                    timeout=3,
                    protocol=request.protocol if request.protocol in ['icmp', 'tcp', 'udp'] else 'icmp'
                )
            
            # Send initial status with route if available
            start_msg = {
                'type': 'start', 
                'target': request.target, 
                'protocol': request.protocol
            }
            if route_info:
                start_msg['route'] = route_info.get('hops', [])
            
            yield f"data: {json.dumps(start_msg)}\n\n"
            
            async for result in ping_service.streaming_ping(
                target=request.target,
                protocol=request.protocol,
                port=request.port,
                count=request.count,
                timeout=request.timeout,
                packet_size=request.packet_size,
                use_https=request.use_https
            ):
                # Send each packet result as it arrives
                yield f"data: {json.dumps({'type': 'packet', 'data': result})}\n\n"
                
            # Send completion
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
