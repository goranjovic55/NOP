# AKIS Framework

**A**gents • **K**nowledge • **I**nstructions • **S**kills

## ⚠️ MANDATORY AT EVERY RESPONSE START

**BEFORE ANY WORK:**
1. `node .github/scripts/session-tracker.js status` → Check session
2. If `active: true, needsResume: true` → `resume [sessionId]` (use provided resumeCommand)
3. If no active → `start "task" "agent"` (auto-pauses any active session as parent)
4. Emit `[SESSION: task] @AgentName`
5. `node .github/scripts/knowledge-query.js --stats` → Load knowledge
6. Emit `[AKIS] entities=N | skills=X,Y | patterns=Z`

**ON INTERRUPT:** New session auto-pauses parent; completing sub-session auto-resumes parent

**SESSION HIERARCHY:** First session = main (depth=0), interrupts create sub-sessions (depth=1,2). Max depth=3.

## Required Response Format

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
