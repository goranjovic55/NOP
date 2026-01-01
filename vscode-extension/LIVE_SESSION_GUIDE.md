# Live Session Monitoring - Visual Guide

## Panel Layout

The AKIS Monitor extension now has **4 panels** (previously 3):

```
┌─────────────────────────────────────────┐
│  AKIS Monitor (Activity Bar)           │
├─────────────────────────────────────────┤
│  📍 Live Session          [Auto 2s]    │  ← NEW! Top priority
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ● ACTIVE                               │
│  Add live session monitoring            │
│  Agent: _DevTeam                       │
│  Last update: 3s ago                   │
│                                         │
│  INTEGRATE                              │
│  Progress: 4/7                          │
│                                         │
│  Decisions So Far:                      │
│  • Create Live Session parser           │
│  • Monitor workflow logs                │
│                                         │
│  Session Timeline:                      │
│  [PHASE] INTEGRATE | progress=4/7      │
│  [DECISION] Implementation             │
├─────────────────────────────────────────┤
│  📜 Workflow History                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  (All completed workflows)              │
├─────────────────────────────────────────┤
│  🔀 Decision Diagram                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  (Mermaid flowcharts)                   │
├─────────────────────────────────────────┤
│  🕸️ Knowledge Graph                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  (D3.js interactive graph)              │
└─────────────────────────────────────────┘
```

## Live Session States

### Active State
```
┌────────────────────────────────────┐
│  ● ACTIVE        ⟳ Auto-refresh   │
│  ════════════════════════════════  │
│  Task: Implement new feature       │
│  Agent: _DevTeam                  │
│  Last update: just now            │
│                                    │
│  COORDINATE                        │
│  Progress: 3/7                     │
│                                    │
│  Decisions So Far: [3]             │
│  Session Timeline: [12 emissions]  │
└────────────────────────────────────┘
```

### Idle State
```
┌────────────────────────────────────┐
│  ○ IDLE          ⟳ Checking...    │
│  ════════════════════════════════  │
│  No Active Session                 │
│                                    │
│  Waiting for agent to start...    │
│  (Checks every 2 seconds)          │
└────────────────────────────────────┘
```

## How It Detects Live Sessions

```
┌─────────────────────────────────────────────────────┐
│  Detection Logic:                                   │
│  ─────────────────────────────────────────────────  │
│  1. Scan log/workflow/*.md files                   │
│  2. Find most recently modified file                │
│  3. Check modification time                         │
│  4. If < 5 minutes ago → ACTIVE                    │
│  5. Else → IDLE                                    │
│                                                     │
│  Example:                                           │
│  Current time:    15:25:10                         │
│  File modified:   15:24:45 (25 seconds ago)        │
│  Status:          ● ACTIVE                         │
│                                                     │
│  Current time:    15:30:00                         │
│  File modified:   15:24:45 (5m 15s ago)           │
│  Status:          ○ IDLE                           │
└─────────────────────────────────────────────────────┘
```

## What Gets Parsed

From partial workflow logs, the parser extracts:

```markdown
# Workflow Log: Task Description

**Agent**: _DevTeam                    → Displayed in Live Session
**Status**: In Progress                → Triggers ACTIVE state

[PHASE: INTEGRATE | progress=4/7]     → Current phase + progress
[DECISION: Create parser]              → Added to "Decisions So Far"
[SKILL: frontend-react]                → Added to timeline
[DELEGATE: agent=Developer...]         → Added to timeline
```

## Real-Time Updates

```
Timeline:
─────────────────────────────────────────────────
15:24:45  Agent starts → Status: ACTIVE
15:24:47  [SESSION] emission detected
15:24:48  [PHASE: CONTEXT] parsed
15:24:50  [DECISION] added to list
15:25:02  [PHASE: PLAN] phase change
15:25:10  Current time → 25s ago
          Auto-refresh triggers
          Panel updates with latest data
```

## Usage Tips

1. **Start monitoring**: Just open the extension, it auto-detects
2. **View live progress**: Watch the phase indicator change
3. **See decisions**: Listed as they're made in the session
4. **Check timeline**: Last 10 emissions shown
5. **Manual refresh**: Click refresh icon if needed
6. **Auto-refresh**: Updates every 2 seconds automatically

## Configuration

Optional settings in VSCode preferences:

```json
{
  "akisMonitor.autoRefresh": true,      // Enable auto-refresh
  "akisMonitor.refreshInterval": 2000,  // Refresh every 2 seconds
  "akisMonitor.workflowLogsPath": "log/workflow"
}
```

## Integration with AKIS Framework

The Live Session view visualizes the 7-phase workflow:

```
1. CONTEXT   → Load knowledge, understand task
2. PLAN      → Design approach, alternatives
3. COORDINATE → Delegate or prepare tools
4. INTEGRATE → Execute work (YOU ARE HERE)
5. VERIFY    → Test and validate
6. LEARN     → Update knowledge
7. COMPLETE  → Final emission, workflow log
```

Progress indicator shows: `current_phase/total_phases` or `H/V` format where:
- H = Horizontal (phase within task)
- V = Vertical (stack depth for nested tasks)

Example: `progress=4/2` means phase 4, stack depth 2 (nested task)
