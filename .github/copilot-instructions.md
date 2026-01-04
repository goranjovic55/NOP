# AKIS v3 - Agent Knowledge & Instruction System

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (solutions)

---

## Session Flow

### Start (Auto)
`python .github/scripts/session_start.sh` → Shows banner with:
- Knowledge map overview (line 1 of project_knowledge.json)
- Available docs in `docs/`
- Available skills in `.github/skills/` (see INDEX for quick lookup)
- Available workflow prompts in `.github/prompts/`

**Query resources throughout work as needed**

### Work (Free-form)
No prescribed phases. Work naturally:
- Query knowledge/docs/skills when stuck
- Use `grep_search` to find examples
- Reference skills for copy-paste solutions
- Invoke workflow prompts (`.github/prompts/`) for multi-step tasks

### End (Required)
`python .github/scripts/session_end.sh` → Runs:
1. Generate codemap → Update project_knowledge.json
2. Suggest skills → Propose new/update/remove (show to user, wait approval)
3. Increment session counter → Check if maintenance due (every 10 sessions)
4. Create workflow log (if >15min or complex)
5. Commit all changes

---

## Knowledge System

**File:** `project_knowledge.json` (JSONL format)

**Line 1 = Map:** Read first for domain overview and quickNav
```json
{"type":"map","domains":{"backend":["Module.A"],"frontend":["Component.B"]},"quickNav":{"api":"Module.A","ui":"Component.B"}}
```

**Entity Types:**
```json
{"type":"entity","name":"Component.Name","entityType":"service|component|module","observations":["desc","upd:YYYY-MM-DD"]}
{"type":"relation","from":"A","to":"B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
{"type":"codegraph","name":"file.ext","nodeType":"module","dependencies":["X"],"dependents":["Y"]}
```

**Workflow:** Query throughout work, update at session end (auto via codemap)

---

## Skills Library

**Location:** `.github/skills/`
**Index:** `.github/skills/INDEX.md` - Quick problem→solution lookup
**Format:** Copy-paste ready, <50 lines, executable patterns

**When to use:** Query INDEX when stuck, grep skill content for examples

**Examples:**
- `debugging.md` - Runtime/build errors, common fixes
- `knowledge.md` - Query/update project_knowledge.json patterns
- `documentation.md` - Doc structure, update workflows

---

## Workflow Prompts

**Location:** `.github/prompts/`
**Purpose:** Multi-step phase-based workflows for specialized tasks
**Format:** Each prompt defines phases (CONTEXT → ANALYZE → IMPLEMENT → ...)

**Difference from regular work:**
- Regular work: Free-form, no phases, context-driven
- Workflow prompts: Prescribed phases, step-by-step instructions

**Available prompts:**
- `akis-workflow-analyzer.md` - Analyze all sessions, consolidate skills/docs (every 10 sessions or manual)

**Usage:** Follow prompt instructions when triggered (auto or manual)

---

## Standards

- Files <500 lines, functions <50 lines
- Type hints/annotations required
- Tests for new features
- Descriptive commit messages
- Use templates from `.github/templates/`

---

## Folder Structure

- `.github/skills/` → Copy-paste solution patterns
- `.github/prompts/` → Multi-step workflow instructions
- `.github/templates/` → File templates (skills, docs, logs)
- `.github/scripts/` → Automation (session_start.sh, session_end.sh, etc.)
- `docs/` → Project documentation (features, guides, technical)
- `log/workflow/` → Historical work logs (>15min tasks)
- `project_knowledge.json` → Knowledge graph (entities, relations, codemap)

---

*Context over Process. Knowledge over Ceremony.*
