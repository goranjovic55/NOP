# AKIS v2 - Lightweight Agent Framework

**A**gents (you) • **K**nowledge (context) • **I**nstructions (this file) • **S**kills (patterns)

---

## 🔵 MANDATORY: Every Task

### 1. Start - Load Knowledge
```
Read project_knowledge.json → Understand project entities
Query knowledge during work → Check existing patterns
```

### 2. Todo Phases (Use Copilot's todo list)
Create todos with these phase names for tracking:

| Phase | Todo Title Format | When |
|-------|-------------------|------|
| CONTEXT | `[CONTEXT] Load knowledge for X` | Start - always |
| PLAN | `[PLAN] Design approach for X` | Complex tasks |
| IMPLEMENT | `[IMPLEMENT] Build X` | Main work |
| VERIFY | `[VERIFY] Test X` | Always |
| LEARN | `[LEARN] Update knowledge & skills` | After user approval - MANDATORY |
| COMPLETE | `[COMPLETE] Create workflow log & commit` | End - always |

### 3. End - Before Commit (MANDATORY)

**⚠️ CRITICAL: LEARN phase must complete BEFORE any commit!**

**LEARN Phase:**
1. **Update Knowledge**: Run `python .github/scripts/generate_codemap.py` + add entities
2. **Update Skills**: Analyze session for patterns:
   - New reusable pattern? → `python .github/scripts/extract_skill.py "name" "desc"`
   - Improved existing pattern? → Update the skill file
   - Outdated skill? → Remove or archive it

**COMPLETE Phase:**
3. **Create Workflow Log**: `log/workflow/YYYY-MM-DD_HHMMSS_task.md` using template
4. **Commit**: Stage and commit all changes

---

## 📚 Knowledge System

### Format: `project_knowledge.json`
JSONL file with three entry types:

```json
{"type":"entity","name":"Module.Component","entityType":"service","observations":["description","upd:YYYY-MM-DD"]}
{"type":"relation","from":"ComponentA","to":"ComponentB","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
{"type":"codegraph","name":"file.ext","nodeType":"module","dependencies":["X"],"dependents":["Y"]}
```

### Workflow
1. **Load at Start**: Read project_knowledge.json to understand existing entities
2. **Query During Work**: Search knowledge before implementing (avoid duplicates)
3. **Update Before Commit**: Run codemap generator + add new entities manually

---

## 🛠️ Skills (Load When Relevant)

Skills are reusable pattern libraries. Load from `.github/skills/` when task matches.

| Task Type | Skill File |
|-----------|------------|
| API endpoints, REST | `backend-api.md` |
| React components, UI | `frontend-react.md` |
| Unit/integration tests | `testing.md` |
| Error handling, logging | `error-handling.md` |
| Docker, deployment | `infrastructure.md` |
| Git, commits, PRs | `git-workflow.md` |

### Skill Lifecycle (During LEARN phase)
| Action | When | Command |
|--------|------|---------|
| **Create** | New reusable pattern emerged | `python .github/scripts/extract_skill.py "name" "desc"` |
| **Update** | Improved/extended pattern | Edit `.github/skills/skill-name.md` directly |
| **Remove** | Outdated or project-specific | Delete the skill file |

### Using Skills
1. Check if skill exists for your task type
2. Read the skill file for patterns and examples
3. Follow the checklist in the skill

---

## 📝 Workflow Log (MANDATORY)

Every significant task (>15 min) MUST end with a workflow log.

**Location**: `log/workflow/YYYY-MM-DD_HHMMSS_task-name.md`

**Template**: `.github/templates/workflow-log.md`

**Purpose**: Workflow logs are the historical record of all work done. They document:
- What was accomplished and why
- Files changed and decisions made
- Knowledge updates and skills used
- Search `log/workflow/` to understand past changes

---

## ⚡ Quick Reference

### Simple Fix (< 5 min)
```
1. [CONTEXT] Check knowledge
2. [IMPLEMENT] Fix it  
3. [VERIFY] Test it
4. Commit (no workflow log needed)
```

### Feature (> 15 min)
```
1. [CONTEXT] Load knowledge, understand scope
2. [PLAN] Design approach, list files
3. [IMPLEMENT] Build feature
4. [VERIFY] Test, check errors
5. [LEARN] Update knowledge, check for skill patterns
6. [COMPLETE] Create workflow log, commit
```

### ⚠️ REVIEW GATE (After VERIFY)
**STOP and present results to user. Do NOT proceed to LEARN/COMPLETE until user approves.**

Show:
- What was done
- Files changed
- Tests/verification results

Wait for user to say "ok", "looks good", "wrap up", etc. before continuing.

---

## 📏 Standards

- Files < 500 lines
- Functions < 50 lines  
- Type hints required (Python/TypeScript)
- Tests for new features
- Descriptive commit messages

---

## � Project Organization

### `.project/` Folder
Location for project planning documents:
- Blueprints and architecture plans
- Roadmaps and milestones
- Project specifications
- Design decisions and ADRs

### `log/workflow/` Folder
Historical record of all work done (search here to understand past changes)

---

## 🚀 Setup for New Project

1. Copy `.github/` folder to new project
2. Create empty `project_knowledge.json` in root
3. Create `log/workflow/` and `.project/` directories
4. Run `python .github/scripts/generate_codemap.py` to populate initial knowledge

---

*AKIS v2: Context over Process. Knowledge over Ceremony.*
