"""Workflow CRUD and execution endpoints"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
import json
import asyncio
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.workflow import Workflow, WorkflowExecution, WorkflowStatus as DBWorkflowStatus, ExecutionStatus as DBExecutionStatus
from app.schemas.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowListResponse,
    ExecutionOptions, ExecutionResponse, ExecutionDetailResponse,
    CompileResult, CompileError, ExecutionProgress
)

router = APIRouter()


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
    current_user: User = Depends(get_current_user)
):
    """Start workflow execution"""
    # Get workflow
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Compile first
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


@router.get("/{workflow_id}/executions", response_model=List[ExecutionResponse])
async def list_executions(
    workflow_id: UUID,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
