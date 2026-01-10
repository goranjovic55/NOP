"""Pydantic schemas for workflow API"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum


class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# Node and Edge schemas (React Flow compatible)
class NodePosition(BaseModel):
    x: float
    y: float


class NodeData(BaseModel):
    label: str
    type: str
    category: str
    parameters: Dict[str, Any] = {}
    

class WorkflowNode(BaseModel):
    id: str
    type: str = "block"
    position: NodePosition
    data: NodeData


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class WorkflowSettings(BaseModel):
    timeout: int = 3600
    on_error: str = "stop"  # stop, continue, skip-branch
    max_parallel: int = 10


class WorkflowVariable(BaseModel):
    name: str
    type: str = "string"
    default: Optional[Any] = None


# Workflow CRUD schemas
class WorkflowBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []


class WorkflowCreate(WorkflowBase):
    nodes: List[WorkflowNode] = []
    edges: List[WorkflowEdge] = []
    settings: WorkflowSettings = WorkflowSettings()
    variables: List[WorkflowVariable] = []


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    settings: Optional[WorkflowSettings] = None
    variables: Optional[List[WorkflowVariable]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class WorkflowResponse(WorkflowBase):
    id: UUID
    status: WorkflowStatus
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    settings: Dict[str, Any]
    variables: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowListResponse(BaseModel):
    workflows: List[WorkflowResponse]
    total: int


# Execution schemas
class ExecutionOptions(BaseModel):
    inputs: Dict[str, Any] = {}
    error_handling: str = "stop"


class NodeExecutionStatus(BaseModel):
    node_id: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    output: Optional[Any] = None
    error: Optional[str] = None


class ExecutionProgress(BaseModel):
    completed: int
    total: int
    percentage: float


class ExecutionResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    status: ExecutionStatus
    current_level: int
    total_levels: int
    node_statuses: Dict[str, str]
    progress: ExecutionProgress
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    errors: List[Dict[str, Any]]

    class Config:
        from_attributes = True


class ExecutionDetailResponse(ExecutionResponse):
    node_results: Dict[str, Any]
    variables: Dict[str, Any]


# Compile result
class CompileError(BaseModel):
    type: str
    message: str
    node_id: Optional[str] = None


class CompileResult(BaseModel):
    valid: bool
    errors: List[CompileError] = []
    execution_order: List[List[str]] = []
    total_levels: int = 0
