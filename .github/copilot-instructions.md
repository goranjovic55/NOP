# AKIS v3 - Agent Knowledge & Instruction System

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (solutions)

## Session Flow (MANDATORY 5 PHASES)

**Checkpoints:** Run `python .github/scripts/session_emit.py`:
- **On every user interrupt** (new request, feature, debug, question)
- At phase transitions
- Every 3-5 todos completed
- When stuck or uncertain

### 1. CONTEXT
- Load `project_knowledge.json` **lines 1-50** (map + domains)
- Load `.github/skills/INDEX.md`, check `structure.md`
- Optional: `python .github/scripts/session_start.py`
**Output:** Context summary (2-3 lines)

### 2. PLAN
- Use `manage_todo_list` with `<PHASE>` prefix
- Break work into <50 line chunks, identify skills from INDEX.md
- All todos must belong to a phase (CONTEXT/PLAN/EXECUTION/REVIEW/SESSION END)
**Output:** TODO list with steps + skills
**Checkpoint:** `session_emit` before execution

### 3. EXECUTION
- Execute todos sequentially, mark in-progress → completed individually
- Query resources as needed
**Output:** Completed implementation
**Checkpoint:** `session_emit` every 3-5 todos

### 4. REVIEW (User Confirmation REQUIRED)
- Verify quality, structure.md compliance, run tests
- **STOP - Request user approval to proceed**
**Output:** Change summary + await confirmation
**Checkpoint:** `session_emit` before approval

### 5. SESSION END
Execute: `python .github/scripts/session_end.py`
- Clean repository → Move misplaced files per structure.md
- Generate codemap → Update project_knowledge.json
- Suggest skills → Propose new/update/remove (show to user, wait approval)
- Create workflow log → AUTO-FILLED (`YYYY-MM-DD_HHMMSS_<task>.md`)
- Commit all changes
**Output:** Session summary + skill suggestions + workflow log path

---

## Knowledge System

`project_knowledge.json` (JSONL) - Line 1 = map, query on-demand, auto-update at session end

## Skills Library

`.github/skills/INDEX.md` - Problem→solution lookup, <50 lines, query when stuck

## Standards

- Files <500 lines, functions <50 lines
- Type hints/annotations required
- Tests for new features
- Use templates from `.github/templates/`

---

*Context over Process. Knowledge over Ceremony.*

---

## Quick Facts (Testable Rules)

| ID | Rule | Value |
|----|------|-------|
| F1 | Max file lines | 500 |
| F2 | Max function lines | 50 |
| F3 | Total phases | 5 |
| F4 | Phase order | CONTEXT→PLAN→EXECUTION→REVIEW→SESSION END |
| F5 | User approval phase | REVIEW (phase 4) |
| F6 | Knowledge file line 1 | map (navigation) |
| F7 | Checkpoint triggers | user interrupt, phase transition, 3-5 todos, stuck |
| F8 | Todo prefix format | `<PHASE>` |
| F9 | Root .py allowed | agent.py only |
| F10 | Scripts location | `scripts/` folder |
| F11 | Docs location | `docs/` folder |
| F12 | Workflow logs | `log/workflow/` |