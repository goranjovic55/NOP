# AKIS v4 - Agent Knowledge & Instruction System

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (solutions)

## Session Start

1. **Read knowledge** - `project_knowledge.json` lines 1-50
2. **Load skills** - `.github/skills/INDEX.md` → domain-relevant skills
3. **Check structure** - `.github/instructions/structure.md`
**Output:** Context summary (2-3 lines)

## Three Phases

### START (Context + Plan)
- Create todos with `manage_todo_list`
- Use prefixes: `<MAIN>`, `<WORK>`, `<END>`
- First todo is always `<MAIN>` - the original request
**Output:** Todo list with clear main thread

### WORK (Execute)
- Execute todos, mark completed individually
- **Query skills by domain** (see Skill Triggers below)
- On user interrupt → see Thread Management
**Output:** Working implementation

### END (Review + Commit)
1. Show change summary
2. Verify no `<PAUSED>` or open `<SUB:N>` todos
3. **STOP - Wait for user approval** (required keywords: "approved", "proceed", "done", "wrap up")
4. Only after approval: `python .github/scripts/session_end.py`

---

## Thread Management (Anti-Drift)

**On user interrupt during WORK:**
1. Mark current todo as `<PAUSED>` with note of what was happening
2. Create new todo: `<SUB:N> New task (from: paused task name)`
3. Complete sub-task fully
4. **Pop back to parent** - resume `<PAUSED>` todo
5. Never start END phase with paused/open threads

**Thread Stack Example:**
```
<MAIN> Implement agent download feature    ← original request
<WORK> Create AgentPage.tsx
<PAUSED> Add download button              ← interrupted here
  <SUB:1> Fix API bug (from: download button) ← user asked for this
  <SUB:2> Also check DB (from: SUB:1)     ← nested interrupt
```

**After completing nested work:**
```
<DONE> SUB:2 complete → pop to SUB:1
<DONE> SUB:1 complete → pop to PAUSED
<WORK> Resume: Add download button        ← back on track
```

**Rules:**
- Always acknowledge thread switch: "Pausing X to work on Y"
- Always announce return: "Returning to X after completing Y"
- Cannot run session_end.py with open threads

---

## Skill Triggers (MANDATORY)

| Touching | Load Skill |
|----------|------------|
| `*.tsx`, `*.jsx`, `components/`, `pages/` | `.github/skills/frontend-react.md` |
| `backend/app/`, `endpoints/`, `*.py` API | `.github/skills/backend-api.md` |
| `docker-compose*`, `Dockerfile` | `.github/skills/docker.md` |
| Error/exception in output | `.github/skills/debugging.md` |
| Creating docs | `.github/skills/documentation.md` |

---

## On User Interrupt

1. Note current position: `<PAUSED> task name`
2. Acknowledge: "Pausing [X] to address [Y]"
3. Handle new request as `<SUB:N>`
4. After completion: "Completed [Y], returning to [X]"
5. Resume paused work

---

## Standards

- Files <500 lines, functions <50 lines
- Type hints/annotations required
- Tests for new features

---

*Context over Process. Knowledge over Ceremony.*

---

## Quick Facts

| ID | Rule | Value |
|----|------|-------|
| F1 | Max file lines | 500 |
| F2 | Max function lines | 50 |
| F3 | Phases | START → WORK → END |
| F4 | User approval | END phase, before session_end.py |
| F5 | Main thread | First todo, always `<MAIN>` |
| F6 | Interrupt handling | `<PAUSED>` + `<SUB:N>` |
| F7 | Thread rule | No open threads at END |
| F8 | Knowledge | Line 1-50 of project_knowledge.json |
| F9 | Root .py | agent.py only |
| F10 | Scripts | `scripts/` folder |
| F11 | Docs | `docs/` folder |
| F12 | Workflow logs | `log/workflow/` |
| F13 | Approval keywords | approved, proceed, done, wrap up |