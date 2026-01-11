/**
 * Workflow Automation Type Definitions
 * Compatible with React Flow and backend API
 */

// === Enums ===

export type WorkflowStatus = 'draft' | 'active' | 'archived';

export type ExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type NodeExecutionStatus = 
  | 'pending' 
  | 'waiting' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped';

export type BlockCategory = 
  | 'connection' 
  | 'command' 
  | 'traffic' 
  | 'scanning' 
  | 'agent' 
  | 'control';

export type ErrorHandlingMode = 'stop' | 'continue' | 'skip-branch';


// === Block Types ===

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


// === Node & Edge (React Flow compatible) ===

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  type: BlockType;
  category: BlockCategory;
  parameters: Record<string, any>;
  icon?: string;
  color?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;  // React Flow node type, usually 'block'
  position: NodePosition;
  data: NodeData;
  selected?: boolean;
  dragging?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  selected?: boolean;
}


// === Workflow ===

export interface WorkflowSettings {
  timeout: number;
  onError: ErrorHandlingMode;
  maxParallel: number;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: WorkflowSettings;
  variables: WorkflowVariable[];
  category?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  settings?: Partial<WorkflowSettings>;
  variables?: WorkflowVariable[];
  category?: string;
  tags?: string[];
}

export interface WorkflowUpdate {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  settings?: Partial<WorkflowSettings>;
  variables?: WorkflowVariable[];
  category?: string;
  tags?: string[];
}


// === Execution ===

export interface ExecutionProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface IterationResult {
  iteration: number;
  success: boolean;
  output?: any;
  error?: string;
  completedAt?: string;
}

export interface NodeResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  iterations?: IterationResult[];
}

export interface ExecutionError {
  type: string;
  message: string;
  nodeId?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  currentLevel: number;
  totalLevels: number;
  nodeStatuses: Record<string, NodeExecutionStatus>;
  nodeResults: Record<string, NodeResult>;
  variables: Record<string, any>;
  progress: ExecutionProgress;
  startedAt?: string;
  completedAt?: string;
  errors: ExecutionError[];
}

export interface ExecutionOptions {
  inputs?: Record<string, any>;
  errorHandling?: ErrorHandlingMode;
}


// === Compilation ===

export interface CompileError {
  type: string;
  message: string;
  nodeId?: string;
}

export interface CompileResult {
  valid: boolean;
  errors: CompileError[];
  executionOrder: string[][];
  totalLevels: number;
}


// === Block Definition (for palette) ===

export interface ParameterDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'password' | 'credential';
  required?: boolean;
  default?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  description?: string;
}

export interface HandleDefinition {
  id: string;
  type: 'input' | 'output';
  label: string;
  handleType?: 'source' | 'target';
}

export interface BlockDefinition {
  type: BlockType;
  label: string;
  category: BlockCategory;
  icon: string;
  color: string;
  description: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  parameters: ParameterDefinition[];
  api?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;
  };
}
