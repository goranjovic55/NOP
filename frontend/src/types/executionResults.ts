/**
 * Workflow Execution Results - Type Definitions
 * 
 * This module defines types for the unified workflow execution results system.
 * It supports:
 * - Block-based automation with pass/fail status
 * - Tree-like execution visualization
 * - Loop handling with compressed/expandable views
 * - Real-time execution updates via WebSocket
 * 
 * KEY CONCEPT: 3-Output Model
 * Every block produces 3 outputs:
 * 1. pass: boolean - Did the block pass?
 * 2. fail: boolean - Did the block fail?
 * 3. output: any - Data to pass to next block
 */

// =============================================================================
// Block Type Definitions
// =============================================================================

/**
 * All available block types in the workflow system.
 * Updated to match the 3-output model from blocks.ts
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
  | 'data.code'
  | 'data.output_interpreter'
  | 'data.assertion'
  | 'data.transform'
  // Logic (alternative namespace)
  | 'logic.code'
  | 'logic.output_interpreter'
  // Legacy types for backwards compatibility
  | 'discovery_scan'
  | 'port_scan'
  | 'service_detection'
  | 'vulnerability_scan'
  | 'ping_test'
  | 'traceroute'
  | 'bandwidth_test'
  | 'dns_lookup'
  | 'ssh_command'
  | 'rep_ring_test'
  | 'condition'
  | 'loop_foreach'
  | 'loop_while'
  | 'loop_count'
  | 'parallel'
  | 'wait'
  | 'start'
  | 'end'
  | 'set_variable'
  | 'transform_data'
  | 'filter_data'
  | 'aggregate'
  | 'http_request'
  | 'output_interpreter'
  | 'code'
  | 'agent_command'
  | 'agent_file_transfer'
  | 'agent_terminal'
  | 'agent_discovery'
  | 'agent_login'
  | 'log'
  | 'alert'
  | 'report'
  | 'assertion'
  | 'email'
  | 'webhook';

/**
 * Block category for grouping and styling
 */
export type BlockCategory =
  | 'network'
  | 'control'
  | 'data'
  | 'agent'
  | 'notification';

// =============================================================================
// Code Block Configuration
// =============================================================================

/**
 * Code Block Configuration
 * 
 * A flexible JavaScript processing block that:
 * 1. Takes input from previous block's output
 * 2. Uses JavaScript code to determine pass/fail
 * 3. Defines custom output to pass to next blocks
 */
export interface CodeBlockConfig {
  /** JavaScript code for pass condition - should return boolean */
  passCode: string;
  
  /** JavaScript code for fail condition (optional, defaults to !pass) */
  failCode?: string;
  
  /** JavaScript code for output transformation - return value for next block */
  outputCode: string;
  
  /** Human-readable description of what this code block does */
  description?: string;
  
  /** Language for syntax highlighting */
  language?: 'javascript' | 'typescript';
}

/**
 * Block execution context passed to code blocks
 */
export interface CodeBlockContext {
  /** Input from previous block */
  input: any;
  
  /** Raw output text (for command blocks) */
  rawInput?: string;
  
  /** Workflow variables */
  variables: Record<string, any>;
  
  /** Previous block information */
  previousBlock?: {
    id: string;
    type: BlockType;
    name: string;
    outputs: BlockOutputs;
  };
}

/**
 * Simplified Block Output Model
 * ALL blocks produce these 3 outputs that can be connected to other blocks
 */
export interface BlockOutputs {
  /** Did the block pass its success criteria? */
  pass: boolean;
  
  /** Did the block fail? */
  fail: boolean;
  
  /** The block's output data - can be connected to next block's input */
  output: any;
}

// =============================================================================
// Output Interpreter Configuration
// =============================================================================

export interface OutputInterpreterConfig {
  inputSource: string;
  parseRules: ParseRule[];
  aggregation: 'all' | 'any' | 'weighted';
  minPassScore?: number;
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

// =============================================================================
// Execution Status Types
// =============================================================================

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export type BlockExecutionState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type InterpretedResult =
  | 'pending'
  | 'passed'
  | 'failed'
  | 'warning'
  | 'requires_review'
  | 'not_applicable';

export type NodeStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'warning';

// =============================================================================
// Execution Result Types
// =============================================================================

export interface ExecutionResult {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion?: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'event';
  agentId?: string;
  agentName?: string;
  metrics: ExecutionMetrics;
  rootNode: ExecutionNode;
  variables: Record<string, any>;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  errors?: ExecutionError[];
}

export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  warningSteps: number;
  successRate: number;
  customMetrics?: Record<string, number | string>;
}

export interface ExecutionError {
  nodeId: string;
  nodeName: string;
  blockType: BlockType;
  error: string;
  errorCode?: string;
  stackTrace?: string;
  timestamp: string;
  iterationIndex?: number;
  iterationValue?: any;
}

// =============================================================================
// Execution Node (Tree Structure)
// =============================================================================

export interface ExecutionNode {
  id: string;
  blockId: string;
  blockType: BlockType;
  blockName: string;
  blockCategory: BlockCategory;
  
  // DUAL STATE MODEL
  executionState: BlockExecutionState;
  interpretedResult: InterpretedResult;
  
  // Combined status for backward compatibility
  status: NodeStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  
  passCondition?: PassCondition;
  result?: NodeResult;
  
  // Tree structure
  children: ExecutionNode[];
  parentId?: string;
  depth: number;
  
  // Loop-specific
  isLoop: boolean;
  iterations?: LoopIteration[];
  currentIteration?: number;
  totalIterations?: number;
  
  // Parallel execution
  isParallel: boolean;
  parallelBranches?: ExecutionNode[];
  
  // UI state
  isExpanded?: boolean;
  isHighlighted?: boolean;
}

export interface PassCondition {
  type: PassConditionType;
  value?: string | number;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  jsonPath?: string;
  script?: string;
  failureMessage?: string;
  conditions?: PassCondition[];
}

export type PassConditionType =
  | 'always'
  | 'contains'
  | 'not_contains'
  | 'regex'
  | 'equals'
  | 'json_path'
  | 'exit_code'
  | 'comparison'
  | 'custom_script'
  | 'all'
  | 'any';

export interface NodeResult {
  output?: any;
  rawOutput?: string;
  executionSuccess: boolean;
  executionError?: string;
  errorCode?: string;
  
  interpretation?: {
    passed: boolean;
    reason: string;
    matchedCondition?: string;
    extractedValue?: any;
    confidence?: number;
  };
  
  logs?: LogEntry[];
  metrics?: Record<string, number>;
  
  assertionResult?: {
    expected: any;
    actual: any;
    passed: boolean;
    message: string;
  };
  
  networkResult?: {
    hostsScanned?: number;
    hostsFound?: number;
    portsScanned?: number;
    portsOpen?: number;
    servicesDetected?: number;
    vulnerabilitiesFound?: number;
    latencyMs?: number;
    packetsLost?: number;
  };
  
  commandResult?: {
    exitCode: number;
    stdout: string;
    stderr: string;
    executionTimeMs: number;
  };
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  data?: any;
}

// =============================================================================
// Loop Iteration Types
// =============================================================================

export interface LoopIteration {
  index: number;
  status: NodeStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  iterationValue?: any;
  iterationLabel?: string;
  children: ExecutionNode[];
  error?: string;
  isExpanded: boolean;
}

export interface LoopSummary {
  totalIterations: number;
  passedIterations: number;
  failedIterations: number;
  skippedIterations: number;
  totalDuration: number;
  averageDuration: number;
  firstFailure?: {
    index: number;
    value?: any;
    error: string;
  };
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

export type ExecutionEventType =
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_paused'
  | 'execution_cancelled'
  | 'node_started'
  | 'node_completed'
  | 'node_failed'
  | 'iteration_started'
  | 'iteration_completed'
  | 'log'
  | 'metric'
  | 'variable_updated';

export interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  timestamp: string;
  nodeId?: string;
  nodeName?: string;
  blockType?: BlockType;
  iterationIndex?: number;
  iterationValue?: any;
  data?: {
    status?: NodeStatus;
    output?: any;
    error?: string;
    log?: LogEntry;
    metric?: { name: string; value: number };
    variable?: { name: string; value: any };
  };
}

// =============================================================================
// Template Definitions
// =============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  author?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  requiredInputs: TemplateInput[];
  expectedOutputs: string[];
  workflow: {
    nodes: TemplateNode[];
    edges: TemplateEdge[];
    variables: Record<string, any>;
  };
  estimatedDuration?: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

export type TemplateCategory =
  | 'network_testing'
  | 'discovery'
  | 'security'
  | 'monitoring'
  | 'compliance'
  | 'custom';

export interface TemplateInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description: string;
  example?: any;
}

export interface TemplateNode {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

// =============================================================================
// Color and Style Constants
// =============================================================================

/**
 * Status colors for cyberpunk theme with distinct icons for accessibility
 */
export const EXECUTION_STATUS_COLORS: Record<NodeStatus, string> = {
  pending: '#666666',
  running: '#00ccff',
  passed: '#00ff88',
  failed: '#ff0055',
  skipped: '#888888',
  warning: '#ffcc00',
} as const;

export const BLOCK_CATEGORY_COLORS: Record<string, string> = {
  // From workflow.ts BlockCategory
  connection: '#00d4ff',
  command: '#00ff88',
  traffic: '#8b5cf6',
  scanning: '#f59e0b',
  agent: '#ff0040',
  control: '#6b7280',
  data: '#14b8a6',
  // Legacy categories for backward compatibility
  network: '#00ff88',
  notification: '#ffcc00',
} as const;

export const STATUS_ICONS: Record<NodeStatus, string> = {
  pending: '○',
  running: '●',
  passed: '✓',
  failed: '✗',
  skipped: '⊘',
  warning: '⚠',
} as const;
