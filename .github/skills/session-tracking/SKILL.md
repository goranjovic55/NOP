# Session Tracking Skill

## When to Use

**REQUIRED for all sessions**. This skill maintains the external session state so agents don't need to track workflow in context.

- Starting any new work session
- Transitioning between phases
- Recording decisions and delegations
- Handling interrupts (vertical workflow)
- Completing sessions

## Pattern

### 1. Session Initialization

```bash
node .github/scripts/session-tracker.js start "task summary" "AgentName" "original user request"
```

**Always capture**:
- Task: Brief summary (what you're doing)
- Agent: Who is working (_DevTeam, Developer, etc.)
- UserRequest: Original user words (full context)

### 2. Phase Transitions

```bash
# Mark todo in-progress first
manage_todo_list(mark #N in-progress)

# Then emit phase with description
node .github/scripts/session-tracker.js phase PHASE_NAME "N/0" "what you're doing in this phase"

# Do the work
# ...

# Mark todo completed
manage_todo_list(mark #N completed)
```

**Phase descriptions** (auto-filled if omitted):
- CONTEXT: "Loading knowledge, skills, and understanding requirements"
- PLAN: "Designing approach and selecting appropriate patterns"
- COORDINATE: "Delegating to specialists or preparing tools"
- INTEGRATE: "Executing implementation and making changes"
- VERIFY: "Testing, validating, and checking for errors"
- LEARN: "Updating knowledge base and documenting changes"
- COMPLETE: "Finalizing work and awaiting user verification"

### 3. Decision Recording

```bash
node .github/scripts/session-tracker.js decision "description of choice made"
```

Record when:
- Choosing between alternatives
- Making architectural decisions
- Selecting patterns or approaches

### 4. Skill Usage

```bash
node .github/scripts/session-tracker.js skills "skill-name,another-skill"
```

Record at CONTEXT phase or when loading skills.

### 5. Interrupts (Vertical Workflow)

```bash
# User interrupts with new request
node .github/scripts/session-tracker.js push "reason for interrupt"
# stackDepth: 0 → 1

# Handle interrupt work
# ...

# Return to main thread
node .github/scripts/session-tracker.js pop "result of interrupt"
# stackDepth: 1 → 0
```

**Max depth**: 3 levels

### 6. Session Completion

```bash
# Present summary to user
# [AWAIT USER VERIFICATION]

# After approval:
node .github/scripts/session-tracker.js complete "log/workflow/YYYY-MM-DD_HHMMSS_task.md"
```

## Benefits

### For Agents
- **No context overhead**: Session state externalized to `.akis-session.json`
- **Clear roadmap**: Always know current phase, progress, decisions made
- **Interrupt handling**: Stack-based workflow for context switching
- **Resumable**: Can continue session across multiple interactions

### For Users
- **Live visibility**: VSCode extension shows real-time progress
- **Session history**: Complete timeline in `.akis-session.json`
- **Workflow logs**: Committed with detailed session data

## Checklist

**Session Start**:
- [ ] `session-tracker.js start` with full user request
- [ ] Record skills to be used
- [ ] Emit CONTEXT phase

**During Work**:
- [ ] Emit phase BEFORE marking todo in-progress
- [ ] Record all significant decisions
- [ ] Use push/pop for interrupts
- [ ] Keep stackDepth ≤ 3

**Session End**:
- [ ] Present summary to user
- [ ] Wait for explicit approval
- [ ] Only then: `session-tracker.js complete`

## Examples

### Simple Session
```bash
# Start
session-tracker.js start "Fix login bug" "Developer" "Login page shows error on valid credentials"
session-tracker.js skills "debugging,frontend-react"
session-tracker.js phase CONTEXT "1/0" "Analyzing login authentication flow"

# Work
session-tracker.js phase INTEGRATE "4/0" "Fixing token validation logic"
session-tracker.js decision "Update JWT verification to handle edge case"

# Complete
session-tracker.js phase VERIFY "5/0" "Testing login with various credentials"
session-tracker.js phase COMPLETE "7/0"
# [AWAIT USER VERIFICATION]
session-tracker.js complete "log/workflow/2026-01-01_fix-login.md"
```

### With Interrupt
```bash
# Main work
session-tracker.js start "Implement feature X" "_DevTeam"
session-tracker.js phase INTEGRATE "4/0"

# User interrupts: "Can you quickly check Y?"
session-tracker.js push "User requested quick check of Y"
session-tracker.js phase VERIFY "5/1" "Checking Y as requested"
# ... do the check ...
session-tracker.js pop "Y verified, resuming feature X"

# Resume main work
session-tracker.js phase INTEGRATE "4/0" "Continuing feature X implementation"
```

## Anti-Patterns

❌ **Don't skip phase emissions**:
```bash
# Bad: Jump directly to work without emitting phase
manage_todo_list(mark #2 in-progress)
# ... do work ...
```

✅ **Do emit phase first**:
```bash
# Good: Emit phase, then mark in-progress
session-tracker.js phase PLAN "2/0" "Designing approach"
manage_todo_list(mark #2 in-progress)
# ... do work ...
```

❌ **Don't complete without user approval**:
```bash
# Bad: Auto-complete after work done
session-tracker.js complete "log.md"
```

✅ **Do wait for approval**:
```bash
# Good: Present summary and wait
# [AWAIT USER VERIFICATION]
# ... user approves ...
session-tracker.js complete "log.md"
```

❌ **Don't forget to pop interrupts**:
```bash
# Bad: Push without matching pop
session-tracker.js push "Interrupt"
# ... stackDepth stuck at 1 ...
```

✅ **Do balance push/pop**:
```bash
# Good: Always pop after interrupt handled
session-tracker.js push "Interrupt"
# ... handle it ...
session-tracker.js pop "Resolved"
```

## Integration with AKIS

This skill integrates with:
- **Phases**: Maps to 7-phase AKIS workflow
- **Agents**: Tracks which agent is working
- **Knowledge**: Session data preserved in git
- **Instructions**: Enforces protocols from phases.md and protocols.md

## Session State Structure

```json
{
  "id": "1735772400000",
  "task": "Brief task summary",
  "userRequest": "Full original user request for context",
  "agent": "_DevTeam",
  "status": "active",
  "phase": "INTEGRATE",
  "progress": "4/0",
  "stackDepth": 0,
  "decisions": [
    {
      "description": "Decision made",
      "timestamp": "2026-01-01T22:00:00.000Z"
    }
  ],
  "emissions": [...],
  "delegations": [...],
  "skills": ["skill1", "skill2"],
  "interrupts": []
}
```

## Notes

- Session file (`.akis-session.json`) is **committed** with workflow log
- VSCode extension monitors this file for live updates (auto-refresh every 2s)
- Starting new session **overwrites** existing file (single session at a time)
- Session provides **external roadmap** - agents don't track in context
