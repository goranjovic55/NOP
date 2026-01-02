# AKIS v2 - Lightweight Agent Framework

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (patterns)

---

## Every Task Flow

### Start
`Read project_knowledge.json` → Load entities, check existing patterns

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
2. Pattern emerged? → `python .github/scripts/extract_skill.py "name" "desc"`
3. Pattern improved? → Update `.github/skills/{name}.md`
4. Pattern obsolete? → Delete skill file

**COMPLETE:**
1. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md` from template
2. Commit all changes

---

## Knowledge System

**Format:** `project_knowledge.json` (JSONL)

```json
{"type":"entity","name":"Module.Component","entityType":"service","observations":["desc","upd:YYYY-MM-DD"]}
{"type":"relation","from":"A","to":"B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
{"type":"codegraph","name":"file.ext","nodeType":"module","dependencies":["X"],"dependents":["Y"]}
```

**Workflow:**
- Load at start → Understand existing entities
- Query during work → Avoid duplicates
- Update before commit → Codemap + manual entities

---

## Skills

Load from `.github/skills/` when task matches:

| Task | Skill |
|------|-------|
| API endpoints, REST | `backend-api.md` |
| React components, UI | `frontend-react.md` |
| Unit/integration tests | `testing.md` |
| Error handling, logging | `error-handling.md` |
| Docker, deployment | `infrastructure.md` |
| Git, commits, PRs | `git-workflow.md` |

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

---

*Context over Process. Knowledge over Ceremony.*
