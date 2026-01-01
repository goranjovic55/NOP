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
| 1 | CONTEXT | Load knowledge + relevant skills | `[AKIS_LOADED]` |
| 2 | PLAN | Design approach, select skills | - |
| 3 | COORDINATE | Delegate OR prepare tools | `[SKILLS: ...]` |
| 4 | INTEGRATE | Execute work | - |
| 5 | VERIFY | Test, validate | `[→VERIFY]` + wait |
| 6 | LEARN | Update knowledge | `[AKIS_UPDATED]` |
| 7 | COMPLETE | Emit completion | `[SKILLS_USED]` |

## Skip Phases

| Task | Phases |
|------|--------|
| Quick fix | 1 → 4 → 5 → 7 |
| Q&A | 1 → 7 |
| Feature | All 7 |
