# AKIS Session Tracking Integration Guide - Multi-Session Support

## Overview

This document describes how agents should integrate with the **multi-session tracking system** to enable real-time monitoring of multiple concurrent sessions in the VSCode AKIS Monitor extension.

## Session Tracking Files

- **`.akis-session.json`** - Current/active session (backwards compatible, single session view)
- **`.akis-sessions.json`** - **Multi-session tracking file** (all sessions in current chat conversation) **← Extension should monitor this**

**Important**: The VSCode AKIS Monitor extension must watch `.akis-sessions.json` to display multiple concurrent sessions. Watching only `.akis-session.json` will show only the current session.

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

After each significant emission, update the session file. PHASE emissions now include the agent name for delegation clarity (e.g., `_DevTeam INTEGRATE`). If a PHASE emission comes from a different agent than the session owner, the live monitor shows `SUBAGENT` with the emitting agent (e.g., `[SUBAGENT] _Developer`). A verbose field is also emitted for the live tracker: `<content> | progress=X/Y`.

**Phase Changes (with detailed messages):**
```bash
node .github/scripts/session-tracker.js phase CONTEXT "1/7" "Examining codebase structure"
node .github/scripts/session-tracker.js phase PLAN "2/7" "Designing solution approach"
node .github/scripts/session-tracker.js phase INTEGRATE "4/7" "Implementing session tracker changes"
```

**Phase Changes (basic - backwards compatible):**
```bash
node .github/scripts/session-tracker.js phase CONTEXT "1/7"
node .github/scripts/session-tracker.js phase PLAN "2/7"
```

**Decisions:**
```bash
node .github/scripts/session-tracker.js decision "Use session tracking file approach"
node .github/scripts/session-tracker.js decision "Create interactive decision tree"
```

**Delegations:**
```bash
node .github/scripts/session-tracker.js delegate Developer "Implement feature X"
```

**Skills:**
```bash
node .github/scripts/session-tracker.js skills "frontend-react, ui-components"
```

### 3. Complete Session

When writing the workflow log (`[COMPLETE]` phase), mark the session completed (the file now stays in place):

```bash
node .github/scripts/session-tracker.js complete "log/workflow/2026-01-01_163900_task.md"
```

### 4. Reset After GitHub Commit

Only reset the live session file after the user verifies the work and the changes are committed/pushed:

```bash
node .github/scripts/session-tracker.js reset
```

This manual reset keeps the live monitor intact through verification and commit steps.

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
  "phaseDisplay": "_DevTeam INTEGRATE",
  "phaseAgent": "_DevTeam",
  "phaseMessage": "Applying code changes to session tracker",
  "phaseVerbose": "_DevTeam INTEGRATE - Applying code changes to session tracker | progress=4/7",
  "progress": "4/7",
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
      "progress": "1/7",
      "content": "_DevTeam CONTEXT",
      "message": "Gathering requirements and context",
      "agent": "_DevTeam",
      "isDelegated": false
    },
    {
      "timestamp": "2026-01-01T16:42:30.000Z",
      "type": "DECISION",
      "content": "Use session tracking file approach"
    },
    {
      "timestamp": "2026-01-01T16:43:10.000Z",
      "type": "SUBAGENT",
      "phase": "SUBAGENT",
      "progress": "3/0",
      "content": "[SUBAGENT] _Developer",
      "agent": "_Developer",
      "isDelegated": true
    }
  ],
  "delegations": [],
  "skills": ["frontend-react", "ui-components"],
  "awaitingReset": false
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
node .github/scripts/session-tracker.js phase CONTEXT "1/7" "Gathering requirements and analyzing codebase"
# ... do context work ...

# PLAN phase
node .github/scripts/session-tracker.js phase PLAN "2/7" "Designing solution architecture"
node .github/scripts/session-tracker.js decision "Use approach X instead of Y"
# ... do planning work ...

# COORDINATE phase
node .github/scripts/session-tracker.js phase COORDINATE "3/7" "Delegating tasks to specialists"
node .github/scripts/session-tracker.js delegate Developer "Implement module A"
node .github/scripts/session-tracker.js skills "backend-api, testing"
# ... coordinate work ...

# INTEGRATE phase
node .github/scripts/session-tracker.js phase INTEGRATE "4/7" "Implementing code changes"
# ... do integration work ...

# VERIFY phase
node .github/scripts/session-tracker.js phase VERIFY "5/7" "Running tests and validation"
# ... verify work ...

# LEARN phase
node .github/scripts/session-tracker.js phase LEARN "6/7" "Updating project knowledge"
# ... update knowledge ...

# COMPLETE phase
node .github/scripts/session-tracker.js phase COMPLETE "7/7" "Finalizing and writing workflow log"
# Write workflow log
WORKFLOW_LOG="log/workflow/$(date +%Y-%m-%d_%H%M%S)_task-name.md"
# ... create workflow log ...

# Clean up session
node .github/scripts/session-tracker.js complete "$WORKFLOW_LOG"
```

## VSCode Extension Integration

**File to Monitor**: `.akis-sessions.json` (not `.akis-session.json`)

The VSCode AKIS Monitor extension:

1. Watches `.akis-sessions.json` for multi-session tracking (file system watcher)
2. Falls back to `.akis-session.json` for single session view (backwards compatible)
3. Parses the JSON data: `{ sessions: [...], currentSessionId: "...", lastUpdate: "..." }`
4. Updates the Live Session panel in real-time showing **all sessions** in current chat
5. Shows current phase, progress, decisions, and emissions for each session
6. Groups completed and active sessions under "Current Session" view
7. Provides export button to combine all sessions into workflow log

### Multi-Session Display

The extension should display each session as a separate expandable tree node:

```
Current Session (3 sessions)
├── 📦 Session 1: docker-cleanup-rebuild [COMPLETED]
│   ├── _DevTeam COMPLETE | progress=7/7
│   └── Actions (12)
│       ├── [SESSION_START] Session Started
│       ├── [PHASE_CHANGE] Phase: CONTEXT - Checking containers
│       ├── [DECISION] Remove all containers and rebuild
│       ├── [FILE_CHANGE] Modified docker-compose.yml
│       └── ...
│
├── 📦 Session 2: fix-502-errors [COMPLETED]  
│   ├── _DevTeam VERIFY | progress=5/7
│   └── Actions (8)
│       ├── [SESSION_START] Session Started
│       ├── [PHASE_CHANGE] Phase: CONTEXT - Investigating errors
│       ├── [DECISION] Fix nginx backend port configuration
│       └── ...
│
└── 📦 Session 3: test-extension-visibility [ACTIVE] ✨
    ├── _DevTeam CONTEXT | progress=1/7
    └── Actions (5)
        ├── [SESSION_START] Session Started
        ├── [PHASE_CHANGE] Phase: CONTEXT
        ├── [DETAIL] Added file change tracking
        ├── [DECISION] Verify extension reading files
        └── [FILE_CHANGE] Modified .akis-sessions.json
```

Each action should be clickable to show:
- **Title**: Brief action description
- **Description**: Full action details
- **Reason**: Why this action was taken
- **Timestamp**: When it occurred
- **Phase**: Which phase it belongs to

## Multi-Session Workflow

### During Chat (Multiple Mini-Sessions)

```bash
# Session 1
node .github/scripts/session-tracker.js start "task-1" "Agent"
# ... work ...
node .github/scripts/session-tracker.js complete "log/workflow/task-1.md"

# Session 2 (still in same chat)
node .github/scripts/session-tracker.js start "task-2" "Agent"
# ... work ...
node .github/scripts/session-tracker.js complete "log/workflow/task-2.md"

# View all sessions
node .github/scripts/session-tracker.js all-status
```

### At End of Chat

```bash
# Export all sessions to combined workflow log
node .github/scripts/session-tracker.js export "log/workflow/2026-01-02_combined.md"

# Commit workflow log
git add log/workflow/2026-01-02_combined.md
git commit -m "Add combined session workflow log"
git push

# Clear session tracking files
node .github/scripts/session-tracker.js reset
```

## Benefits

- **Real-time monitoring**: See agent progress without waiting for workflow logs
- **Multi-session support**: Track multiple tasks in one conversation
- **Live decisions**: View decisions as they're made during execution
- **Phase tracking**: Monitor which phase each agent is currently in
- **Combined logs**: Export all sessions together for complete context
- **Clean separation**: Reset after commit for next conversation
- **Minimal overhead**: Simple JSON file writes, auto-cleaned after reset

## Backwards Compatibility

The VSCode extension and session tracker maintain full backwards compatibility:
- Single session workflows continue to work with `.akis-session.json`
- Multi-session tracking is opt-in via `.akis-sessions.json`
- Old workflow logs are still supported
- Extension gracefully handles both single and multi-session files

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
4. `.akis-sessions.json` exists in workspace root (for multi-session view)

### Sessions not cleared after reset

If tracking files persist after `reset`:
1. Check console for errors
2. Manually delete: `rm .akis-session.json .akis-sessions.json`
3. Ensure all sessions are completed before reset

### Export not including all sessions

Verify:
1. All sessions have been started with `start` command
2. Sessions are tracked in `.akis-sessions.json`
3. No JSON parsing errors in session file
4. Output path is writable

## Advanced Usage

### View All Sessions

```bash
node .github/scripts/session-tracker.js all-status
```

Output:
```json
{
  "active": true,
  "count": 3,
  "currentSessionId": "1735876543210",
  "sessions": [
    {
      "id": "1735876543100",
      "task": "docker-cleanup-rebuild",
      "status": "completed",
      "phase": "COMPLETE",
      "progress": "7/7",
      "isCurrent": false
    },
    ...
  ]
}
```

### Export with Custom Path

```bash
node .github/scripts/session-tracker.js export "log/workflow/my-custom-log.md"
```

## Future Enhancements

- Interactive decision tree with zoom/pan across all sessions
- Decision branching visualization for multi-session context
- Time-travel debugging (replay session history)
- Session comparison view
- Merge and split session capabilities
```
- Multi-agent session coordination
- Session analytics and metrics
