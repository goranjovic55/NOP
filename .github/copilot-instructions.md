# AKIS v3 - Agent Knowledge & Instruction System

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (solutions)

---

## BLOCKING GATES (Enforce Before Proceeding)

Each phase has a gate. **You MUST NOT proceed until gate requirements are met.**

| Phase | Gate Requirement | Verification |
|-------|-----------------|--------------|
| CONTEXT | Knowledge + skills loaded | Can state relevant entities |
| PLAN | TODO list created | Actionable items with subtasks |
| EXECUTE | Current task clear | Matches TODO item |
| REVIEW | All tasks addressed | Checklist complete |
| END | Docs/logs created | Workflow log exists (if >15min) |

---

## Session Flow (MANDATORY 5 PHASES)

### 1. CONTEXT (Load Before Work)

**GATE:** Must load knowledge and skills BEFORE any code changes.

```bash
# REQUIRED: Load domain map
head -1 project_knowledge.json

# REQUIRED: Query task-relevant entities
grep '"name":"KEYWORD"' project_knowledge.json

# REQUIRED: Check relevant skills
cat .github/skills/INDEX.md
```

**Checklist:**
- [ ] Read knowledge map (line 1)
- [ ] Query entities for task domain
- [ ] Load applicable skills
- [ ] Check `.github/instructions/structure.md`

**Output:** Brief context summary showing loaded entities/skills.

**See:** `.github/instructions/context-loading.md`

---

### 2. PLAN (TODO Before Implementation)

**GATE:** Must have explicit TODO list BEFORE writing code.

**Create actionable steps:**
```markdown
- [ ] Task 1: Specific action (file/component)
  - [ ] Subtask 1a: Detailed change
  - [ ] Subtask 1b: Verification step
- [ ] Task 2: Next action
```

**Checklist:**
- [ ] Each task <50 lines of change
- [ ] Each task independently verifiable
- [ ] Dependencies identified
- [ ] Skills for approach identified

**Anti-drift anchor:** Restate the original task before planning.

**Output:** TODO list with clear, measurable steps.

**See:** `.github/instructions/task-tracking.md`

---

### 3. EXECUTE (Sequential, Verified)

**GATE:** Current task must match a TODO item.

**Process:**
1. Work on ONE task at a time
2. Verify completion before moving to next
3. Mark `[x]` when complete
4. Use `report_progress` after meaningful units

**Mid-task anchor (every 3-5 actions):**
- [ ] Still aligned with original task?
- [ ] Current work advances plan?
- [ ] No unrelated tangents?

**If drift detected:** Stop, restate task, realign.

**Output:** Completed implementations matching TODO items.

**See:** `.github/instructions/session-discipline.md`

---

### 4. REVIEW (Verify Before Complete)

**GATE:** All planned items must be addressed.

**Checklist:**
- [ ] All TODO items complete or documented as deferred
- [ ] Code compiles/lints successfully
- [ ] Tests pass (if applicable)
- [ ] Changes match original request
- [ ] Files in correct locations per structure.md

**Output:** Change summary, ready for user confirmation.

---

### 5. SESSION END (Document and Commit)

**GATE:** Must create workflow log for tasks >15 minutes.

**Required actions:**
1. **Structure check:** Verify files in correct locations
2. **Knowledge update:** Run codemap if significant changes
3. **Workflow log:** Create if >15 min or complex task
4. **Commit:** Use `report_progress` with updated checklist

```bash
# Generate codemap (significant changes only)
python .github/scripts/generate_codemap.py

# Create workflow log
cp .github/templates/workflow-log.md log/workflow/$(date +%Y-%m-%d_%H%M%S)_TASK.md
```

**Output:** Session summary, committed changes, workflow log.

**See:** `.github/instructions/session-end.md`

---

## Anti-Drift Enforcement

### Drift Warning Signs
- Working on unrelated files
- Fixing bugs not in original scope
- Refactoring beyond requirements
- Extended exploration without implementation

### Recovery Procedure
1. **STOP** current action
2. **RESTATE** original task
3. **COMPARE** current work vs. requirements
4. **REALIGN** or document scope change
5. **CONTINUE** aligned work

### Context Anchors
Insert at key points to maintain focus:
- **Session start:** "Task: [restate in own words]"
- **Before implementation:** "Plan: [TODO list]"
- **Mid-task:** "Current: [what I'm doing] aligns with [which TODO]"
- **Before commit:** "Changes: [summary] match [original request]"

---

## Knowledge System

**File:** `project_knowledge.json` (JSONL format)
**Line 1 = Map:** Read FIRST for domain overview and quickNav

**Load pattern:**
```bash
# Domain overview
head -1 project_knowledge.json | python3 -m json.tool

# Query specific entity
grep '"name":"ModuleName"' project_knowledge.json
```

**Update:** At session end via `generate_codemap.py` for codegraph updates.

---

## Skills Library

**Index:** `.github/skills/INDEX.md` - Problem→solution lookup
**Format:** Copy-paste ready, <50 lines, executable patterns

**Load pattern:**
```bash
# Find relevant skill
grep -r "keyword" .github/skills/

# Apply skill
cat .github/skills/{relevant}.md
```

**Available:** debugging, knowledge, documentation, backend-api, frontend-react, ui-consistency

---

## Instruction Files

Detailed protocols in `.github/instructions/`:
- `context-loading.md` - Knowledge/skills/docs loading
- `task-tracking.md` - TODO and subtask management
- `session-discipline.md` - Anti-drift and context anchors
- `session-end.md` - Codemap, logs, completion
- `structure.md` - File placement rules

---

## Standards

- Files <500 lines, functions <50 lines
- Type hints/annotations required
- Tests for new features
- Templates from `.github/templates/`

---

## Quick Reference

**Start:** Load knowledge → Load skills → Create TODO
**Work:** Execute sequentially → Verify each → Report progress
**End:** Check structure → Update knowledge → Create log → Commit

**Gate violations:** Stop and fix before proceeding.

---

*Context over Process. Knowledge over Ceremony.*
