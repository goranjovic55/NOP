# Data Models Blueprint: NOP Workflow Automation

> **Version**: 1.0  
> **Status**: Draft for Review  
> **Created**: 2026-01-10  

## Overview

This document defines all TypeScript interfaces for the frontend and Python/Pydantic schemas for the backend.

---

## Frontend TypeScript Interfaces

### Workflow Core Types

```typescript
// frontend/src/types/workflow.ts

import { Node, Edge } from '@xyflow/react';

/**
 * Complete workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  
  // Visual representation
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Viewport state
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  
  // Initial variables
  variables: Record<string, any>;
  
  // Execution settings
  settings: WorkflowSettings;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Tags for organization
  tags?: string[];
}

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  errorHandling: ErrorHandlingMode;
  retryCount: number;
  retryDelay: number;  // milliseconds
  timeout: number;     // seconds, 0 = no timeout
  parallelLimit: number;  // max concurrent executions
}

export type ErrorHandlingMode = 'stop' | 'continue' | 'skip-branch';

/**
 * Workflow node (extends React Flow Node)
 */
export interface WorkflowNode extends Node {
  type: 'block';
  data: WorkflowNodeData;
}

export interface WorkflowNodeData {
  type: BlockType;
  label: string;
  config: BlockConfig;
  description?: string;
}

/**
 * Workflow edge (extends React Flow Edge)
 */
export interface WorkflowEdge extends Edge {
  sourceHandle: string;
  targetHandle: string;
  label?: string;
  condition?: string;  // For conditional edges
}

/**
 * Block type identifiers
 */
export type BlockType =
  // Connection
  | 'connection.ssh_test'
  | 'connection.rdp_test'
  | 'connection.vnc_test'
  | 'connection.ftp_test'
  | 'connection.tcp_test'
  // Command
  | 'command.ssh_execute'
  | 'command.system_info'
  | 'command.ftp_list'
  | 'command.ftp_download'
  | 'command.ftp_upload'
  // Traffic
  | 'traffic.start_capture'
  | 'traffic.stop_capture'
  | 'traffic.burst_capture'
  | 'traffic.get_stats'
  | 'traffic.ping'
  | 'traffic.advanced_ping'
  | 'traffic.storm'
  // Scanning
  | 'scanning.version_detect'
  | 'scanning.port_scan'
  // Agent
  | 'agent.generate'
  | 'agent.deploy'
  | 'agent.terminate'
  // Control
  | 'control.start'
  | 'control.end'
  | 'control.delay'
  | 'control.condition'
  | 'control.loop'
  | 'control.parallel'
  | 'control.variable_set'
  | 'control.variable_get';

/**
 * Block configuration (varies by block type)
 */
export type BlockConfig = Record<string, any>;
```

### Block Definitions

```typescript
// frontend/src/types/blocks.ts

import { BlockType } from './workflow';

/**
 * Block category definition
 */
export interface BlockCategory {
  key: string;
  label: string;
  color: string;
  icon: string;
  description: string;
}

/**
 * Block categories registry
 */
export const BLOCK_CATEGORIES: Record<string, BlockCategory> = {
  connection: {
    key: 'connection',
    label: 'Connection',
    color: '#3B82F6',
    icon: '🔌',
    description: 'Test connectivity to remote hosts',
  },
  command: {
    key: 'command',
    label: 'Command',
    color: '#10B981',
    icon: '⚡',
    description: 'Execute commands and operations',
  },
  traffic: {
    key: 'traffic',
    label: 'Traffic',
    color: '#8B5CF6',
    icon: '📡',
    description: 'Network traffic capture and analysis',
  },
  scanning: {
    key: 'scanning',
    label: 'Scanning',
    color: '#F59E0B',
    icon: '🔍',
    description: 'Port scanning and service detection',
  },
  agent: {
    key: 'agent',
    label: 'Agent',
    color: '#EF4444',
    icon: '🤖',
    description: 'Agent generation and management',
  },
  control: {
    key: 'control',
    label: 'Control',
    color: '#6B7280',
    icon: '⚙️',
    description: 'Flow control and logic',
  },
};

/**
 * Block parameter definition
 */
export interface BlockParameter {
  name: string;
  label?: string;
  type: ParameterType;
  required: boolean;
  default?: any;
  description?: string;
  placeholder?: string;
  
  // For enum type
  options?: string[];
  
  // For number type
  min?: number;
  max?: number;
  
  // For expression type
  expressionOnly?: boolean;
}

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'text'       // multiline
  | 'expression' // Mustache expression
  | 'array'
  | 'object'
  | 'credential';

/**
 * Block handle definition
 */
export interface BlockHandle {
  id: string;
  label: string;
  type: 'input' | 'output';
  description?: string;
}

/**
 * Complete block definition
 */
export interface BlockDefinition {
  type: BlockType;
  category: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  
  // Handles
  inputs: BlockHandle[];
  outputs: BlockHandle[];
  
  // Parameters
  parameters: BlockParameter[];
  
  // API mapping
  api?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;
    requestMapping?: Record<string, string>;
  };
  
  // Output schema (for expression intellisense)
  outputSchema?: Record<string, string>;
}

/**
 * Block definitions registry
 */
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  'connection.ssh_test': {
    type: 'connection.ssh_test',
    category: 'connection',
    label: 'SSH Test',
    description: 'Test SSH connectivity to a remote host',
    icon: '🔐',
    color: '#3B82F6',
    inputs: [{ id: 'in', label: 'Input', type: 'input' }],
    outputs: [
      { id: 'success', label: 'Success', type: 'output' },
      { id: 'failure', label: 'Failure', type: 'output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true, placeholder: '192.168.1.1' },
      { name: 'port', label: 'Port', type: 'number', required: false, default: 22 },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'password', label: 'Password', type: 'string', required: false },
      { name: 'key_file', label: 'Key File', type: 'string', required: false },
      { name: 'credential_id', label: 'Credential', type: 'credential', required: false },
    ],
    api: {
      method: 'POST',
      endpoint: '/api/v1/access/test/ssh',
    },
    outputSchema: {
      success: 'boolean',
      host: 'string',
      port: 'number',
      message: 'string',
      response_time_ms: 'number',
    },
  },
  
  // ... Additional block definitions follow the same pattern
  // See BLOCKS.md for complete list
};
```

### Execution State Types

```typescript
// frontend/src/types/execution.ts

/**
 * Execution status
 */
export type ExecutionStatus =
  | 'idle'
  | 'compiling'
  | 'validating'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Node execution status
 */
export type NodeExecutionStatus =
  | 'pending'
  | 'waiting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Complete execution state
 */
export interface ExecutionState {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  
  // Timing
  startedAt: Date | null;
  completedAt: Date | null;
  
  // Progress tracking
  currentLevel: number;
  totalLevels: number;
  
  // Node-level tracking
  nodeStatuses: Map<string, NodeExecutionStatus>;
  nodeResults: Map<string, NodeResult>;
  
  // Errors
  errors: ExecutionError[];
  
  // Variables
  variables: Map<string, any>;
  
  // Progress summary
  progress: ExecutionProgress;
}

/**
 * Node execution result
 */
export interface NodeResult {
  nodeId: string;
  success: boolean;
  output: any;
  error?: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;  // milliseconds
}

/**
 * Execution error
 */
export interface ExecutionError {
  type: 'compile' | 'validation' | 'execution' | 'timeout';
  message: string;
  nodeId?: string;
  details?: any;
  timestamp: Date;
}

/**
 * Execution progress
 */
export interface ExecutionProgress {
  completed: number;
  total: number;
  percentage: number;
  failed: number;
  skipped: number;
}

/**
 * Compiled DAG structure
 */
export interface CompiledDAG {
  nodes: ExecutableNode[];
  edges: ExecutionEdge[];
  executionOrder: string[][];  // Array of parallel groups
  entryPoints: string[];
  exitPoints: string[];
  variables: Map<string, any>;
  isValid: boolean;
  errors: string[];
}

/**
 * Executable node
 */
export interface ExecutableNode {
  id: string;
  type: BlockType;
  config: Record<string, any>;
  inputs: string[];
  outputs: Record<string, string[]>;
  dependencies: string[];
}

/**
 * Execution edge
 */
export interface ExecutionEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  condition?: string;
}
```

### Zustand Store Schema

```typescript
// frontend/src/store/workflowStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  BlockType,
  WorkflowSettings,
} from '../types/workflow';
import {
  ExecutionState,
  NodeExecutionStatus,
  NodeResult,
} from '../types/execution';

/**
 * Workflow store state
 */
interface WorkflowState {
  // Workflow data
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  
  // Canvas state (React Flow)
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  // Execution
  executionState: ExecutionState | null;
  nodeStatuses: Map<string, NodeExecutionStatus>;
  nodeResults: Map<string, NodeResult>;
  
  // UI state
  isPaletteOpen: boolean;
  isConfigPanelOpen: boolean;
  
  // History (for undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isExecuting: boolean;
}

/**
 * Workflow store actions
 */
interface WorkflowActions {
  // Node operations
  addNode: (type: BlockType, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Record<string, any>) => void;
  updateNodeLabel: (id: string, label: string) => void;
  duplicateNode: (id: string) => void;
  
  // Edge operations
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (id: string) => void;
  
  // React Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  
  // Selection
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  
  // Workflow operations
  newWorkflow: () => void;
  loadWorkflow: (id: string) => Promise<void>;
  saveWorkflow: () => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  updateWorkflowSettings: (settings: Partial<WorkflowSettings>) => void;
  
  // Execution
  executeWorkflow: () => Promise<void>;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => void;
  updateNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  updateNodeResult: (nodeId: string, result: NodeResult) => void;
  
  // UI actions
  togglePalette: () => void;
  toggleConfigPanel: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  
  // Computed
  canUndo: boolean;
  canRedo: boolean;
}

interface HistoryEntry {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  timestamp: number;
}

/**
 * Complete store type
 */
type WorkflowStore = WorkflowState & WorkflowActions;

/**
 * Default workflow settings
 */
const defaultSettings: WorkflowSettings = {
  errorHandling: 'stop',
  retryCount: 0,
  retryDelay: 1000,
  timeout: 0,
  parallelLimit: 10,
};

/**
 * Initial state
 */
const initialState: WorkflowState = {
  workflows: [],
  currentWorkflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  executionState: null,
  nodeStatuses: new Map(),
  nodeResults: new Map(),
  isPaletteOpen: true,
  isConfigPanelOpen: true,
  history: [],
  historyIndex: -1,
  isLoading: false,
  isSaving: false,
  isExecuting: false,
};

/**
 * Create workflow store
 */
export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Node operations
        addNode: (type, position) => {
          const id = `node_${Date.now()}`;
          const newNode: WorkflowNode = {
            id,
            type: 'block',
            position,
            data: {
              type,
              label: '',
              config: {},
            },
          };
          
          set((state) => {
            state.nodes.push(newNode);
            state.selectedNodeId = id;
          });
          
          get().pushHistory();
        },
        
        removeNode: (id) => {
          set((state) => {
            state.nodes = state.nodes.filter((n) => n.id !== id);
            state.edges = state.edges.filter(
              (e) => e.source !== id && e.target !== id
            );
            if (state.selectedNodeId === id) {
              state.selectedNodeId = null;
            }
          });
          
          get().pushHistory();
        },
        
        updateNodeConfig: (id, config) => {
          set((state) => {
            const node = state.nodes.find((n) => n.id === id);
            if (node) {
              node.data.config = config;
            }
          });
        },
        
        updateNodeLabel: (id, label) => {
          set((state) => {
            const node = state.nodes.find((n) => n.id === id);
            if (node) {
              node.data.label = label;
            }
          });
        },
        
        duplicateNode: (id) => {
          const node = get().nodes.find((n) => n.id === id);
          if (node) {
            get().addNode(node.data.type, {
              x: node.position.x + 50,
              y: node.position.y + 50,
            });
          }
        },
        
        // Edge operations
        addEdge: (edge) => {
          set((state) => {
            state.edges.push(edge);
          });
          get().pushHistory();
        },
        
        removeEdge: (id) => {
          set((state) => {
            state.edges = state.edges.filter((e) => e.id !== id);
          });
          get().pushHistory();
        },
        
        // React Flow handlers
        onNodesChange: (changes) => {
          set((state) => {
            state.nodes = applyNodeChanges(changes, state.nodes) as WorkflowNode[];
          });
        },
        
        onEdgesChange: (changes) => {
          set((state) => {
            state.edges = applyEdgeChanges(changes, state.edges) as WorkflowEdge[];
          });
        },
        
        // Selection
        selectNode: (id) => {
          set((state) => {
            state.selectedNodeId = id;
            state.selectedEdgeId = null;
            state.isConfigPanelOpen = id !== null;
          });
        },
        
        selectEdge: (id) => {
          set((state) => {
            state.selectedEdgeId = id;
            state.selectedNodeId = null;
          });
        },
        
        // ... Additional action implementations
        
        // Computed
        get canUndo() {
          return get().historyIndex > 0;
        },
        
        get canRedo() {
          const state = get();
          return state.historyIndex < state.history.length - 1;
        },
      })),
      {
        name: 'nop-workflow-store',
        partialize: (state) => ({
          workflows: state.workflows,
          isPaletteOpen: state.isPaletteOpen,
        }),
      }
    )
  )
);
```

---

## Backend Python/Pydantic Schemas

### Workflow Schemas

```python
# backend/app/schemas/workflow.py

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum


class ErrorHandlingMode(str, Enum):
    STOP = "stop"
    CONTINUE = "continue"
    SKIP_BRANCH = "skip-branch"


class WorkflowSettings(BaseModel):
    """Workflow execution settings"""
    error_handling: ErrorHandlingMode = ErrorHandlingMode.STOP
    retry_count: int = Field(default=0, ge=0, le=5)
    retry_delay: int = Field(default=1000, ge=0)  # milliseconds
    timeout: int = Field(default=0, ge=0)  # seconds, 0 = no timeout
    parallel_limit: int = Field(default=10, ge=1, le=50)


class NodePosition(BaseModel):
    """Node position on canvas"""
    x: float
    y: float


class WorkflowNodeData(BaseModel):
    """Node data payload"""
    type: str
    label: str = ""
    config: Dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None


class WorkflowNode(BaseModel):
    """Workflow node"""
    id: str
    type: str = "block"
    position: NodePosition
    data: WorkflowNodeData


class WorkflowEdge(BaseModel):
    """Workflow edge"""
    id: str
    source: str
    target: str
    source_handle: str = Field(alias="sourceHandle")
    target_handle: str = Field(alias="targetHandle")
    label: Optional[str] = None
    condition: Optional[str] = None
    
    class Config:
        populate_by_name = True


class Viewport(BaseModel):
    """Canvas viewport state"""
    x: float = 0
    y: float = 0
    zoom: float = 1


class WorkflowCreate(BaseModel):
    """Create workflow request"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    viewport: Optional[Viewport] = None
    variables: Dict[str, Any] = Field(default_factory=dict)
    settings: WorkflowSettings = Field(default_factory=WorkflowSettings)
    tags: List[str] = Field(default_factory=list)


class WorkflowUpdate(BaseModel):
    """Update workflow request"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    viewport: Optional[Viewport] = None
    variables: Optional[Dict[str, Any]] = None
    settings: Optional[WorkflowSettings] = None
    tags: Optional[List[str]] = None


class WorkflowResponse(BaseModel):
    """Workflow response"""
    id: UUID
    name: str
    description: Optional[str]
    version: int
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    viewport: Optional[Viewport]
    variables: Dict[str, Any]
    settings: WorkflowSettings
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID]
    
    class Config:
        from_attributes = True


class WorkflowListResponse(BaseModel):
    """List workflows response"""
    workflows: List[WorkflowResponse]
    total: int
```

### Execution Schemas

```python
# backend/app/schemas/execution.py

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    COMPILING = "compiling"
    VALIDATING = "validating"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NodeExecutionStatus(str, Enum):
    PENDING = "pending"
    WAITING = "waiting"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class ExecutionOptions(BaseModel):
    """Execution start options"""
    variables: Dict[str, Any] = Field(default_factory=dict)
    error_handling: Optional[str] = None  # Override workflow setting
    dry_run: bool = False


class NodeResult(BaseModel):
    """Result from node execution"""
    node_id: str
    success: bool
    output: Any
    error: Optional[str] = None
    started_at: datetime
    completed_at: datetime
    duration_ms: int


class ExecutionProgress(BaseModel):
    """Execution progress"""
    completed: int
    total: int
    percentage: float
    failed: int = 0
    skipped: int = 0


class ExecutionError(BaseModel):
    """Execution error"""
    type: str  # compile, validation, execution, timeout
    message: str
    node_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime


class ExecutionResponse(BaseModel):
    """Start execution response"""
    id: UUID
    workflow_id: UUID
    status: ExecutionStatus
    started_at: datetime
    
    class Config:
        from_attributes = True


class ExecutionDetailResponse(BaseModel):
    """Detailed execution response"""
    id: UUID
    workflow_id: UUID
    status: ExecutionStatus
    started_at: datetime
    completed_at: Optional[datetime]
    
    # Progress
    current_level: int
    total_levels: int
    progress: ExecutionProgress
    
    # Node details
    node_statuses: Dict[str, NodeExecutionStatus]
    node_results: Dict[str, NodeResult]
    
    # Errors
    errors: List[ExecutionError]
    
    # Variables
    variables: Dict[str, Any]
    
    class Config:
        from_attributes = True


class ExecutionEvent(BaseModel):
    """WebSocket execution event"""
    event: str  # progress, node_start, node_complete, node_error, complete, error
    data: Dict[str, Any]
    timestamp: datetime
```

### DAG Compilation Schemas

```python
# backend/app/schemas/dag.py

from pydantic import BaseModel
from typing import List, Dict, Optional


class ExecutableNode(BaseModel):
    """Compiled executable node"""
    id: str
    type: str
    config: Dict[str, any]
    inputs: List[str]
    outputs: Dict[str, List[str]]
    dependencies: List[str]


class ExecutionEdge(BaseModel):
    """Compiled execution edge"""
    id: str
    source: str
    source_handle: str
    target: str
    target_handle: str
    condition: Optional[str] = None


class CompileResult(BaseModel):
    """DAG compilation result"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    
    # Compiled data (only if valid)
    nodes: Optional[List[ExecutableNode]] = None
    edges: Optional[List[ExecutionEdge]] = None
    execution_order: Optional[List[List[str]]] = None
    entry_points: Optional[List[str]] = None
    exit_points: Optional[List[str]] = None
```

---

## SQLAlchemy Models

```python
# backend/app/models/workflow.py

from sqlalchemy import Column, String, Integer, JSON, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class Workflow(Base):
    """Workflow database model"""
    __tablename__ = "workflows"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    
    # Graph data
    nodes = Column(JSON, nullable=False, default=list)
    edges = Column(JSON, nullable=False, default=list)
    viewport = Column(JSON, nullable=True)
    
    # Configuration
    variables = Column(JSON, nullable=False, default=dict)
    settings = Column(JSON, nullable=False, default=dict)
    tags = Column(ARRAY(String), nullable=False, default=list)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    executions = relationship("WorkflowExecution", back_populates="workflow")
    creator = relationship("User", back_populates="workflows")


class WorkflowExecution(Base):
    """Workflow execution history"""
    __tablename__ = "workflow_executions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    
    # Status
    status = Column(String(20), nullable=False, default="pending")
    
    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Progress
    current_level = Column(Integer, default=0)
    total_levels = Column(Integer, default=0)
    
    # Results
    node_statuses = Column(JSON, nullable=False, default=dict)
    node_results = Column(JSON, nullable=False, default=dict)
    errors = Column(JSON, nullable=False, default=list)
    variables = Column(JSON, nullable=False, default=dict)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
```

---

## API Request/Response Types

### API Client Types (Frontend)

```typescript
// frontend/src/services/workflowApi.ts

import { api } from './api';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowSettings,
} from '../types/workflow';
import {
  ExecutionState,
  ExecutionStatus,
  NodeExecutionStatus,
  NodeResult,
  CompiledDAG,
} from '../types/execution';

/**
 * Workflow API request types
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
  variables?: Record<string, any>;
  settings?: Partial<WorkflowSettings>;
  tags?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
  variables?: Record<string, any>;
  settings?: Partial<WorkflowSettings>;
  tags?: string[];
}

export interface ExecuteWorkflowRequest {
  variables?: Record<string, any>;
  errorHandling?: 'stop' | 'continue' | 'skip-branch';
  dryRun?: boolean;
}

/**
 * Workflow API response types
 */
export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
}

export interface CompileResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dag?: CompiledDAG;
}

export interface ExecutionStartResponse {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
}

export interface ExecutionDetailResponse {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  currentLevel: number;
  totalLevels: number;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    failed: number;
    skipped: number;
  };
  nodeStatuses: Record<string, NodeExecutionStatus>;
  nodeResults: Record<string, NodeResult>;
  errors: Array<{
    type: string;
    message: string;
    nodeId?: string;
    timestamp: string;
  }>;
  variables: Record<string, any>;
}

/**
 * Workflow API client
 */
export const workflowApi = {
  // List workflows
  list: async (): Promise<WorkflowListResponse> => {
    return api.get('/workflows');
  },
  
  // Get workflow by ID
  get: async (id: string): Promise<Workflow> => {
    return api.get(`/workflows/${id}`);
  },
  
  // Create workflow
  create: async (data: CreateWorkflowRequest): Promise<Workflow> => {
    return api.post('/workflows', data);
  },
  
  // Update workflow
  update: async (id: string, data: UpdateWorkflowRequest): Promise<Workflow> => {
    return api.put(`/workflows/${id}`, data);
  },
  
  // Delete workflow
  delete: async (id: string): Promise<void> => {
    return api.delete(`/workflows/${id}`);
  },
  
  // Compile workflow
  compile: async (id: string): Promise<CompileResponse> => {
    return api.post(`/workflows/${id}/compile`);
  },
  
  // Start execution
  execute: async (
    id: string,
    options?: ExecuteWorkflowRequest
  ): Promise<ExecutionStartResponse> => {
    return api.post(`/workflows/${id}/execute`, options);
  },
  
  // Get execution details
  getExecution: async (
    workflowId: string,
    executionId: string
  ): Promise<ExecutionDetailResponse> => {
    return api.get(`/workflows/${workflowId}/executions/${executionId}`);
  },
  
  // Cancel execution
  cancelExecution: async (
    workflowId: string,
    executionId: string
  ): Promise<void> => {
    return api.post(`/workflows/${workflowId}/executions/${executionId}/cancel`);
  },
};
```

---

## Summary

This document defines:

1. **Frontend TypeScript Interfaces**:
   - Workflow, Node, Edge types
   - Block definitions and parameters
   - Execution state and results
   - Zustand store schema

2. **Backend Pydantic Schemas**:
   - Workflow CRUD schemas
   - Execution schemas
   - DAG compilation schemas

3. **SQLAlchemy Models**:
   - Workflow model
   - WorkflowExecution model

4. **API Types**:
   - Request/response interfaces
   - API client implementation

All types are designed to ensure type safety across the full stack and enable seamless data flow between frontend and backend.
