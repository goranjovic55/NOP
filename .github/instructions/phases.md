```markdown
---
applyTo: '**'
---

# Phases

## Flow

```
CONTEXT → PLAN → COORDINATE → INTEGRATE → VERIFY → LEARN → COMPLETE
   1        2         3           4          5        6        7
```

**Emit**: `[PHASE: NAME | progress=H/V]` (H=phase 1-7, V=depth 0-3)

## Phase Actions

| # | Phase | Action | Emit |
|---|-------|--------|------|
| 1 | CONTEXT | Load knowledge + relevant skills | `[AKIS]` |
| 2 | PLAN | Design approach, select skills | - |
| 3 | COORDINATE | Delegate OR prepare tools | `[DELEGATE:]` |
| 4 | INTEGRATE | Execute work | - |
| 5 | VERIFY | Test, validate | `[→VERIFY]` + wait |
| 6 | LEARN | Update knowledge | `[AKIS_UPDATED]` |
| 7 | COMPLETE | Emit completion | `[COMPLETE]` |

## Blocking Gates

| Phase | Gate | Rule |
|-------|------|------|
| CONTEXT | `[AKIS]` | Cannot proceed until emitted |
| VERIFY | User confirmation | Must wait before LEARN |
| COMPLETE | Task finished | Required for all sessions |

## Skip Phases

| Task | Phases |
|------|--------|
| Quick fix | 1 → 4 → 5 → 7 |
| Q&A | 1 → 7 |
| Feature | All 7 |

## Progress Examples

- `progress=4/0` → Main task, phase 4
- `progress=1/1` → Nested interrupt, phase 1, depth 1
- `progress=3/2` → Double-nested, phase 3, depth 2
```
