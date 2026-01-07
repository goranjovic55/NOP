# AKIS Protocols

Detailed procedures for session lifecycle. Referenced by `copilot-instructions.md`.

---

## Protocol: Session Start

**When:** First message of conversation

1. Read `project_knowledge.json` lines 1-50 (map + key entities)
2. Read `.github/instructions/structure.md` for file organization
3. **IMMEDIATELY call `manage_todo_list`** - create initial todos

**Output:** 2-3 line context summary, then show todo list

---

## Protocol: Todo Tracking

### ⚠️ CRITICAL: NO WORK WITHOUT TODO

**Before ANY action (code, file, terminal):**
1. Ensure todo exists for the action
2. Mark todo as in-progress
3. Do the work
4. Mark completed IMMEDIATELY

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

### Step 4: After Approval - MANDATORY EXECUTION

⚠️ **DO NOT SKIP ANY STEP - RE-READ THIS SECTION WHEN USER APPROVES**

#### 4a. Update Knowledge Map (REQUIRED)
```bash
python .github/scripts/generate_codemap.py
```

#### 4b. Suggest Skills (REQUIRED)
```bash
python .github/scripts/suggest_skill.py
```
Review output - note useful patterns for user.

#### 4c. Repository Cleanup (REQUIRED)
Check `.github/instructions/structure.md` for rules:
- Move misplaced `.md` files to `docs/{category}/`
- Move scripts to `scripts/`
- Clean backup files (`*_backup*.json`, `*.bak`)
- Verify root only has allowed files

#### 4d. Create Workflow Log
Create file: `log/workflow/YYYY-MM-DD_HHMMSS_task-name.md`

Use template: `.github/templates/workflow-log.md`

#### 4e. Commit and Push (REQUIRED)
```bash
git add -A && git commit -m "type(scope): message" && git push
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

---

## Standards

- Files < 500 lines
- Functions < 50 lines  
- Type hints required
- Tests for new features
