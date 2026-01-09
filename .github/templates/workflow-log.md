````markdown
# {TASK_NAME} | {YYYY-MM-DD} | ~{N}min | {complexity}

## Metrics
| Tasks | Files | Skills | Delegations | Scripts |
|-------|-------|--------|-------------|---------|
| {done}/{total} | {N} modified | {N} loaded | {N} agents | knowledge✓ skills✓ docs✓ |

## Worktree
```
<MAIN> ✓ {Original request}
├─ <WORK> ✓ {Task 1}
├─ <DELEGATE> ✓ → {agent-name}: {task description}
├─ <WORK> ✓ {Task 2}
└─ <END> ✓ Review and commit
```

## Summary
{Brief description of what was accomplished - 2-3 sentences max}

## Changes
| File | Change |
|------|--------|
| `path/file.ext` | Created/Modified - brief description |

## Script Output
```
knowledge.py: {N} entities updated
skills.py: {N} existing, {N} candidates ({list})
instructions.py: {N} patterns, {N} gaps
cleanup.py: {N} items cleaned
docs.py: {N} updates needed
```

## Skills Used
- `{skill1}` → file1.py, file2.py
- `{skill2}` → Dockerfile

## Delegations
{Omit if none}
| Agent | Task | Result |
|-------|------|--------|
| `{agent-name}` | {delegated task} | {outcome} |

## Skill Suggestions
{From skills.py --suggest or "None"}

## Problems & Solutions
{Omit if none}
| Problem | Cause | Solution |
|---------|-------|----------|
| {what} | {why} | {fix} |

## Verification
{Commands/tests run to verify}

````
