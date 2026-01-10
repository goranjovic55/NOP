"""Workflow models for automation scripts"""

from sqlalchemy import Column, String, Text, JSON, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ExecutionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    
    # Graph structure (nodes and edges from React Flow)
    nodes = Column(JSON, default=list)
    edges = Column(JSON, default=list)
    
    # Workflow settings
    settings = Column(JSON, default=dict)
    
    # Variables and inputs
    variables = Column(JSON, default=list)
    
    # Metadata
    category = Column(String(50), nullable=True)
    tags = Column(JSON, default=list)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING)
    
    # Execution state
    current_level = Column(Integer, default=0)
    total_levels = Column(Integer, default=0)
    
    # Node statuses and results
    node_statuses = Column(JSON, default=dict)
    node_results = Column(JSON, default=dict)
    
    # Variables during execution
    variables = Column(JSON, default=dict)
    
    # Errors
    errors = Column(JSON, default=list)
    
    # Progress
    completed_nodes = Column(Integer, default=0)
    total_nodes = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
