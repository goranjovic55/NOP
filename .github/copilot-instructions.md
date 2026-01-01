# AKIS Protocol

**AKIS** = **A**gents • **K**nowledge • **I**nstructions • **S**kills

## Required Response Format

```
[SESSION: task] @AgentName
[AKIS_LOADED] entities: N | skills: skill1, skill2 | patterns: pat1, pat2
[PHASE: NAME | progress=N/7]
<work>
[SKILLS_USED] skill1, skill2
[COMPLETE] outcome | changed: files
```

---

## 🔷 Agents (WHO does work)

**Load agent file ONLY when delegating to that agent.**

| Agent | When to Load | File |
|-------|--------------|------|
| _DevTeam | Complex tasks (>30min), orchestration | `.github/agents/_DevTeam.agent.md` |
| Architect | Design decisions | `.github/agents/Architect.agent.md` |
| Developer | Implementation | `.github/agents/Developer.agent.md` |
| Reviewer | Testing, validation | `.github/agents/Reviewer.agent.md` |
| Researcher | Investigation | `.github/agents/Researcher.agent.md` |

**Delegation**: `#runSubagent Name "Task: ... Context: ... Skills: ..."` (see `_DevTeam.agent.md`)

---

## 🔷 Knowledge (WHAT exists)

**Load at session start**, query as needed.

| File | Content |
|------|---------|
| `project_knowledge.json` | Entities, relations, codegraph |
| `.github/global_knowledge.json` | Cross-project patterns |

**Emit**: `[AKIS_LOADED] entities: N | skills: ... | patterns: ...`

---

## 🔷 Instructions (HOW to behave)

**Load instruction file ONLY when relevant.**

| File | When to Load |
|------|--------------|
| `phases.md` | Every task (7-phase flow) |
| `protocols.md` | Delegation, interrupts |
| `templates.md` | Output formatting |
| `error_recovery.md` | On errors |
| `structure.md` | Architecture tasks |

**Phases**: CONTEXT → PLAN → COORDINATE → INTEGRATE → VERIFY → LEARN → COMPLETE

---

## 🔷 Skills (Patterns to apply)

**Load skill ONLY when task matches trigger.**

| Skill | Trigger |
|-------|---------|
| `backend-api` | FastAPI, REST |
| `frontend-react` | React components |
| `security` | Auth, validation |
| `testing` | Tests |
| `error-handling` | Exceptions |
| `git-deploy` | Commits |
| `infrastructure` | Docker |
| `protocol-dissection` | Packets |
| `zustand-store` | State mgmt |
| `api-service` | API clients |
| `ui-components` | UI patterns |
| `cyberpunk-theme` | Styling |

**Path**: `.github/skills/{name}/SKILL.md`

**Emit**: `[SKILLS_USED] skill1, skill2`

---

## Enforcement

**Blocking (HALT if missing)**:
- `[SESSION:]` before work
- `[AKIS_LOADED]` in CONTEXT
- `[SKILLS_USED]` before COMPLETE

**Load-on-demand**: Read file only when task requires it (see "When to Load" columns above).
