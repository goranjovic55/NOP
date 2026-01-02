# Example Session Workflow

**Scenario**: Implement REST API endpoint with authentication

## Session Start

```bash
# Agent reads this FIRST
cat .akis-session.json
# → status: "active", phase: "CONTEXT", progress: "1/7"

# OR if no session
node .github/scripts/session-tracker.js start "implement-auth-endpoint" "Developer"
```

## Phase 1: CONTEXT

**Emit Headers**:
```
[SESSION: implement-auth-endpoint] @Developer | phase: CONTEXT | depth: 0
[AKIS] entities=292 | skills=backend-api,security | patterns=[]
[PHASE: CONTEXT | 1/7]
```

**Actions**:
```bash
# Load knowledge (already emitted in [AKIS])
# Identify relevant skills
node .github/scripts/session-tracker.js skill backend-api
node .github/scripts/session-tracker.js skill security
```

**Session State After**:
```json
{
  "phase": "CONTEXT",
  "progress": "1/7",
  "skills": ["backend-api", "security"],
  "context": {
    "entities": ["Backend.FastAPI", "Backend.Core.Security"],
    "skills": ["backend-api", "security"],
    "files": []
  }
}
```

---

## Phase 2: PLAN

**Emit**:
```
[PHASE: PLAN | 2/7]
```

**Actions**:
```bash
# Design approach (in agent's head, no tool needed)
# If deviating from standard flow:
node .github/scripts/session-tracker.js decision "Skip middleware, use decorator pattern"

# Update phase
node .github/scripts/session-tracker.js phase PLAN "2/7"
```

**Session State After**:
```json
{
  "phase": "PLAN",
  "progress": "2/7",
  "decisions": [
    {
      "timestamp": "...",
      "description": "Skip middleware, use decorator pattern",
      "phase": "PLAN"
    }
  ]
}
```

---

## Phase 3: COORDINATE

**Emit**:
```
[PHASE: COORDINATE | 3/7]
```

**Actions**:

### Option A: Delegate (_DevTeam only)
```bash
# Delegation via runSubagent
#runSubagent Architect "Task: Design auth flow | Context: JWT tokens | Skills: security | Expect: DESIGN_DECISION"

# Track delegation
node .github/scripts/session-tracker.js delegate Architect "Design auth flow"
```

**Session State After (Delegation)**:
```json
{
  "phase": "COORDINATE",
  "progress": "3/7",
  "delegations": [
    {
      "timestamp": "...",
      "agent": "Architect",
      "task": "Design auth flow",
      "status": "pending"
    }
  ]
}
```

### Option B: Direct Implementation (Developer/others)
```bash
# Just move to next phase
node .github/scripts/session-tracker.js phase COORDINATE "3/7"
```

---

## Phase 4: INTEGRATE

**Emit**:
```
[PHASE: INTEGRATE | 4/7]
```

**Actions**:
```bash
# Execute work (use skills loaded in CONTEXT)
# backend-api skill → FastAPI patterns
# security skill → JWT, password hashing

# Track file changes
node .github/scripts/session-tracker.js action FILE_CHANGE "backend/app/api/v1/auth.py created"
node .github/scripts/session-tracker.js action FILE_CHANGE "backend/app/core/security.py modified"

# Update phase
node .github/scripts/session-tracker.js phase INTEGRATE "4/7"
```

**Session State After**:
```json
{
  "phase": "INTEGRATE",
  "progress": "4/7",
  "actions": [
    {
      "type": "FILE_CHANGE",
      "description": "backend/app/api/v1/auth.py created",
      "phase": "INTEGRATE"
    },
    {
      "type": "FILE_CHANGE",
      "description": "backend/app/core/security.py modified",
      "phase": "INTEGRATE"
    }
  ],
  "context": {
    "files": ["backend/app/api/v1/auth.py", "backend/app/core/security.py"]
  }
}
```

---

## Phase 5: VERIFY

**Emit**:
```
[PHASE: VERIFY | 5/7]
```

**Actions**:
```bash
# Run tests
# Track validation
node .github/scripts/session-tracker.js action VALIDATION "Tests passed: 12/12"

# Update phase
node .github/scripts/session-tracker.js phase VERIFY "5/7"
```

**Session State After**:
```json
{
  "phase": "VERIFY",
  "progress": "5/7",
  "actions": [
    {
      "type": "VALIDATION",
      "description": "Tests passed: 12/12",
      "phase": "VERIFY"
    }
  ]
}
```

---

## Phase 6: LEARN

**Emit**:
```
[PHASE: LEARN | 6/7]
```

**Actions**:
```bash
# Update knowledge
# (Append to project_knowledge.json)

# Track update
node .github/scripts/session-tracker.js action KNOWLEDGE_UPDATE "Added Backend.API.AuthEndpoint entity"

# Update phase
node .github/scripts/session-tracker.js phase LEARN "6/7"
```

**Session State After**:
```json
{
  "phase": "LEARN",
  "progress": "6/7",
  "actions": [
    {
      "type": "KNOWLEDGE_UPDATE",
      "description": "Added Backend.API.AuthEndpoint entity",
      "phase": "LEARN"
    }
  ]
}
```

---

## Phase 7: COMPLETE

**Emit**:
```
[PHASE: COMPLETE | 7/7]
```

**Actions**:
```bash
# Finalize session
node .github/scripts/session-tracker.js phase COMPLETE "7/7"
node .github/scripts/session-tracker.js complete "Auth endpoint implemented"
```

**Final Emit**:
```
[COMPLETE] Auth endpoint implemented | files: backend/app/api/v1/auth.py, backend/app/core/security.py
```

**Session State After**:
```json
{
  "status": "completed",
  "phase": "COMPLETE",
  "progress": "7/7",
  "completedAt": "2026-01-02T12:00:00.000Z",
  "skills": ["backend-api", "security"],
  "context": {
    "entities": ["Backend.FastAPI", "Backend.Core.Security", "Backend.API.AuthEndpoint"],
    "skills": ["backend-api", "security"],
    "files": ["backend/app/api/v1/auth.py", "backend/app/core/security.py"],
    "changes": ["Created auth endpoint", "Modified security module"]
  }
}
```

---

## Resume Example

**If interrupted at Phase 4**:

```bash
# Read session state
cat .akis-session.json
# → phase: "INTEGRATE", progress: "4/7", skills: ["backend-api", "security"]

# Resume with headers
[SESSION: implement-auth-endpoint] @Developer | phase: INTEGRATE | depth: 0
[AKIS] entities=292 | skills=backend-api,security | patterns=[]
[PHASE: INTEGRATE | 4/7]

# Continue work from INTEGRATE phase
# Session state tells agent:
# - What skills are active (backend-api, security)
# - What files already changed (from actions[])
# - What decisions were made (from decisions[])
# - Current progress (4/7)
```

---

## Quick Fix Example (Skip Phases)

**Bug fix**: 1→4→5→7

```bash
node .github/scripts/session-tracker.js start "fix-typo" "Developer"

# Phase 1: CONTEXT
[SESSION: fix-typo] @Developer | phase: CONTEXT | depth: 0
[AKIS] entities=292 | skills=[] | patterns=[]
[PHASE: CONTEXT | 1/7]
node .github/scripts/session-tracker.js phase CONTEXT "1/7"

# Skip to Phase 4: INTEGRATE
node .github/scripts/session-tracker.js phase INTEGRATE "4/7"
[PHASE: INTEGRATE | 4/7]
node .github/scripts/session-tracker.js action FILE_CHANGE "Fixed typo in README.md"

# Phase 5: VERIFY
node .github/scripts/session-tracker.js phase VERIFY "5/7"
[PHASE: VERIFY | 5/7]

# Phase 7: COMPLETE
node .github/scripts/session-tracker.js phase COMPLETE "7/7"
[PHASE: COMPLETE | 7/7]
node .github/scripts/session-tracker.js complete "Typo fixed"
[COMPLETE] Typo fixed | files: README.md
```

---

## Key Takeaways

✅ **DO**:
- Read `.akis-session.json` FIRST
- Emit `[SESSION:]` and `[AKIS]` at start
- Update session state as you work (`phase`, `action`, `skill`, `decision`)
- Log deviations as `decisions[]`
- Track skills in `skills[]` array
- Complete with `[COMPLETE]` emission

❌ **DON'T**:
- Use `manage_todo_list` for phases
- Manually sync phase todos
- Skip session state updates
- Forget to emit headers

**Cognitive Load**:
- Read session → Know where you are
- Update session → Track progress
- Session file = plan + state + history
