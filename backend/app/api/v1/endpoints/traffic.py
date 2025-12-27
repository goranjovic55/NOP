from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from typing import List, Dict
from app.services.SnifferService import sniffer_service
from app.services.PingService import ping_service
from app.schemas.traffic import PingRequest, PingResponse
import asyncio
import json
import os

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


@router.post("/ping", response_model=PingResponse)
async def advanced_ping(request: PingRequest):
    """
    Perform advanced ping with support for multiple protocols.
    Similar to hping3 functionality for testing firewall rules and services.
    
    Supported protocols:
    - ICMP: Standard ping
    - TCP: TCP connection ping to specific port
    - UDP: UDP packet ping to specific port
    - HTTP: HTTP/HTTPS request ping
    """
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
        raise HTTPException(status_code=500, detail=f"Ping failed: {str(e)}")
