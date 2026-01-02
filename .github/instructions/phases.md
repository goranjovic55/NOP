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

| # | Phase | Action | Gate |
|---|-------|--------|------|
| 1 | CONTEXT | Load knowledge + skills | `[AKIS]` |
| 2 | PLAN | Design approach, define scope | `[SCOPE]` |
| 3 | COORDINATE | Delegate OR load skill files | `[SKILL]` |
| 4 | INTEGRATE | Execute work within scope | `[ANCHOR]` |
| 5 | VERIFY | Test, validate, skill checklist | `[SCOPE_AUDIT]` |
| 6 | LEARN | Update knowledge | - |
| 7 | COMPLETE | Emit completion | `[COMPLETE]` |

## Anti-Drift Gates

| Gate | When | Format |
|------|------|--------|
| `[SCOPE]` | PLAN | `files=[...] \| max=N` |
| `[ANCHOR]` | INTEGRATE | `task="X" \| on_track=yes/no` |
| `[SCOPE_AUDIT]` | VERIFY | `planned=N \| actual=M` |

**Drift detected?** → `[DRIFT: current="X" \| should_be="Y"]` → Correct before proceed

## Skill Protocol

1. Load: `.github/skills/{name}/SKILL.md`
2. Emit: `[SKILL: {name} | loaded]`
3. At VERIFY: `[SKILL_VERIFY: {name} | passed=X/Y]`

## Skip Phases

| Task | Phases |
|------|--------|
| Quick fix | 1 → 4 → 5 → 7 |
| Q&A | 1 → 7 |
| Feature | All 7 |

## Progress Format

`progress=H/V` → H=phase (1-7), V=depth (0=main, 1+=nested)
```
