# Agent Framework v2.0 - Streamlined Protocol

**Philosophy**: Emit at boundaries, work freely in between  
**Overhead**: 15% (quick tasks) vs 40% (previous)  
**Based on**: Analysis of 21 sessions, 1455 lines reduced to ~350

---

## Quick Reference

### Session Boundaries

```
[SESSION: task_description] @mode
... work freely ...
[COMPLETE] outcome | changed: files
```

### User Interrupts

```
[PAUSE: current_task]
... handle interrupt ...
[RESUME: original_task]
```

### Optional (When Helpful)

```
[DECISION: question] → answer
[ATTEMPT #N] action → ✓/✗
[→VERIFY] testing phase
```

---

## Modes

| Mode | When | Focus |
|------|------|-------|
| @_DevTeam | Multi-step coordination | Delegate, integrate |
| @Architect | Design decisions | Evaluate options, document choices |
| @Developer | Implementation | Write code, run tests |
| @Reviewer | Quality validation | Test, verify standards |
| @Researcher | Investigation | Explore, analyze, document |

---

## Delegation

**Use #runSubagent** when:
- Task complexity > delegation overhead
- Specialist expertise needed
- Can work in parallel

**Don't delegate**:
- Quick fixes (<10 min)
- Simple edits
- Single-file changes

---

## Workflow Logs

**When**: Significant work (>15 min)  
**Where**: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`  
**Target**: 30-50 lines  

**Contents**:
- Task summary
- Key decisions made
- Files changed
- Learnings (if any)

---

## Knowledge System

**Files**:
- `project_knowledge.json` - Project entities/patterns
- `.github/global_knowledge.json` - Universal patterns
- `.claude/skills.md` - Skill checklist

**Update when**:
- Architectural patterns discovered
- Significant code structure changes
- Cross-cutting concerns identified

**Don't update for**:
- Simple bug fixes
- One-off changes

---

## Drift Detection (Auto)

Framework auto-detects:
- Missing [SESSION:] before work
- Work completed without [COMPLETE]
- Stuck in loops (3+ failed attempts)
- Mode violations (wrong role doing work)
- Skipped verification

---

## Performance Targets

| Task Size | Overhead | Emissions |
|-----------|----------|-----------|
| Quick (<10 min) | <15% | 2-3 |
| Medium (30 min) | <10% | 4-6 |
| Complex (2+ hrs) | <7% | 8-12 |

---

## Files Structure

```
.github/
├── copilot-instructions.md (core protocol)
├── agents/
│   ├── _DevTeam.agent.md
│   ├── Architect.agent.md
│   ├── Developer.agent.md
│   ├── Reviewer.agent.md
│   └── Researcher.agent.md
└── global_knowledge.json

.claude/
├── skills.md (checklist)
└── README.md

project_knowledge.json
log/workflow/
```

**Total**: ~870 lines (vs 1,455 previous) = 40% reduction

---

## Migration from v1.0

**Removed**:
- ❌ `[SKILLS: loaded=N | available: ...]` at start
- ❌ `[KNOWLEDGE: loaded | entities=N]` at start
- ❌ `[PHASE: X | progress=N/7]` tracking
- ❌ Mandatory delegation rules
- ❌ Verbose session tracking checklists

**Kept**:
- ✅ `[SESSION: task] @mode` (simplified)
- ✅ `[DECISION: ?] → answer` (optional, helpful)
- ✅ `[ATTEMPT #N] → ✓/✗` (optional, helpful)
- ✅ `[COMPLETE] outcome | changed: files`
- ✅ Workflow logs
- ✅ Knowledge system

**Added**:
- ✅ Auto drift detection
- ✅ Boundary-only emissions
- ✅ Freedom to work between boundaries

---

## Success Metrics

**v1.0 (measured)**:
- Compliance: 52% (SESSION)
- Overhead: 40% (quick tasks)
- Drift caught by emissions: 12.5%
- Drift caught by user: 50%

**v2.0 (targets)**:
- Compliance: 85%+
- Overhead: 15% (quick tasks)
- Drift caught by auto-detection: 60%+
- Drift caught by user: <20%

---

## Examples

### Quick Fix
```
[SESSION: Fix password hashing bug] @_DevTeam
[DECISION: Fix vs redesign?] → Fix (scope creep risk)
[ATTEMPT #1] Update hash to bcrypt → ✓
[ATTEMPT #2] Run tests → ✓ all pass
[COMPLETE] Bug fixed | changed: auth.py, test_auth.py
```

### Feature with Delegation
```
[SESSION: Implement JWT authentication] @_DevTeam

#runSubagent Architect
Task: Design JWT auth approach
[COMPLETE] Design done | artifacts: docs/auth_design.md

#runSubagent Developer  
Task: Implement JWT auth per design
[COMPLETE] Implemented | changed: jwt_service.py, auth.py

#runSubagent Reviewer
Task: Validate auth implementation
[COMPLETE] Approved | tests: 15/15 pass

[COMPLETE] Auth feature complete | changed: 3 files, 1 doc
```

### User Interrupt
```
[SESSION: Refactor database models] @Developer
[ATTEMPT #1] Extract base model → ✓
[PAUSE: refactor] User needs urgent bugfix

[SESSION: Fix login redirect] @Developer  
[ATTEMPT #1] Fix redirect URL → ✓
[COMPLETE] Hotfix deployed | changed: login.py

[RESUME: refactor] Continuing model refactor
[ATTEMPT #2] Update child models → ✓
[COMPLETE] Refactor done | changed: models.py
```

---

## For More Details

See analysis documents:
- [ECOSYSTEM_MEASUREMENTS.md](docs/analysis/ECOSYSTEM_MEASUREMENTS.md) - Full data
- [EMISSION_STRATEGY.md](docs/analysis/EMISSION_STRATEGY.md) - Drift detection approach  
- [STREAMLINED_PROTOCOL_V2.md](docs/analysis/STREAMLINED_PROTOCOL_V2.md) - Complete spec
