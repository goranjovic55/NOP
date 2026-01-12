/**
 * Workflow Execution Results - Type Definitions
 * 
 * This module defines types for the unified workflow execution results system.
 * It supports:
 * - Block-based automation with pass/fail status
 * - Tree-like execution visualization
 * - Loop handling with compressed/expandable views
 * - Real-time execution updates via WebSocket
 */

// =============================================================================
// Block Type Definitions
// =============================================================================

/**
 * All available block types in the workflow system.
 * Organized by category for easier maintenance.
 */
export type BlockType =
  // Network Operations
  | 'discovery_scan'      // ARP scan, passive discovery
  | 'port_scan'           // TCP/UDP port scanning
  | 'service_detection'   // Service version detection
  | 'vulnerability_scan'  // CVE lookup, exploit matching
  | 'ping_test'           // ICMP/TCP/UDP ping
  | 'traceroute'          // Network path tracing
  | 'bandwidth_test'      // Bandwidth measurement
  | 'dns_lookup'          // DNS resolution
  
  // Control Flow
  | 'condition'           // If/else branching
  | 'loop_foreach'        // Iterate over collection
  | 'loop_while'          // While condition is true
  | 'loop_count'          // Fixed iteration count
  | 'parallel'            // Execute branches in parallel
  | 'wait'                // Delay execution
  | 'start'               // Workflow start block
  | 'end'                 // Workflow end block
  
  // Data Operations
  | 'set_variable'        // Set workflow variable
  | 'transform_data'      // Data transformation
  | 'filter_data'         // Filter collection
  | 'aggregate'           // Aggregate results
  | 'http_request'        // HTTP API call
  
  // Agent Operations
  | 'agent_command'       // Send command to agent
  | 'agent_file_transfer' // Upload/download files
  | 'agent_terminal'      // Execute terminal command
  | 'agent_discovery'     // Agent-based discovery
  
  // Notification/Output
  | 'log'                 // Log message
  | 'alert'               // Send alert
  | 'report'              // Generate report
  | 'assertion'           // Pass/fail check
  | 'email'               // Send email notification
  | 'webhook';            // Call external webhook

/**
 * Block category for grouping and styling
 */
export type BlockCategory =
  | 'network'
  | 'control'
  | 'data'
  | 'agent'
  | 'notification';

/**
 * Block definition with metadata
 */
export interface BlockDefinition {
  type: BlockType;
  category: BlockCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  inputs: BlockParameter[];
  outputs: BlockOutput[];
  hasPassFailStatus: boolean;
}

export interface BlockParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'expression';
  required: boolean;
  default?: any;
  description: string;
  options?: string[]; // For select/dropdown parameters
}

export interface BlockOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
}

// =============================================================================
// Execution Status Types
// =============================================================================

/**
 * Overall execution status
 */
export type ExecutionStatus =
  | 'pending'    // Not started
  | 'running'    // Currently executing
  | 'completed'  // Finished successfully
  | 'failed'     // Finished with failures
  | 'paused'     // Temporarily stopped
  | 'cancelled'; // User cancelled

/**
 * Individual node/step status
 */
export type NodeStatus =
  | 'pending'  // Not yet executed
  | 'running'  // Currently executing
  | 'passed'   // Completed successfully
  | 'failed'   // Completed with error
  | 'skipped'  // Skipped (e.g., due to condition or upstream failure)
  | 'warning'; // Completed but with warnings

// =============================================================================
// Execution Result Types
// =============================================================================

/**
 * Complete execution result for a workflow run
 */
export interface ExecutionResult {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion?: string;
  
  // Status
  status: ExecutionStatus;
  startedAt: string;           // ISO 8601 timestamp
  completedAt?: string;        // ISO 8601 timestamp
  duration?: number;           // Duration in milliseconds
  
  // Execution context
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'event';
  agentId?: string;            // Agent that executed this
  agentName?: string;
  
  // Metrics summary
  metrics: ExecutionMetrics;
  
  // Execution tree (root node)
  rootNode: ExecutionNode;
  
  // Variables and context
  variables: Record<string, any>;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  
  // Error summary (if failed)
  errors?: ExecutionError[];
}

/**
 * Execution metrics summary
 */
export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  warningSteps: number;
  
  // Success rate as percentage (0-100)
  successRate: number;
  
  // Custom metrics from blocks
  customMetrics?: Record<string, number | string>;
}

/**
 * Error information for failed steps
 */
export interface ExecutionError {
  nodeId: string;
  nodeName: string;
  blockType: BlockType;
  error: string;
  errorCode?: string;
  stackTrace?: string;
  timestamp: string;
  
  // For loop iterations
  iterationIndex?: number;
  iterationValue?: any;
}

// =============================================================================
// Execution Node (Tree Structure)
// =============================================================================

/**
 * A single node in the execution tree
 */
export interface ExecutionNode {
  id: string;
  blockId: string;
  blockType: BlockType;
  blockName: string;
  blockCategory: BlockCategory;
  
  // Execution status
  status: NodeStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  
  // Result data
  result?: NodeResult;
  
  // Tree structure
  children: ExecutionNode[];
  parentId?: string;
  depth: number;
  
  // Loop-specific properties
  isLoop: boolean;
  iterations?: LoopIteration[];
  currentIteration?: number;
  totalIterations?: number;
  
  // Parallel execution
  isParallel: boolean;
  parallelBranches?: ExecutionNode[];
  
  // UI state (client-side)
  isExpanded?: boolean;
  isHighlighted?: boolean;
}

/**
 * Result data for a single node execution
 */
export interface NodeResult {
  success: boolean;
  output?: any;
  error?: string;
  errorCode?: string;
  
  // Execution logs
  logs?: LogEntry[];
  
  // Metrics produced by this node
  metrics?: Record<string, number>;
  
  // For assertion blocks
  assertionResult?: {
    expected: any;
    actual: any;
    passed: boolean;
    message: string;
  };
  
  // For network operation blocks
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
}

/**
 * Log entry from execution
 */
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  data?: any;
}

// =============================================================================
// Loop Iteration Types
// =============================================================================

/**
 * A single iteration of a loop block
 */
export interface LoopIteration {
  index: number;                    // 0-based iteration index
  status: NodeStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  
  // The value being iterated (e.g., IP address, hostname)
  iterationValue?: any;
  iterationLabel?: string;          // Human-readable label for the iteration
  
  // Child nodes executed in this iteration
  children: ExecutionNode[];
  
  // Error if this iteration failed
  error?: string;
  
  // UI state
  isExpanded: boolean;
}

/**
 * Loop summary for compressed view
 */
export interface LoopSummary {
  totalIterations: number;
  passedIterations: number;
  failedIterations: number;
  skippedIterations: number;
  
  // Aggregated duration
  totalDuration: number;
  averageDuration: number;
  
  // First failure for quick access
  firstFailure?: {
    index: number;
    value?: any;
    error: string;
  };
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

/**
 * Real-time execution event types
 */
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

/**
 * WebSocket event for real-time updates
 */
export interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  timestamp: string;
  
  // Node-specific data
  nodeId?: string;
  nodeName?: string;
  blockType?: BlockType;
  
  // Iteration-specific data
  iterationIndex?: number;
  iterationValue?: any;
  
  // Event payload
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

/**
 * Workflow template for common automation patterns
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  
  // Template metadata
  author?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  
  // Required inputs
  requiredInputs: TemplateInput[];
  
  // Expected outputs
  expectedOutputs: string[];
  
  // The workflow definition
  workflow: {
    nodes: TemplateNode[];
    edges: TemplateEdge[];
    variables: Record<string, any>;
  };
  
  // Estimated metrics
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
// UI State Types
// =============================================================================

/**
 * State for the execution results viewer component
 */
export interface ExecutionViewerState {
  execution: ExecutionResult | null;
  isLoading: boolean;
  error: string | null;
  
  // Expansion state
  expandedNodes: Set<string>;
  expandedIterations: Map<string, Set<number>>;
  
  // Filter/view options
  filter: {
    showPassed: boolean;
    showFailed: boolean;
    showSkipped: boolean;
    showWarnings: boolean;
    searchText: string;
  };
  
  // Selected node for details panel
  selectedNodeId: string | null;
  
  // View mode
  viewMode: 'tree' | 'timeline' | 'summary';
  
  // Real-time updates
  isLive: boolean;
  wsConnected: boolean;
}

/**
 * Actions for execution viewer state management
 */
export interface ExecutionViewerActions {
  // Data loading
  loadExecution: (executionId: string) => Promise<void>;
  refreshExecution: () => Promise<void>;
  
  // Node expansion
  toggleNodeExpanded: (nodeId: string) => void;
  toggleIterationExpanded: (nodeId: string, iterationIndex: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Filtering
  setFilter: (filter: Partial<ExecutionViewerState['filter']>) => void;
  
  // Selection
  selectNode: (nodeId: string | null) => void;
  
  // View mode
  setViewMode: (mode: ExecutionViewerState['viewMode']) => void;
  
  // Real-time
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  handleEvent: (event: ExecutionEvent) => void;
}

// =============================================================================
// Pass/Fail Rule Types
// =============================================================================

/**
 * Pass/fail determination rule for a block type
 */
export interface PassFailRule {
  pass: (result: NodeResult, node?: ExecutionNode) => boolean;
  fail: (result: NodeResult, node?: ExecutionNode) => boolean;
  warning?: (result: NodeResult, node?: ExecutionNode) => boolean;
}

/**
 * Registry of pass/fail rules by block type
 */
export type PassFailRules = Partial<Record<BlockType, PassFailRule>>;

// =============================================================================
// Color and Style Constants
// =============================================================================

/**
 * Status colors for cyberpunk theme
 * Note: These colors are supplemented with distinct icons (STATUS_ICONS)
 * to ensure accessibility for users with color vision deficiencies.
 * The combination of color + unique icon shape provides multiple
 * differentiating factors beyond color alone.
 */
export const EXECUTION_STATUS_COLORS: Record<NodeStatus, string> = {
  pending: '#666666',   // Gray circle ○
  running: '#00ccff',   // Cyan filled circle ● (animated)
  passed: '#00ff88',    // Green checkmark ✓
  failed: '#ff0055',    // Red X ✗
  skipped: '#888888',   // Gray empty set ⊘
  warning: '#ffcc00',   // Yellow warning ⚠
} as const;

/**
 * Category colors for block types
 */
export const BLOCK_CATEGORY_COLORS: Record<BlockCategory, string> = {
  network: '#00ff88',
  control: '#ff00ff',
  data: '#00ccff',
  agent: '#ff8800',
  notification: '#ffcc00',
} as const;

/**
 * Status icons (Unicode symbols)
 */
export const STATUS_ICONS: Record<NodeStatus, string> = {
  pending: '○',
  running: '●',
  passed: '✓',
  failed: '✗',
  skipped: '⊘',
  warning: '⚠',
} as const;
