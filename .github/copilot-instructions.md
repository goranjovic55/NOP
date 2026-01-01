# AKIS Framework

**A**gents • **K**nowledge • **I**nstructions • **S**kills

**⚠️ CRITICAL**: Reading this file = user work requested. Load `.github/skills/session-tracking/SKILL.md` and start session NOW.

## Session Start (MANDATORY)

1. Load `.github/skills/session-tracking/SKILL.md`
2. Start tracking + emit CONTEXT
3. Proceed with work

## Response Format (After Session Start)

```
[SESSION: task] @AgentName
[AKIS] entities=N | skills=X,Y | patterns=Z
[PHASE: NAME | progress=N/7]
<work>
[AWAIT USER VERIFICATION]
[COMPLETE] result | files: changed  ← ONLY after user approval
```

**Blocking (HALT if missing)**: Session start sequence, `[AKIS]` in CONTEXT, **USER VERIFICATION** before `[COMPLETE]`

**CRITICAL RULE**: Never execute COMPLETE phase or mark session complete without explicit user approval. Always present summary and wait for confirmation.

**Todo Tracking (REQUIRED)**: Map phases to todo titles for visibility:
- CONTEXT → "Analyze/Research [subject]"
- PLAN → "Design/Plan [approach]"  
- COORDINATE → "Delegate/Prepare [task]"
- INTEGRATE → "Implement/Execute [feature]"
- VERIFY → "Test/Validate [result]"
- LEARN → "Update/Document [changes]"
- COMPLETE → "Finalize/Review [deliverable]"

**Session Tracking (REQUIRED)**: Use `session-tracking` skill for all work:
- **MANDATORY FIRST STEP**: Load `.github/skills/session-tracking/SKILL.md` and follow its initialization pattern
- **TRIGGER**: Reading the session-tracking skill file means user work is requested - ALWAYS start session tracking
- **NO EXCEPTIONS**: Every user request requiring work must have an active tracked session
- Provides: External roadmap (no context overhead)
- Enforces: Phase emissions, decision logging, interrupt handling
- All commands and patterns documented in the skill file

**CRITICAL**: Session tracking must be initialized BEFORE any work begins. The skill file contains all necessary commands and workflow patterns. If you read the session-tracking skill, you MUST start a session.

---

## 🔷 Agents (WHO)

**Load agent file ONLY when delegating.**

| Agent | Role | When to Load |
|-------|------|--------------|
| _DevTeam | Orchestrator (delegates, never implements) | Complex tasks >30min |
| Architect | Design, alternatives, trade-offs | Design decisions |
| Developer | Code, tests, skill patterns | Implementation |
| Reviewer | Validate, security, quality | Testing/validation |
| Researcher | Investigate, document | Research tasks |

**Path**: `.github/agents/{Name}.agent.md`

**Delegation**: `#runSubagent Name "Task: ... | Context: ... | Skills: ... | Expect: RESULT_TYPE"`

**⚠️ LIVE SESSION TRACKING**:
- **MANDATORY**: `.akis-session.json` tracks all session state in real-time
- Session-tracking skill (`.github/skills/session-tracking/SKILL.md`) provides all commands and patterns
- VSCode extension monitors this file for live visualization
- **File is committed** with workflow log to preserve session details in git history
- Starting new session **overwrites** existing file (does not append)

---

## 🔷 Knowledge (WHAT)

**Load at session start**, query as needed.

| File | Content |
|------|---------|
| `project_knowledge.json` | Entities, relations, codegraph (JSONL) |
| `.github/global_knowledge.json` | Cross-project patterns |

**Format**:
```json
{"type":"entity","name":"Module.Component","entityType":"service","observations":["desc, upd:YYYY-MM-DD"]}
{"type":"relation","from":"A","to":"B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
{"type":"codegraph","name":"file.ext","dependencies":["X"],"dependents":["Y"]}
```

**Emit**: `[AKIS] entities=N | skills=X,Y | patterns=Z`

---

## 🔷 Instructions (HOW)

**Load instruction file ONLY when relevant.**

| File | When to Load |
|------|--------------|
| `phases.md` | Every task (7-phase flow) |
| `protocols.md` | Delegation, interrupts |
| `templates.md` | Output formatting |
| `structure.md` | Architecture tasks |

**Path**: `.github/instructions/{file}.md`

**Phases**: CONTEXT(1) → PLAN(2) → COORDINATE(3) → INTEGRATE(4) → VERIFY(5) → LEARN(6) → COMPLETE(7)

**Skip**: Quick fix (1→4→5→7), Q&A (1→7)

---

## 🔷 Skills (PATTERNS)

**Load skill when task matches**: API/REST → `backend-api` | React/UI → `frontend-react` | Tests → `testing` | Auth/secrets → `security` | Errors → `error-handling` | Docker → `infrastructure` | Git → `git-deploy`

**Path**: `.github/skills/{name}/SKILL.md` (When to Use, Pattern, Checklist, Examples)

---

## Portability

Copy `.github/` + empty `project_knowledge.json`. **Limits**: instructions <50, agents <50, skills <100 lines
