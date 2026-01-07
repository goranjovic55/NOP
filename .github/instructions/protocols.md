# AKIS Protocols

Detailed procedures for session lifecycle. Referenced by `copilot-instructions.md`.

---

## Protocol: Session Start

**When:** First message of conversation

1. Read `project_knowledge.json` lines 1-50 (map + key entities)
2. Read `.github/skills/INDEX.md` → load relevant domain skills
3. Read `.github/instructions/structure.md` for file organization
4. Optionally check `docs/INDEX.md` for existing documentation

**Output:** 2-3 line context summary, then create todos

---

## Protocol: Todo Tracking

**Rule:** NO WORK WITHOUT TODO

### Prefixes
| Prefix | Use |
|--------|-----|
| `<MAIN>` | Original user request (always first) |
| `<WORK>` | Subtasks for implementation |
| `<END>` | Final review and commit |
| `<PAUSED>` | Interrupted task |
| `<SUB:N>` | User interrupt handler (N = nesting level) |

### Status Symbols
- `✓` completed
- `◆` in-progress  
- `○` not-started
- `⊘` paused

### Worktree Format
```
<MAIN> ✓ Original user request
├─ <WORK> ✓ First task completed
├─ <WORK> ✓ Second task completed  
├─ <PAUSED> Third task (interrupted)
│  └─ <SUB:1> ✓ User interrupt handled
├─ <WORK> ✓ Third task resumed
└─ <END> ✓ Review and commit
```

---

## Protocol: Thread Management

**When:** User sends message during WORK phase

1. Mark current todo as `<PAUSED>`
2. Announce: "Pausing [X] to handle [Y]"
3. Create `<SUB:N>` todo for interrupt
4. Complete interrupt task
5. Resume: mark `<PAUSED>` as `<WORK>` again
6. Announce: "Resuming [X]"

**Rule:** No `<PAUSED>` or open `<SUB:N>` todos at END phase

---

## Protocol: Session End

**When:** All `<WORK>` todos complete, ready for review

### Step 1: Show Summary
Display change summary with files modified/created

### Step 2: Show Worktree
Display final todo tree with status symbols

### Step 3: Wait for Approval
**STOP** - User must say: "approved", "proceed", "done", or "wrap up"

### Step 4: After Approval - Execute End Tasks

#### 4a. Update Knowledge Map
```bash
python .github/scripts/generate_codemap.py
```

#### 4b. Check for Skill Suggestions
```bash
python .github/scripts/suggest_skill.py
```
Review output - create skills manually if useful.

#### 4c. Create Workflow Log
Create file: `log/workflow/YYYY-MM-DD_HHMMSS_task-name.md`

Use template:
```markdown
# Task Name

**Date**: YYYY-MM-DD HH:MM
**Files Changed**: N

## Worktree
<paste final worktree here>

## Work Summary
Brief description of what was accomplished

## Changes
- Created: `path/file.ext`
- Modified: `path/file.ext`

## Lessons Learned
- Key insight or pattern discovered

## Next Steps
- Follow-up task if any

## Skill Suggestions
<paste suggest_skill.py output if any>
```

#### 4d. Commit
```bash
git add -A && git commit -m "type(scope): message"
```

---

## Protocol: Skill Loading

**When:** Touching specific file types

| Pattern | Skill File |
|---------|------------|
| `*.tsx`, `*.jsx`, `components/`, `pages/` | `.github/skills/frontend-react.md` |
| `backend/app/`, `endpoints/`, `*.py` API | `.github/skills/backend-api.md` |
| `docker-compose*`, `Dockerfile` | `.github/skills/docker.md` |
| Error/exception in output | `.github/skills/debugging.md` |
| Creating docs | `.github/skills/documentation.md` |

---

## Standards

- Files < 500 lines
- Functions < 50 lines  
- Type hints required
- Tests for new features
