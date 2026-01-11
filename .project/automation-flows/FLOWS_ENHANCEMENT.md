# Flows Page Enhancement Plan

## Current State Analysis

The Flows page **already has** a solid foundation:
- ✅ Visual canvas with drag-drop blocks
- ✅ 30 block types across 6 categories
- ✅ Execution engine with real-time console
- ✅ Control flow: Start, End, Delay, Condition, Loop, Parallel
- ✅ Connection tests: SSH, RDP, VNC, FTP, TCP
- ✅ Commands: SSH Execute, System Info, FTP operations
- ✅ Traffic: Ping (real), Port scan, Storm
- ✅ Agent: Generate, Deploy, Terminate
- ✅ Variables: Set/Get workflow variables

## What's MISSING for Practical Automation

### Gap 1: Loop Block Doesn't Actually Iterate

**Current:** Loop block outputs "iterations: 5" but doesn't actually repeat execution.

**Need:** When you connect blocks after Loop → Each Iteration output, those blocks should run for EACH item/count.

**Example Flow:**
```
Start → Set Variable (hosts = ["192.168.1.1", "192.168.1.2", "192.168.1.3"])
      → Loop (mode=array, array={{hosts}})
          ├─ [Each Iteration] → Ping (host={{item}}) → Collect Result
          └─ [Complete] → Generate Report → End
```

### Gap 2: No Result Collection/Aggregation

**Current:** Each block outputs its result individually to console.

**Need:** A way to collect results across iterations for a final summary.

**New Block: `control.collect`**
```
- Stores values into an array variable
- Accumulates across loop iterations
- Example: collect ping results → get summary at end
```

**New Block: `control.aggregate`**
```
- Takes collected results and computes summary
- Count passed/failed
- Group by category
- Generate report table
```

### Gap 3: No Asset/Discovery Integration

**Current:** Must manually enter IP addresses.

**Need:** Blocks to fetch targets dynamically.

**New Blocks:**
```
- discovery.get_assets       → Get assets from NOP database
- discovery.ping_sweep       → Discover hosts in CIDR
- discovery.from_previous    → Use output of previous scan as targets
```

### Gap 4: No Report Block

**Current:** Just console output.

**Need:** Structured report generation at flow end.

**New Block: `control.report`**
```
Parameters:
- title: "REP Ring Test Results"
- format: table | summary | detailed
- columns: [
    { header: "Target", value: "{{item.host}}" },
    { header: "Ping OK", value: "{{item.reachable}}" },
    { header: "Latency", value: "{{item.avg_latency_ms}}ms" },
    { header: "Status", value: "{{item.reachable ? 'PASS' : 'FAIL'}}" }
  ]
- data: "{{collected_results}}"
```

### Gap 5: No Device Command Abstraction

**Current:** SSH Execute with raw commands.

**Need:** Abstracted network device commands that translate to correct syntax.

**New Blocks:**
```
- network.interface_shutdown  → Translates to "conf t / int Gi0/1 / shutdown"
- network.interface_enable    → Translates to "no shutdown"
- network.show_command        → "show rep topology", "show spanning-tree"
- network.save_config         → "write memory" / "copy run start"
```

### Gap 6: Assertions/Checks

**Current:** Condition block can branch, but no structured pass/fail tracking.

**Need:** Assertion blocks that record test results.

**New Block: `control.assert`**
```
Parameters:
- name: "Ping Success"
- expression: "{{$prev.reachable}} == true"
- severity: critical | warning | info
- on_fail: continue | stop

Output:
- passed: true/false
- recorded to test results
```

---

## Practical Enhancement Roadmap

### Phase 1: Make Loop Actually Work (Critical)

**Backend Changes:**
```python
# In workflow_executor.py
# When hitting a Loop node:
# 1. Evaluate the array/count
# 2. For each item:
#    a. Set {{item}} variable
#    b. Execute all nodes on "iteration" branch
#    c. Collect outputs
# 3. After all iterations, follow "complete" branch
```

**This single change unlocks:**
- ✅ Ping multiple hosts
- ✅ Scan multiple targets
- ✅ Deploy agent to multiple hosts

### Phase 2: Add Collection Blocks (High Value)

**New Blocks:**
1. `control.collect` - Add current result to array
2. `control.report` - Generate summary table from collected data

**Example Flow After Phase 1+2:**
```
Start 
  → Set Variable: hosts = ["192.168.1.1", "192.168.1.2"]
  → Loop (array: hosts, item: host)
      ├─ [Each] → Ping (host: {{host}}) 
               → Collect (variable: results, value: {{$prev}})
      └─ [Done] → Report (data: results, columns: [...])
               → End
```

### Phase 3: Asset Integration (Medium Value)

**New Blocks:**
1. `discovery.get_assets` - Fetch from NOP database
2. `discovery.ping_sweep` - Discover hosts in CIDR

**Example:**
```
Start → Get Assets (filter: online)
      → Loop (array: {{$prev}})
          → Port Scan (host: {{item.ip}})
          → Collect
      → Report → End
```

### Phase 4: Device Commands (For Network Use Cases)

**New Blocks:**
1. `network.device_command` - Send CLI command via SSH with expect patterns
2. `network.interface_state` - Enable/disable interface

### Phase 5: Enhanced Reporting

**New Features:**
1. Export report as PDF/Markdown
2. Store execution reports in database
3. View report history

---

## Quick Wins (Implementable Now)

### 1. Fix Loop Execution (Backend)

The loop block exists but doesn't iterate. Fix the executor to:
- Evaluate array expression
- Execute iteration branch N times
- Set `{{item}}` and `{{index}}` for each iteration

### 2. Add Collect Block

Simple block that appends `{{$prev}}` to a variable array:
```typescript
{
  type: 'control.collect',
  label: 'Collect Result',
  parameters: [
    { name: 'variable', label: 'Into Variable', type: 'string' },
    { name: 'value', label: 'Value', type: 'string', default: '{{$prev}}' }
  ]
}
```

### 3. Add Report Block

Generate markdown table from collected array:
```typescript
{
  type: 'control.report',
  label: 'Generate Report',
  parameters: [
    { name: 'title', label: 'Report Title', type: 'string' },
    { name: 'data', label: 'Data Variable', type: 'string' },
    { name: 'format', label: 'Format', type: 'select', options: ['table', 'summary'] }
  ]
}
```

### 4. Add Get Assets Block

Fetch assets from NOP database:
```typescript
{
  type: 'discovery.get_assets',
  label: 'Get Assets',
  category: 'scanning',
  parameters: [
    { name: 'filter', label: 'Filter', type: 'select', options: ['all', 'online', 'offline'] },
    { name: 'limit', label: 'Max Results', type: 'number', default: 100 }
  ]
}
```

---

## Example: Agent Deployment Pipeline (After Enhancements)

```
┌─────────────────────────────────────────────────────────────────┐
│ FLOW: Asset Discovery & Agent Deployment                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐                                                    │
│  │  START  │                                                    │
│  └────┬────┘                                                    │
│       │                                                         │
│       ▼                                                         │
│  ┌────────────────┐                                             │
│  │ Ping Sweep     │ network: 192.168.1.0/24                     │
│  │ (Discovery)    │ output: discovered_hosts                    │
│  └────────┬───────┘                                             │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────┐                                             │
│  │ Set Variable   │ hosts = {{discovered_hosts}}                │
│  └────────┬───────┘                                             │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────┐                                             │
│  │ LOOP           │ foreach: hosts                              │
│  │                │ item: host                                  │
│  └────────┬───────┘                                             │
│           │                                                     │
│     ┌─────┴─────┐                                               │
│     │Each       │Complete                                       │
│     ▼           ▼                                               │
│  ┌──────────┐ ┌──────────┐                                      │
│  │Port Scan │ │ Report   │ → END                                │
│  └────┬─────┘ └──────────┘                                      │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────┐                                               │
│  │ SSH Test     │ → success/failure                             │
│  └──────┬───────┘                                               │
│         │success                                                │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ Agent Deploy │ host: {{host.ip}}                             │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ Collect      │ variable: results                             │
│  │              │ value: {host, deployed, agent_id}             │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

REPORT OUTPUT:
┌────────────────┬──────────┬─────────────┬─────────┐
│ Host           │ SSH OK   │ Agent ID    │ Status  │
├────────────────┼──────────┼─────────────┼─────────┤
│ 192.168.1.10   │ ✓        │ agent-a1b2  │ LIVE    │
│ 192.168.1.15   │ ✓        │ agent-c3d4  │ LIVE    │
│ 192.168.1.20   │ ✗        │ -           │ FAILED  │
├────────────────┴──────────┴─────────────┴─────────┤
│ Summary: 2/3 assets agentized (67%)               │
└───────────────────────────────────────────────────┘
```

---

## Example: REP Ring Test (After Enhancements)

```
┌─────────────────────────────────────────────────────────────────┐
│ FLOW: REP Ring Redundancy Test                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START → Set Variable: switches = [sw1, sw2, sw3, sw4]          │
│        → Set Variable: test_ports = ["Gi0/1", "Gi0/2"]          │
│        → LOOP (switches)                                        │
│            ├─ [Each] → SSH Test ({{switch}})                    │
│            │         → LOOP (test_ports)                        │
│            │             ├─ [Each] → SSH Execute:               │
│            │             │            "conf t; int {{port}}; shut"
│            │             │         → Delay (10s)                │
│            │             │         → SSH Execute:               │
│            │             │            "show rep topology"        │
│            │             │         → Assert: "REP enabled"       │
│            │             │         → Ping (other switches)       │
│            │             │         → Assert: all reachable       │
│            │             │         → SSH Execute: "no shut"      │
│            │             │         → Collect (result)            │
│            │             └─ [Done] → Continue                    │
│            └─ [Done] → Report (collected results)               │
│                      → End                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Priority | Enhancement | Effort | Impact |
|----------|-------------|--------|--------|
| 🔴 P0 | Fix Loop Execution | 2-3 days | Unlocks all iteration use cases |
| 🔴 P0 | Add Collect Block | 1 day | Enables result aggregation |
| 🟡 P1 | Add Report Block | 2 days | Structured output |
| 🟡 P1 | Add Get Assets Block | 1 day | Dynamic targets |
| 🟢 P2 | Add Assert Block | 1 day | Test tracking |
| 🟢 P2 | Add Ping Sweep Block | 1 day | Discovery |
| 🔵 P3 | Network Device Commands | 3 days | Switch management |
| 🔵 P3 | Report Export (PDF) | 2 days | Documentation |

**Recommended Start:** P0 items (Loop + Collect) = ~3-4 days

---

## Questions for User

1. **Start with Loop fix?** This is the critical missing piece.

2. **What targets?** 
   - Static IPs entered manually?
   - From NOP asset database?
   - From discovery scan?

3. **Report format preference?**
   - Console table (simple)
   - Markdown (exportable)
   - PDF (formal reports)

4. **Device types for network commands?**
   - Cisco IOS/IOS-XE
   - Juniper
   - Other vendors
