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
| 3 | COORDINATE | Delegate OR load skill files | - |
| 4 | INTEGRATE | Execute work within scope | `[ANCHOR]` |
| 5 | VERIFY | Test, validate, audit scope | `[SCOPE_AUDIT]` |
| 6 | LEARN | Update knowledge | - |
| 7 | COMPLETE | Emit completion | `[COMPLETE]` |

## Anti-Drift Gates

| Gate | When | Format |
|------|------|--------|
| `[SESSION]` | START | Required first emission |
| `[AKIS]` | CONTEXT | Load knowledge, emit stats |
| `[SCOPE]` | PLAN | `files=[...] \| max=N` |
| `[ANCHOR]` | INTEGRATE | `task="X" \| on_track=yes/no` |
| `[SCOPE_AUDIT]` | VERIFY | `planned=N \| actual=M` |
| `[COMPLETE]` | END | Required for all sessions |

**Drift detected?** → `[DRIFT: should_be="X"]` → Correct before proceed

## Session-Driven Workflow

**Every Response**:
1. Read `.akis-session.json` → Get `phase`, `progress`, `skills[]`, `decisions[]`
2. Emit headers: `[SESSION:]` `[AKIS:]` `[PHASE: NAME | N/7]`
3. Continue from current phase
4. Update session as you work: `phase`, `action`, `skill`, `decision`
5. Deviations → `decision "why"`
6. Phase progress automatic from session state

**Phase Completion**: On `complete` → Auto-resumes parent at paused phase

## Skip Phases

| Task | Phases |
|------|--------|
| Quick fix | 1 → 4 → 5 → 7 |
| Q&A | 1 → 7 |
| Feature | All 7 |

## Progress Format

`progress=H/V` → H=phase (1-7), V=depth (0=main, 1+=nested)
```
