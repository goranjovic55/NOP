# AKIS Framework

**A**gents • **K**nowledge • **I**nstructions • **S**kills

## ⚠️ MANDATORY AT EVERY RESPONSE START

**BEFORE ANY WORK - Read Session State:**
1. Read `.akis-session.json` directly → Get current session state
2. If `status: "active"` → You're in a session, continue from current `phase`
3. If no session or needs new → `node .github/scripts/session-tracker.js start "task" "agent"`
4. Emit `[SESSION: task] @AgentName | phase: PHASE | depth: N`
5. Read `project_knowledge.json` stats → Load context
6. Emit `[AKIS] entities=N | skills=X,Y | patterns=Z`

**Session State File** (`.akis-session.json`):
```json
{
  "id": "1234567890",
  "name": "task-name",
  "status": "active|completed",
  "phase": "CONTEXT|PLAN|COORDINATE|INTEGRATE|VERIFY|LEARN|COMPLETE",
  "progress": "N/7",
  "agent": "_DevTeam|Developer|Architect|...",
  "depth": 0,                    // 0=main, 1+=sub-session
  "parentSessionId": null,       // null=main, id=child of parent
  "actions": [...],              // Timeline of all actions
  "decisions": [...],            // Key decisions made
  "context": { "entities": N, "skills": [], "files": [] }
}
```

**Resume Logic**: If `parentSessionId` exists, you're in a sub-session. On complete, parent auto-resumes.

**SESSION HIERARCHY:** depth=0 (main) → depth=1 (child) → depth=2 (grandchild). Max depth=3.

**Multi-session file** (`.akis-sessions.json`): Contains ALL sessions with hierarchy for visualization.

```
[SESSION: task] @AgentName
[AKIS] entities=N | skills=X,Y | patterns=Z
[PHASE: NAME | N/7]
<work>
[COMPLETE] result | files: changed
```

**Blocking**: `[SESSION:]` before work, `[AKIS]` in CONTEXT, `[COMPLETE]` at end

**Session Tracking**: `start "task" "agent"` | `phase NAME "N/7"` | `decision "desc"` | `delegate Agent "task"` | `complete "log/file.md"` | `reset` (after commit only)

---

## 🔷 Agents (WHO)

| Agent | Role | When to Load |
|-------|------|--------------|
| _DevTeam | Orchestrator (delegates, never implements) | Complex tasks >30min |
| Architect | Design, alternatives, trade-offs | Design decisions |
| Developer | Code, tests, skill patterns | Implementation |
| Reviewer | Validate, security, quality | Testing/validation |
| Researcher | Investigate, document | Research tasks |

**Path**: `.github/agents/{Name}.agent.md`

**Delegation**: `#runSubagent Name "Task: ... | Context: ... | Skills: ... | Expect: RESULT_TYPE"`

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
| `todo-list.md` | Creating/managing todos |
| `structure.md` | Architecture tasks |

**Path**: `.github/instructions/{file}.md`

**Phases**: CONTEXT(1) → PLAN(2) → COORDINATE(3) → INTEGRATE(4) → VERIFY(5) → LEARN(6) → COMPLETE(7)

**Skip**: Quick fix (1→4→5→7), Q&A (1→7)

**Todo Format**: `[PHASE: NAME | N/7] Description` - Always create all 7 phases in todo list

---

## 🔷 Skills (PATTERNS)

**Load skill when task matches**: API/REST → `backend-api` | React/UI → `frontend-react` | Tests → `testing` | Auth/secrets → `security` | Errors → `error-handling` | Docker → `infrastructure` | Git → `git-deploy`

**Path**: `.github/skills/{name}/SKILL.md` (When to Use, Pattern, Checklist, Examples)

---

## Portability

Copy `.github/` + empty `project_knowledge.json`. **Limits**: instructions <50, agents <50, skills <100 lines
