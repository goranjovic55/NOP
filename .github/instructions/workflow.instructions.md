---
applyTo: '**'
description: 'Workflow details: END phase, log format, fullstack coordination.'
---

# Workflow Details

> Core workflow in copilot-instructions.md. This file: END details + log format.

## END Phase (Detailed)

**Step 1:** Close ⊘ orphans, verify all edits

**Step 2:** Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`

**Step 3:** Run scripts:
```bash
python .github/scripts/knowledge.py --update
python .github/scripts/skills.py --suggest
python .github/scripts/docs.py --suggest
python .github/scripts/agents.py --suggest
python .github/scripts/instructions.py --suggest
```

**Step 4:** Present results table:
| Script | Output |
|--------|--------|
| knowledge.py | X entities |
| skills.py | X suggestions |
| docs.py | X suggestions |
| agents.py | X suggestions |
| instructions.py | X suggestions |

**Step 5:** ASK before applying suggestions

**Step 6:** ASK before `git push`

## Workflow Log Format

```yaml
---
session:
  id: "YYYY-MM-DD_task"
  complexity: medium  # simple|medium|complex

skills:
  loaded: [skill1, skill2]

files:
  modified:
    - {path: "file.tsx", domain: frontend}

agents:
  delegated:
    - {name: code, task: "Task", result: success}

root_causes:  # REQUIRED for debugging
  - problem: "Error description"
    solution: "Fix applied"
---

# Session: Task Name

## Summary
Brief description.

## Tasks
- ✓ Task 1
- ✓ Task 2
```

## Fullstack Coordination
1. Pre-load: frontend-react + backend-api
2. Order: API → Types → UI → Test
3. Check: trailing slashes, CORS, state sync
