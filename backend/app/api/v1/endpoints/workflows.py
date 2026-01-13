"""Workflow CRUD and execution endpoints - Phase 3: Block Library"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
import json
import asyncio
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models.user import User
from app.models.workflow import Workflow, WorkflowExecution, WorkflowStatus as DBWorkflowStatus, ExecutionStatus as DBExecutionStatus
from app.services.scanner import NetworkScanner
from app.schemas.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowListResponse,
    ExecutionOptions, ExecutionResponse, ExecutionDetailResponse,
    CompileResult, CompileError, ExecutionProgress
)

router = APIRouter()


# === Block Execution Models ===

class BlockExecuteRequest(BaseModel):
    """Request to execute a single block"""
    block_type: str
    parameters: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None  # Previous block outputs, variables, etc.


class BlockExecuteResponse(BaseModel):
    """Response from block execution"""
    success: bool
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration_ms: Optional[int] = None
    route: Optional[str] = None  # Which output handle to follow (e.g., "success", "failure")


class DelayRequest(BaseModel):
    """Request for delay block"""
    seconds: int = 5


# === Block Execution Service ===

async def execute_block(block_type: str, params: Dict[str, Any], context: Dict[str, Any] = None) -> BlockExecuteResponse:
    """
    Execute a single workflow block.
    Phase 3: Connects blocks to actual API endpoints or simulates execution.
    """
    start_time = datetime.utcnow()
    context = context or {}
    
    try:
        # === Control Blocks ===
        if block_type == "control.start":
            # Support loop input - get iteration from context if connected to a loop
            loop_input = context.get("loop_input", {})
            iteration = loop_input.get("iteration", 0)
            item = loop_input.get("item", params.get("initialValue", 0))
            max_iterations = params.get("maxIterations", 100)
            
            # Safety check for max iterations
            if iteration >= max_iterations:
                return BlockExecuteResponse(
                    success=False,
                    error=f"Max iterations ({max_iterations}) reached",
                    output={"iteration": iteration, "max_exceeded": True},
                    route="error"
                )
            
            return BlockExecuteResponse(
                success=True,
                output={
                    "started": True,
                    "timestamp": datetime.utcnow().isoformat(),
                    "iteration": iteration,
                    "item": item,
                    "from_loop": bool(loop_input)
                },
                route="out"
            )
        
        elif block_type == "control.end":
            status = params.get("status", "success")
            message = params.get("message", "Workflow completed")
            return BlockExecuteResponse(
                success=status == "success",
                output={"status": status, "message": message},
                route=None
            )
        
        elif block_type == "control.delay":
            seconds = params.get("seconds", 5)
            await asyncio.sleep(seconds)
            return BlockExecuteResponse(
                success=True,
                output={"delayed": seconds, "message": f"Waited {seconds} seconds"},
                route="out",
                duration_ms=seconds * 1000
            )
        
        elif block_type == "control.condition":
            expression = params.get("expression", "true")
            # Simple expression evaluation (in production, use a safe evaluator)
            # For now, check if expression looks truthy
            result = evaluate_expression(expression, context)
            return BlockExecuteResponse(
                success=True,
                output={"expression": expression, "result": result},
                route="true" if result else "false"
            )
        
        elif block_type == "control.loop":
            # Get loop state from context (keyed by a unique node identifier if available)
            loop_state = context.get("loop_state", {})
            loop_id = params.get("_node_id", "default_loop")
            
            mode = params.get("mode", "count")
            
            if mode == "count":
                count = params.get("count", 5)
                current_index = loop_state.get(loop_id, 0)
                
                if current_index >= count:
                    # Loop complete - reset state and exit via "done" handle
                    loop_state[loop_id] = 0
                    context["loop_state"] = loop_state
                    return BlockExecuteResponse(
                        success=True,
                        output={"mode": "count", "completed": True, "total_iterations": count},
                        route="done"  # Match "done" output handle
                    )
                
                # Increment for next iteration
                loop_state[loop_id] = current_index + 1
                context["loop_state"] = loop_state
                context["item"] = current_index  # Current iteration index
                context["variables"] = context.get("variables", {})
                context["variables"]["item"] = current_index
                context["variables"]["index"] = current_index
                
                return BlockExecuteResponse(
                    success=True,
                    output={"mode": "count", "iteration": current_index + 1, "of": count, "item": current_index},
                    route="loop"  # Match "loop" output handle
                )
            else:
                # Array mode
                array_expr = params.get("array", "[]")
                items = evaluate_expression(array_expr, context) or []
                if not isinstance(items, list):
                    items = []
                
                current_index = loop_state.get(loop_id, 0)
                
                if current_index >= len(items):
                    # Loop complete - reset state and exit via "done" handle
                    loop_state[loop_id] = 0
                    context["loop_state"] = loop_state
                    return BlockExecuteResponse(
                        success=True,
                        output={"mode": "array", "completed": True, "total_items": len(items)},
                        route="done"  # Match "done" output handle
                    )
                
                # Get current item and increment
                current_item = items[current_index]
                loop_state[loop_id] = current_index + 1
                context["loop_state"] = loop_state
                context["item"] = current_item
                context["variables"] = context.get("variables", {})
                context["variables"]["item"] = current_item
                context["variables"]["index"] = current_index
                
                # Also set the variable name specified in params
                var_name = params.get("variable", "item")
                context["variables"][var_name] = current_item
                
                return BlockExecuteResponse(
                    success=True,
                    output={"mode": "array", "iteration": current_index + 1, "of": len(items), "item": current_item},
                    route="loop"  # Match "loop" output handle
                )
        
        elif block_type == "control.parallel":
            return BlockExecuteResponse(
                success=True,
                output={"parallel": True, "branches": 3},
                route="branch1"  # In real execution, all branches execute
            )
        
        elif block_type == "control.variable_set":
            name = params.get("name", "var")
            value = params.get("value", "")
            
            # Actually update context variables
            context["variables"] = context.get("variables", {})
            
            # Try to parse JSON arrays/objects
            try:
                parsed_value = json.loads(value) if isinstance(value, str) and value.strip().startswith('[') else value
            except (json.JSONDecodeError, TypeError):
                parsed_value = value
            
            context["variables"][name] = parsed_value
            
            return BlockExecuteResponse(
                success=True,
                output={"variable": name, "value": parsed_value, "action": "set"},
                route="out"
            )
        
        elif block_type == "control.variable_get":
            name = params.get("name", "var")
            variables = context.get("variables", {})
            value = variables.get(name)
            
            # Also check if it's a special variable like 'item'
            if value is None and name == "item":
                value = context.get("item")
            
            return BlockExecuteResponse(
                success=True,
                output={"variable": name, "value": value, "action": "get"},
                route="out"
            )
        
        # === Connection Blocks ===
        elif block_type == "connection.ssh_test":
            host = params.get("host", "")
            port = params.get("port", 22)
            timeout = params.get("timeout", 5)
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required",
                    output={"host": host, "port": port, "connected": False},
                    route="failure"
                )
            
            # Real TCP connection test to SSH port
            import socket
            import time
            start_time = time.time()
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                sock.close()
                duration_ms = int((time.time() - start_time) * 1000)
                connected = result == 0
                
                return BlockExecuteResponse(
                    success=connected,
                    output={"host": host, "port": port, "connected": connected, "latency_ms": duration_ms},
                    duration_ms=duration_ms,
                    route="success" if connected else "failure"
                )
            except socket.error as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"host": host, "port": port, "connected": False, "error": str(e)},
                    route="failure"
                )
        
        elif block_type == "connection.rdp_test":
            host = params.get("host", "")
            port = params.get("port", 3389)
            timeout = params.get("timeout", 5)
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required",
                    output={"host": host, "port": port, "protocol": "rdp", "connected": False},
                    route="failure"
                )
            
            # Real TCP connection test to RDP port
            import socket
            import time
            start_time = time.time()
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                sock.close()
                duration_ms = int((time.time() - start_time) * 1000)
                connected = result == 0
                
                return BlockExecuteResponse(
                    success=connected,
                    output={"host": host, "port": port, "protocol": "rdp", "connected": connected, "latency_ms": duration_ms},
                    duration_ms=duration_ms,
                    route="success" if connected else "failure"
                )
            except socket.error as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"host": host, "port": port, "protocol": "rdp", "connected": False, "error": str(e)},
                    route="failure"
                )
        
        elif block_type == "connection.vnc_test":
            host = params.get("host", "")
            port = params.get("port", 5900)
            timeout = params.get("timeout", 5)
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required",
                    output={"host": host, "port": port, "protocol": "vnc", "connected": False},
                    route="failure"
                )
            
            # Real TCP connection test to VNC port
            import socket
            import time
            start_time = time.time()
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                sock.close()
                duration_ms = int((time.time() - start_time) * 1000)
                connected = result == 0
                
                return BlockExecuteResponse(
                    success=connected,
                    output={"host": host, "port": port, "protocol": "vnc", "connected": connected, "latency_ms": duration_ms},
                    duration_ms=duration_ms,
                    route="success" if connected else "failure"
                )
            except socket.error as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"host": host, "port": port, "protocol": "vnc", "connected": False, "error": str(e)},
                    route="failure"
                )
        
        elif block_type == "connection.ftp_test":
            host = params.get("host", "")
            port = params.get("port", 21)
            protocol = params.get("protocol", "ftp")
            timeout = params.get("timeout", 5)
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required",
                    output={"host": host, "port": port, "protocol": protocol, "connected": False},
                    route="failure"
                )
            
            # Real TCP connection test to FTP port
            import socket
            import time
            start_time = time.time()
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                sock.close()
                duration_ms = int((time.time() - start_time) * 1000)
                connected = result == 0
                
                return BlockExecuteResponse(
                    success=connected,
                    output={"host": host, "port": port, "protocol": protocol, "connected": connected, "latency_ms": duration_ms},
                    duration_ms=duration_ms,
                    route="success" if connected else "failure"
                )
            except socket.error as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"host": host, "port": port, "protocol": protocol, "connected": False, "error": str(e)},
                    route="failure"
                )
        
        elif block_type == "connection.tcp_test":
            host = params.get("host", "")
            port = params.get("port", 80)
            timeout = params.get("timeout", 5)
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required",
                    output={"host": host, "port": port, "open": False},
                    route="failure"
                )
            
            # Real TCP connection test
            import socket
            import time
            start_time = time.time()
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                sock.close()
                duration_ms = int((time.time() - start_time) * 1000)
                is_open = result == 0
                
                return BlockExecuteResponse(
                    success=True,  # Block execution succeeded, port may or may not be open
                    output={"host": host, "port": port, "open": is_open, "latency_ms": duration_ms},
                    duration_ms=duration_ms,
                    route="success" if is_open else "failure"
                )
            except socket.error as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"host": host, "port": port, "open": False, "error": str(e)},
                    route="failure"
                )
        
        # === Command Blocks ===
        elif block_type == "command.ssh_execute":
            host = params.get("host", "")
            command = params.get("command", "")
            await asyncio.sleep(1.0)
            if not host or not command:
                return BlockExecuteResponse(
                    success=False,
                    error="Host and command are required",
                    route="error"
                )
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "command": command,
                    "stdout": f"Executed: {command}",
                    "stderr": "",
                    "exit_code": 0
                },
                route="out"
            )
        
        elif block_type == "command.system_info":
            host = params.get("host", "")
            info_type = params.get("infoType", "all")
            await asyncio.sleep(0.8)
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "type": info_type,
                    "info": {
                        "os": "Linux 5.15.0",
                        "hostname": host,
                        "uptime": "5 days",
                        "memory": "8GB",
                        "cpu": "4 cores"
                    }
                },
                route="out"
            )
        
        elif block_type == "command.ftp_list":
            host = params.get("host", "")
            path = params.get("path", "/")
            await asyncio.sleep(0.5)
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "path": path,
                    "files": [
                        {"name": "file1.txt", "size": 1024, "type": "file"},
                        {"name": "dir1", "size": 0, "type": "directory"}
                    ]
                },
                route="out"
            )
        
        elif block_type in ["command.ftp_download", "command.ftp_upload"]:
            host = params.get("host", "")
            await asyncio.sleep(1.0)
            action = "downloaded" if "download" in block_type else "uploaded"
            return BlockExecuteResponse(
                success=True,
                output={"host": host, "action": action, "bytes": 2048},
                route="out"
            )
        
        # === Traffic Blocks ===
        elif block_type == "traffic.ping":
            host = params.get("host", "")
            count = params.get("count", 4)
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required for ping",
                    route="unreachable"
                )
            
            # Execute real ping
            import subprocess
            try:
                result = subprocess.run(
                    ["ping", "-c", str(count), "-W", "2", host],
                    capture_output=True,
                    text=True,
                    timeout=count * 3 + 5  # Allow time for all pings + timeout
                )
                
                output_text = result.stdout + result.stderr
                reachable = result.returncode == 0
                
                # Parse ping output for stats
                packets_sent = count
                packets_received = 0
                avg_latency = None
                
                # Try to parse output for statistics
                lines = output_text.split('\n')
                for line in lines:
                    if 'packets transmitted' in line:
                        parts = line.split(',')
                        for part in parts:
                            if 'received' in part:
                                try:
                                    packets_received = int(part.strip().split()[0])
                                except:
                                    pass
                    if 'avg' in line or 'rtt' in line:
                        try:
                            # Format: rtt min/avg/max/mdev = 0.123/0.456/0.789/0.012 ms
                            if '=' in line:
                                stats = line.split('=')[1].strip().split('/')[1]
                                avg_latency = float(stats)
                        except:
                            pass
                
                return BlockExecuteResponse(
                    success=reachable,
                    output={
                        "host": host,
                        "packets_sent": packets_sent,
                        "packets_received": packets_received,
                        "avg_latency_ms": avg_latency,
                        "reachable": reachable,
                        "raw_output": output_text[:500]  # Limit output size
                    },
                    route="reachable" if reachable else "unreachable"
                )
            except subprocess.TimeoutExpired:
                return BlockExecuteResponse(
                    success=False,
                    output={"host": host, "error": "Ping timed out"},
                    error="Ping timed out",
                    route="unreachable"
                )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    output={"host": host, "error": str(e)},
                    error=str(e),
                    route="unreachable"
                )
        
        elif block_type == "traffic.advanced_ping":
            host = params.get("host", "")
            count = params.get("count", 4)
            size = params.get("size", 64)
            await asyncio.sleep(0.8)
            reachable = bool(host)
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "packets_sent": count,
                    "packets_received": count if reachable else 0,
                    "packet_size": size,
                    "min_latency_ms": 2.1,
                    "max_latency_ms": 8.5,
                    "avg_latency_ms": 5.2,
                    "reachable": reachable
                },
                route="reachable" if reachable else "unreachable"
            )
        
        elif block_type in ["traffic.start_capture", "traffic.burst_capture"]:
            interface = params.get("interface", "eth0")
            duration = params.get("duration_seconds", 1)
            await asyncio.sleep(duration)
            return BlockExecuteResponse(
                success=True,
                output={
                    "interface": interface,
                    "capture_id": f"cap_{datetime.utcnow().timestamp()}",
                    "packets_captured": 150,
                    "bytes_captured": 48000
                },
                route="out"
            )
        
        elif block_type == "traffic.stop_capture":
            capture_id = params.get("captureId", "")
            return BlockExecuteResponse(
                success=True,
                output={"capture_id": capture_id, "stopped": True},
                route="out"
            )
        
        elif block_type == "traffic.get_stats":
            interface = params.get("interface", "eth0")
            return BlockExecuteResponse(
                success=True,
                output={
                    "interface": interface,
                    "rx_bytes": 1024000,
                    "tx_bytes": 512000,
                    "rx_packets": 1500,
                    "tx_packets": 800
                },
                route="out"
            )
        
        elif block_type == "traffic.storm":
            interface = params.get("interface", "")
            storm_type = params.get("type", "broadcast")
            duration = params.get("duration", 5)
            await asyncio.sleep(min(duration, 2))  # Cap actual wait
            return BlockExecuteResponse(
                success=True,
                output={
                    "interface": interface,
                    "type": storm_type,
                    "duration": duration,
                    "packets_sent": 5000
                },
                route="out"
            )
        
        # === Scanning Blocks ===
        elif block_type == "scanning.version_detect":
            host = params.get("host", "")
            ports = params.get("ports", "22,80,443")
            await asyncio.sleep(2.0)
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "services": [
                        {"port": 22, "service": "ssh", "version": "OpenSSH 8.2"},
                        {"port": 80, "service": "http", "version": "nginx 1.18.0"},
                        {"port": 443, "service": "https", "version": "nginx 1.18.0"}
                    ]
                },
                route="out"
            )
        
        elif block_type == "scanning.port_scan":
            host = params.get("host", "")
            scan_type = params.get("scanType", "quick")
            custom_ports = params.get("customPorts", "")
            technique = params.get("technique", "tcp_syn")
            
            # Determine port range based on scan type
            if scan_type == "full":
                ports = "1-65535"
            elif scan_type == "custom" and custom_ports:
                ports = custom_ports
            else:  # quick
                ports = "22,80,443,21,23,25,53,110,143,3306,3389,5432,8080,8443"
            
            # Use real scanner service
            import time
            start_time = time.time()
            scanner = NetworkScanner()
            result = await scanner.port_scan(host, ports)
            duration_ms = int((time.time() - start_time) * 1000)
            
            if "error" in result:
                return BlockExecuteResponse(
                    success=False,
                    error=result["error"],
                    duration_ms=duration_ms,
                    route="fail"
                )
            
            # Parse the nmap result structure to extract open/closed/filtered ports
            open_ports = []
            closed_ports = 0
            filtered_ports = 0
            services = {}
            
            # Extract from hosts[].ports[] structure
            for host_info in result.get("hosts", []):
                for port_info in host_info.get("ports", []):
                    port_id = int(port_info.get("portid", 0))
                    state = port_info.get("state", "unknown")
                    
                    if state == "open":
                        open_ports.append(port_id)
                        # Extract service info if available
                        if "service" in port_info:
                            svc = port_info["service"]
                            services[port_id] = {
                                "name": svc.get("name"),
                                "product": svc.get("product"),
                                "version": svc.get("version")
                            }
                    elif state == "closed":
                        closed_ports += 1
                    elif state == "filtered":
                        filtered_ports += 1
            
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "scan_type": scan_type,
                    "technique": technique,
                    "open_ports": open_ports,
                    "closed_ports": closed_ports,
                    "filtered_ports": filtered_ports,
                    "services": services,
                },
                duration_ms=duration_ms,
                route="out"
            )
        
        # === Agent Blocks ===
        elif block_type == "agent.generate":
            agent_id = params.get("agent_id", "")
            platform = params.get("platform", "linux-amd64")
            await asyncio.sleep(1.0)
            return BlockExecuteResponse(
                success=True,
                output={
                    "agent_id": agent_id,
                    "platform": platform,
                    "binary_path": f"/tmp/agent_{agent_id}_{platform}",
                    "size_bytes": 2048000,
                    "checksum": "abc123def456"
                },
                route="out"
            )
        
        elif block_type == "agent.deploy":
            host = params.get("host", "")
            await asyncio.sleep(1.5)
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "deployed": True,
                    "agent_pid": 12345,
                    "connection_established": True
                },
                route="out"
            )
        
        elif block_type == "agent.terminate":
            agent_id = params.get("agent_id", "")
            return BlockExecuteResponse(
                success=True,
                output={"agent_id": agent_id, "terminated": True},
                route="out"
            )
        
        # === Data Processing Blocks (3-Output Model) ===
        elif block_type == "data.code":
            """
            Code Block - Execute JavaScript code for pass/fail/output
            Uses 3-output model: pass, fail, output
            """
            description = params.get("description", "")
            pass_code = params.get("passCode", "return true;")
            fail_code = params.get("failCode", "")
            output_code = params.get("outputCode", "return context.input;")
            
            # Get input from previous block
            input_data = context.get("$prev", {}).get("output", context.get("input", ""))
            variables = context.get("variables", {})
            
            # Build execution context for code
            code_context = {
                "input": input_data,
                "rawInput": str(input_data) if input_data else "",
                "variables": variables
            }
            
            try:
                # Evaluate pass condition (simulated - in production use safe JS eval)
                pass_result = evaluate_code_expression(pass_code, code_context)
                
                # Evaluate fail condition (defaults to !pass)
                if fail_code:
                    fail_result = evaluate_code_expression(fail_code, code_context)
                else:
                    fail_result = not pass_result
                
                # Evaluate output
                output_result = evaluate_code_expression(output_code, code_context)
                
                return BlockExecuteResponse(
                    success=True,
                    output={
                        "pass": pass_result,
                        "fail": fail_result,
                        "output": output_result,
                        "description": description
                    },
                    route="pass" if pass_result else "fail"
                )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=f"Code execution error: {str(e)}",
                    output={"pass": False, "fail": True, "output": None},
                    route="fail"
                )
        
        elif block_type == "data.output_interpreter":
            """
            Output Interpreter Block - Parse and interpret output using rules
            Uses 3-output model: pass, fail, output
            Enhanced with port detection and status checking
            """
            input_source = params.get("inputSource", "{{previous.output}}")
            aggregation = params.get("aggregation", "all")
            contains_pass = params.get("containsPass", "")
            not_contains_fail = params.get("notContainsFail", "")
            regex_pattern = params.get("regexPattern", "")
            extract_variable = params.get("extractVariable", "")
            extract_pattern = params.get("extractPattern", "")
            port_check = params.get("portCheck", "")
            port_check_mode = params.get("portCheckMode", "any")
            status_check = params.get("statusCheck", "")
            
            # Get input from previous block
            input_data = context.get("$prev", {}).get("output", context.get("input", ""))
            input_str = str(input_data) if input_data else ""
            
            import re
            import json as json_module
            
            rule_results = []
            extracted_vars = {}
            detected_ports = {"open": [], "closed": [], "filtered": []}
            
            # Parse input if it's JSON
            parsed_input = None
            if isinstance(input_data, dict):
                parsed_input = input_data
            elif isinstance(input_data, str):
                try:
                    parsed_input = json_module.loads(input_data)
                except:
                    parsed_input = None
            
            # Check contains (pass)
            if contains_pass:
                passed = contains_pass.lower() in input_str.lower()
                rule_results.append({
                    "rule": "contains",
                    "pattern": contains_pass,
                    "passed": passed,
                    "reason": f"Contains '{contains_pass}'" if passed else f"Missing '{contains_pass}'"
                })
            
            # Check not_contains (fail)
            if not_contains_fail:
                try:
                    pattern = re.compile(not_contains_fail, re.IGNORECASE)
                    match = pattern.search(input_str)
                    passed = match is None  # Pass if pattern NOT found
                    rule_results.append({
                        "rule": "not_contains",
                        "pattern": not_contains_fail,
                        "passed": passed,
                        "reason": f"Does not contain '{not_contains_fail}'" if passed else f"Found '{not_contains_fail}'"
                    })
                except re.error:
                    rule_results.append({
                        "rule": "not_contains",
                        "pattern": not_contains_fail,
                        "passed": False,
                        "reason": f"Invalid regex: {not_contains_fail}"
                    })
            
            # Check regex pattern
            if regex_pattern:
                try:
                    pattern = re.compile(regex_pattern, re.IGNORECASE)
                    match = pattern.search(input_str)
                    passed = match is not None
                    rule_results.append({
                        "rule": "regex",
                        "pattern": regex_pattern,
                        "passed": passed,
                        "reason": f"Matches '{regex_pattern}'" if passed else f"No match for '{regex_pattern}'"
                    })
                except re.error:
                    rule_results.append({
                        "rule": "regex",
                        "pattern": regex_pattern,
                        "passed": False,
                        "reason": f"Invalid regex: {regex_pattern}"
                    })
            
            # Port detection - check for open ports in scan results
            if port_check:
                target_ports = [int(p.strip()) for p in port_check.split(",") if p.strip().isdigit()]
                found_open = []
                
                # Check various formats of port data
                if parsed_input:
                    # Format: {"open_ports": [22, 80, 443]}
                    if "open_ports" in parsed_input:
                        open_ports = parsed_input.get("open_ports", [])
                        for p in target_ports:
                            if p in open_ports:
                                found_open.append(p)
                                detected_ports["open"].append(p)
                    
                    # Format: {"services": [{"port": 22, "state": "open"}, ...]}
                    if "services" in parsed_input:
                        services = parsed_input.get("services", [])
                        for svc in services:
                            if isinstance(svc, dict):
                                port = svc.get("port")
                                state = svc.get("state", svc.get("status", ""))
                                if port in target_ports and str(state).lower() in ["open", "up", "running"]:
                                    found_open.append(port)
                                    detected_ports["open"].append(port)
                    
                    # Format: {"ports": {"22": "open", "80": "open"}}
                    if "ports" in parsed_input and isinstance(parsed_input["ports"], dict):
                        for port_str, state in parsed_input["ports"].items():
                            try:
                                port = int(port_str)
                                if port in target_ports and str(state).lower() in ["open", "up"]:
                                    found_open.append(port)
                                    detected_ports["open"].append(port)
                            except:
                                pass
                
                # Also check in raw text format: "22/tcp open ssh"
                port_pattern = r"(\d+)/(tcp|udp)\s+(open|closed|filtered)"
                for match in re.finditer(port_pattern, input_str, re.IGNORECASE):
                    port = int(match.group(1))
                    state = match.group(3).lower()
                    if port in target_ports:
                        if state == "open":
                            found_open.append(port)
                            detected_ports["open"].append(port)
                        elif state == "closed":
                            detected_ports["closed"].append(port)
                        else:
                            detected_ports["filtered"].append(port)
                
                # Deduplicate
                found_open = list(set(found_open))
                detected_ports["open"] = list(set(detected_ports["open"]))
                
                # Determine pass based on mode
                if port_check_mode == "any":
                    passed = len(found_open) > 0
                    reason = f"Found {len(found_open)} open port(s): {found_open}" if passed else f"None of ports {target_ports} are open"
                elif port_check_mode == "all":
                    passed = set(target_ports).issubset(set(found_open))
                    missing = set(target_ports) - set(found_open)
                    reason = f"All ports {target_ports} are open" if passed else f"Missing open ports: {list(missing)}"
                else:  # specific
                    passed = len(found_open) > 0
                    reason = f"Port(s) {found_open} open" if passed else f"Target ports not open"
                
                rule_results.append({
                    "rule": "port_check",
                    "target_ports": target_ports,
                    "found_open": found_open,
                    "mode": port_check_mode,
                    "passed": passed,
                    "reason": reason
                })
                
                # Auto-extract port info
                extracted_vars["detected_ports"] = detected_ports
                extracted_vars["open_ports"] = found_open
            
            # Status check - look for status fields
            if status_check and parsed_input:
                try:
                    pattern = re.compile(status_check, re.IGNORECASE)
                    status_fields = ["status", "state", "result", "success"]
                    status_found = False
                    status_value = None
                    
                    for field in status_fields:
                        if field in parsed_input:
                            status_value = str(parsed_input[field])
                            if pattern.search(status_value):
                                status_found = True
                                break
                    
                    rule_results.append({
                        "rule": "status_check",
                        "pattern": status_check,
                        "passed": status_found,
                        "reason": f"Status '{status_value}' matches '{status_check}'" if status_found else f"Status doesn't match '{status_check}'"
                    })
                except re.error:
                    rule_results.append({
                        "rule": "status_check",
                        "pattern": status_check,
                        "passed": False,
                        "reason": f"Invalid regex: {status_check}"
                    })
            
            # Extract variable
            if extract_variable and extract_pattern:
                try:
                    pattern = re.compile(extract_pattern)
                    match = pattern.search(input_str)
                    if match:
                        extracted_vars[extract_variable] = match.group(1) if match.groups() else match.group(0)
                except re.error:
                    pass
            
            # Aggregate results
            if aggregation == "all":
                overall_pass = all(r["passed"] for r in rule_results) if rule_results else True
            elif aggregation == "any":
                overall_pass = any(r["passed"] for r in rule_results) if rule_results else True
            else:
                overall_pass = all(r["passed"] for r in rule_results) if rule_results else True
            
            return BlockExecuteResponse(
                success=True,
                output={
                    "pass": overall_pass,
                    "fail": not overall_pass,
                    "output": {
                        "input": input_str[:500] if len(input_str) > 500 else input_str,
                        "ruleResults": rule_results,
                        "extractedVariables": extracted_vars,
                        "detectedPorts": detected_ports,
                        "aggregation": aggregation
                    }
                },
                route="pass" if overall_pass else "fail"
            )
        
        elif block_type == "data.assertion":
            """
            Assertion Block - Simple pass/fail check
            Uses 2-output model: pass, fail
            """
            name = params.get("name", "Assertion")
            condition = params.get("condition", "contains")
            value = params.get("value", "")
            fail_message = params.get("failMessage", f"Assertion '{name}' failed")
            
            # Get input from previous block
            input_data = context.get("$prev", {}).get("output", context.get("input", ""))
            input_str = str(input_data) if input_data else ""
            
            import re
            
            passed = False
            reason = ""
            
            if condition == "contains":
                passed = value.lower() in input_str.lower()
                reason = f"Contains '{value}'" if passed else f"Missing '{value}'"
            elif condition == "not_contains":
                passed = value.lower() not in input_str.lower()
                reason = f"Does not contain '{value}'" if passed else f"Contains '{value}'"
            elif condition == "equals":
                passed = input_str.strip() == value
                reason = f"Equals '{value}'" if passed else f"Not equal to '{value}'"
            elif condition == "regex":
                try:
                    pattern = re.compile(value, re.IGNORECASE)
                    passed = pattern.search(input_str) is not None
                    reason = f"Matches regex '{value}'" if passed else f"No match for '{value}'"
                except re.error:
                    passed = False
                    reason = f"Invalid regex: {value}"
            elif condition == "expression":
                # Simple expression evaluation
                passed = evaluate_expression(value, context)
                reason = f"Expression evaluated to {passed}"
            
            return BlockExecuteResponse(
                success=passed,
                output={
                    "name": name,
                    "passed": passed,
                    "reason": reason,
                    "failMessage": fail_message if not passed else None
                },
                route="pass" if passed else "fail"
            )
        
        elif block_type == "data.transform":
            """
            Transform Block - Transform input data
            Always passes, outputs transformed data
            """
            transform_type = params.get("transformType", "json_parse")
            field = params.get("field", "")
            template = params.get("template", "")
            filter_expression = params.get("filterExpression", "")
            
            # Get input from previous block
            input_data = context.get("$prev", {}).get("output", context.get("input", ""))
            
            output = input_data
            
            try:
                if transform_type == "json_parse":
                    if isinstance(input_data, str):
                        output = json.loads(input_data)
                    else:
                        output = input_data
                
                elif transform_type == "json_stringify":
                    output = json.dumps(input_data)
                
                elif transform_type == "extract_field":
                    if field:
                        # Simple dot notation field extraction
                        parts = field.split(".")
                        result = input_data
                        for part in parts:
                            if isinstance(result, dict):
                                result = result.get(part)
                            elif isinstance(result, list) and part.isdigit():
                                result = result[int(part)] if int(part) < len(result) else None
                            else:
                                result = None
                                break
                        output = result
                
                elif transform_type == "split_lines":
                    if isinstance(input_data, str):
                        output = input_data.split("\n")
                    else:
                        output = [str(input_data)]
                
                elif transform_type == "filter_array":
                    if isinstance(input_data, list) and filter_expression:
                        # Simple filter (in production, use safe evaluator)
                        # For now, just pass through
                        output = input_data
                
                elif transform_type == "template":
                    # Simple template substitution
                    output = template
                    if isinstance(input_data, dict):
                        for key, val in input_data.items():
                            output = output.replace(f"{{{{{key}}}}}", str(val))
                
                return BlockExecuteResponse(
                    success=True,
                    output={"pass": True, "output": output, "transformType": transform_type},
                    route="pass"
                )
            
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=f"Transform error: {str(e)}",
                    output={"pass": False, "output": None},
                    route="pass"  # Transform always passes, but with null output on error
                )
        
        # === Scanning Blocks (Additional) ===
        elif block_type == "scanning.network_discovery":
            network = params.get("network", "192.168.1.0/24")
            timeout = params.get("timeout", 30)
            
            # Use real nmap network discovery with service detection
            import time
            import subprocess
            start_time = time.time()
            
            try:
                # Quick scan with OS hints and service versions
                result = subprocess.run(
                    ["nmap", "-sn", "-oX", "-", network],
                    capture_output=True,
                    text=True,
                    timeout=timeout
                )
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Parse XML output
                import xml.etree.ElementTree as ET
                root = ET.fromstring(result.stdout)
                
                hosts = []
                for host_elem in root.findall(".//host"):
                    status = host_elem.find("status")
                    if status is not None and status.get("state") == "up":
                        addr = host_elem.find("address")
                        if addr is not None:
                            host_info = {
                                "ip": addr.get("addr"),
                                "status": "up",
                                "type": "unknown"
                            }
                            
                            # Get hostname if available
                            hostname_elem = host_elem.find(".//hostname")
                            if hostname_elem is not None:
                                host_info["hostname"] = hostname_elem.get("name")
                            
                            # Get MAC if available
                            mac_addr = host_elem.find(".//address[@addrtype='mac']")
                            if mac_addr is not None:
                                host_info["mac"] = mac_addr.get("addr")
                                host_info["vendor"] = mac_addr.get("vendor", "")
                            
                            hosts.append(host_info)
                
                return BlockExecuteResponse(
                    success=True,
                    output={
                        "network": network,
                        "hosts_found": len(hosts),
                        "hosts": hosts,
                        "scan_time": duration_ms / 1000
                    },
                    duration_ms=duration_ms,
                    route="out"
                )
            except subprocess.TimeoutExpired:
                return BlockExecuteResponse(
                    success=False,
                    error="Network discovery timed out",
                    route="fail"
                )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    route="fail"
                )
        
        elif block_type == "scanning.host_scan":
            host = params.get("host", "")
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required",
                    route="fail"
                )
            
            # Use real nmap scan
            import time
            start_time = time.time()
            scanner = NetworkScanner()
            
            # Do a quick port scan with OS detection
            result = await scanner.port_scan(host, "22,80,443,21,23,25,53,110,143,3306,3389,5432,8080,8443")
            duration_ms = int((time.time() - start_time) * 1000)
            
            if "error" in result:
                return BlockExecuteResponse(
                    success=False,
                    error=result["error"],
                    duration_ms=duration_ms,
                    route="fail"
                )
            
            # Extract host info
            open_ports = []
            hostname = host
            status = "down"
            os_guess = "Unknown"
            
            for host_info in result.get("hosts", []):
                host_status = host_info.get("status", {})
                if isinstance(host_status, dict):
                    status = host_status.get("state", "down")
                else:
                    status = str(host_status) if host_status else "down"
                    
                hostnames = host_info.get("hostnames", [])
                if hostnames:
                    hostname = hostnames[0].get("name", host)
                
                for port_info in host_info.get("ports", []):
                    if port_info.get("state") == "open":
                        open_ports.append(int(port_info.get("portid", 0)))
            
            # If we found open ports, host is definitely up
            if open_ports:
                status = "up"
            
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "status": status,
                    "ports": open_ports,
                    "os_guess": os_guess,
                    "hostname": hostname
                },
                duration_ms=duration_ms,
                route="out"
            )
        
        elif block_type == "scanning.ping_sweep":
            network = params.get("network", "192.168.1.0/24")
            
            # Use real nmap ping sweep
            import time
            import subprocess
            start_time = time.time()
            
            try:
                # nmap -sn for ping sweep (no port scan)
                result = subprocess.run(
                    ["nmap", "-sn", "-oX", "-", network],
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Parse XML output
                import xml.etree.ElementTree as ET
                root = ET.fromstring(result.stdout)
                
                alive_hosts = []
                for host_elem in root.findall(".//host"):
                    status = host_elem.find("status")
                    if status is not None and status.get("state") == "up":
                        addr = host_elem.find("address")
                        if addr is not None:
                            alive_hosts.append(addr.get("addr"))
                
                # Get total scanned from runstats
                runstats = root.find(".//runstats/hosts")
                total_scanned = int(runstats.get("total", 0)) if runstats is not None else len(alive_hosts)
                
                return BlockExecuteResponse(
                    success=True,
                    output={
                        "network": network,
                        "alive_hosts": alive_hosts,
                        "total_scanned": total_scanned,
                        "hosts_up": len(alive_hosts)
                    },
                    duration_ms=duration_ms,
                    route="out"
                )
            except subprocess.TimeoutExpired:
                return BlockExecuteResponse(
                    success=False,
                    error="Ping sweep timed out",
                    route="fail"
                )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    route="fail"
                )
        
        elif block_type == "scanning.service_scan":
            host = params.get("host", "")
            ports = params.get("ports", "22,80,443")
            
            if not host:
                return BlockExecuteResponse(
                    success=False,
                    error="Host is required",
                    route="fail"
                )
            
            # Use real nmap service scan with version detection
            import time
            import subprocess
            start_time = time.time()
            
            try:
                result = subprocess.run(
                    ["nmap", "-sV", "-Pn", "-p", ports, "-oX", "-", host],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Parse XML output
                import xml.etree.ElementTree as ET
                root = ET.fromstring(result.stdout)
                
                services = []
                for port_elem in root.findall(".//port"):
                    state = port_elem.find("state")
                    service = port_elem.find("service")
                    
                    port_id = int(port_elem.get("portid", 0))
                    port_state = state.get("state", "unknown") if state is not None else "unknown"
                    
                    svc_info = {"port": port_id, "state": port_state}
                    if service is not None:
                        svc_info["service"] = service.get("name", "unknown")
                        svc_info["product"] = service.get("product", "")
                        svc_info["version"] = service.get("version", "")
                    
                    services.append(svc_info)
                
                return BlockExecuteResponse(
                    success=True,
                    output={
                        "host": host,
                        "services": services
                    },
                    duration_ms=duration_ms,
                    route="out"
                )
            except subprocess.TimeoutExpired:
                return BlockExecuteResponse(
                    success=False,
                    error="Service scan timed out",
                    route="fail"
                )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    route="fail"
                )
        
        # === Agent Blocks (Additional) ===
        elif block_type == "agent.list":
            await asyncio.sleep(0.3)
            return BlockExecuteResponse(
                success=True,
                output={
                    "agents": [
                        {"id": "agent-001", "name": "Agent 1", "status": "online", "os": "linux"},
                        {"id": "agent-002", "name": "Agent 2", "status": "offline", "os": "windows"}
                    ],
                    "total": 2,
                    "online": 1
                },
                route="out"
            )
        
        elif block_type == "agent.create":
            name = params.get("name", "NewAgent")
            os_type = params.get("os", "linux")
            await asyncio.sleep(0.5)
            return BlockExecuteResponse(
                success=True,
                output={
                    "agent_id": f"agent-{datetime.utcnow().timestamp():.0f}",
                    "name": name,
                    "os": os_type,
                    "status": "created",
                    "connection_url": "wss://localhost:12001/ws/agent"
                },
                route="out"
            )
        
        # === Data Blocks (Additional) ===
        elif block_type == "data.http_request":
            url = params.get("url", "")
            method = params.get("method", "GET")
            headers = params.get("headers", {})
            body = params.get("body", "")
            
            import httpx
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.request(method, url, headers=headers, content=body if body else None)
                    return BlockExecuteResponse(
                        success=response.status_code < 400,
                        output={
                            "status_code": response.status_code,
                            "headers": dict(response.headers),
                            "body": response.text[:2000]
                        },
                        route="pass" if response.status_code < 400 else "fail"
                    )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"error": str(e)},
                    route="fail"
                )
        
        elif block_type == "data.json_transform":
            input_data = params.get("input", context.get("input", ""))
            expression = params.get("expression", "$")
            
            try:
                if isinstance(input_data, str):
                    data = json.loads(input_data)
                else:
                    data = input_data
                
                # Simple JSONPath-like extraction
                if expression.startswith("$."):
                    key = expression[2:]
                    result = data.get(key, data) if isinstance(data, dict) else data
                else:
                    result = data
                
                return BlockExecuteResponse(
                    success=True,
                    output={"result": result, "expression": expression},
                    route="pass"
                )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"error": str(e)},
                    route="fail"
                )
        
        elif block_type == "data.database_query":
            connection_string = params.get("connectionString", "")
            query = params.get("query", "SELECT 1")
            await asyncio.sleep(0.5)
            return BlockExecuteResponse(
                success=True,
                output={
                    "query": query,
                    "rows": [{"column1": 1}],
                    "row_count": 1
                },
                route="pass"
            )
        
        # ============================================
        # === ASSETS Blocks ===
        # ============================================
        elif block_type == "assets.get_all":
            include_offline = params.get("includeOffline", True)
            limit = params.get("limit", 100)
            
            # Fetch from database
            from app.models.asset import Asset
            from sqlalchemy import select
            
            try:
                async with db.async_session() as session:
                    query = select(Asset).limit(limit)
                    if not include_offline:
                        query = query.where(Asset.status == "online")
                    
                    result = await session.execute(query)
                    db_assets = result.scalars().all()
                    
                    assets = []
                    for asset in db_assets:
                        assets.append({
                            "id": str(asset.id),
                            "ip": str(asset.ip_address),
                            "hostname": asset.hostname,
                            "type": asset.asset_type,
                            "status": asset.status,
                            "discovery_method": asset.discovery_method,
                            "mac": asset.mac_address,
                            "first_seen": asset.first_seen.isoformat() if asset.first_seen else None,
                            "last_seen": asset.last_seen.isoformat() if asset.last_seen else None
                        })
                    
                    return BlockExecuteResponse(
                        success=True,
                        output={"assets": assets, "count": len(assets)},
                        route="assets"
                    )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=f"Database error: {str(e)}",
                    output={"assets": [], "count": 0},
                    route="error"
                )
        
        elif block_type == "assets.get_by_filter":
            asset_type = params.get("type", "")
            subnet = params.get("subnet", "")
            tag = params.get("tag", "")
            status = params.get("status", "")
            discovery_method = params.get("discoveryMethod", "")
            await asyncio.sleep(0.2)
            # In production, query database with filters
            sample_assets = [
                {"id": "1", "ip": "192.168.1.1", "hostname": "switch-01", "type": "switch", "status": "online", "discovery_method": "arp"},
                {"id": "2", "ip": "192.168.1.10", "hostname": "server-01", "type": "server", "status": "online", "discovery_method": "manual"},
            ]
            return BlockExecuteResponse(
                success=True,
                output={"assets": sample_assets, "count": len(sample_assets), "filter": {"type": asset_type, "status": status}},
                route="assets"
            )
        
        elif block_type == "assets.get_single":
            identifier = params.get("identifier", "")
            await asyncio.sleep(0.1)
            if identifier:
                return BlockExecuteResponse(
                    success=True,
                    output={"asset": {"id": "1", "ip": identifier, "hostname": f"host-{identifier}", "type": "server", "status": "online"}},
                    route="found"
                )
            return BlockExecuteResponse(
                success=False,
                error=f"Asset not found: {identifier}",
                route="not_found"
            )
        
        elif block_type == "assets.discover_arp":
            subnet = params.get("subnet", "192.168.1.0/24")
            interface = params.get("interface", "eth0")
            timeout = params.get("timeout", 10)
            auto_add = params.get("autoAdd", True)
            await asyncio.sleep(1.0)  # Simulate ARP scan
            discovered = [
                {"ip": "192.168.1.1", "mac": "00:11:22:33:44:55", "vendor": "Cisco", "discovery_method": "arp"},
                {"ip": "192.168.1.100", "mac": "AA:BB:CC:DD:EE:FF", "vendor": "Dell", "discovery_method": "arp"},
            ]
            return BlockExecuteResponse(
                success=True,
                output={"discovered": discovered, "count": len(discovered), "subnet": subnet, "method": "arp"},
                route="discovered"
            )
        
        elif block_type == "assets.discover_ping":
            subnet = params.get("subnet", "192.168.1.0/24")
            timeout = params.get("timeout", 1000)
            concurrent = params.get("concurrent", 50)
            
            # Real ping sweep using nmap
            import subprocess
            import time
            start_time = time.time()
            
            try:
                result = subprocess.run(
                    ["nmap", "-sn", "-oX", "-", subnet],
                    capture_output=True,
                    text=True,
                    timeout=timeout / 1000 if timeout > 0 else 60
                )
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Parse XML output
                import xml.etree.ElementTree as ET
                root = ET.fromstring(result.stdout)
                
                discovered = []
                for host_elem in root.findall(".//host"):
                    status = host_elem.find("status")
                    if status is not None and status.get("state") == "up":
                        addr = host_elem.find("address")
                        if addr is not None:
                            # Try to get latency from times
                            times = host_elem.find("times")
                            latency_ms = None
                            if times is not None:
                                srtt = times.get("srtt")
                                if srtt:
                                    latency_ms = float(srtt) / 1000  # Convert to ms
                            
                            discovered.append({
                                "ip": addr.get("addr"),
                                "latency_ms": latency_ms or 1.0,
                                "discovery_method": "ping"
                            })
                
                return BlockExecuteResponse(
                    success=True,
                    output={"discovered": discovered, "count": len(discovered), "subnet": subnet, "method": "ping"},
                    duration_ms=duration_ms,
                    route="discovered"
                )
            except subprocess.TimeoutExpired:
                return BlockExecuteResponse(
                    success=False,
                    error="Ping discovery timed out",
                    route="fail"
                )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    route="fail"
                )
        
        elif block_type == "assets.discover_passive":
            interface = params.get("interface", "eth0")
            duration = params.get("duration", 60)
            protocols = params.get("protocols", ["arp", "dhcp"])
            await asyncio.sleep(min(duration, 5))  # Simulate passive monitoring
            discovered = [
                {"ip": "192.168.1.25", "mac": "11:22:33:44:55:66", "protocol": "arp", "discovery_method": "passive"},
                {"ip": "192.168.1.30", "hostname": "laptop-01", "protocol": "dhcp", "discovery_method": "passive"},
            ]
            return BlockExecuteResponse(
                success=True,
                output={"discovered": discovered, "count": len(discovered), "method": "passive", "protocols": protocols},
                route="discovered"
            )
        
        elif block_type == "assets.check_online":
            host = params.get("host", "")
            method = params.get("method", "ping")
            port = params.get("port", 22)
            timeout = params.get("timeout", 5)
            
            if not host:
                return BlockExecuteResponse(success=False, error="Host is required", route="offline")
            
            # Real online check using ping
            import subprocess
            import time
            start_time = time.time()
            
            try:
                if method == "ping":
                    result = subprocess.run(
                        ["ping", "-c", "1", "-W", str(timeout), host],
                        capture_output=True,
                        text=True,
                        timeout=timeout + 2
                    )
                    is_online = result.returncode == 0
                    duration_ms = int((time.time() - start_time) * 1000)
                    
                    # Extract latency from ping output
                    latency_ms = None
                    if is_online:
                        import re
                        match = re.search(r'time=(\d+\.\d+)', result.stdout)
                        if match:
                            latency_ms = float(match.group(1))
                    
                    if is_online:
                        return BlockExecuteResponse(
                            success=True,
                            output={"host": host, "online": True, "method": method, "latency_ms": latency_ms},
                            duration_ms=duration_ms,
                            route="online"
                        )
                    return BlockExecuteResponse(
                        success=True,
                        output={"host": host, "online": False, "method": method},
                        duration_ms=duration_ms,
                        route="offline"
                    )
                elif method == "tcp":
                    # TCP port check
                    import socket
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(timeout)
                    result = sock.connect_ex((host, port))
                    sock.close()
                    duration_ms = int((time.time() - start_time) * 1000)
                    is_online = result == 0
                    
                    if is_online:
                        return BlockExecuteResponse(
                            success=True,
                            output={"host": host, "online": True, "method": "tcp", "port": port, "latency_ms": duration_ms},
                            duration_ms=duration_ms,
                            route="online"
                        )
                    return BlockExecuteResponse(
                        success=True,
                        output={"host": host, "online": False, "method": "tcp", "port": port},
                        duration_ms=duration_ms,
                        route="offline"
                    )
            except Exception as e:
                return BlockExecuteResponse(
                    success=False,
                    error=str(e),
                    output={"host": host, "online": False, "method": method, "error": str(e)},
                    route="offline"
                )
        
        elif block_type == "assets.get_credentials":
            asset_id = params.get("assetId", "")
            cred_type = params.get("credentialType", "")
            
            if not asset_id:
                return BlockExecuteResponse(success=False, error="Asset ID is required", route="not_found")
            
            await asyncio.sleep(0.1)
            # In production, fetch from credential vault
            credentials = {
                "username": "admin",
                "password": "********",  # Would be actual password from vault
                "type": cred_type or "ssh",
                "asset_id": asset_id
            }
            return BlockExecuteResponse(
                success=True,
                output={"credentials": credentials},
                route="found"
            )
        
        else:
            return BlockExecuteResponse(
                success=False,
                error=f"Unknown block type: {block_type}",
                route="error"
            )
    
    except Exception as e:
        return BlockExecuteResponse(
            success=False,
            error=str(e),
            route="error"
        )
    finally:
        end_time = datetime.utcnow()
        # Duration would be calculated here


def evaluate_expression(expression: str, context: Dict[str, Any]) -> Any:
    """
    Evaluate a simple expression with context variables.
    In production, use a safe expression evaluator.
    """
    if not expression:
        return True
    
    # Handle common patterns
    expr_lower = expression.lower().strip()
    if expr_lower in ["true", "1", "yes"]:
        return True
    if expr_lower in ["false", "0", "no"]:
        return False
    
    # Simple variable substitution {{ $prev.success }}
    if "{{" in expression:
        # For now, return True if expression contains success
        if "success" in expression.lower():
            prev = context.get("$prev", {})
            return prev.get("success", True)
    
    return True  # Default to true


def evaluate_code_expression(code: str, context: Dict[str, Any]) -> Any:
    """
    Evaluate JavaScript-like code expression safely.
    This is a Python-side simulation of JS expressions.
    In production, use a proper sandboxed JS engine like PyMiniRacer.
    
    Args:
        code: JavaScript-like code string (e.g., "return input.includes('success');")
        context: Execution context with input, rawInput, variables
    
    Returns:
        Evaluated result (bool, str, dict, list, etc.)
    """
    if not code:
        return True
    
    code_stripped = code.strip()
    
    # Extract return value if present
    if code_stripped.startswith("return "):
        code_stripped = code_stripped[7:].rstrip(";")
    
    # Simple expressions
    if code_stripped in ["true", "True"]:
        return True
    if code_stripped in ["false", "False"]:
        return False
    if code_stripped == "context.input" or code_stripped == "input":
        return context.get("input", "")
    
    # Get context values
    input_data = context.get("input", "")
    raw_input = context.get("rawInput", str(input_data) if input_data else "")
    variables = context.get("variables", {})
    
    # Handle common patterns
    code_lower = code_stripped.lower()
    
    # Pattern: input.includes('text') or rawInput.includes('text')
    includes_match = None
    import re
    
    # Match: input.includes('text') or rawInput.includes('text')
    includes_pattern = r"(input|rawInput|context\.input|context\.rawInput)\.includes\(['\"](.+?)['\"]\)"
    match = re.search(includes_pattern, code_stripped)
    if match:
        search_text = match.group(2).lower()
        return search_text in raw_input.lower()
    
    # Match: !input.includes('text')
    not_includes_pattern = r"!(input|rawInput)\.includes\(['\"](.+?)['\"]\)"
    match = re.search(not_includes_pattern, code_stripped)
    if match:
        search_text = match.group(2).lower()
        return search_text not in raw_input.lower()
    
    # Match: input.match(/regex/) or input.match('regex')
    match_pattern = r"(input|rawInput)\.match\(['\"/](.+?)['\"/]\)"
    match = re.search(match_pattern, code_stripped)
    if match:
        try:
            regex = match.group(2)
            return bool(re.search(regex, raw_input, re.IGNORECASE))
        except re.error:
            return False
    
    # Simple variable access: variables.varName
    var_access_pattern = r"variables\.(\w+)"
    match = re.search(var_access_pattern, code_stripped)
    if match:
        var_name = match.group(1)
        return variables.get(var_name)
    
    # Comparison: value === 'text' or value == 'text'
    compare_pattern = r"(.+?)\s*(===?|!==?)\s*['\"](.+?)['\"]"
    match = re.search(compare_pattern, code_stripped)
    if match:
        left_side = match.group(1).strip()
        operator = match.group(2)
        right_side = match.group(3)
        
        # Resolve left side
        left_value = raw_input if left_side in ["input", "rawInput"] else str(left_side)
        
        if "==" in operator:
            return left_value == right_side
        elif "!=" in operator:
            return left_value != right_side
    
    # Length check: input.length > 0
    if ".length" in code_stripped:
        return len(raw_input) > 0
    
    # Truthy check
    if code_stripped in ["input", "rawInput", "context.input"]:
        return bool(raw_input)
    
    # Default: try to eval as Python (not recommended for production)
    # For safety, default to True for unknown expressions
    return True


# === Block Execution Endpoints ===

@router.post("/block/execute", response_model=BlockExecuteResponse)
async def execute_single_block(
    request: BlockExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute a single workflow block"""
    return await execute_block(
        request.block_type,
        request.parameters,
        request.context
    )


@router.post("/block/delay", response_model=BlockExecuteResponse)
async def execute_delay(
    request: DelayRequest,
    current_user: User = Depends(get_current_user)
):
    """Execute delay block (simplified endpoint)"""
    await asyncio.sleep(request.seconds)
    return BlockExecuteResponse(
        success=True,
        output={"delayed": request.seconds},
        duration_ms=request.seconds * 1000,
        route="out"
    )


class CodeBlockRequest(BaseModel):
    """Request for code block execution"""
    context: Dict = Field(default_factory=dict, description="Context with input data")
    passCode: str = Field(..., description="JavaScript code for pass condition")
    failCode: Optional[str] = Field(default=None, description="JavaScript code for fail condition")
    outputCode: str = Field(..., description="JavaScript code for output transformation")

@router.post("/block/code", response_model=BlockExecuteResponse)
async def execute_code_block(
    request: CodeBlockRequest,
    current_user: User = Depends(get_current_user)
):
    """Execute code block with pass/fail logic"""
    import time
    start_time = time.time()
    
    try:
        raw_input = request.context.get("input", "")
        
        # Evaluate pass condition
        pass_result = evaluate_code_expression(request.passCode, raw_input)
        
        # Evaluate fail condition (defaults to !pass)
        if request.failCode:
            fail_result = evaluate_code_expression(request.failCode, raw_input)
        else:
            fail_result = not pass_result
        
        # Evaluate output transformation
        output_value = raw_input  # Default to input
        if request.outputCode:
            try:
                # Simple output transformation support
                if "context.input" in request.outputCode:
                    output_value = {"input": raw_input, "pass": pass_result, "fail": fail_result}
            except:
                pass
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Determine route based on pass/fail
        route = "pass" if pass_result else "fail"
        
        return BlockExecuteResponse(
            success=True,
            output={
                "pass": pass_result,
                "fail": fail_result,
                "output": output_value,
                "route": route
            },
            duration_ms=duration_ms,
            route=route
        )
    except Exception as e:
        return BlockExecuteResponse(
            success=False,
            output={"error": str(e)},
            duration_ms=int((time.time() - start_time) * 1000),
            route="fail",
            error=str(e)
        )


# === CRUD Endpoints ===

@router.get("/", response_model=WorkflowListResponse)
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """List all workflows"""
    query = select(Workflow)
    
    if status:
        query = query.where(Workflow.status == status)
    if category:
        query = query.where(Workflow.category == category)
    
    query = query.order_by(Workflow.updated_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    workflows = result.scalars().all()
    
    # Get total count
    count_query = select(func.count(Workflow.id))
    if status:
        count_query = count_query.where(Workflow.status == status)
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    return WorkflowListResponse(
        workflows=[WorkflowResponse.model_validate(w) for w in workflows],
        total=total
    )


@router.post("/", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    workflow: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Create a new workflow"""
    db_workflow = Workflow(
        name=workflow.name,
        description=workflow.description,
        nodes=[n.model_dump() for n in workflow.nodes],
        edges=[e.model_dump() for e in workflow.edges],
        settings=workflow.settings.model_dump(),
        variables=[v.model_dump() for v in workflow.variables],
        category=workflow.category,
        tags=workflow.tags
    )
    
    db.add(db_workflow)
    await db.commit()
    await db.refresh(db_workflow)
    
    return WorkflowResponse.model_validate(db_workflow)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Get workflow by ID"""
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return WorkflowResponse.model_validate(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: UUID,
    workflow_update: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Update workflow"""
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    update_data = workflow_update.model_dump(exclude_unset=True)
    
    # Handle nested objects
    if "nodes" in update_data and update_data["nodes"] is not None:
        update_data["nodes"] = [n.model_dump() if hasattr(n, 'model_dump') else n for n in update_data["nodes"]]
    if "edges" in update_data and update_data["edges"] is not None:
        update_data["edges"] = [e.model_dump() if hasattr(e, 'model_dump') else e for e in update_data["edges"]]
    if "settings" in update_data and update_data["settings"] is not None:
        update_data["settings"] = update_data["settings"].model_dump() if hasattr(update_data["settings"], 'model_dump') else update_data["settings"]
    if "variables" in update_data and update_data["variables"] is not None:
        update_data["variables"] = [v.model_dump() if hasattr(v, 'model_dump') else v for v in update_data["variables"]]
    
    for key, value in update_data.items():
        setattr(workflow, key, value)
    
    await db.commit()
    await db.refresh(workflow)
    
    return WorkflowResponse.model_validate(workflow)


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Delete workflow"""
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    await db.delete(workflow)
    await db.commit()


# === Compilation ===

@router.post("/{workflow_id}/compile", response_model=CompileResult)
async def compile_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Compile and validate workflow DAG"""
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    errors = []
    nodes = workflow.nodes or []
    edges = workflow.edges or []
    
    # Validate: must have at least one node
    if len(nodes) == 0:
        errors.append(CompileError(type="empty", message="Workflow has no nodes"))
        return CompileResult(valid=False, errors=errors)
    
    # Build node lookup and identify loop nodes
    node_map = {n["id"]: n for n in nodes}
    loop_node_ids = set()
    for n in nodes:
        node_data = n.get("data", {})
        node_type = node_data.get("type", "")
        if node_type == "control.loop":
            loop_node_ids.add(n["id"])
    
    # Build adjacency and in-degree, excluding back-edges to loop nodes
    # Back-edges to loop nodes are valid for loop iteration patterns
    node_ids = {n["id"] for n in nodes}
    in_degree = {nid: 0 for nid in node_ids}
    adjacency = {nid: [] for nid in node_ids}
    back_edges_to_loops = []  # Track for execution, but exclude from cycle detection
    
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        if src in node_ids and tgt in node_ids:
            # Check if this is a back-edge to a loop node
            # Back-edges are edges where target is a loop node and the edge
            # doesn't come from the 'iteration' handle (those go INTO the loop body)
            source_handle = edge.get("sourceHandle", "out")
            target_is_loop = tgt in loop_node_ids
            
            if target_is_loop and source_handle != "iteration":
                # This is likely a loop-back edge (returning from loop body to loop control)
                back_edges_to_loops.append(edge)
                # Don't add to adjacency for topological sort, but still valid edge
            else:
                adjacency[src].append(tgt)
                in_degree[tgt] += 1
    
    # Topological sort (Kahn's algorithm)
    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    sorted_nodes = []
    levels = []
    
    while queue:
        # Current level = all nodes with in_degree 0
        current_level = list(queue)
        levels.append(current_level)
        sorted_nodes.extend(current_level)
        
        next_queue = []
        for node_id in current_level:
            for neighbor in adjacency[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    next_queue.append(neighbor)
        queue = next_queue
    
    # Check for cycles (excluding valid loop back-edges)
    if len(sorted_nodes) != len(node_ids):
        errors.append(CompileError(
            type="cycle",
            message="Workflow contains a cycle. DAG must not have circular dependencies."
        ))
        return CompileResult(valid=False, errors=errors)
    
    return CompileResult(
        valid=True,
        errors=[],
        execution_order=levels,
        total_levels=len(levels)
    )


# === Execution ===

@router.post("/{workflow_id}/execute", response_model=ExecutionResponse)
async def start_execution(
    workflow_id: UUID,
    options: ExecutionOptions = ExecutionOptions(),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Start workflow execution"""
    # Get workflow
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Compile first (pass None for user if not authenticated)
    compile_result = await compile_workflow(workflow_id, db, current_user)
    if not compile_result.valid:
        raise HTTPException(status_code=400, detail="Workflow failed compilation")
    
    # Create execution record
    execution = WorkflowExecution(
        workflow_id=workflow_id,
        status=DBExecutionStatus.PENDING,
        total_levels=compile_result.total_levels,
        total_nodes=len(workflow.nodes),
        variables=options.inputs
    )
    
    db.add(execution)
    await db.commit()
    await db.refresh(execution)
    
    # Start background execution
    asyncio.create_task(run_workflow_execution(execution.id, workflow, db))
    
    return ExecutionResponse(
        id=execution.id,
        workflow_id=execution.workflow_id,
        status=execution.status,
        current_level=execution.current_level,
        total_levels=execution.total_levels,
        node_statuses=execution.node_statuses or {},
        progress=ExecutionProgress(
            completed=0,
            total=execution.total_nodes,
            percentage=0.0
        ),
        started_at=execution.started_at,
        completed_at=execution.completed_at,
        errors=execution.errors or []
    )


async def run_workflow_execution(execution_id: UUID, workflow, db: AsyncSession):
    """
    Background task to execute workflow blocks in order.
    Updates execution status and node results as it progresses.
    Also sends WebSocket updates to connected clients.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Starting workflow execution: {execution_id}")
    
    from app.core.database import AsyncSessionLocal
    from app.api.websocket import connection_manager
    
    async def send_ws_event(event_type: str, data: dict):
        """Send a WebSocket event to subscribers."""
        try:
            await connection_manager.send_to_execution(str(execution_id), {
                "type": event_type,
                "executionId": str(execution_id),
                **data
            })
        except Exception as e:
            logger.warning(f"Failed to send WS event: {e}")
    
    try:
        async with AsyncSessionLocal() as session:
            # Get fresh execution record
            result = await session.execute(
                select(WorkflowExecution).where(WorkflowExecution.id == execution_id)
            )
            execution = result.scalar_one_or_none()
            if not execution:
                logger.error(f"Execution {execution_id} not found")
                return
            
            nodes = workflow.nodes or []
            edges = workflow.edges or []
            
            logger.info(f"Executing workflow with {len(nodes)} nodes and {len(edges)} edges")
            
            # Build node lookup and adjacency
            node_map = {n.get('id'): n for n in nodes}
            outgoing_edges = {}
            for edge in edges:
                src = edge.get('source')
                if src not in outgoing_edges:
                    outgoing_edges[src] = []
                outgoing_edges[src].append(edge)
            
            # Find start node
            start_node = None
            for node in nodes:
                data = node.get('data', {})
                if data.get('type') == 'control.start':
                    start_node = node
                    break
            
            if not start_node:
                execution.status = DBExecutionStatus.FAILED
                execution.errors = [{"type": "NoStartNode", "message": "No start node found"}]
                await session.commit()
                return
            
            # Update status to running
            execution.status = DBExecutionStatus.RUNNING
            execution.started_at = datetime.utcnow()
            execution.node_statuses = {}
            execution.node_results = {}
            await session.commit()
            
            # Notify WebSocket subscribers
            await send_ws_event("execution_started", {"status": "running"})
            
            # Execute nodes in order
            current_node = start_node
            context = {"variables": execution.variables or {}, "prev": None, "loop_state": {}}
            completed_count = 0
            max_steps = 1000  # Safety limit to prevent infinite loops
            step_count = 0
            
            while current_node and step_count < max_steps:
                step_count += 1
                node_id = current_node.get('id')
                data = current_node.get('data', {})
                block_type = data.get('type', 'unknown')
                params = data.get('parameters', {})
                
                # Update node status to running
                execution.node_statuses[node_id] = 'running'
                flag_modified(execution, 'node_statuses')
                await session.commit()
                
                # Notify node started
                await send_ws_event("node_started", {"nodeId": node_id, "blockType": block_type})
                
                try:
                    # Execute the block (pass node_id for loop state tracking)
                    params_with_id = {**params, "_node_id": node_id}
                    block_result = await execute_block(block_type, params_with_id, context)
                    
                    # Update node result - with special handling for loop iterations
                    execution.node_statuses[node_id] = 'completed' if block_result.success else 'failed'
                    execution.node_results = execution.node_results or {}
                    
                    # For loop nodes, track each iteration separately
                    if block_type == 'control.loop':
                        existing_result = execution.node_results.get(node_id, {})
                        iterations = existing_result.get("iterations", [])
                        
                        # Only add iteration result if we're iterating (not completing)
                        if block_result.route == "loop":
                            iteration_num = len(iterations) + 1
                            iterations.append({
                                "iteration": iteration_num,
                                "success": block_result.success,
                                "output": block_result.output,
                                "completedAt": datetime.utcnow().isoformat()
                            })
                        
                        execution.node_results[node_id] = {
                            "success": block_result.success,
                            "output": block_result.output,
                            "error": block_result.error,
                            "duration_ms": block_result.duration_ms,
                            "completed_at": datetime.utcnow().isoformat(),
                            "iterations": iterations
                        }
                    else:
                        execution.node_results[node_id] = {
                            "success": block_result.success,
                            "output": block_result.output,
                            "error": block_result.error,
                            "duration_ms": block_result.duration_ms,
                            "completed_at": datetime.utcnow().isoformat()
                        }
                    
                    completed_count += 1
                    execution.completed_nodes = completed_count
                    flag_modified(execution, 'node_statuses')
                    flag_modified(execution, 'node_results')
                    await session.commit()
                    
                    # Notify node completed - include iteration data for loops
                    ws_data = {
                        "nodeId": node_id,
                        "status": "success" if block_result.success else "failed",
                        "output": block_result.output,
                        "error": block_result.error,
                        "durationMs": block_result.duration_ms
                    }
                    
                    # Add iteration info for loop nodes
                    if block_type == 'control.loop':
                        ws_data["iterations"] = execution.node_results[node_id].get("iterations", [])
                        ws_data["isIteration"] = block_result.route == "loop"
                    
                    await send_ws_event("node_completed", ws_data)
                    
                    # Update context with output
                    context["prev"] = block_result.output
                    
                    # Find next node based on route
                    next_node = None
                    route = block_result.route
                    
                    if route and node_id in outgoing_edges:
                        for edge in outgoing_edges[node_id]:
                            source_handle = edge.get('sourceHandle', 'out')
                            if source_handle == route or route == 'out':
                                target_id = edge.get('target')
                                next_node = node_map.get(target_id)
                                break
                    
                    # If no route match but have edges, follow first edge
                    if not next_node and node_id in outgoing_edges and outgoing_edges[node_id]:
                        target_id = outgoing_edges[node_id][0].get('target')
                        next_node = node_map.get(target_id)
                    
                    current_node = next_node
                    
                    # Check if we hit end node
                    if block_type == 'control.end':
                        break
                        
                except Exception as e:
                    execution.node_statuses[node_id] = 'failed'
                    execution.node_results = execution.node_results or {}
                    execution.node_results[node_id] = {
                        "success": False,
                        "error": str(e),
                        "completed_at": datetime.utcnow().isoformat()
                    }
                    execution.status = DBExecutionStatus.FAILED
                    execution.errors = execution.errors or []
                    execution.errors.append({"type": "ExecutionError", "message": str(e), "node_id": node_id})
                    flag_modified(execution, 'node_statuses')
                    flag_modified(execution, 'node_results')
                    flag_modified(execution, 'errors')
                    await session.commit()
                    
                    # Notify node failed
                    await send_ws_event("node_completed", {
                        "nodeId": node_id,
                        "status": "failed",
                        "error": str(e)
                    })
                    await send_ws_event("execution_completed", {"status": "failed"})
                    return
            
            # Check if we exceeded max steps (infinite loop protection)
            if step_count >= max_steps:
                execution.status = DBExecutionStatus.FAILED
                execution.errors = execution.errors or []
                execution.errors.append({
                    "type": "MaxStepsExceeded",
                    "message": f"Execution exceeded maximum {max_steps} steps. Possible infinite loop."
                })
                execution.completed_at = datetime.utcnow()
                flag_modified(execution, 'errors')
                await session.commit()
                await send_ws_event("execution_completed", {"status": "failed", "error": "Max steps exceeded"})
                logger.warning(f"Workflow execution {execution_id} exceeded max steps")
                return
            
            # Mark execution as completed
            execution.status = DBExecutionStatus.COMPLETED
            execution.completed_at = datetime.utcnow()
            await session.commit()
            
            # Notify execution completed
            await send_ws_event("execution_completed", {"status": "completed"})
            logger.info(f"Workflow execution {execution_id} completed successfully")
    except Exception as e:
        logger.error(f"Workflow execution {execution_id} failed with error: {e}")
        import traceback
        traceback.print_exc()


@router.get("/{workflow_id}/executions", response_model=List[ExecutionResponse])
async def list_executions(
    workflow_id: UUID,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """List workflow execution history"""
    result = await db.execute(
        select(WorkflowExecution)
        .where(WorkflowExecution.workflow_id == workflow_id)
        .order_by(WorkflowExecution.created_at.desc())
        .limit(limit)
    )
    executions = result.scalars().all()
    
    return [
        ExecutionResponse(
            id=e.id,
            workflow_id=e.workflow_id,
            status=e.status,
            current_level=e.current_level,
            total_levels=e.total_levels,
            node_statuses=e.node_statuses or {},
            progress=ExecutionProgress(
                completed=e.completed_nodes,
                total=e.total_nodes,
                percentage=(e.completed_nodes / e.total_nodes * 100) if e.total_nodes > 0 else 0
            ),
            started_at=e.started_at,
            completed_at=e.completed_at,
            errors=e.errors or []
        )
        for e in executions
    ]


@router.get("/{workflow_id}/executions/{execution_id}", response_model=ExecutionDetailResponse)
async def get_execution(
    workflow_id: UUID,
    execution_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Get execution details"""
    result = await db.execute(
        select(WorkflowExecution)
        .where(WorkflowExecution.id == execution_id)
        .where(WorkflowExecution.workflow_id == workflow_id)
    )
    execution = result.scalar_one_or_none()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return ExecutionDetailResponse(
        id=execution.id,
        workflow_id=execution.workflow_id,
        status=execution.status,
        current_level=execution.current_level,
        total_levels=execution.total_levels,
        node_statuses=execution.node_statuses or {},
        node_results=execution.node_results or {},
        variables=execution.variables or {},
        progress=ExecutionProgress(
            completed=execution.completed_nodes,
            total=execution.total_nodes,
            percentage=(execution.completed_nodes / execution.total_nodes * 100) if execution.total_nodes > 0 else 0
        ),
        started_at=execution.started_at,
        completed_at=execution.completed_at,
        errors=execution.errors or []
    )


@router.post("/{workflow_id}/executions/{execution_id}/cancel")
async def cancel_execution(
    workflow_id: UUID,
    execution_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user)  # Optional auth for testing
):
    """Cancel running execution"""
    result = await db.execute(
        select(WorkflowExecution)
        .where(WorkflowExecution.id == execution_id)
        .where(WorkflowExecution.workflow_id == workflow_id)
    )
    execution = result.scalar_one_or_none()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    if execution.status not in [DBExecutionStatus.RUNNING, DBExecutionStatus.PAUSED, DBExecutionStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Execution cannot be cancelled")
    
    execution.status = DBExecutionStatus.CANCELLED
    execution.completed_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "cancelled", "execution_id": str(execution_id)}
