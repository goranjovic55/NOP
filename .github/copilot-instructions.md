# AKIS v4 - Agent Knowledge & Instruction System

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (solutions)

## Quick Facts

| ID | Rule | Value |
|----|------|-------|
| F1 | Phases | START → WORK → END |
| F2 | Knowledge | `project_knowledge.json` lines 1-50 |
| F3 | Todo rule | **NO WORK WITHOUT TODO** |
| F4 | Interrupt | **User message during WORK = PAUSE current todo first** |
| F5 | Approval | Say "approved/proceed/done/wrap up" before session_end.py |
| F6 | Worktree | Show todo tree at END phase |
| F7 | Locations | Scripts: `scripts/` • Docs: `docs/` • Logs: `log/workflow/` |

---

## Session Start

1. **Read knowledge** - `project_knowledge.json` lines 1-50
2. **Load skills** - `.github/skills/INDEX.md` → domain-relevant skills
3. **Check structure** - `.github/instructions/structure.md`
4. **Check docs** - `docs/INDEX.md` for existing documentation
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
- **NO WORK WITHOUT TODO** - every action must have a corresponding todo
**Output:** Working implementation

### END (Review + Commit)
1. Show change summary
2. Show final **Worktree** (todo tree with status)
3. Verify no `<PAUSED>` or open `<SUB:N>` todos
4. **STOP - Wait for user approval** (required keywords: "approved", "proceed", "done", "wrap up")
5. Only after approval: `python .github/scripts/session_end.py`

---

## Todo Tracking (MANDATORY)

**NO WORK WITHOUT TODO.** Every task requires a todo entry.

**Worktree Format (shown at END):**
```
<MAIN> ✓ Original user request
├─ <WORK> ✓ First task completed
├─ <WORK> ✓ Second task completed  
├─ <PAUSED> Third task (interrupted)
│  └─ <SUB:1> ✓ User interrupt handled
├─ <WORK> ✓ Third task resumed & completed
└─ <END> ✓ Review and commit
```

**Status symbols:** ✓ completed, ◆ in-progress, ○ not-started, ⊘ paused

---

## Thread Management (Anti-Drift)

**On interrupt:** `<PAUSED>` current → `<SUB:N>` new task → complete → pop back

```
<PAUSED> Add button        ← interrupted
  <SUB:1> Fix bug          ← handle this
<WORK> Resume: Add button  ← pop back
```

**Rules:** Announce switches ("Pausing X for Y") • No open threads at END

---

## Skill Triggers (MANDATORY)

| Touching | Load Skill |
|----------|------------|
| `*.tsx`, `*.jsx`, `components/`, `pages/` | `.github/skills/frontend-react.md` |
| `backend/app/`, `endpoints/`, `*.py` API | `.github/skills/backend-api.md` |
| `docker-compose*`, `Dockerfile` | `.github/skills/docker.md` |
| Error/exception in output | `.github/skills/debugging.md` |
| Creating docs | `.github/skills/documentation.md` |

**Standards:** Files <500 lines • Functions <50 lines • Type hints required • Tests for new features

*Context over Process. Knowledge over Ceremony.*
