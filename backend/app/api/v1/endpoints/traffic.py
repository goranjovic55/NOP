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
                        cmd = ['dig', f'@{target}', '-p', str(port), 'google.com', 'A', '+time=1']
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
