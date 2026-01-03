# Universal Skills Creation

**Date:** 2026-01-03  
**Duration:** ~30 min  
**Branch:** main

---

## Context

User requested standardized project structure documentation and creation of universal skills based on comprehensive workflow analysis from branch `copilot/analyze-workflows-suggest-skills`.

Analysis showed:
- 43 workflows analyzed
- Top universal patterns: Testing (97.7%), Framework Design (90.7%), Knowledge Management (76.7%), Debugging (76.7%), Documentation (74.4%)
- Framework design skill obsolete due to AKIS v2 simplification

---

## Approach

1. Create project structure documentation
2. Review workflow analysis reports (WORKFLOW_SKILLS_SUMMARY.md, WORKFLOW_SKILLS_ANALYSIS.md)
3. Create 3 high-impact universal skills aligned with AKIS v2
4. Update copilot-instructions.md skills table
5. Update knowledge base

---

## Changes

### 1. Project Structure Standard
**File:** `.github/instructions/structure.md`

Terse, project-agnostic structure guide:
- Root folder explanations (`.github/`, `docs/`, `log/`, `scripts/`, etc.)
- Application code organization (`{service}/src/`, `{service}/tests/`)
- Placement rules for code, tests, docs, logs, config

### 2. Knowledge Management Skill
**File:** `.github/skills/knowledge-management.md`

Coverage: 76.7% of workflows

**Content:**
- Load `project_knowledge.json` at task start
- JSONL format (entity/relation/codegraph)
- Entity types and relation types
- Query patterns during work
- Update procedures (codemap + manual entities)

### 3. Debugging Skill
**File:** `.github/skills/debugging.md`

Coverage: 76.7% of workflows

**Content:**
- General debugging strategy
- Build errors (TypeScript/Python)
- Type errors (mypy, tsc)
- Runtime errors (backend/frontend)
- Docker troubleshooting (containers, networks, volumes)
- Database and performance debugging
- Debugging tools and checklist

### 4. Documentation Skill
**File:** `.github/skills/documentation.md`

Coverage: 74.4% of workflows

**Content:**
- Workflow log creation (when, template, structure)
- README best practices
- Inline documentation guidelines
- API documentation (FastAPI autodocs)
- Architecture decision records (ADRs)
- Feature documentation

### 5. Updated AKIS Instructions
**File:** `.github/copilot-instructions.md`

Added 3 new skills to table:
- `knowledge-management.md` - Knowledge queries, updates
- `debugging.md` - Build errors, troubleshooting
- `documentation.md` - Workflow logs, READMEs

### 6. Knowledge Base Updates
**File:** `project_knowledge.json`

Added entities:
- `AKIS.Skills.KnowledgeManagement`
- `AKIS.Skills.Debugging`
- `AKIS.Skills.Documentation`
- `AKIS.Instructions.Structure`

---

## Verification

- [x] All skill files created and formatted
- [x] Skills aligned with AKIS v2 workflow
- [x] Terse, practical content (no fluff)
- [x] copilot-instructions.md updated
- [x] Knowledge base updated with entities
- [x] Project structure doc is project-agnostic

---

## Decisions

**Skill Selection:**
- Dropped framework-design.md (AKIS simplified, pattern no longer needed)
- Focused on 3 universal skills with highest coverage
- All skills reference current AKIS workflow phases

**Documentation Style:**
- Kept all docs terse (AKIS principle)
- Used checklists, tables, code examples
- Minimal prose, maximum utility

**Knowledge Updates:**
- Generated codemap (112 files, 186 entities, 103 relations)
- Added 4 manual entities for new skills/docs
- Maintained JSONL format consistency

---

## Lessons

1. **Analysis Quality:** Comprehensive workflow analysis (43 workflows) provided clear direction
2. **Framework Simplification:** AKIS v2 reduced complexity - framework-design skill obsolete
3. **Universal Patterns:** 3 skills cover 76%+ of workflows with minimal overlap
4. **Terse Documentation:** Concise skills more likely to be read and applied

---

## Next Steps

- Monitor skill activation in future workflows
- Iterate based on usage patterns
- Consider merging/consolidating if overlap emerges

---

## Total Impact

**Before:** 7 skills  
**After:** 10 skills (+3)  
**Coverage:** 76%+ of all workflows with universal skills  
**Skill ecosystem:** Complete for current project patterns
