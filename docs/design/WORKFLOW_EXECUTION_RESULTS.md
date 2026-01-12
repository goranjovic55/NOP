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

### 1. Dual-State Model: Execution vs Interpretation

A key insight is that blocks have **two distinct states**:

1. **Execution State** (`executionState`): Did the block complete its operation?
   - `completed` - Block finished executing (command ran, API responded, etc.)
   - `failed` - Block could not execute (connection error, timeout, etc.)
   - `pending` / `running` - Block hasn't started or is in progress

2. **Interpreted Result** (`interpretedResult`): Based on the output, what is the pass/fail verdict?
   - `passed` - Output meets the defined success criteria
   - `failed` - Output does not meet success criteria
   - `requires_review` - Needs human interpretation
   - `not_applicable` - Block doesn't have pass/fail semantics

**Example: Rep Ring Test**
```
Block: "Execute SSH Command: show rep ring"
├── executionState: completed (command ran successfully)
├── rawOutput: "Port Te1/0/1 is Open, Ring is OK"
├── interpretedResult: passed (found "Ring is OK" in output)
└── passCondition: { type: 'contains', value: 'Ring is OK' }
```

### 2. Execution Result Model

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
  
  // DUAL STATE: Execution vs Interpretation
  executionState: 'pending' | 'running' | 'completed' | 'failed';  // Did block execute?
  interpretedResult: 'pending' | 'passed' | 'failed' | 'warning' | 'requires_review' | 'not_applicable';  // Pass/fail verdict
  
  // For backward compatibility, status combines both states
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'warning';
  
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  
  // Result data with TWO outputs
  result?: {
    // Block output (raw data to pass to next block)
    output?: any;
    rawOutput?: string;  // For command blocks, the raw text output
    
    // Execution state details
    executionSuccess: boolean;  // Did block complete without errors?
    executionError?: string;    // Error if execution failed
    
    // Interpretation details
    interpretation?: {
      passed: boolean;
      reason: string;           // Why it passed/failed
      matchedCondition?: string; // Which condition matched
      extractedValue?: any;     // Value extracted from output
    };
    
    logs?: string[];
    metrics?: Record<string, number>;
  };
  
  // Pass condition for this block (defined when building workflow)
  passCondition?: PassCondition;
  
  // Tree structure
  children: ExecutionNode[];
  
  // For loops - iteration tracking
  isLoop?: boolean;
  iterations?: LoopIteration[];
  currentIteration?: number;
  totalIterations?: number;
}

// Pass condition types for output interpretation
interface PassCondition {
  type: 'always'           // Always pass if execution completes
       | 'contains'         // Output contains string
       | 'not_contains'     // Output does not contain string
       | 'regex'            // Output matches regex
       | 'equals'           // Output equals value
       | 'json_path'        // JSON path expression evaluates to truthy
       | 'exit_code'        // Command exit code equals value
       | 'comparison'       // Numeric comparison
       | 'custom_script';   // Custom JavaScript/expression
  
  value?: string | number | RegExp;
  
  // For comparison type
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  
  // For json_path type
  jsonPath?: string;
  
  // For custom_script type
  script?: string;  // e.g., "output.includes('Ring is OK') && !output.includes('Error')"
  
  // Error message when condition fails
  failureMessage?: string;
}

interface LoopIteration {
  index: number;
  executionState: 'completed' | 'failed';
  interpretedResult: 'passed' | 'failed' | 'warning' | 'requires_review';
  status: 'passed' | 'failed' | 'skipped';  // Combined status
  startedAt: string;
  completedAt?: string;
  duration?: number;
  iterationValue?: any; // The value being iterated (e.g., IP address, host)
  children: ExecutionNode[]; // Steps within this iteration
  collapsed: boolean; // UI state for expand/collapse
}
```

### 3. Output Interpreter Block

For complex output parsing (like "show rep ring"), use an **Output Interpreter Block**:

```typescript
// New block type for parsing command outputs
type BlockType = 
  // ... existing types ...
  | 'output_interpreter'  // Parse and interpret output from previous block
```

**Output Interpreter Block Properties:**
```typescript
interface OutputInterpreterConfig {
  // Input: output from previous block
  inputSource: string;  // Variable name or {{previous.output}}
  
  // Parsing rules
  parseRules: ParseRule[];
  
  // Overall pass condition (all rules must pass by default)
  aggregation: 'all' | 'any' | 'custom';
  
  // Extract values to pass to next blocks
  extractedVariables: ExtractRule[];
}

interface ParseRule {
  name: string;
  description: string;
  condition: PassCondition;
  weight?: number;  // For weighted scoring
}

interface ExtractRule {
  variableName: string;
  extractMethod: 'regex' | 'json_path' | 'line_number' | 'between_markers';
  pattern: string;
}
```

**Example: Rep Ring Test Interpreter**
```yaml
block: output_interpreter
name: "Parse Rep Ring Status"
config:
  inputSource: "{{ssh_command.rawOutput}}"
  parseRules:
    - name: "Ring Status OK"
      condition:
        type: contains
        value: "Ring is OK"
      failureMessage: "Ring status not OK - possible failure"
    - name: "No Port Errors"
      condition:
        type: not_contains
        value: "Port Down"
    - name: "Topology Complete"
      condition:
        type: regex
        value: "\\d+ ports in ring"
  extractedVariables:
    - variableName: "ring_port_count"
      extractMethod: regex
      pattern: "(\\d+) ports in ring"
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

## 6. Complete Example: Rep Ring Test Workflow

This example shows the dual-state model in action for a REP ring test:

### 6.1 Workflow Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ REP RING TEST WORKFLOW                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                               │
│  │    START     │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│  ┌──────▼───────┐                                               │
│  │ Agent Login  │ executionState: completed/failed              │
│  │ (SSH to SW)  │ interpretedResult: passed if connected        │
│  └──────┬───────┘                                               │
│         │                                                       │
│  ┌──────▼───────┐                                               │
│  │ Port Shutdown│ Shut down port to test ring failover          │
│  │ (CLI cmd)    │ executionState: completed (command ran)       │
│  └──────┬───────┘ interpretedResult: always pass                │
│         │                                                       │
│  ┌──────▼───────┐                                               │
│  │ Show Rep Ring│ Get ring status after shutdown                │
│  │ (CLI cmd)    │ executionState: completed (got output)        │
│  └──────┬───────┘ rawOutput: "Ring is OK, 4 ports..."           │
│         │                                                       │
│  ┌──────▼───────────────┐                                       │
│  │ Parse Ring Status    │ OUTPUT INTERPRETER block              │
│  │ (output_interpreter) │ Parses rawOutput from previous block  │
│  │ passCondition:       │                                       │
│  │  - contains "Ring is │ interpretedResult: passed/failed      │
│  │    OK"               │ based on parsing rules                │
│  │  - not contains      │                                       │
│  │    "Port Down"       │                                       │
│  └──────┬───────────────┘                                       │
│         │                                                       │
│  ┌──────▼───────┐                                               │
│  │ Port Enable  │ Re-enable the port                            │
│  │ (CLI cmd)    │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│  ┌──────▼───────┐                                               │
│  │     END      │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Execution Result Example

```json
{
  "id": "exec-001",
  "workflowName": "Rep Ring Test - Switch A",
  "status": "completed",
  "rootNode": {
    "blockName": "Show Rep Ring",
    "blockType": "ssh_command",
    
    "executionState": "completed",
    "interpretedResult": "pending",
    
    "result": {
      "executionSuccess": true,
      "rawOutput": "REP Segment 1:\n  Port Te1/0/1: Open\n  Port Te1/0/2: Open\n  Ring is OK\n  4 ports in segment",
      "commandResult": {
        "exitCode": 0,
        "stdout": "REP Segment 1:\n  Port Te1/0/1: Open\n...",
        "stderr": "",
        "executionTimeMs": 234
      }
    },
    
    "children": [{
      "blockName": "Parse Ring Status",
      "blockType": "output_interpreter",
      
      "executionState": "completed",
      "interpretedResult": "passed",
      
      "passCondition": {
        "type": "all",
        "conditions": [
          { "type": "contains", "value": "Ring is OK" },
          { "type": "not_contains", "value": "Port Down" }
        ]
      },
      
      "result": {
        "executionSuccess": true,
        "interpretation": {
          "passed": true,
          "reason": "All conditions met: 'Ring is OK' found, 'Port Down' not found",
          "matchedCondition": "all",
          "extractedValue": { "ring_port_count": 4 }
        }
      }
    }]
  }
}
```

### 6.3 UI Display with Dual State

```
┌─────────────────────────────────────────────────────────────────┐
│ Rep Ring Test - Switch A                              PASSED ✓  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✓ Agent Login                                                  │
│  │  └─ [Executed ✓] [Interpretation: PASSED]                    │
│  │     Connected to 192.168.1.1 as admin                        │
│  │                                                              │
│  ✓ Port Shutdown (Te1/0/1)                                      │
│  │  └─ [Executed ✓] [Interpretation: N/A]                       │
│  │     Command: shutdown                                        │
│  │                                                              │
│  ✓ Show Rep Ring                                                │
│  │  └─ [Executed ✓] [Interpretation: PENDING → Next Block]      │
│  │     Output: "REP Segment 1: Ring is OK, 4 ports..."          │
│  │                                                              │
│  ✓ Parse Ring Status                                     ← KEY  │
│  │  └─ [Executed ✓] [Interpretation: PASSED]                    │
│  │     ├─ ✓ Rule: "Ring is OK" found in output                  │
│  │     ├─ ✓ Rule: "Port Down" NOT found                         │
│  │     └─ Extracted: ring_port_count = 4                        │
│  │                                                              │
│  ✓ Port Enable (Te1/0/1)                                        │
│  │  └─ [Executed ✓] [Interpretation: N/A]                       │
│  │                                                              │
│  ✓ End                                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Components

### 7.1 React Components

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

### 7.2 Backend Services

```
backend/app/services/
├── workflow_executor.py           # Execute workflow blocks
├── workflow_compiler.py           # Compile workflow to DAG
├── output_interpreter.py          # NEW: Parse and interpret block outputs
└── execution_result_service.py    # NEW: Result aggregation & storage
```

### 7.3 API Endpoints

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
