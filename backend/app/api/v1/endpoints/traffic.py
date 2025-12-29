from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from app.services.SnifferService import sniffer_service
from app.core.database import get_db
from app.models.flow import Flow
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

@router.post("/craft")
async def craft_packet(packet_config: Dict):
    """Craft and send a custom packet"""
    try:
        result = sniffer_service.craft_and_send_packet(packet_config)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/protocol-breakdown")
async def get_protocol_breakdown(db: AsyncSession = Depends(get_db)):
    """Get traffic protocol breakdown with time-series data (last 6 hours, hourly buckets)"""
    try:
        # Get flows from last 6 hours
        six_hours_ago = datetime.utcnow() - timedelta(hours=6)
        
        # Query flows grouped by protocol
        tcp_query = select(func.count(Flow.id)).where(
            Flow.protocol == "TCP",
            Flow.first_seen >= six_hours_ago
        )
        tcp_result = await db.execute(tcp_query)
        tcp_count = tcp_result.scalar() or 0
        
        udp_query = select(func.count(Flow.id)).where(
            Flow.protocol == "UDP",
            Flow.first_seen >= six_hours_ago
        )
        udp_result = await db.execute(udp_query)
        udp_count = udp_result.scalar() or 0
        
        icmp_query = select(func.count(Flow.id)).where(
            Flow.protocol == "ICMP",
            Flow.first_seen >= six_hours_ago
        )
        icmp_result = await db.execute(icmp_query)
        icmp_count = icmp_result.scalar() or 0
        
        other_query = select(func.count(Flow.id)).where(
            Flow.protocol.notin_(["TCP", "UDP", "ICMP"]),
            Flow.first_seen >= six_hours_ago
        )
        other_result = await db.execute(other_query)
        other_count = other_result.scalar() or 0
        
        # Build hourly time-series buckets
        time_series = []
        for i in range(6, 0, -1):
            hour_start = datetime.utcnow() - timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            
            # Count flows per protocol in this hour
            hour_tcp_query = select(func.count(Flow.id)).where(
                Flow.protocol == "TCP",
                Flow.first_seen >= hour_start,
                Flow.first_seen < hour_end
            )
            hour_tcp = (await db.execute(hour_tcp_query)).scalar() or 0
            
            hour_udp_query = select(func.count(Flow.id)).where(
                Flow.protocol == "UDP",
                Flow.first_seen >= hour_start,
                Flow.first_seen < hour_end
            )
            hour_udp = (await db.execute(hour_udp_query)).scalar() or 0
            
            hour_icmp_query = select(func.count(Flow.id)).where(
                Flow.protocol == "ICMP",
                Flow.first_seen >= hour_start,
                Flow.first_seen < hour_end
            )
            hour_icmp = (await db.execute(hour_icmp_query)).scalar() or 0
            
            hour_other_query = select(func.count(Flow.id)).where(
                Flow.protocol.notin_(["TCP", "UDP", "ICMP"]),
                Flow.first_seen >= hour_start,
                Flow.first_seen < hour_end
            )
            hour_other = (await db.execute(hour_other_query)).scalar() or 0
            
            time_series.append({
                "timestamp": hour_start.isoformat(),
                "tcp": hour_tcp,
                "udp": hour_udp,
                "icmp": hour_icmp,
                "other": hour_other
            })
        
        return {
            "totals": {
                "tcp": tcp_count,
                "udp": udp_count,
                "icmp": icmp_count,
                "other": other_count
            },
            "time_series": time_series
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting protocol breakdown: {str(e)}")
