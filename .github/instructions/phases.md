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

| # | Phase | Action | Update Session |
|---|-------|--------|----------------|
| 1 | CONTEXT | Load knowledge + relevant skills | `[AKIS]` entities, skills |
| 2 | PLAN | Design approach, select skills | decisions[] if deviate |
| 3 | COORDINATE | Delegate OR prepare tools | `skill NAME` if used |
| 4 | INTEGRATE | Execute work | action FILE_CHANGE |
| 5 | VERIFY | Test, validate | action VALIDATION |
| 6 | LEARN | Update knowledge | action KNOWLEDGE_UPDATE |
| 7 | COMPLETE | Emit completion | `complete "summary"` |

## Blocking Gates

| Phase | Gate | Rule |
|-------|------|------|
| START | `[SESSION:]` | FIRST emission in every response |
| CONTEXT | `[AKIS]` | Load knowledge, emit stats |
| COMPLETE | `[COMPLETE]` | Required for all sessions |

## Session-Driven Workflow

**Every Response**:
1. Read `.akis-session.json` → Get `phase`, `progress`, `skills[]`, `decisions[]`
2. Emit headers: `[SESSION:]` `[AKIS:]` `[PHASE: NAME | N/7]`
3. Continue from current phase
4. Update session as you work: `phase`, `action`, `skill`, `decision`
5. Deviations → `decision "why"`
6. Phase progress automatic from session state

**Phase Completion**: On `complete` → Auto-resumes `parentSessionId` at paused phase

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
