# Update Workflows - Quick Reference

This document clarifies the three distinct update workflows and their responsibilities to prevent confusion.

## The 3 Update Workflows

### 1. update_knowledge.md
**What**: Knowledge graph optimization
**Files**: 
- `project_knowledge.json` (project-specific entities, relations, codegraph)
- `.github/global_knowledge.json` (universal patterns)

**Does**:
- ✅ Add/update entities and relations
- ✅ Extract patterns from workflow logs
- ✅ Update codegraph nodes
- ✅ Distill universal patterns to global knowledge

**Does NOT**:
- ❌ Update skills files (.claude/)
- ❌ Update documentation (docs/)
- ❌ Create "memory" files (deprecated system)

---

### 2. update_skills.md
**What**: Skills framework synchronization
**Files**:
- `.claude/skills.md` (13 core skills)
- `.claude/skills/domain.md` (project-specific patterns)
- `.claude/context.md` (project state)
- `.claude/settings.json`, `.claude/commands/`

**Does**:
- ✅ Detect project stack (Python, TypeScript, Docker, etc.)
- ✅ Add domain-specific skill patterns
- ✅ Update project context and commands
- ✅ Sync settings and configurations

**Does NOT**:
- ❌ Update knowledge files (project_knowledge.json, global_knowledge.json)
- ❌ Update documentation (docs/)

---

### 3. update_documents.md
**What**: Documentation optimization
**Files**:
- `docs/` (all documentation markdown files)
- `docs/INDEX.md` (navigation index)
- `README.md` (documentation section)

**Does**:
- ✅ Create/update documentation index
- ✅ Consolidate documentation (target: 10-15 files)
- ✅ Extract technical notes from workflow logs
- ✅ Organize docs by category

**Does NOT**:
- ❌ Update knowledge files
- ❌ Update skills files
- ❌ Modify code or comments

---

## Common Confusion: Knowledge vs. Memory

**DEPRECATED (DO NOT USE)**:
- ❌ `global_memory.json` - Old system, removed
- ❌ `project_memory.json` - Old system, removed
- ❌ `scripts/update_memory.py` - Old script, removed
- ❌ `.openhands/microagents/memory_manager.md` - Old microagent, removed

**CURRENT (USE THESE)**:
- ✅ `project_knowledge.json` - Project entities/relations/codegraph
- ✅ `.github/global_knowledge.json` - Universal patterns

The "memory" system was replaced by the knowledge graph system. Only knowledge files should be referenced or updated.

---

## Workflow Execution Order

For a complete system update, execute in this order:

1. **update_knowledge** - Update knowledge graph first
2. **update_skills** - Sync skills and context
3. **update_documents** - Update documentation last

This order ensures:
- Knowledge is captured before skills reference it
- Skills are defined before documentation references them
- Documentation reflects the current state of knowledge and skills

---

## File Responsibilities Matrix

| File/Directory | update_knowledge | update_skills | update_documents |
|----------------|------------------|---------------|------------------|
| `project_knowledge.json` | ✅ PRIMARY | ❌ No | ❌ No |
| `.github/global_knowledge.json` | ✅ PRIMARY | ❌ No | ❌ No |
| `.claude/skills.md` | ❌ No | ✅ PRIMARY | ❌ No |
| `.claude/skills/domain.md` | ❌ No | ✅ PRIMARY | ❌ No |
| `.claude/context.md` | ❌ No | ✅ PRIMARY | ❌ No |
| `docs/*.md` | ❌ No | ❌ No | ✅ PRIMARY |
| `docs/INDEX.md` | ❌ No | ❌ No | ✅ PRIMARY |
| `README.md` (docs section) | ❌ No | ❌ No | ✅ PRIMARY |
| `log/workflow/*.md` | 📖 READ | 📖 READ | 📖 READ |

Legend:
- ✅ PRIMARY - This workflow modifies these files
- ❌ No - This workflow does not touch these files
- 📖 READ - This workflow reads but does not modify

---

## Checklist for Running update_knowledge

When executing `update_knowledge`, verify:

- [ ] Extract learnings from `log/workflow/*.md`
- [ ] Scan codebase for new entities
- [ ] Update `project_knowledge.json` with new entities/relations
- [ ] Update `.github/global_knowledge.json` with universal patterns
- [ ] Validate JSONL format (one object per line)
- [ ] Check size constraints (<100KB total)
- [ ] Verify Entity:Cluster ratio (≥6:1)
- [ ] **DO NOT** create or reference memory files
- [ ] **DO NOT** modify skills files
- [ ] **DO NOT** modify documentation files

---

## Quick Validation Commands

```bash
# Verify knowledge files exist (not memory files)
ls -lh project_knowledge.json .github/global_knowledge.json

# Verify no memory files exist
! ls global_memory.json project_memory.json 2>/dev/null || echo "ERROR: Memory files should not exist"

# Count entities in project knowledge
grep '"type":"entity"' project_knowledge.json | wc -l

# Count patterns in global knowledge
grep '"type":"entity"' .github/global_knowledge.json | wc -l

# Check total knowledge size
du -h project_knowledge.json .github/global_knowledge.json | tail -1

# Validate JSONL format
jq empty project_knowledge.json && echo "✅ Valid JSONL" || echo "❌ Invalid JSONL"
```

---

## Future-Proofing

To prevent confusion in future workflow executions:

1. **Always read this file first** before executing any update workflow
2. **Follow the checklist** specific to each workflow
3. **Verify file targets** match the workflow scope
4. **Do not mix workflows** - execute them separately and in order
5. **Reference deprecated list** to avoid using old systems

---

**Last Updated**: 2025-12-29
**Maintained by**: Agent framework
**Version**: 1.0
