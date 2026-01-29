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
import re
import requests

router = APIRouter()

class PingRequest(BaseModel):
    target: str
    protocol: str = "icmp"
    port: Optional[int] = None
    count: int = 4
    timeout: int = 5
    packet_size: int = 56
    use_https: bool = False
    
    # Validators
    @staticmethod
    def validate_target(v):
        if not v or len(v) > 255:
            raise ValueError("Target must be a valid hostname or IP address")
        return v
    
    @staticmethod
    def validate_port(v):
        if v is not None and (v < 1 or v > 65535):
            raise ValueError("Port must be between 1 and 65535")
        return v
    
    @staticmethod
    def validate_count(v):
        if v < 1 or v > 100:
            raise ValueError("Count must be between 1 and 100")
        return v
    
    @staticmethod
    def validate_timeout(v):
        if v < 1 or v > 30:
            raise ValueError("Timeout must be between 1 and 30 seconds")
        return v
    
    @staticmethod
    def validate_packet_size(v):
        if v < 1 or v > 65500:
            raise ValueError("Packet size must be between 1 and 65500 bytes")
        return v

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
        # Only stop sniffing if NOT in persistent capture mode
        if not sniffer_service.persistent_capture:
            sniffer_service.stop_sniffing()
        else:
            # Just clear the callback so we don't try to push packets
            sniffer_service.callback = None
        try:
            await websocket.close()
        except:
            pass


class BurstCaptureRequest(BaseModel):
    duration_seconds: int = 1  # Default 1 second burst capture
    interface: str = None  # Optional interface to capture on


@router.post("/burst-capture")
async def burst_capture(request: BurstCaptureRequest):
    """
    Perform a burst capture for the specified duration.
    This captures fresh traffic data for a short period (1-10 seconds).
    If interface is specified, switches to that interface for capture.
    Useful for live topology updates that need recent traffic snapshots.
    """
    duration = max(1, min(10, request.duration_seconds))  # Clamp to 1-10 seconds
    
    try:
        # If interface specified, ensure we're capturing on it
        if request.interface:
            sniffer_service.start_burst_capture(interface=request.interface)
        else:
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


class StartSniffingRequest(BaseModel):
    interface: str = "eth0"
    filter: str = ""


@router.post("/start-capture")
async def start_capture(request: StartSniffingRequest):
    """
    Start persistent packet capture that continues even when leaving the page.
    Unlike WebSocket capture, this runs in background and doesn't stream packets.
    Use /stats to get capture status and connection data.
    """
    try:
        sniffer_service.start_sniffing(request.interface, None, request.filter, persistent=True)
        return {
            "success": True,
            "is_sniffing": True,
            "interface": request.interface,
            "filter": request.filter or None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop-capture")
async def stop_capture():
    """
    Stop the persistent packet capture.
    """
    try:
        was_sniffing = sniffer_service.is_sniffing
        sniffer_service.stop_sniffing()
        return {
            "success": True,
            "was_sniffing": was_sniffing,
            "is_sniffing": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capture-status")
async def capture_status():
    """
    Get current capture status without full stats.
    """
    return {
        "is_sniffing": sniffer_service.is_sniffing,
        "interface": sniffer_service.interface,
        "filter": sniffer_service.filter
    }


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
    """Advanced ping supporting multiple protocols: ICMP, TCP, UDP, HTTP, DNS"""
    try:
        protocol = request.protocol.lower()
        target = request.target
        count = request.count
        timeout = request.timeout
        packet_size = request.packet_size
        
        results = []
        
        if protocol == "icmp":
            # Standard ICMP ping
            try:
                cmd = ['ping', '-c', str(count), '-W', str(timeout), '-s', str(packet_size), target]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 2)
                
                # Parse output
                output_lines = result.stdout.splitlines()
                raw_output = result.stdout
                
                # Extract statistics
                transmitted = received = 0
                packet_loss = 100.0
                min_ms = max_ms = avg_ms = None
                
                for line in output_lines:
                    # Parse transmitted/received
                    if "packets transmitted" in line:
                        match = re.search(r'(\d+) packets transmitted, (\d+) received', line)
                        if match:
                            transmitted = int(match.group(1))
                            received = int(match.group(2))
                            if transmitted > 0:
                                packet_loss = ((transmitted - received) / transmitted) * 100
                    
                    # Parse RTT statistics
                    if "min/avg/max" in line or "rtt min/avg/max" in line:
                        match = re.search(r'= ([\d.]+)/([\d.]+)/([\d.]+)', line)
                        if match:
                            min_ms = float(match.group(1))
                            avg_ms = float(match.group(2))
                            max_ms = float(match.group(3))
                    
                    # Parse individual ping results
                    if "icmp_seq=" in line:
                        seq_match = re.search(r'icmp_seq=(\d+)', line)
                        time_match = re.search(r'time=([\d.]+)', line)
                        if seq_match:
                            seq = int(seq_match.group(1))
                            if time_match:
                                time_ms = float(time_match.group(1))
                                results.append({"seq": seq, "status": "success", "time_ms": time_ms})
                            else:
                                results.append({"seq": seq, "status": "timeout"})
                
                # Fill in missing sequences as timeouts
                for i in range(1, count + 1):
                    if not any(r["seq"] == i for r in results):
                        results.append({"seq": i, "status": "timeout"})
                
                return {
                    "protocol": "icmp",
                    "target": target,
                    "count": count,
                    "transmitted": transmitted,
                    "received": received,
                    "successful": received,
                    "failed": transmitted - received,
                    "packet_loss": round(packet_loss, 1),
                    "min_ms": min_ms,
                    "max_ms": max_ms,
                    "avg_ms": avg_ms,
                    "results": sorted(results, key=lambda x: x["seq"]),
                    "raw_output": raw_output,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
            except subprocess.TimeoutExpired:
                return {
                    "protocol": "icmp",
                    "target": target,
                    "error": "Ping timed out",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            except Exception as e:
                return {
                    "protocol": "icmp",
                    "target": target,
                    "error": str(e),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
        
        elif protocol == "tcp":
            # TCP SYN ping using hping3
            if not request.port:
                return {
                    "protocol": "tcp",
                    "target": target,
                    "error": "Port is required for TCP ping",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            
            try:
                # hping3 -S -c count -p port -W timeout target
                cmd = ['hping3', '-S', '-c', str(count), '-p', str(request.port), 
                       '-W', str(timeout), target]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 2)
                
                output_lines = result.stdout + "\n" + result.stderr
                
                # Parse hping3 output
                successful = 0
                failed = 0
                times = []
                
                for i, line in enumerate(output_lines.splitlines()):
                    if "flags=" in line:
                        # Extract RTT
                        time_match = re.search(r'rtt=([\d.]+)', line)
                        if time_match:
                            time_ms = float(time_match.group(1))
                            times.append(time_ms)
                            successful += 1
                            results.append({"seq": i + 1, "status": "success", "time_ms": time_ms})
                        else:
                            successful += 1
                            results.append({"seq": i + 1, "status": "sent"})
                
                failed = count - successful
                
                # Fill missing sequences
                for i in range(1, count + 1):
                    if not any(r["seq"] == i for r in results):
                        results.append({"seq": i, "status": "timeout"})
                
                response_data = {
                    "protocol": "tcp",
                    "target": target,
                    "port": request.port,
                    "count": count,
                    "successful": successful,
                    "failed": failed,
                    "packet_loss": round((failed / count) * 100, 1) if count > 0 else 0,
                    "results": sorted(results, key=lambda x: x["seq"]),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                if times:
                    response_data["min_ms"] = round(min(times), 2)
                    response_data["max_ms"] = round(max(times), 2)
                    response_data["avg_ms"] = round(sum(times) / len(times), 2)
                
                return response_data
                
            except FileNotFoundError:
                return {
                    "protocol": "tcp",
                    "target": target,
                    "port": request.port,
                    "error": "hping3 not installed. Please install hping3 for TCP ping support.",
                    "note": "Run: apt-get install hping3",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            except Exception as e:
                return {
                    "protocol": "tcp",
                    "target": target,
                    "port": request.port,
                    "error": str(e),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
        
        elif protocol == "udp":
            # UDP ping using hping3
            if not request.port:
                return {
                    "protocol": "udp",
                    "target": target,
                    "error": "Port is required for UDP ping",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            
            try:
                cmd = ['hping3', '--udp', '-c', str(count), '-p', str(request.port),
                       '-W', str(timeout), target]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 2)
                
                output_lines = result.stdout + "\n" + result.stderr
                
                successful = 0
                times = []
                
                for i, line in enumerate(output_lines.splitlines()):
                    if "ICMP Port Unreachable" in line or "flags=" in line:
                        time_match = re.search(r'rtt=([\d.]+)', line)
                        if time_match:
                            time_ms = float(time_match.group(1))
                            times.append(time_ms)
                            successful += 1
                            results.append({"seq": i + 1, "status": "success", "time_ms": time_ms})
                        else:
                            successful += 1
                            results.append({"seq": i + 1, "status": "sent"})
                
                failed = count - successful
                
                for i in range(1, count + 1):
                    if not any(r["seq"] == i for r in results):
                        results.append({"seq": i, "status": "timeout"})
                
                response_data = {
                    "protocol": "udp",
                    "target": target,
                    "port": request.port,
                    "count": count,
                    "successful": successful,
                    "failed": failed,
                    "packet_loss": round((failed / count) * 100, 1) if count > 0 else 0,
                    "results": sorted(results, key=lambda x: x["seq"]),
                    "note": "UDP ping shows response when port is unreachable (ICMP error) or open (data response)",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                if times:
                    response_data["min_ms"] = round(min(times), 2)
                    response_data["max_ms"] = round(max(times), 2)
                    response_data["avg_ms"] = round(sum(times) / len(times), 2)
                
                return response_data
                
            except FileNotFoundError:
                return {
                    "protocol": "udp",
                    "target": target,
                    "port": request.port,
                    "error": "hping3 not installed. Please install hping3 for UDP ping support.",
                    "note": "Run: apt-get install hping3",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            except Exception as e:
                return {
                    "protocol": "udp",
                    "target": target,
                    "port": request.port,
                    "error": str(e),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
        
        elif protocol == "http":
            # HTTP/HTTPS ping
            port = request.port or (443 if request.use_https else 80)
            scheme = "https" if request.use_https else "http"
            url = f"{scheme}://{target}:{port}"
            
            successful = 0
            failed = 0
            times = []
            
            for i in range(1, count + 1):
                try:
                    start = time.time()
                    # Note: SSL verification disabled for ping testing. In production, consider making this configurable.
                    response = requests.get(url, timeout=timeout, verify=False)
                    elapsed_ms = (time.time() - start) * 1000
                    
                    times.append(elapsed_ms)
                    successful += 1
                    results.append({
                        "seq": i,
                        "status": "success",
                        "time_ms": round(elapsed_ms, 2),
                        "http_code": str(response.status_code)
                    })
                except requests.Timeout:
                    failed += 1
                    results.append({"seq": i, "status": "timeout"})
                except Exception as e:
                    failed += 1
                    results.append({"seq": i, "status": "failed", "error": str(e)})
            
            response_data = {
                "protocol": "http",
                "target": target,
                "port": port,
                "count": count,
                "successful": successful,
                "failed": failed,
                "packet_loss": round((failed / count) * 100, 1) if count > 0 else 0,
                "results": results,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            if times:
                response_data["min_ms"] = round(min(times), 2)
                response_data["max_ms"] = round(max(times), 2)
                response_data["avg_ms"] = round(sum(times) / len(times), 2)
            
            return response_data
        
        elif protocol == "dns":
            # DNS query using dig
            port = request.port or 53
            
            try:
                successful = 0
                failed = 0
                times = []
                
                for i in range(1, count + 1):
                    try:
                        # Query for root domain to ensure compatibility with any DNS server
                        cmd = ['dig', f'@{target}', '-p', str(port), '.', 'NS', '+time=1']
                        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
                        
                        # Parse query time
                        time_match = re.search(r'Query time: (\d+) msec', result.stdout)
                        if time_match:
                            query_time = float(time_match.group(1))
                            times.append(query_time)
                            successful += 1
                            results.append({"seq": i, "status": "success", "time_ms": query_time})
                        elif result.returncode == 0:
                            successful += 1
                            results.append({"seq": i, "status": "success"})
                        else:
                            failed += 1
                            results.append({"seq": i, "status": "failed"})
                    except subprocess.TimeoutExpired:
                        failed += 1
                        results.append({"seq": i, "status": "timeout"})
                    except Exception as e:
                        failed += 1
                        results.append({"seq": i, "status": "failed"})
                
                response_data = {
                    "protocol": "dns",
                    "target": target,
                    "port": port,
                    "count": count,
                    "successful": successful,
                    "failed": failed,
                    "packet_loss": round((failed / count) * 100, 1) if count > 0 else 0,
                    "results": results,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                if times:
                    response_data["min_ms"] = round(min(times), 2)
                    response_data["max_ms"] = round(max(times), 2)
                    response_data["avg_ms"] = round(sum(times) / len(times), 2)
                
                return response_data
                
            except FileNotFoundError:
                return {
                    "protocol": "dns",
                    "target": target,
                    "port": port,
                    "error": "dig not installed. Please install dnsutils for DNS ping support.",
                    "note": "Run: apt-get install dnsutils",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            except Exception as e:
                return {
                    "protocol": "dns",
                    "target": target,
                    "port": port,
                    "error": str(e),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
        
        else:
            return {
                "protocol": protocol,
                "target": target,
                "error": f"Unsupported protocol: {protocol}. Supported: icmp, tcp, udp, http, dns",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
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


# ========== Deep Packet Inspection (DPI) Endpoints ==========

class DPISettingsRequest(BaseModel):
    enabled: bool


@router.get("/dpi/stats")
async def get_dpi_stats():
    """Get Deep Packet Inspection statistics"""
    return sniffer_service.get_dpi_stats()


@router.post("/dpi/settings")
async def update_dpi_settings(request: DPISettingsRequest):
    """Enable or disable Deep Packet Inspection"""
    sniffer_service.set_dpi_enabled(request.enabled)
    return {
        "success": True,
        "dpi_enabled": request.enabled
    }


@router.post("/dpi/reset")
async def reset_dpi_stats():
    """Reset DPI statistics"""
    sniffer_service.reset_dpi_stats()
    return {"success": True, "message": "DPI statistics reset"}


@router.get("/protocols")
async def get_protocol_breakdown():
    """Get protocol breakdown with bytes and packet counts"""
    breakdown = sniffer_service.dpi_service.get_protocol_breakdown()
    
    # Convert to list format for frontend
    protocols = []
    for protocol, stats in breakdown.items():
        protocols.append({
            "protocol": protocol,
            "packets": stats["packets"],
            "bytes": stats["bytes"],
            "packet_percentage": stats["packet_percentage"],
            "byte_percentage": stats["byte_percentage"]
        })
    
    return {
        "protocols": protocols,
        "total_protocols": len(protocols),
        "dpi_enabled": sniffer_service.dpi_enabled
    }


# ========== L2 Layer Topology Endpoints ==========

@router.get("/l2/topology")
async def get_l2_topology():
    """Get L2 (MAC-level) topology data for layer 2 visualization"""
    return sniffer_service.get_l2_topology()


@router.get("/l2/entities")
async def get_l2_entities():
    """Get all discovered L2 entities (MAC addresses)"""
    return {
        "entities": sniffer_service.get_l2_entities(),
        "count": len(sniffer_service.l2_entities)
    }


@router.get("/l2/connections")
async def get_l2_connections():
    """Get L2 connections (MAC to MAC)"""
    return {
        "connections": sniffer_service.get_l2_connections(),
        "count": len(sniffer_service.l2_connections)
    }


@router.get("/l2/multicast-groups")
async def get_l2_multicast_groups():
    """Get multicast group memberships for bus topology detection"""
    return {
        "groups": sniffer_service.get_l2_multicast_groups(),
        "count": len(sniffer_service.l2_multicast_groups)
    }


# ========== Pattern Detection Endpoints (L7 Analysis) ==========

@router.get("/patterns/flows")
async def get_flow_patterns():
    """Get detected flow patterns (cyclic, master-slave, etc.)"""
    return {
        "patterns": sniffer_service.dpi_service.get_flow_patterns()
    }


@router.get("/patterns/multicast-bus")
async def get_multicast_bus_topology():
    """Get detected multicast bus groups from pattern detection"""
    return {
        "bus_groups": sniffer_service.dpi_service.get_multicast_bus_topology()
    }


class LabelFingerprintRequest(BaseModel):
    fingerprint: str
    label: str


@router.post("/patterns/label")
async def label_protocol_fingerprint(request: LabelFingerprintRequest):
    """Associate a custom label with a detected protocol fingerprint"""
    sniffer_service.dpi_service.label_protocol_fingerprint(
        request.fingerprint, 
        request.label
    )
    return {
        "success": True,
        "fingerprint": request.fingerprint,
        "label": request.label
    }
