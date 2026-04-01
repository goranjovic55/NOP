"""Workflow CRUD and execution endpoints - Phase 3: Block Library"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Dict, Any
from uuid import UUID
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
from app.services.block_executor import (
    BlockExecuteRequest, BlockExecuteResponse, DelayRequest, CodeBlockRequest,
    execute_block, evaluate_expression, evaluate_code_expression,
)

router = APIRouter()



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
                
                logger.info(f"[NODE_EXEC] Processing node {node_id} type={block_type}")
                
                # Update node status to running
                execution.node_statuses[node_id] = 'running'
                flag_modified(execution, 'node_statuses')
                await session.commit()
                logger.info(f"[NODE_EXEC] Set {node_id} to 'running', node_statuses keys: {list(execution.node_statuses.keys())}")
                
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
                    logger.info(f"[NODE_EXEC] Set {node_id} to '{execution.node_statuses[node_id]}', all statuses: {execution.node_statuses}")
                    
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
            
            # Notify execution completed - include final node statuses
            await send_ws_event("execution_completed", {
                "status": "completed",
                "nodeStatuses": execution.node_statuses or {},
                "nodeResults": execution.node_results or {}
            })
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
