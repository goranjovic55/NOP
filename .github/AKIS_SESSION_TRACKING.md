# AKIS Session Tracking Integration Guide

## Overview

This document describes how agents should integrate with the session tracking system to enable real-time monitoring in the VSCode AKIS Monitor extension.

## Session Tracking File: `.akis-session.json`

The session tracking file is a temporary JSON file that agents write to during execution. It enables the VSCode extension to monitor live sessions without waiting for workflow logs (which are only created at the end).

## Integration Steps

### 1. Start Session

At the beginning of your agent workflow (`[SESSION]` emission), create the session file:

```bash
node .github/scripts/session-tracker.js start "Task description" "AgentName"
```

**Example:**
```bash
node .github/scripts/session-tracker.js start "Add live session monitoring" "_DevTeam"
```

### 2. Update During Execution

After each significant emission, update the session file:

**Phase Changes:**
```bash
node .github/scripts/session-tracker.js phase CONTEXT "1/0"
node .github/scripts/session-tracker.js phase PLAN "2/0"
node .github/scripts/session-tracker.js phase INTEGRATE "4/0"
```

**Decisions:**
```bash
node .github/scripts/session-tracker.js decision "Use session tracking file approach"
node .github/scripts/session-tracker.js decision "Create interactive decision tree"
```

**Delegations:**
```bash
node .github/scripts/session-tracker.js delegate Developer "Implement feature X"
node .github/scripts/session-tracker.js delegate Reviewer "Validate changes"
```

**Skills:**
```bash
node .github/scripts/session-tracker.js skills "frontend-react, ui-components"
```

### 3. Complete Session

When writing the workflow log (`[COMPLETE]` phase), finalize the session:

```bash
node .github/scripts/session-tracker.js complete "log/workflow/2026-01-01_163900_task.md"
```

This marks the session as completed. **The file is NOT deleted and should be committed** with the workflow log to preserve session details in git history.

### 4. New Session Behavior

When starting a new session, the `start` command will **overwrite** any existing `.akis-session.json` file (not append). This ensures each session is tracked independently.

## File Format

The `.akis-session.json` file contains:

```json
{
  "id": "1735752000000",
  "startTime": "2026-01-01T16:40:00.000Z",
  "lastUpdate": "2026-01-01T16:42:30.000Z",
  "task": "Add live session monitoring",
  "agent": "_DevTeam",
  "status": "active",
  "phase": "INTEGRATE",
  "progress": "4/0",
  "decisions": [
    {
      "description": "Use session tracking file approach",
      "timestamp": "2026-01-01T16:41:00.000Z"
    }
  ],
  "emissions": [
    {
      "timestamp": "2026-01-01T16:40:00.000Z",
      "type": "SESSION",
      "content": "Add live session monitoring"
    },
    {
      "timestamp": "2026-01-01T16:41:00.000Z",
      "type": "PHASE",
      "phase": "CONTEXT",
      "progress": "1/0",
      "content": "CONTEXT"
    },
    {
      "timestamp": "2026-01-01T16:42:30.000Z",
      "type": "DECISION",
      "content": "Use session tracking file approach"
    }
  ],
  "delegations": [],
  "skills": ["frontend-react", "ui-components"]
}
```

## Workflow Integration

### Minimal Integration (Quick Start)

Add these lines at key points in your agent workflow:

```
[SESSION] → node .github/scripts/session-tracker.js start "task" "agent"
[PHASE] → node .github/scripts/session-tracker.js phase PHASE_NAME "progress"
[DECISION] → node .github/scripts/session-tracker.js decision "description"
[COMPLETE] → node .github/scripts/session-tracker.js complete "workflow_log_path"
```

### Full Integration Example

```bash
#!/bin/bash
# Agent workflow with session tracking

# Start session
node .github/scripts/session-tracker.js start "Implement new feature" "_DevTeam"

# CONTEXT phase
node .github/scripts/session-tracker.js phase CONTEXT "1/0"
# ... do context work ...

# PLAN phase
node .github/scripts/session-tracker.js phase PLAN "2/0"
node .github/scripts/session-tracker.js decision "Use approach X instead of Y"
# ... do planning work ...

# COORDINATE phase
node .github/scripts/session-tracker.js phase COORDINATE "3/0"
node .github/scripts/session-tracker.js delegate Developer "Implement module A"
node .github/scripts/session-tracker.js skills "backend-api, testing"
# ... coordinate work ...

# INTEGRATE phase
node .github/scripts/session-tracker.js phase INTEGRATE "4/0"
# ... do integration work ...

# VERIFY phase
node .github/scripts/session-tracker.js phase VERIFY "5/0"
# ... verify work ...

# LEARN phase
node .github/scripts/session-tracker.js phase LEARN "6/0"
# ... update knowledge ...

# COMPLETE phase
node .github/scripts/session-tracker.js phase COMPLETE "7/0"
# Write workflow log
WORKFLOW_LOG="log/workflow/$(date +%Y-%m-%d_%H%M%S)_task-name.md"
# ... create workflow log ...

# Clean up session
node .github/scripts/session-tracker.js complete "$WORKFLOW_LOG"
```

## VSCode Extension Integration

The VSCode AKIS Monitor extension:

1. Watches `.akis-session.json` for changes (file system watcher)
2. Parses the JSON data
3. Updates the Live Session panel in real-time
4. Shows current phase, progress, decisions, and emissions
5. Displays interactive decision tree

## Benefits

- **Real-time monitoring**: See agent progress without waiting for workflow logs
- **Live decisions**: View decisions as they're made during execution
- **Phase tracking**: Monitor which phase the agent is currently in
- **No workflow log dependency**: Workflow logs are only created at the end
- **Minimal overhead**: Simple JSON file writes, auto-cleaned after completion

## Backwards Compatibility

The VSCode extension falls back to monitoring workflow logs if `.akis-session.json` doesn't exist. This ensures compatibility with agents that haven't integrated session tracking yet.

## Troubleshooting

### Session file not updating

Check that:
1. Node.js is installed and accessible
2. `.github/scripts/session-tracker.js` exists and is executable
3. You're running commands from the repository root
4. No permission issues with writing to the workspace root

### Extension not showing live updates

Verify:
1. VSCode extension is installed and active
2. Workspace folder is open (not just files)
3. Auto-refresh is enabled in extension settings
4. `.akis-session.json` exists in workspace root

### Session file not deleted after completion

The file is auto-deleted 3 seconds after calling `complete`. If it persists:
1. Check the console for errors
2. Manually delete with: `rm .akis-session.json`
3. Ensure the complete command was called with a valid workflow log path

## Future Enhancements

- Interactive decision tree with zoom/pan
- Decision branching visualization
- Time-travel debugging (replay session history)
- Multi-agent session coordination
- Session analytics and metrics
