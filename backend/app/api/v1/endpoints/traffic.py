from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from typing import List, Dict, Optional
from app.services.SnifferService import sniffer_service
from app.schemas.traffic import StormConfig
from pydantic import BaseModel
import asyncio
import json
import os
import subprocess
import time
import re
import socket

router = APIRouter()

class PingRequest(BaseModel):
    host: str

class AdvancedPingRequest(BaseModel):
    target: str
    protocol: str = "icmp"  # icmp, tcp, udp, http, dns
    count: int = 4
    timeout: int = 5
    packet_size: int = 56
    include_route: bool = False
    port: Optional[int] = None
    use_https: Optional[bool] = False

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
async def advanced_ping(request: AdvancedPingRequest):
    """Advanced ping with multiple protocols and optional traceroute"""
    try:
        packets = []
        hops = []
        successful = 0
        failed = 0
        latencies = []
        
        # Run traceroute if requested (in parallel with ping)
        if request.include_route:
            try:
                traceroute_result = subprocess.run(
                    ['traceroute', '-m', '30', '-w', '2', request.target],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                # Parse traceroute output
                for line in traceroute_result.stdout.split('\n')[1:]:  # Skip first line
                    if line.strip():
                        hop_match = re.match(r'\s*(\d+)\s+(.+)', line)
                        if hop_match:
                            hop_num = int(hop_match.group(1))
                            hop_info = hop_match.group(2).strip()
                            
                            # Extract IP and latency
                            ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', hop_info)
                            time_match = re.search(r'(\d+\.?\d*)\s*ms', hop_info)
                            
                            hops.append({
                                "hop": hop_num,
                                "ip": ip_match.group(1) if ip_match else "*",
                                "latency": float(time_match.group(1)) if time_match else None
                            })
            except Exception as e:
                print(f"Traceroute failed: {e}")
        
        # Perform ping based on protocol
        if request.protocol == "icmp":
            for i in range(request.count):
                start_time = time.time()
                result = subprocess.run(
                    ['ping', '-c', '1', '-W', str(request.timeout), '-s', str(request.packet_size), request.target],
                    capture_output=True,
                    text=True,
                    timeout=request.timeout + 1
                )
                latency = (time.time() - start_time) * 1000
                
                if result.returncode == 0:
                    successful += 1
                    latencies.append(latency)
                    packets.append({"seq": i + 1, "status": "success", "latency": round(latency, 2)})
                else:
                    failed += 1
                    packets.append({"seq": i + 1, "status": "failed", "latency": None})
        
        elif request.protocol == "tcp":
            port = request.port or 80
            for i in range(request.count):
                start_time = time.time()
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(request.timeout)
                    sock.connect((request.target, port))
                    sock.close()
                    latency = (time.time() - start_time) * 1000
                    successful += 1
                    latencies.append(latency)
                    packets.append({"seq": i + 1, "status": "success", "latency": round(latency, 2)})
                except:
                    failed += 1
                    packets.append({"seq": i + 1, "status": "failed", "latency": None})
        
        elif request.protocol == "udp":
            port = request.port or 53
            for i in range(request.count):
                start_time = time.time()
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    sock.settimeout(request.timeout)
                    sock.sendto(b'ping', (request.target, port))
                    try:
                        sock.recvfrom(1024)
                        latency = (time.time() - start_time) * 1000
                        successful += 1
                        latencies.append(latency)
                        packets.append({"seq": i + 1, "status": "success", "latency": round(latency, 2)})
                    except socket.timeout:
                        # UDP doesn't guarantee response, consider success if no error
                        latency = (time.time() - start_time) * 1000
                        successful += 1
                        latencies.append(latency)
                        packets.append({"seq": i + 1, "status": "success", "latency": round(latency, 2)})
                    sock.close()
                except Exception as e:
                    failed += 1
                    packets.append({"seq": i + 1, "status": "failed", "latency": None})
        
        elif request.protocol == "http":
            import urllib.request
            protocol = "https" if request.use_https else "http"
            port = request.port or (443 if request.use_https else 80)
            url = f"{protocol}://{request.target}:{port}"
            
            for i in range(request.count):
                start_time = time.time()
                try:
                    req = urllib.request.Request(url, method='HEAD')
                    with urllib.request.urlopen(req, timeout=request.timeout) as response:
                        latency = (time.time() - start_time) * 1000
                        successful += 1
                        latencies.append(latency)
                        packets.append({"seq": i + 1, "status": "success", "latency": round(latency, 2)})
                except:
                    failed += 1
                    packets.append({"seq": i + 1, "status": "failed", "latency": None})
        
        elif request.protocol == "dns":
            for i in range(request.count):
                start_time = time.time()
                try:
                    socket.gethostbyname(request.target)
                    latency = (time.time() - start_time) * 1000
                    successful += 1
                    latencies.append(latency)
                    packets.append({"seq": i + 1, "status": "success", "latency": round(latency, 2)})
                except:
                    failed += 1
                    packets.append({"seq": i + 1, "status": "failed", "latency": None})
        
        # Calculate statistics
        packet_loss = (failed / request.count * 100) if request.count > 0 else 0
        
        response = {
            "protocol": request.protocol,
            "target": request.target,
            "count": request.count,
            "successful": successful,
            "failed": failed,
            "packet_loss": round(packet_loss, 2),
            "packets": packets,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if latencies:
            response["min_ms"] = round(min(latencies), 2)
            response["max_ms"] = round(max(latencies), 2)
            response["avg_ms"] = round(sum(latencies) / len(latencies), 2)
        
        if hops:
            response["hops"] = hops
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
