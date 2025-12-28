---
applyTo: '**'
---

# Phases

Flexible - use what's needed, skip what's not.

## Overview
| Phase | Purpose |
|-------|---------|
| CONTEXT | Load knowledge, understand scope |
| PLAN | Break down complex tasks |
| DESIGN | Architecture decisions |
| IMPLEMENT | Write/modify code |
| DEBUG | Fix issues |
| TEST | Verify changes |
| LEARN | Update knowledge |
| COMPLETE | Summarize, handoff |

## Selection
| Task | Phases |
|------|--------|
| Quick fix | CONTEXT → IMPLEMENT → TEST |
| Bug fix | CONTEXT → DEBUG → TEST → LEARN |
| Feature | CONTEXT → PLAN → DESIGN → IMPLEMENT → TEST → LEARN |
| Refactor | CONTEXT → PLAN → DESIGN → IMPLEMENT → TEST → LEARN |
| Investigation | CONTEXT → PLAN → COMPLETE |

## Nesting
```
# Simple:
[NEST: parent=<main> | child=<sub>]
[RETURN: to=<main> | result=<findings>]

# Multi-level:
[STACK: push | task=<sub> | depth=N | parent=<main>]
[STACK: pop | task=<sub> | depth=N-1 | result=<findings>]
```
Use NEST for single-level, STACK for multi-level.

## Quality Checkpoints
| When | Check |
|------|-------|
| Before IMPLEMENT | Context verified |
| After DESIGN | Major changes approved |
| After TEST | 100% tests pass |
| After COMPLETE | User verification |
