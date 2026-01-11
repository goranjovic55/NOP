"""Workflow CRUD and execution endpoints - Phase 3: Block Library"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel
import json
import asyncio
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models.user import User
from app.models.workflow import Workflow, WorkflowExecution, WorkflowStatus as DBWorkflowStatus, ExecutionStatus as DBExecutionStatus
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
            return BlockExecuteResponse(
                success=True,
                output={"started": True, "timestamp": datetime.utcnow().isoformat()},
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
            mode = params.get("mode", "count")
            if mode == "count":
                count = params.get("count", 5)
                return BlockExecuteResponse(
                    success=True,
                    output={"mode": "count", "iterations": count},
                    route="iteration"
                )
            else:
                array_expr = params.get("array", "[]")
                items = evaluate_expression(array_expr, context) or []
                return BlockExecuteResponse(
                    success=True,
                    output={"mode": "array", "items": items, "count": len(items) if isinstance(items, list) else 0},
                    route="iteration"
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
            return BlockExecuteResponse(
                success=True,
                output={"variable": name, "value": value, "action": "set"},
                route="out"
            )
        
        elif block_type == "control.variable_get":
            name = params.get("name", "var")
            value = context.get("variables", {}).get(name)
            return BlockExecuteResponse(
                success=True,
                output={"variable": name, "value": value, "action": "get"},
                route="out"
            )
        
        # === Connection Blocks ===
        elif block_type == "connection.ssh_test":
            host = params.get("host", "")
            port = params.get("port", 22)
            # Simulate SSH test (in production, actually test connection)
            await asyncio.sleep(0.5)
            success = bool(host)  # Simple check
            return BlockExecuteResponse(
                success=success,
                output={"host": host, "port": port, "connected": success},
                route="success" if success else "failure"
            )
        
        elif block_type == "connection.rdp_test":
            host = params.get("host", "")
            port = params.get("port", 3389)
            await asyncio.sleep(0.5)
            success = bool(host)
            return BlockExecuteResponse(
                success=success,
                output={"host": host, "port": port, "protocol": "rdp", "connected": success},
                route="success" if success else "failure"
            )
        
        elif block_type == "connection.vnc_test":
            host = params.get("host", "")
            port = params.get("port", 5900)
            await asyncio.sleep(0.5)
            success = bool(host)
            return BlockExecuteResponse(
                success=success,
                output={"host": host, "port": port, "protocol": "vnc", "connected": success},
                route="success" if success else "failure"
            )
        
        elif block_type == "connection.ftp_test":
            host = params.get("host", "")
            port = params.get("port", 21)
            protocol = params.get("protocol", "ftp")
            await asyncio.sleep(0.5)
            success = bool(host)
            return BlockExecuteResponse(
                success=success,
                output={"host": host, "port": port, "protocol": protocol, "connected": success},
                route="success" if success else "failure"
            )
        
        elif block_type == "connection.tcp_test":
            host = params.get("host", "")
            port = params.get("port", 80)
            await asyncio.sleep(0.3)
            success = bool(host and port)
            return BlockExecuteResponse(
                success=success,
                output={"host": host, "port": port, "open": success},
                route="success" if success else "failure"
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
            await asyncio.sleep(1.5)
            return BlockExecuteResponse(
                success=True,
                output={
                    "host": host,
                    "scan_type": scan_type,
                    "open_ports": [22, 80, 443, 3306, 8080],
                    "closed_ports": 995,
                    "filtered_ports": 0
                },
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


# === CRUD Endpoints ===

@router.get("/", response_model=WorkflowListResponse)
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    
    # Build adjacency and in-degree
    node_ids = {n["id"] for n in nodes}
    in_degree = {nid: 0 for nid in node_ids}
    adjacency = {nid: [] for nid in node_ids}
    
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        if src in node_ids and tgt in node_ids:
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
    
    # Check for cycles
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
            context = {"variables": execution.variables or {}, "prev": None}
            completed_count = 0
            
            while current_node:
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
                    # Execute the block
                    block_result = await execute_block(block_type, params, context)
                    
                    # Update node result
                    execution.node_statuses[node_id] = 'completed' if block_result.success else 'failed'
                    execution.node_results = execution.node_results or {}
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
                    
                    # Notify node completed
                    await send_ws_event("node_completed", {
                        "nodeId": node_id,
                        "status": "success" if block_result.success else "failed",
                        "output": block_result.output,
                        "error": block_result.error,
                        "durationMs": block_result.duration_ms
                    })
                    
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
