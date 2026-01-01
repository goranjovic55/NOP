# AKIS Framework

**A**gents • **K**nowledge • **I**nstructions • **S**kills

## Required Response Format

```
[SESSION: task] @AgentName
[AKIS] entities=N | skills=X,Y | patterns=Z
[PHASE: NAME | progress=N/7]
<work>
[COMPLETE] result | files: changed
```

**Blocking (HALT if missing)**: `[SESSION:]` before work, `[AKIS]` in CONTEXT, `[COMPLETE]` at end

**Session Tracking (REQUIRED)**: Call `node .github/scripts/session-tracker.js` at every phase/decision/delegation. Start: `start "task" "agent"`. Phase: `phase NAME "N/0"`. Decision: `decision "desc"`. Delegate: `delegate Agent "task"`. Complete: `complete "log/workflow/file.md"`. See `.github/AKIS_SESSION_TRACKING.md`.

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
- **MANDATORY**: Update `.akis-session.json` after each emission for real-time monitoring
- Use `.github/scripts/session-tracker.js` to emit session state
- VSCode extension monitors this file for live visualization
- **File is committed** with workflow log to preserve session details in git history
- Starting new session **overwrites** existing file (does not append)

**Session Tracking Commands**:
```bash
# Start session
node .github/scripts/session-tracker.js start "task description" "AgentName"

# Update phase
node .github/scripts/session-tracker.js phase CONTEXT "1/0"

# Record decision
node .github/scripts/session-tracker.js decision "Decision description"

# Record delegation
node .github/scripts/session-tracker.js delegate DeveloperAgent "Implementation task"

# Record skills
node .github/scripts/session-tracker.js skills "skill-name, skill-name"

# Complete session (file persists for commit)
node .github/scripts/session-tracker.js complete "log/workflow/YYYY-MM-DD_HHMMSS_task.md"
```

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
