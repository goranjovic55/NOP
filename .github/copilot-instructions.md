# AKIS v2 - Lightweight Agent Framework

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (patterns)

---

## Every Task Flow

### Start
`Read project_knowledge.json` → Index entities, map available context

**Context Indexing:**
1. Read line 1 of `project_knowledge.json` (map) for domain overview
2. Identify relevant documentation paths in `docs/` based on task domain
3. Note applicable skills in `.github/skills/`
4. Query specific sections as needed **throughout the workflow**

**During Work (All Phases):**
Query `project_knowledge.json`, `docs/`, and skills as needed

### Todo Phases

| Phase | Title Format | When |
|-------|--------------|------|
| CONTEXT | `[CONTEXT] Load knowledge for X` | Always (start) |
| PLAN | `[PLAN] Design approach for X` | Complex tasks |
| IMPLEMENT | `[IMPLEMENT] Build X` | Main work |
| VERIFY | `[VERIFY] Test X` | Always |
| LEARN | `[LEARN] Update knowledge & skills` | Always (after approval) |
| COMPLETE | `[COMPLETE] Log & commit` | Always (end) |

### End (LEARN → COMPLETE)

**LEARN:**
1. Run `python .github/scripts/generate_codemap.py` + add entities to project_knowledge.json
2. Run `python .github/scripts/update_docs.py` → Apply doc updates automatically (lightweight)
3. Run `python .github/scripts/suggest_skill.py` → Analyze session and propose skills
4. **Show skill suggestions to user** → Wait for approval before writing
5. If approved: Create/update `.github/skills/{name}.md` with skill content
6. Pattern obsolete? → Delete skill file

**COMPLETE:**
1. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md` from template
2. **Increment session counter**: `python .github/scripts/session_tracker.py increment`
3. **Check if maintenance is due**: `python .github/scripts/session_tracker.py check-maintenance`
   - If due (every 10 sessions): **Ask user** if they want to run cross-session maintenance workflow
   - If user approves: Follow `.github/prompts/akis-workflow-analyzer.md`
   - After maintenance: Run `python .github/scripts/session_tracker.py mark-maintenance-done`
4. Commit all changes

---

## Knowledge System

**Format:** `project_knowledge.json` (JSONL)

**Line 1 - Map:** `{"type":"map","domains":{...},"quickNav":{...}}` - Read first for overview

**Types:**
```json
{"type":"entity","name":"Module.Component","entityType":"service","observations":["desc","upd:YYYY-MM-DD"]}
{"type":"relation","from":"A","to":"B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
{"type":"codegraph","name":"file.ext","nodeType":"module","dependencies":["X"],"dependents":["Y"]}
```

**Workflow:**
- Read line 1 (map) → Get domain overview & quickNav
- **Query specific domains as needed throughout work** → Use map to locate entities
- Update before commit → Codemap + manual entities (map auto-updates)

---

## Skills

Reference from `.github/skills/` when task matches (query as needed during work):

| Task | Skill |
|------|-------|
| API endpoints, REST | `backend-api.md` |
| React components, UI | `frontend-react.md` |
| Unit/integration tests | `testing.md` |
| Error handling, logging | `error-handling.md` |
| Docker, deployment | `infrastructure.md` |
| Git, commits, PRs | `git-workflow.md` |
| Knowledge queries, updates | `knowledge.md` |
| Build errors, troubleshooting | `debugging.md` |
| Workflow logs, READMEs, doc updates | `documentation.md` |

---

## Workflow Logs

**Required:** Tasks >15 min  
**Location:** `log/workflow/YYYY-MM-DD_HHMMSS_task.md`  
**Template:** `.github/templates/workflow-log.md`  
**Purpose:** Historical record (search to understand past changes)

---

## Quick Workflows

**Simple (<5 min):**
```
CONTEXT → IMPLEMENT → VERIFY → Commit (no log)
```

**Feature (>15 min):**
```
CONTEXT → PLAN → IMPLEMENT → VERIFY
↓ (wait for user approval)
LEARN → COMPLETE
```

**Review Gate:** After VERIFY, show results and wait for user approval before LEARN/COMPLETE

---

## Standards

- Files <500 lines, functions <50 lines
- Type hints required (Python/TypeScript)
- Tests for new features
- Descriptive commit messages

---

## Folders

- `.project/` → Planning docs, blueprints, ADRs
- `log/workflow/` → Historical work record
- `.github/prompts/` → Specialized workflow prompts

---

## Cross-Session Analysis

**Purpose**: Analyze all workflow logs to standardize skills, organize docs, and improve framework

**Trigger Options**:
1. **Automatic**: Every 10 sessions - prompted in COMPLETE phase
2. **Manual**: User can trigger anytime with the workflow prompt

**Session Tracking**: Uses `.github/scripts/session_tracker.py` to track session numbers

**Workflow**: Follow `.github/prompts/akis-workflow-analyzer.md`

**Script**: `python .github/scripts/analyze_workflows.py`

**Important**: This is a separate maintenance workflow that runs independently outside of regular sessions to analyze patterns across multiple sessions.

**Outputs**:
- Skill candidates from recurring patterns
- Documentation organization recommendations  
- Instruction improvements from common decisions
- Knowledge updates from cross-session insights

**Session Tracking Commands**:
```bash
# Check current session number
python .github/scripts/session_tracker.py current

# Check if maintenance is due
python .github/scripts/session_tracker.py check-maintenance

# Mark maintenance as completed
python .github/scripts/session_tracker.py mark-maintenance-done
```

---

*Context over Process. Knowledge over Ceremony.*
