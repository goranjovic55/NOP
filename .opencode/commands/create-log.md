---
description: Create a workflow log for the current session
---

# Create Workflow Log

Create a workflow log in `log/workflow/` to document this session.

## Filename Format
`log/workflow/YYYY-MM-DD_HHMMSS_task.md`

## Template

```yaml
---
session:
  id: "[date]_[task-name]"
  complexity: medium  # simple|medium|complex

skills:
  loaded: [skill1, skill2]

files:
  modified:
    - {path: "path/to/file.ext", domain: backend}

agents:
  delegated:
    - {name: code, task: "Task description", result: success}

root_causes:  # REQUIRED for debugging sessions
  - problem: "Error description"
    solution: "Fix applied"
---

# Session: [Task Name]

## Summary
Brief description of what was accomplished.

## Tasks Completed
- ✓ Task 1
- ✓ Task 2
- ✓ Task 3

## Key Changes
- file1.py: Added feature X
- file2.tsx: Fixed bug Y

## Gotchas Discovered
| Issue | Solution |
|-------|----------|
| Problem found | How it was fixed |
```

## Required for Debugging Sessions

If this was a debugging session, `root_causes` section is REQUIRED:

```yaml
root_causes:
  - problem: "JSONB nested object not saving"
    solution: "Added flag_modified(obj, 'field') before commit"
```

## After Creating Log

Run the update scripts:
```bash
python .github/scripts/knowledge.py --update
```
