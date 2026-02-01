---
description: End a session with proper cleanup and documentation
---

# AKIS Session End

## Pre-END Checklist
- [ ] All ◆ marked ✓ or ⊘
- [ ] Syntax verified on all edits
- [ ] Build passes (if applicable)

## Step 1: Create Workflow Log
Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md` with:
- Session summary
- Skills used
- Files modified
- Root causes (for debugging)

## Step 2: Run Update Scripts
```bash
python .github/scripts/knowledge.py --update
python .github/scripts/skills.py --update
python .github/scripts/agents.py --update
python .github/scripts/instructions.py --update
```

## Step 3: Present Results
| Script | Output | Changes |
|--------|--------|---------|
| knowledge.py | X entities | project_knowledge.json |
| skills.py | X skills | INDEX.md |
| agents.py | X agents | agents/*.md |

## Step 4: Ask Before Push
ALWAYS ask user confirmation before `git push`.
