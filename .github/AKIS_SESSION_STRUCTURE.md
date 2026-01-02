# AKIS Session Structure - Action-Based Tree View

## Overview

Sessions now use an action-based structure where every operation is recorded as a detailed, clickable action in chronological order. The VSCode extension displays multiple sessions as separate expandable trees.

## Session Tree Structure

```
📁 .akis-sessions.json (Multi-session file)
  ├── Session 1: "docker-cleanup-rebuild"
  │   ├── Action 1: Session Started
  │   ├── Action 2: Phase: CONTEXT
  │   ├── Action 3: Decision Made
  │   ├── Action 4: File modified
  │   ├── Action 5: Phase: INTEGRATE
  │   └── Action 6: Phase: COMPLETE
  │
  └── Session 2: "fix-502-errors"
      ├── Action 1: Session Started
      ├── Action 2: Phase: CONTEXT
      ├── Action 3: Context Updated
      ├── Action 4: File modified
      └── Action 5: Phase: VERIFY
```

## Action Structure

Every action contains:

```javascript
{
  "id": "unique-id",           // Sequential action ID
  "timestamp": "ISO-8601",     // When action occurred
  "type": "ACTION_TYPE",       // Type of action
  "phase": "PHASE_NAME",       // Current phase when action occurred
  "agent": "AgentName",        // Agent that performed action
  "title": "Short title",      // Display title in tree
  "description": "Details",    // Full description
  "reason": "Why this action", // Reasoning/justification
  "details": {                 // Type-specific details
    // ... action-specific data
  }
}
```

## Action Types

### PHASE_CHANGE
Phase transition in workflow.

```javascript
{
  "type": "PHASE_CHANGE",
  "title": "Phase: INTEGRATE",
  "description": "Implementing solution",
  "reason": "Phase transition in workflow",
  "details": {
    "from": "PLAN",
    "to": "INTEGRATE",
    "progress": "4/7",
    "message": "Implementing solution"
  }
}
```

### DECISION
Strategic decision point.

```javascript
{
  "type": "DECISION",
  "title": "Decision Made",
  "description": "Use action-based tracking",
  "reason": "Extension needs hierarchical view",
  "details": {
    "decision": "Use action-based tracking",
    "alternatives": ["Event-based", "Log-based"],
    "rationale": "Better UX for extension"
  }
}
```

### DELEGATE
Task delegated to another agent.

```javascript
{
  "type": "DELEGATE",
  "title": "Delegated to Developer",
  "description": "Implement feature X",
  "reason": "Specialized agent required",
  "details": {
    "toAgent": "Developer",
    "task": "Implement feature X",
    "expectedResult": "Working implementation"
  }
}
```

### FILE_CHANGE
File modified/created/deleted.

```javascript
{
  "type": "FILE_CHANGE",
  "title": "File modified",
  "description": "src/app.ts",
  "reason": "Code implementation",
  "details": {
    "file": "src/app.ts",
    "changeType": "modified",
    "linesChanged": 42,
    "summary": "Added new feature"
  }
}
```

### CONTEXT
Context information updated.

```javascript
{
  "type": "CONTEXT",
  "title": "Context Updated",
  "description": "Added 3 entities, 2 files",
  "reason": "Building session knowledge",
  "details": {
    "entities": ["Module.Component", "Service"],
    "files": ["src/app.ts", "src/service.ts"],
    "patterns": ["backend-api"]
  }
}
```

### SKILL
Skills/patterns applied.

```javascript
{
  "type": "SKILL",
  "title": "Skills Applied",
  "description": "Using: backend-api, frontend-react",
  "reason": "Technical pattern implementation",
  "details": {
    "skills": ["backend-api", "frontend-react"],
    "patterns": ["REST", "hooks"]
  }
}
```

### DETAIL
Progress update or detail.

```javascript
{
  "type": "DETAIL",
  "title": "Detail",
  "description": "Analyzed dependencies",
  "reason": "Progress update",
  "details": {
    "text": "Analyzed dependencies"
  }
}
```

## Phase Tracking

Phases group actions by workflow stage:

```javascript
{
  "phases": {
    "CONTEXT": {
      "name": "CONTEXT",
      "status": "completed",
      "startTime": "2026-01-02T04:00:00Z",
      "endTime": "2026-01-02T04:05:00Z",
      "message": "Loading context",
      "actionIds": ["0", "1", "2", "3"]  // Actions in this phase
    },
    "PLAN": {
      "name": "PLAN",
      "status": "active",
      "startTime": "2026-01-02T04:05:00Z",
      "message": "Designing solution",
      "actionIds": ["4", "5", "6"]
    }
  }
}
```

## Extension Tree View

The VSCode extension displays:

```
LIVE SESSION
├── 🔄 enhance-ssot-sessions (active)
│   ├── 📋 Actions (6)
│   │   ├── [0] Session Started
│   │   │   ├── Description: Started enhance-ssot-sessions with _DevTeam
│   │   │   ├── Reason: Initialize new work session
│   │   │   └── Details: { task: "...", agent: "..." }
│   │   ├── [1] Phase: PLAN
│   │   │   ├── Description: Designing solution
│   │   │   ├── Reason: Phase transition in workflow
│   │   │   └── Details: { from: "CONTEXT", to: "PLAN", ... }
│   │   ├── [2] Decision Made
│   │   │   ├── Description: Use action-based tracking
│   │   │   ├── Reason: Extension needs hierarchical view
│   │   │   └── Details: { decision: "...", alternatives: [...] }
│   │   ├── [3] File modified
│   │   │   ├── Description: .github/scripts/session-tracker.js
│   │   │   ├── Reason: Code implementation
│   │   │   └── Details: { file: "...", changeType: "..." }
│   │   ├── [4] Phase: INTEGRATE
│   │   └── [5] Skills Applied
│   │
│   └── 📁 Phases
│       ├── CONTEXT (completed) [actions: 0]
│       ├── PLAN (completed) [actions: 1, 2]
│       └── INTEGRATE (active) [actions: 3, 4, 5]
│
└── ✅ multi-session-support (completed)
    └── 📋 Actions (8)
        └── ... (chronological actions)
```

## CLI Commands

### Start Session
```bash
node session-tracker.js start "task-name" "AgentName" ["session-name"]
```

### Add Actions
```bash
# Phase change
node session-tracker.js phase PLAN "2/7" "Designing solution"

# Decision with reason
node session-tracker.js decision "Use X approach" --reason "Better performance"

# File change
node session-tracker.js file-change "src/app.ts" "modified"

# Context update
node session-tracker.js context --entities "Mod1,Mod2" --files "file.ts"

# Skill usage
node session-tracker.js skills "backend-api,frontend-react"

# Delegation
node session-tracker.js delegate "Developer" "Implement feature X"

# Detail/progress
node session-tracker.js detail "Completed analysis"
```

### View Sessions
```bash
# All sessions
node session-tracker.js all-status

# Specific session
node session-tracker.js get-session "session-id-or-name"

# Get context summary
node session-tracker.js get-context
```

### Export & Reset
```bash
# Export all sessions to workflow log
node session-tracker.js export "log/workflow/2026-01-02_sessions.md"

# After commit to GitHub
git add log/workflow/2026-01-02_sessions.md
git commit -m "Add workflow logs"
git push

# Clear session tracking files
node session-tracker.js reset
```

## Multi-Session Workflow

1. **During Chat** - Multiple mini-sessions can run:
```bash
# Session 1
node session-tracker.js start "cleanup" "_DevTeam"
# ... work ...
node session-tracker.js complete

# Session 2 (parallel or sequential in same chat)
node session-tracker.js start "fix-bug" "_DevTeam"
# ... work ...
node session-tracker.js complete
```

2. **View All Sessions**:
```bash
node session-tracker.js all-status
# Shows both sessions as separate trees
```

3. **Export Combined Log**:
```bash
node session-tracker.js export "log/workflow/combined.md"
# All sessions with their actions exported
```

4. **After Commit**:
```bash
git push
node session-tracker.js reset
# Clears .akis-session.json and .akis-sessions.json
```

## Session as SSOT (Single Source of Truth)

Each session contains complete context for restoration:

```javascript
{
  "id": "unique-id",
  "name": "session-name",
  "task": "task-description",
  "agent": "AgentName",
  "status": "active|completed",
  "phase": "current-phase",
  "progress": "N/7",
  
  // Chronological actions (main tree)
  "actions": [
    { /* action 1 */ },
    { /* action 2 */ },
    // ...
  ],
  
  // Phase grouping
  "phases": {
    "CONTEXT": { /* phase data */ },
    "PLAN": { /* phase data */ }
  },
  
  // Context (SSOT for restoration)
  "context": {
    "entities": ["Entity1", "Entity2"],
    "files": ["file1.ts", "file2.ts"],
    "patterns": ["pattern1"],
    "skills": ["skill1", "skill2"],
    "changes": [
      { "file": "...", "type": "modified", "timestamp": "..." }
    ]
  },
  
  // Legacy collections
  "decisions": [...],
  "delegations": [...],
  "skills": [...],
  "emissions": [...]
}
```

## Benefits

1. **Chronological View**: All actions in order of occurrence
2. **Clickable Details**: Each action shows full context when clicked
3. **Multi-Session Support**: Multiple sessions as separate trees
4. **Full Context**: Every action has description, reason, and details
5. **SSOT**: Session file has all info to restore agent state
6. **Parallel Sessions**: Can track concurrent work streams
7. **Export to Logs**: Combine all sessions before commit
8. **Clean Separation**: Reset only after GitHub commit

## Migration

Old sessions without actions are automatically migrated when updated:
- Actions array is initialized if missing
- Phases converted from array to object format
- Context initialized with empty collections
- All new emissions create proper action entries

## Example Session JSON

```json
{
  "id": "1767327296715",
  "name": "enhance-ssot-sessions",
  "task": "enhance-ssot-sessions",
  "agent": "_DevTeam",
  "status": "completed",
  "phase": "COMPLETE",
  "progress": "7/7",
  "startTime": "2026-01-02T04:14:56.715Z",
  "endTime": "2026-01-02T04:30:00.000Z",
  "actions": [
    {
      "id": "0",
      "timestamp": "2026-01-02T04:14:56.715Z",
      "type": "SESSION_START",
      "phase": "CONTEXT",
      "agent": "_DevTeam",
      "title": "Session Started",
      "description": "Started enhance-ssot-sessions with _DevTeam",
      "reason": "Initialize new work session",
      "details": {
        "task": "enhance-ssot-sessions",
        "agent": "_DevTeam"
      }
    },
    {
      "id": "1",
      "timestamp": "2026-01-02T04:18:20.468Z",
      "type": "PHASE_CHANGE",
      "phase": "PLAN",
      "agent": "_DevTeam",
      "title": "Phase: PLAN",
      "description": "Designing solution",
      "reason": "Phase transition in workflow",
      "details": {
        "from": "CONTEXT",
        "to": "PLAN",
        "progress": "2/7",
        "message": "Designing solution"
      }
    }
  ],
  "phases": {
    "CONTEXT": {
      "name": "CONTEXT",
      "status": "completed",
      "startTime": "2026-01-02T04:14:56.715Z",
      "endTime": "2026-01-02T04:18:20.468Z",
      "message": "",
      "actionIds": ["0"]
    },
    "PLAN": {
      "name": "PLAN",
      "status": "active",
      "startTime": "2026-01-02T04:18:20.468Z",
      "message": "Designing solution",
      "actionIds": ["1"]
    }
  },
  "context": {
    "entities": ["SessionTracker", "AKIS.Framework"],
    "skills": ["infrastructure", "state-management"],
    "patterns": ["state-management"],
    "files": [".github/scripts/session-tracker.js"],
    "changes": [
      {
        "file": ".github/scripts/session-tracker.js",
        "type": "modified",
        "timestamp": "2026-01-02T04:27:25.807Z"
      }
    ]
  }
}
```

This structure provides the VSCode extension with everything needed to display rich, interactive session trees with full action details.
