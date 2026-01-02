---
name: context-switching
description: Handling user interrupts and task switching with state preservation. Use when managing multiple concurrent tasks.
---

# Context Switching

## When to Use
- User interrupts current task
- Handling multiple concurrent requests
- Managing task priorities
- Preserving work state

## Pattern
[PAUSE] → `checkpoint` → Handle Interrupt → [RESUME]

## Checklist
- [ ] `node session-tracker.js checkpoint` before interrupt
- [ ] Emit `[PAUSE: task=<current> | phase=<phase>]`
- [ ] Handle interruption (max depth: 3)
- [ ] Emit `[RESUME: task=<original> | phase=<phase>]`
- [ ] Continue from saved state

## Hard Limits

| Limit | Value | Behavior if Exceeded |
|-------|-------|---------------------|
| Max depth | 3 | Session creation BLOCKED |
| Stale threshold | 30min | Ask user: resume/new? |
| Orphan threshold | 1hr | Persist to recovery file |

## Example Flow
```markdown
# Main task in progress
[PHASE: INTEGRATE | progress=4/0]
Working on feature implementation...

# User interrupts - MUST pause first
[PAUSE: task=feature-implementation | phase=INTEGRATE]
node session-tracker.js checkpoint

# Start interrupt task (depth=1)
[SESSION: Fix critical bug] @Developer | depth=1
[PHASE: COMPLETE | progress=7/1]

# Auto-resume parent
[RESUME: task=feature-implementation | phase=INTEGRATE]
```

## Stale Session Recovery
```
node session-tracker.js stale-check
# Returns: { stale: true, age: 45, recommendation: "ask_user" }
```

## Stack Depth
```
progress=4/0  → Main thread, phase 4
progress=1/1  → Depth 1 (first interrupt)
progress=3/2  → Depth 2 (nested interrupt)
# Depth 3 is HARD LIMIT - blocked beyond this
```
