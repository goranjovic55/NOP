---
description: Run AKIS update scripts to sync knowledge, skills, and agents
---

# Run AKIS Update Scripts

Execute the AKIS framework update scripts at the end of a session:

## Step 1: Run All Updates

```bash
python .github/scripts/knowledge.py --update && \
python .github/scripts/skills.py --update && \
python .github/scripts/agents.py --update && \
python .github/scripts/instructions.py --update
```

## Step 2: Review Changes

Each script will report:
- Number of entities/skills/agents updated
- Changes made to index files
- Backups created in `.backups/` directories

## What Each Script Does

| Script | Updates | Backup Location |
|--------|---------|-----------------|
| knowledge.py | project_knowledge.json | .github/.backups/ |
| skills.py | skills/INDEX.md | .github/skills/.backups/ |
| agents.py | agents/*.md | .github/agents/.backups/ |
| instructions.py | instructions/*.md | .github/instructions/.backups/ |

## Rollback If Needed

```bash
# Example: Rollback skills index
cp .github/skills/.backups/INDEX_YYYYMMDD_*.md .github/skills/INDEX.md
```

## Dry Run Mode

Preview changes without applying:

```bash
python .github/scripts/knowledge.py --update --dry-run
```
