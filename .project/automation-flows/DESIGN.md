# Automation Flow Execution Engine - Design Document

## Problem Statement

Users need to execute complex multi-step automation workflows across multiple devices/targets and receive structured reports showing:
1. **What was tested** (targets, operations)
2. **What happened** (command outputs, status changes)
3. **Summary metrics** (success/failure counts, timing)
4. **Actionable results** (e.g., "4/4 switches have working REP rings", "3 assets agentized")

### Use Cases

#### Use Case 1: REP Ring Testing
```
For each switch in [switch1, switch2, switch3, switch4]:
  1. SSH login
  2. Disable port Gi0/1
  3. Ping all other switches
  4. Check REP ring status
  5. Wait 10s for convergence
  6. Re-enable port
  7. Disable port Gi0/2
  8. Repeat ping + check
  9. Re-enable all ports

REPORT:
┌─────────────────────────────────────────────────────────┐
│ REP RING TEST RESULTS                                   │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Switch   │ Port Down│ Ring OK? │ Ping OK? │ Status      │
├──────────┼──────────┼──────────┼──────────┼─────────────┤
│ switch1  │ Gi0/1    │ ✓        │ 3/3      │ PASS        │
│ switch1  │ Gi0/2    │ ✓        │ 3/3      │ PASS        │
│ switch2  │ Gi0/1    │ ✓        │ 3/3      │ PASS        │
│ ...      │ ...      │ ...      │ ...      │ ...         │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
Overall: 8/8 tests passed, REP ring fully redundant
```

#### Use Case 2: Asset Agentization Pipeline
```
1. Passive discovery (get assets)
2. For each asset:
   a. Port scan
   b. Vulnerability scan
   c. Try exploit chain OR SSH login
   d. Deploy agent
   e. Verify agent callback

REPORT:
┌───────────────────────────────────────────────────────────────┐
│ AGENT DEPLOYMENT RESULTS                                      │
├─────────────────┬───────────┬─────────────┬─────────┬─────────┤
│ Asset           │ Method    │ Agent ID    │ Status  │ Time    │
├─────────────────┼───────────┼─────────────┼─────────┼─────────┤
│ 192.168.1.10    │ SSH       │ agent-a1b2  │ ✓ LIVE  │ 45s     │
│ 192.168.1.15    │ Exploit   │ agent-c3d4  │ ✓ LIVE  │ 1m 23s  │
│ 192.168.1.20    │ SSH       │ -           │ ✗ FAIL  │ timeout │
│ 192.168.1.25    │ -         │ -           │ ⊘ SKIP  │ no vuln │
└─────────────────┴───────────┴─────────────┴─────────┴─────────┘
Summary: 2/4 assets agentized (50%)
```

---

## Architecture Design

### Core Components

```
┌──────────────────────────────────────────────────────────────┐
│                    FLOW EXECUTION SYSTEM                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │   FLOW      │───▶│   FLOW       │───▶│    REPORT      │  │
│  │  BUILDER    │    │  EXECUTOR    │    │   GENERATOR    │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
│        │                   │                    │            │
│        ▼                   ▼                    ▼            │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │   FLOW      │    │   RESULT     │    │    REPORT      │  │
│  │  SCHEMA     │    │  COLLECTOR   │    │   TEMPLATES    │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 1. Flow Schema (Extended)

Current Scripts use a flat step list. We need hierarchical flows:

```typescript
interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Target Configuration
  targets: FlowTarget[];
  
  // Variables & Parameters
  variables: FlowVariable[];
  parameters: FlowParameter[];  // User-configurable at runtime
  
  // Flow Structure
  stages: FlowStage[];
  
  // Report Configuration
  reportConfig: ReportConfig;
}

interface FlowTarget {
  id: string;
  type: 'asset' | 'ip' | 'cidr' | 'group' | 'dynamic';
  value: string;  // IP, asset ID, or expression like "{{discovered_assets}}"
  credentials?: string;  // Credential ID or "prompt"
  metadata?: Record<string, any>;
}

interface FlowStage {
  id: string;
  name: string;
  description?: string;
  
  // Execution mode
  mode: 'sequential' | 'parallel' | 'foreach';
  
  // For 'foreach' mode
  iterateOver?: string;  // Variable name containing array
  iteratorVar?: string;  // Variable name for current item (default: "item")
  maxParallel?: number;  // Max concurrent iterations
  
  // Stage steps
  steps: FlowStep[];
  
  // Error handling
  onError: 'stop' | 'continue' | 'skip-target' | 'retry';
  retryCount?: number;
  
  // Conditions
  condition?: string;  // Expression to evaluate
  
  // Sub-stages (for nesting)
  stages?: FlowStage[];
}

interface FlowStep {
  id: string;
  name: string;
  type: FlowStepType;
  params: Record<string, any>;  // Supports expressions: "{{target.ip}}"
  
  // Output capture
  outputVar?: string;  // Store result in this variable
  extractors?: OutputExtractor[];  // Parse output for specific values
  
  // Assertions for reporting
  assertions?: StepAssertion[];
  
  // Timing
  timeout?: number;
  retryOnFail?: boolean;
}

interface OutputExtractor {
  name: string;
  type: 'regex' | 'json-path' | 'line-contains' | 'custom';
  pattern: string;
  storeAs: string;  // Variable name
}

interface StepAssertion {
  id: string;
  name: string;  // "REP Ring Active", "Ping Success"
  type: 'contains' | 'not-contains' | 'equals' | 'regex' | 'json-path' | 'custom';
  target: string;  // What to check: "output", "exitCode", or variable name
  expected: any;
  severity: 'critical' | 'warning' | 'info';
}
```

### 2. Enhanced Step Types

```typescript
type FlowStepType =
  // Connection
  | 'ssh_connect' | 'ssh_execute' | 'ssh_disconnect'
  | 'rdp_connect' | 'vnc_connect' | 'telnet_connect'
  
  // Network Operations
  | 'ping' | 'ping_sweep' | 'traceroute'
  | 'port_scan' | 'service_detection'
  
  // Device Commands (abstracted)
  | 'device_command'      // Generic command execution
  | 'interface_shutdown'  // Abstracted: translates to correct syntax
  | 'interface_enable'
  | 'show_command'        // Read-only commands
  
  // Scanning
  | 'vuln_scan' | 'version_detect' | 'cve_lookup'
  
  // Exploitation
  | 'exploit_run' | 'payload_execute'
  
  // Agent
  | 'agent_generate' | 'agent_deploy' | 'agent_verify'
  
  // Control Flow
  | 'delay' | 'condition' | 'set_variable' | 'log'
  
  // Data Collection
  | 'collect_metric'  // Add data point to report
  | 'assert'          // Check condition, record result
  
  // External
  | 'http_request' | 'script_execute';
```

### 3. Result Collector

```typescript
interface ExecutionResult {
  flowId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Summary
  summary: ExecutionSummary;
  
  // Per-target results
  targetResults: Map<string, TargetResult>;
  
  // Timeline of all events
  timeline: ExecutionEvent[];
  
  // Collected metrics for reporting
  metrics: CollectedMetric[];
  
  // Assertion results
  assertions: AssertionResult[];
  
  // Raw logs
  logs: ExecutionLog[];
}

interface TargetResult {
  targetId: string;
  targetInfo: FlowTarget;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'skipped';
  stageResults: Map<string, StageResult>;
  variables: Record<string, any>;  // Target-specific variables
  startTime: Date;
  endTime?: Date;
  error?: string;
}

interface StageResult {
  stageId: string;
  stageName: string;
  status: ExecutionStatus;
  stepResults: StepResult[];
  iterations?: IterationResult[];  // For foreach stages
}

interface StepResult {
  stepId: string;
  stepName: string;
  stepType: FlowStepType;
  status: ExecutionStatus;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  
  // Outputs
  output: any;
  rawOutput?: string;
  extractedValues: Record<string, any>;
  
  // Assertions
  assertionResults: AssertionResult[];
  
  // Errors
  error?: string;
  errorDetail?: any;
}

interface CollectedMetric {
  id: string;
  name: string;
  category: string;
  value: any;
  targetId?: string;
  stageId?: string;
  stepId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface AssertionResult {
  assertionId: string;
  assertionName: string;
  passed: boolean;
  expected: any;
  actual: any;
  targetId?: string;
  stepId?: string;
  severity: 'critical' | 'warning' | 'info';
}
```

### 4. Report Generator

```typescript
interface ReportConfig {
  type: 'table' | 'summary' | 'detailed' | 'custom';
  title: string;
  description?: string;
  
  // Table configuration
  tableColumns?: ReportColumn[];
  groupBy?: string;  // Group rows by target, stage, etc.
  
  // Summary configuration
  summaryMetrics?: SummaryMetric[];
  
  // Custom template
  template?: string;  // Markdown template with placeholders
}

interface ReportColumn {
  header: string;
  value: string;  // Expression: "{{target.ip}}", "{{assertions.ping_ok.passed}}"
  type: 'text' | 'status' | 'duration' | 'count';
  width?: string;
}

interface SummaryMetric {
  name: string;
  type: 'count' | 'percentage' | 'duration' | 'list';
  filter?: string;  // Expression to filter items
  format?: string;
}

interface GeneratedReport {
  flowId: string;
  executionId: string;
  generatedAt: Date;
  
  title: string;
  summary: string;
  
  // Structured data
  tables: ReportTable[];
  metrics: ReportMetric[];
  timeline?: ReportTimeline;
  
  // Rendered output
  markdown: string;
  html?: string;
  json: any;
}
```

---

## Example Flow Definitions

### REP Ring Test Flow

```json
{
  "id": "rep-ring-test",
  "name": "REP Ring Redundancy Test",
  "description": "Test network failover by disabling ports and verifying ring topology",
  "version": "1.0",
  
  "parameters": [
    { "name": "convergence_wait", "type": "number", "default": 10, "label": "Convergence Wait (s)" },
    { "name": "ping_count", "type": "number", "default": 3, "label": "Ping Count" }
  ],
  
  "targets": [
    { "id": "sw1", "type": "ip", "value": "192.168.1.1", "credentials": "cisco-switch" },
    { "id": "sw2", "type": "ip", "value": "192.168.1.2", "credentials": "cisco-switch" },
    { "id": "sw3", "type": "ip", "value": "192.168.1.3", "credentials": "cisco-switch" },
    { "id": "sw4", "type": "ip", "value": "192.168.1.4", "credentials": "cisco-switch" }
  ],
  
  "stages": [
    {
      "id": "per-switch-test",
      "name": "Test Each Switch",
      "mode": "foreach",
      "iterateOver": "targets",
      "iteratorVar": "current_switch",
      "maxParallel": 1,
      "onError": "continue",
      
      "stages": [
        {
          "id": "connect",
          "name": "Connect",
          "mode": "sequential",
          "steps": [
            {
              "id": "ssh",
              "name": "SSH Connect",
              "type": "ssh_connect",
              "params": {
                "host": "{{current_switch.value}}",
                "credentials": "{{current_switch.credentials}}"
              }
            }
          ]
        },
        {
          "id": "test-ports",
          "name": "Test Ports",
          "mode": "foreach",
          "iterateOver": "['Gi0/1', 'Gi0/2']",
          "iteratorVar": "port",
          
          "steps": [
            {
              "id": "disable-port",
              "name": "Disable {{port}}",
              "type": "interface_shutdown",
              "params": { "interface": "{{port}}" }
            },
            {
              "id": "wait",
              "name": "Wait for convergence",
              "type": "delay",
              "params": { "seconds": "{{convergence_wait}}" }
            },
            {
              "id": "check-rep",
              "name": "Check REP Status",
              "type": "show_command",
              "params": { "command": "show rep topology" },
              "outputVar": "rep_status",
              "assertions": [
                {
                  "id": "rep-active",
                  "name": "REP Ring Active",
                  "type": "contains",
                  "target": "output",
                  "expected": "REP enabled",
                  "severity": "critical"
                }
              ]
            },
            {
              "id": "ping-others",
              "name": "Ping Other Switches",
              "type": "ping",
              "params": {
                "targets": "{{targets | exclude(current_switch) | map('value')}}",
                "count": "{{ping_count}}"
              },
              "outputVar": "ping_results",
              "assertions": [
                {
                  "id": "ping-success",
                  "name": "Ping Success",
                  "type": "custom",
                  "target": "ping_results.successCount",
                  "expected": "{{ping_results.totalCount}}",
                  "severity": "critical"
                }
              ]
            },
            {
              "id": "collect-result",
              "name": "Record Test Result",
              "type": "collect_metric",
              "params": {
                "name": "port_test",
                "category": "rep_ring",
                "value": {
                  "switch": "{{current_switch.value}}",
                  "port": "{{port}}",
                  "rep_ok": "{{assertions['rep-active'].passed}}",
                  "ping_ok": "{{ping_results.successCount}}/{{ping_results.totalCount}}"
                }
              }
            },
            {
              "id": "enable-port",
              "name": "Re-enable {{port}}",
              "type": "interface_enable",
              "params": { "interface": "{{port}}" }
            }
          ]
        },
        {
          "id": "disconnect",
          "name": "Disconnect",
          "mode": "sequential",
          "steps": [
            {
              "id": "ssh-close",
              "name": "SSH Disconnect",
              "type": "ssh_disconnect",
              "params": {}
            }
          ]
        }
      ]
    }
  ],
  
  "reportConfig": {
    "type": "table",
    "title": "REP Ring Test Results",
    "tableColumns": [
      { "header": "Switch", "value": "{{metric.value.switch}}", "type": "text" },
      { "header": "Port", "value": "{{metric.value.port}}", "type": "text" },
      { "header": "REP OK", "value": "{{metric.value.rep_ok}}", "type": "status" },
      { "header": "Ping", "value": "{{metric.value.ping_ok}}", "type": "text" },
      { "header": "Status", "value": "{{metric.value.rep_ok && metric.value.ping_ok ? 'PASS' : 'FAIL'}}", "type": "status" }
    ],
    "summaryMetrics": [
      { "name": "Total Tests", "type": "count" },
      { "name": "Passed", "type": "count", "filter": "status == 'PASS'" },
      { "name": "Pass Rate", "type": "percentage", "filter": "status == 'PASS'" }
    ]
  }
}
```

### Asset Agentization Flow

```json
{
  "id": "asset-agentization",
  "name": "Asset Discovery & Agent Deployment",
  "description": "Discover assets, scan vulnerabilities, deploy agents",
  "version": "1.0",
  
  "parameters": [
    { "name": "target_network", "type": "string", "label": "Target Network (CIDR)" },
    { "name": "prefer_ssh", "type": "boolean", "default": true, "label": "Prefer SSH over Exploit" },
    { "name": "agent_callback", "type": "string", "label": "Agent Callback URL" }
  ],
  
  "variables": [
    { "name": "discovered_assets", "type": "array", "default": [] },
    { "name": "agentized_assets", "type": "array", "default": [] }
  ],
  
  "stages": [
    {
      "id": "discovery",
      "name": "Asset Discovery",
      "mode": "sequential",
      "steps": [
        {
          "id": "ping-sweep",
          "name": "Ping Sweep",
          "type": "ping_sweep",
          "params": { "network": "{{target_network}}" },
          "outputVar": "discovered_assets"
        }
      ]
    },
    {
      "id": "per-asset",
      "name": "Process Each Asset",
      "mode": "foreach",
      "iterateOver": "discovered_assets",
      "iteratorVar": "asset",
      "maxParallel": 5,
      "onError": "continue",
      
      "stages": [
        {
          "id": "scan",
          "name": "Scan Asset",
          "mode": "sequential",
          "steps": [
            {
              "id": "port-scan",
              "name": "Port Scan",
              "type": "port_scan",
              "params": { "target": "{{asset.ip}}", "ports": "22,80,443,445,3389" },
              "outputVar": "open_ports"
            },
            {
              "id": "vuln-scan",
              "name": "Vulnerability Scan",
              "type": "vuln_scan",
              "params": { "target": "{{asset.ip}}" },
              "outputVar": "vulnerabilities"
            }
          ]
        },
        {
          "id": "deploy-agent",
          "name": "Deploy Agent",
          "mode": "sequential",
          "steps": [
            {
              "id": "try-ssh",
              "name": "Try SSH Login",
              "type": "ssh_connect",
              "params": {
                "host": "{{asset.ip}}",
                "credentials": "ssh-creds"
              },
              "condition": "{{prefer_ssh && 22 in open_ports}}",
              "outputVar": "ssh_connected"
            },
            {
              "id": "ssh-deploy",
              "name": "Deploy via SSH",
              "type": "agent_deploy",
              "params": {
                "method": "ssh",
                "callback": "{{agent_callback}}"
              },
              "condition": "{{ssh_connected}}",
              "outputVar": "agent_result"
            },
            {
              "id": "try-exploit",
              "name": "Try Exploit",
              "type": "exploit_run",
              "params": {
                "target": "{{asset.ip}}",
                "vulnerabilities": "{{vulnerabilities}}"
              },
              "condition": "{{!ssh_connected && vulnerabilities.length > 0}}",
              "outputVar": "exploit_result"
            },
            {
              "id": "exploit-deploy",
              "name": "Deploy via Exploit",
              "type": "agent_deploy",
              "params": {
                "method": "shell",
                "callback": "{{agent_callback}}"
              },
              "condition": "{{exploit_result.success}}",
              "outputVar": "agent_result"
            },
            {
              "id": "verify-agent",
              "name": "Verify Agent",
              "type": "agent_verify",
              "params": { "timeout": 30 },
              "condition": "{{agent_result.deployed}}",
              "outputVar": "agent_verified"
            },
            {
              "id": "record",
              "name": "Record Result",
              "type": "collect_metric",
              "params": {
                "name": "agent_deployment",
                "category": "agentization",
                "value": {
                  "asset": "{{asset.ip}}",
                  "method": "{{ssh_connected ? 'SSH' : (exploit_result.success ? 'Exploit' : 'N/A')}}",
                  "agent_id": "{{agent_result.agentId || '-'}}",
                  "status": "{{agent_verified ? 'LIVE' : (agent_result.deployed ? 'DEPLOYED' : 'FAILED')}}",
                  "duration": "{{_step_duration}}"
                }
              }
            }
          ]
        }
      ]
    }
  ],
  
  "reportConfig": {
    "type": "table",
    "title": "Agent Deployment Results",
    "tableColumns": [
      { "header": "Asset", "value": "{{metric.value.asset}}", "type": "text" },
      { "header": "Method", "value": "{{metric.value.method}}", "type": "text" },
      { "header": "Agent ID", "value": "{{metric.value.agent_id}}", "type": "text" },
      { "header": "Status", "value": "{{metric.value.status}}", "type": "status" },
      { "header": "Time", "value": "{{metric.value.duration}}", "type": "duration" }
    ],
    "summaryMetrics": [
      { "name": "Total Assets", "type": "count" },
      { "name": "Agentized", "type": "count", "filter": "status in ['LIVE', 'DEPLOYED']" },
      { "name": "Success Rate", "type": "percentage", "filter": "status == 'LIVE'" }
    ]
  }
}
```

---

## UI Design

### Flow Builder Page (Enhanced Scripts Page)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◈ Automation Flows                                    [+ New Flow]   │
├──────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌──────────────────────────────────────────┐ │
│ │ MY FLOWS            │ │ FLOW EDITOR                              │ │
│ │                     │ │                                          │ │
│ │ ◈ REP Ring Test    │ │  ┌──────────────────────────────────┐    │ │
│ │   ○ 4 targets      │ │  │ TARGETS                    [+Add] │    │ │
│ │   ○ Last: 2h ago   │ │  ├──────────────────────────────────┤    │ │
│ │                     │ │  │ ○ sw1  192.168.1.1  cisco-switch │    │ │
│ │ ◈ Agent Pipeline   │ │  │ ○ sw2  192.168.1.2  cisco-switch │    │ │
│ │   ○ Dynamic targets│ │  │ ○ sw3  192.168.1.3  cisco-switch │    │ │
│ │   ○ Last: 1d ago   │ │  └──────────────────────────────────┘    │ │
│ │                     │ │                                          │ │
│ │ ─────────────────── │ │  ┌──────────────────────────────────┐    │ │
│ │ TEMPLATES           │ │  │ STAGES                     [+Add] │    │ │
│ │                     │ │  ├──────────────────────────────────┤    │ │
│ │ ◇ REP Ring Test    │ │  │ ▼ Stage: Per-Switch Test         │    │ │
│ │ ◇ Vuln→Exploit     │ │  │   Mode: foreach targets          │    │ │
│ │ ◇ Network Recon    │ │  │   ├─ ▼ Stage: Connect            │    │ │
│ │ ◇ Agent Deploy     │ │  │   │  └─ ◇ SSH Connect            │    │ │
│ │                     │ │  │   ├─ ▼ Stage: Test Ports         │    │ │
│ │                     │ │  │   │  ├─ ◇ Disable Port           │    │ │
│ │                     │ │  │   │  ├─ ◇ Wait 10s               │    │ │
│ │                     │ │  │   │  ├─ ◇ Check REP [assert]     │    │ │
│ │                     │ │  │   │  ├─ ◇ Ping Others [assert]   │    │ │
│ │                     │ │  │   │  └─ ◇ Re-enable Port         │    │ │
│ │                     │ │  │   └─ ▼ Stage: Disconnect         │    │ │
│ │                     │ │  └──────────────────────────────────┘    │ │
│ └─────────────────────┘ │                                          │ │
│                         │ [▶ Run Flow]  [Save]  [Export]           │ │
│                         └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Execution View with Live Progress

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▶ EXECUTING: REP Ring Test                           [Pause] [Stop] │
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ PROGRESS                                                4/4 ▓▓▓▓ │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ Target        │ Stage              │ Step           │ Status     │ │
│ ├───────────────┼────────────────────┼────────────────┼────────────┤ │
│ │ ✓ sw1         │ ✓ Test Ports       │ ✓ All done     │ PASSED     │ │
│ │ ✓ sw2         │ ✓ Test Ports       │ ✓ All done     │ PASSED     │ │
│ │ ◆ sw3         │ ◆ Test Ports       │ ◆ Ping Others  │ RUNNING    │ │
│ │ ○ sw4         │ ○ Pending          │ ○ Pending      │ PENDING    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ LIVE OUTPUT                                             [Clear]  │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ [sw3] Executing: ping 192.168.1.1 192.168.1.2 192.168.1.4       │ │
│ │ [sw3] Ping 192.168.1.1: 4ms                                      │ │
│ │ [sw3] Ping 192.168.1.2: 3ms                                      │ │
│ │ [sw3] Ping 192.168.1.4: 5ms                                      │ │
│ │ [sw3] ✓ Assertion PASSED: Ping Success (3/3)                     │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Report View

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📊 REPORT: REP Ring Test                 [Export PDF] [Export JSON]  │
│    Executed: 2026-01-11 10:30:45         Duration: 5m 23s           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ SUMMARY                                                          │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │   ✓ 8/8 Tests Passed    │   ⏱ 5m 23s Total    │   4 Switches   │ │
│ │   100% Success Rate     │   40s avg/test      │   2 ports each │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ DETAILED RESULTS                                                 │ │
│ ├───────────┬──────────┬──────────┬──────────┬─────────────────────┤ │
│ │ Switch    │ Port     │ REP OK   │ Ping     │ Status              │ │
│ ├───────────┼──────────┼──────────┼──────────┼─────────────────────┤ │
│ │ sw1       │ Gi0/1    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ │ sw1       │ Gi0/2    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ │ sw2       │ Gi0/1    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ │ sw2       │ Gi0/2    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ │ sw3       │ Gi0/1    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ │ sw3       │ Gi0/2    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ │ sw4       │ Gi0/1    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ │ sw4       │ Gi0/2    │ ✓        │ 3/3      │ ✓ PASS              │ │
│ └───────────┴──────────┴──────────┴──────────┴─────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ CONCLUSION                                                        │ │
│ │ REP Ring topology is fully redundant. All failover tests passed. │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Schema & Storage (2-3 days)
- [ ] Define TypeScript/Python types for flows
- [ ] Database models for flows, executions, results
- [ ] Basic CRUD API for flows

### Phase 2: Flow Executor Engine (3-4 days)
- [ ] Extend WorkflowExecutor for hierarchical stages
- [ ] Implement foreach/parallel execution modes
- [ ] Add variable scoping and expression evaluation
- [ ] Implement assertions and metric collection

### Phase 3: Step Implementations (4-5 days)
- [ ] SSH connection manager with persistent sessions
- [ ] Device command abstraction (Cisco, Juniper, etc.)
- [ ] Enhanced ping/network operations
- [ ] Agent deployment steps

### Phase 4: Report Generator (2-3 days)
- [ ] Result aggregation service
- [ ] Table/summary report generation
- [ ] Markdown/HTML/PDF export
- [ ] Report templates

### Phase 5: UI Enhancement (3-4 days)
- [ ] Hierarchical flow builder
- [ ] Stage/step editor with drag-drop
- [ ] Live execution view with progress
- [ ] Report viewer with export

### Phase 6: Templates & Polish (2 days)
- [ ] Built-in flow templates
- [ ] Error handling improvements
- [ ] Documentation
- [ ] Testing

**Total: ~16-21 days**

---

## Quick Wins (Can Implement Now)

1. **Enhanced Script Templates** - Add more detailed templates with the current system
2. **Basic Report Output** - Generate simple markdown reports from current script execution
3. **Assertion Checking** - Add output validation to current steps
4. **Multi-Target Support** - Allow current scripts to iterate over multiple targets

---

## Technology Choices

| Component | Technology | Reason |
|-----------|------------|--------|
| Flow Schema | JSON/YAML | Easy to read, version control friendly |
| Expression Engine | Jinja2 (Python) / Handlebars (TS) | Powerful templating |
| Execution | asyncio + concurrent.futures | Parallel execution support |
| Storage | PostgreSQL JSONB | Flexible schema for flows |
| WebSocket | Existing infrastructure | Real-time progress updates |
| Reports | Markdown → HTML/PDF | Universal, exportable |

---

## Questions for User

1. **Immediate Priority**: Should we start with the full hierarchical system, or enhance the current Scripts page first?

2. **Device Support**: Which network devices do you primarily work with? (Cisco IOS, IOS-XE, NX-OS, Juniper, etc.)

3. **Credential Management**: Should flows use existing credential store, or prompt at runtime?

4. **Report Persistence**: Store reports in DB, or generate on-demand?

5. **Scheduling**: Need to schedule flows for recurring execution?
