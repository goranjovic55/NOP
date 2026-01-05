# AKIS v3 - Agent Knowledge & Instruction System

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (solutions)

---

## Session Flow (MANDATORY 5 PHASES)

**ALL sessions MUST follow these phases in order:**

### 1. CONTEXT
Execute: `python .github/scripts/session_start.py` (optional helper)
- Load `project_knowledge.json` (line 1 = map)
- Query relevant docs from `docs/`
- Load skills from `.github/skills/INDEX.md`
- Check `.github/instructions/structure.md`
**Output:** Context summary (2-3 lines)

### 2. PLAN
- Use `manage_todo_list` to create actionable steps
- Break work into <50 line chunks
- Identify knowledge/skills/docs needed (specify which skills from INDEX.md)
- **TODO format:** `<PHASE> Description` (e.g., `<EXECUTION> Implement feature X`)
- All todos must belong to a phase (CONTEXT/PLAN/EXECUTION/REVIEW/SESSION END)
**Output:** TODO list with clear steps + skills to use

### 3. EXECUTION
- Execute TODOs sequentially
- Mark in-progress → completed individually
- Query resources as needed
**Output:** Completed implementation

### 4. REVIEW (User Confirmation REQUIRED)
- Review all changes for quality
- Verify structure.md compliance
- Run tests if applicable
- **STOP - Request user approval to proceed**
**Output:** Change summary + await confirmation

### 5. SESSION END
Execute: `python .github/scripts/session_end.py`
- Clean repository → Move misplaced files per structure.md
- Generate codemap → Update project_knowledge.json
- Suggest skills → Propose new/update/remove (show to user, wait approval)
- Increment session counter → Check if maintenance due (every 10 sessions)
- Create workflow log → AUTO-FILLED from git changes and session data
  * Log named: `YYYY-MM-DD_HHMMSS_<task-name>.md` (task from branch name)
  * Auto-fills: Summary, Changes, Skills, timestamp
  * Agent should review and enhance with: Decisions, Gotchas, Future work
- Commit all changes
**Output:** Session summary + skill suggestions + workflow log path

**IMPORTANT:** Workflow logs are auto-generated but need manual enhancement:
- Add specific technical decisions and rationale
- Document gotchas or issues encountered  
- Note future work or improvements needed
- Provide context for next session

---

## Knowledge System

**File:** `project_knowledge.json` (JSONL format)
**Line 1 = Map:** Read first for domain overview and quickNav

**Workflow:** Query throughout work, update at session end (auto via codemap)

---

## Skills Library

**Location:** `.github/skills/INDEX.md` - Problem→solution lookup
**Format:** Copy-paste ready, <50 lines, executable patterns
**Usage:** Query INDEX when stuck

---

## Standards

- Files <500 lines, functions <50 lines
- Type hints/annotations required
- Tests for new features
- Use templates from `.github/templates/`

---

*Context over Process. Knowledge over Ceremony.*
