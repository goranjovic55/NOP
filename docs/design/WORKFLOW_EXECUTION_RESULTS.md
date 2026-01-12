# Workflow Execution Results - Unified Solution Proposal

**Status**: Proposed  
**Version**: 1.0  
**Date**: 2026-01-12  
**Author**: AKIS Framework

---

## Executive Summary

This document proposes a unified solution for interpreting and visualizing automation workflow execution results in NOP. The solution addresses the need for:

1. **Block-based automation** - Visual flow builder with connected blocks
2. **Execution result interpretation** - Pass/fail status for each step
3. **Tree-like visualization** - Hierarchical view of execution flow
4. **Loop handling** - Compressed views with expandable iteration details

---

## Problem Statement

The NOP platform uses block-based automation flows for network operations (e.g., rep ring test, discovery scans, vulnerability assessments). Currently, there is no unified way to:

- Summarize execution results in an intuitive manner
- Visualize pass/fail status for each automation step
- Handle loop iterations with compressed/expandable views
- Provide an overview while allowing drill-down into details

---

## Proposed Solution Architecture

### 1. Execution Result Model

```typescript
// Core execution result types
interface ExecutionResult {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number; // milliseconds
  
  // Overall metrics
  totalSteps: number;
  completedSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  
  // Execution tree
  rootNode: ExecutionNode;
  
  // Variables and context
  variables: Record<string, any>;
  outputs: Record<string, any>;
}

interface ExecutionNode {
  id: string;
  blockId: string;
  blockType: BlockType;
  blockName: string;
  
  // Execution status
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'warning';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  
  // Result data
  result?: {
    success: boolean;
    output?: any;
    error?: string;
    logs?: string[];
    metrics?: Record<string, number>;
  };
  
  // Tree structure
  children: ExecutionNode[];
  
  // For loops - iteration tracking
  isLoop?: boolean;
  iterations?: LoopIteration[];
  currentIteration?: number;
  totalIterations?: number;
}

interface LoopIteration {
  index: number;
  status: 'passed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  iterationValue?: any; // The value being iterated (e.g., IP address, host)
  children: ExecutionNode[]; // Steps within this iteration
  collapsed: boolean; // UI state for expand/collapse
}
```

### 2. Block Type Categories

Based on analysis of NOP automation patterns:

```typescript
type BlockType = 
  // Network Operations
  | 'discovery_scan'      // ARP scan, passive discovery
  | 'port_scan'           // TCP/UDP port scanning
  | 'service_detection'   // Service version detection
  | 'vulnerability_scan'  // CVE lookup, exploit matching
  | 'ping_test'           // ICMP/TCP/UDP ping
  | 'traceroute'          // Network path tracing
  
  // Control Flow
  | 'condition'           // If/else branching
  | 'loop_foreach'        // Iterate over collection
  | 'loop_while'          // While condition is true
  | 'loop_count'          // Fixed iteration count
  | 'parallel'            // Execute branches in parallel
  | 'wait'                // Delay execution
  
  // Data Operations
  | 'set_variable'        // Set workflow variable
  | 'transform_data'      // Data transformation
  | 'filter_data'         // Filter collection
  | 'aggregate'           // Aggregate results
  
  // Agent Operations
  | 'agent_command'       // Send command to agent
  | 'agent_file_transfer' // Upload/download files
  | 'agent_terminal'      // Execute terminal command
  
  // Notification/Output
  | 'log'                 // Log message
  | 'alert'               // Send alert
  | 'report'              // Generate report
  | 'assertion'           // Pass/fail check
```

---

## 3. UI Component Design

### 3.1 Execution Tree View

The main visualization component showing execution flow as a tree:

```
┌─────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Rep Ring Test                                    ▶ RUN │
│ Status: COMPLETED │ Duration: 2m 34s │ 15/16 Passed            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✓ Start                                              0.1s      │
│  │                                                              │
│  ✓ Set Variables                                      0.05s     │
│  │  └─ targets = ["10.0.0.1", "10.0.0.2", ...]               │
│  │                                                              │
│  ▼ Loop: For Each Target (5 iterations)               2m 30s    │
│  │  ├─ ✓ Iteration 1: 10.0.0.1                       28s  [+]  │
│  │  ├─ ✓ Iteration 2: 10.0.0.2                       32s  [+]  │
│  │  ├─ ✓ Iteration 3: 10.0.0.3                       25s  [+]  │
│  │  ├─ ✗ Iteration 4: 10.0.0.4                       35s  [-]  │
│  │  │     └─ Error: Connection timeout                         │
│  │  └─ ✓ Iteration 5: 10.0.0.5                       30s  [+]  │
│  │                                                              │
│  ✓ Aggregate Results                                  0.2s      │
│  │  └─ 4/5 hosts passed connectivity test                     │
│  │                                                              │
│  ✓ Generate Report                                    0.5s      │
│  │                                                              │
│  ✓ End                                                0.05s     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend: ✓ Passed  ✗ Failed  ⚠ Warning  ○ Pending  ● Running  ⊘ Skipped
```

### 3.2 Expanded Loop Iteration View

When user clicks [+] to expand an iteration:

```
│  ├─ ✓ Iteration 1: 10.0.0.1                          28s  [-]  │
│  │     │                                                        │
│  │     ├─ ✓ Ping Test                                2.1s       │
│  │     │     └─ Response: 1.2ms latency                        │
│  │     │                                                        │
│  │     ├─ ✓ Port Scan (1-1000)                       15s        │
│  │     │     └─ Open ports: 22, 80, 443, 3306                  │
│  │     │                                                        │
│  │     ├─ ✓ Service Detection                        8s         │
│  │     │     └─ SSH 8.9, nginx 1.24, MySQL 8.0                 │
│  │     │                                                        │
│  │     ├─ ✓ Assertion: Port 22 Open                  0.01s      │
│  │     │     └─ PASS: Port 22 is open                          │
│  │     │                                                        │
│  │     └─ ✓ Assertion: SSH Available                 0.01s      │
│  │           └─ PASS: SSH service detected                     │
```

### 3.3 Failed Step Detail View

```
│  ├─ ✗ Iteration 4: 10.0.0.4                          35s  [-]  │
│  │     │                                                        │
│  │     ├─ ✗ Ping Test                                30s        │
│  │     │     └─ ERROR: Connection timeout after 30s            │
│  │     │        Logs:                                          │
│  │     │        [14:32:01] Sending ICMP echo request...        │
│  │     │        [14:32:15] No response, retrying (1/3)...      │
│  │     │        [14:32:25] No response, retrying (2/3)...      │
│  │     │        [14:32:31] No response, retrying (3/3)...      │
│  │     │        [14:32:31] FAILED: Host unreachable            │
│  │     │                                                        │
│  │     ├─ ⊘ Port Scan (skipped)                                │
│  │     ├─ ⊘ Service Detection (skipped)                        │
│  │     └─ ⊘ Assertions (skipped)                               │
```

---

## 4. Summary Dashboard

Above the tree view, provide a summary dashboard:

```
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTION SUMMARY                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │   15    │  │    1    │  │    0    │  │   94%   │           │
│  │ PASSED  │  │ FAILED  │  │ SKIPPED │  │ SUCCESS │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                 │
│  Duration: 2m 34s    │    Started: 14:30:00    │    Agent: C2  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ FAILED STEPS (1)                                                │
│ ├─ [Loop Iteration 4] Ping Test - Connection timeout           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ KEY METRICS                                                     │
│ ├─ Hosts Tested: 5                                              │
│ ├─ Hosts Reachable: 4 (80%)                                     │
│ ├─ Total Ports Scanned: 5,000                                   │
│ ├─ Open Ports Found: 16                                         │
│ └─ Services Detected: 12                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Template Categories for Network Automation

Based on NOP's network operations platform, here are the proposed automation templates:

### 5.1 Network Testing Templates

| Template | Description | Blocks Used |
|----------|-------------|-------------|
| **Rep Ring Test** | Tests network ring redundancy | Loop → Ping → Assert connectivity |
| **Port Availability Check** | Verify critical ports are open | Loop hosts → Port scan → Assertions |
| **Service Health Check** | Check if services are responding | Loop services → Connect → Assert response |
| **Latency Baseline** | Measure network latency baselines | Loop → Ping (timed) → Aggregate stats |

### 5.2 Discovery Templates

| Template | Description | Blocks Used |
|----------|-------------|-------------|
| **Full Network Discovery** | Complete network enumeration | ARP scan → Port scan → Service detect → CVE lookup |
| **Quick Discovery** | Fast host enumeration | ARP scan → Basic ping |
| **Passive Monitoring** | Sniff and discover | Passive capture → Extract hosts |

### 5.3 Security Assessment Templates

| Template | Description | Blocks Used |
|----------|-------------|-------------|
| **Vulnerability Scan** | CVE-based vulnerability check | Discover → Service detect → CVE lookup → Report |
| **Compliance Check** | Security baseline verification | Loop checks → Assert → Report |

---

## 6. Implementation Components

### 6.1 React Components

```
frontend/src/components/workflow/
├── ExecutionResults/
│   ├── index.ts                    # Exports
│   ├── ExecutionResultsView.tsx    # Main container
│   ├── ExecutionSummary.tsx        # Summary dashboard
│   ├── ExecutionTree.tsx           # Tree visualization
│   ├── ExecutionNode.tsx           # Single node in tree
│   ├── LoopIterations.tsx          # Loop iteration handler
│   ├── StepDetails.tsx             # Expanded step details
│   ├── FailedStepCard.tsx          # Failed step summary
│   └── MetricsPanel.tsx            # Key metrics display
```

### 6.2 Backend Services

```
backend/app/services/
├── workflow_executor.py           # Execute workflow blocks
├── workflow_compiler.py           # Compile workflow to DAG
└── execution_result_service.py    # NEW: Result aggregation & storage
```

### 6.3 API Endpoints

```
POST /api/v1/workflows/{id}/execute          # Start execution
GET  /api/v1/workflows/{id}/executions       # List executions
GET  /api/v1/workflows/executions/{exec_id}  # Get execution details
WS   /api/v1/workflows/executions/{exec_id}  # Real-time updates
POST /api/v1/workflows/executions/{exec_id}/cancel  # Cancel execution
```

---

## 7. Real-time Updates via WebSocket

For live execution monitoring:

```typescript
interface ExecutionEvent {
  type: 'node_started' | 'node_completed' | 'node_failed' 
      | 'iteration_started' | 'iteration_completed'
      | 'execution_completed' | 'execution_failed'
      | 'log' | 'metric';
  
  executionId: string;
  nodeId?: string;
  iterationIndex?: number;
  timestamp: string;
  
  data?: {
    status?: string;
    output?: any;
    error?: string;
    log?: string;
    metric?: { name: string; value: number };
  };
}
```

---

## 8. Pass/Fail Determination Logic

Each block type has specific pass/fail criteria:

```typescript
const PASS_FAIL_RULES: Record<BlockType, PassFailRule> = {
  'ping_test': {
    pass: (result) => result.latency !== undefined && result.latency < 5000,
    fail: (result) => result.error === 'timeout' || result.unreachable,
    warning: (result) => result.latency > 1000,
  },
  
  'port_scan': {
    pass: (result) => result.scanned && !result.error,
    fail: (result) => result.error !== undefined,
    // No warning state for port scan
  },
  
  'assertion': {
    pass: (result) => result.assertion === true,
    fail: (result) => result.assertion === false,
  },
  
  'loop_foreach': {
    pass: (node) => node.iterations.every(i => i.status === 'passed'),
    fail: (node) => node.iterations.some(i => i.status === 'failed'),
    warning: (node) => node.iterations.some(i => i.status === 'warning'),
  },
  
  // ... other block types
};
```

---

## 9. Cyberpunk UI Styling

Consistent with NOP's cyberpunk design theme:

```typescript
const EXECUTION_STATUS_COLORS = {
  passed: '#00ff88',   // Neon green
  failed: '#ff0055',   // Neon red
  warning: '#ffcc00',  // Neon yellow
  running: '#00ccff',  // Neon cyan (animated)
  pending: '#666666',  // Dim gray
  skipped: '#888888',  // Medium gray
};

const BLOCK_CATEGORY_COLORS = {
  network: '#00ff88',      // Network operations
  control: '#ff00ff',      // Control flow
  data: '#00ccff',         // Data operations
  agent: '#ff8800',        // Agent operations
  notification: '#ffcc00', // Notifications
};
```

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Define TypeScript types for execution results
- [ ] Implement backend execution result service
- [ ] Add database models for execution history
- [ ] Create WebSocket event handlers

### Phase 2: Basic UI Components (Week 3-4)
- [ ] ExecutionResultsView container
- [ ] ExecutionSummary dashboard
- [ ] Basic ExecutionTree view
- [ ] StepDetails panel

### Phase 3: Loop Handling (Week 5)
- [ ] LoopIterations component
- [ ] Expand/collapse functionality
- [ ] Iteration metrics aggregation

### Phase 4: Templates & Polish (Week 6)
- [ ] Pre-built automation templates
- [ ] Real-time WebSocket integration
- [ ] Animation and transitions
- [ ] Export/share execution results

---

## 11. Success Criteria

1. **User can see at-a-glance status** - Summary shows pass/fail/total
2. **Drill-down capability** - Click to expand any node/iteration
3. **Loop handling** - Iterations are compressed by default, expandable
4. **Real-time updates** - Live status during execution
5. **Clear error reporting** - Failed steps show error details and logs
6. **Performance** - Handles workflows with 1000+ steps smoothly

---

## Related Documentation

- [Workflow Builder](../features/WORKFLOW_BUILDER.md)
- [Block Definitions](../technical/BLOCK_DEFINITIONS.md)
- [API Specification](../technical/API_rest_v1.md)

---

**Document Version**: 1.0  
**Status**: Proposed  
**Next Review**: 2026-01-19
