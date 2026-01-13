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
  | 'control'
  | 'data';     // New: Data processing blocks (code, interpreter, assertion)

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
  | 'scanning.network_discovery'
  | 'scanning.host_scan'
  | 'scanning.ping_sweep'
  | 'scanning.service_scan'
  // Vulnerability
  | 'vulnerability.cve_lookup'
  | 'vulnerability.get_exploits'
  | 'vulnerability.execute_exploit'
  // Asset
  | 'asset.list_assets'
  | 'asset.get_asset'
  | 'asset.get_stats'
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
  | 'control.variable_get'
  // Data Processing (3-Output Model)
  | 'data.code'              // JavaScript code block for custom logic
  | 'data.output_interpreter' // Parse and interpret output from previous block
  | 'data.assertion'          // Pass/fail check based on condition
  | 'data.transform'          // Data transformation
  // Logic (alternative namespace for code blocks in templates)
  | 'logic.code'              // Same as data.code, for template compatibility
  | 'logic.output_interpreter'; // Same as data.output_interpreter


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
  // Execution state (set by useWorkflowExecution hook)
  executionStatus?: string;
  executionOutput?: any;
  executionError?: any;
  executionDuration?: number;
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
  // 3-Output Model: Every block can produce pass/fail/output
  hasPassFailOutputs?: boolean;
  defaultPassCondition?: PassCondition;
}


// === 3-Output Model Types ===
// Every block produces: pass (boolean), fail (boolean), output (any)

export interface BlockOutputs {
  pass: boolean;    // Did the block pass its success criteria?
  fail: boolean;    // Did the block fail?
  output: any;      // Data to pass to next block
}

export interface PassCondition {
  type: 'always'           // Always pass if execution completes
       | 'contains'         // Output contains string
       | 'not_contains'     // Output does not contain string
       | 'regex'            // Output matches regex
       | 'equals'           // Output equals value
       | 'json_path'        // JSON path expression evaluates to truthy
       | 'exit_code'        // Command exit code equals value
       | 'comparison'       // Numeric comparison
       | 'custom_script';   // Custom JavaScript/expression
  
  value?: string | number;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  jsonPath?: string;
  script?: string;
  failureMessage?: string;
}


// === Code Block Configuration ===
// JavaScript code block for custom pass/fail/output logic

export interface CodeBlockConfig {
  passCode: string;      // JS code returning boolean for pass condition
  failCode?: string;     // Optional JS code for fail (defaults to !pass)
  outputCode: string;    // JS code returning value for next block
  description?: string;
  language?: 'javascript' | 'typescript';
}


// === Output Interpreter Block Configuration ===
// Declarative parsing of command outputs

export interface OutputInterpreterConfig {
  inputSource: string;           // e.g., "{{previous.rawOutput}}"
  parseRules: ParseRule[];       // Conditions to check
  aggregation: 'all' | 'any' | 'weighted';
  minPassScore?: number;         // For weighted aggregation
  extractedVariables?: ExtractRule[];
}

export interface ParseRule {
  id: string;
  name: string;
  description?: string;
  condition: PassCondition;
  weight?: number;
  critical?: boolean;
  failureMessage?: string;
}

export interface ExtractRule {
  variableName: string;
  extractMethod: 'regex' | 'json_path' | 'line_number' | 'between_markers' | 'split';
  pattern: string;
  captureGroup?: number;
  defaultValue?: any;
}
