---
applyTo: '**'
---

# Examples

## Feature Implementation

```
[SESSION: role=Lead | task="Add JWT auth" | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]
Loading knowledge... FastAPI detected.

[PHASE: PLAN | progress=2/7]
[DELEGATE: agent=Architect | task="Design JWT auth"]
→ [INTEGRATE: from=Architect | status=complete | result="JWT with refresh tokens"]

[PHASE: COORDINATE | progress=3/7]
[DELEGATE: agent=Developer | task="Implement auth based on design"]
→ [INTEGRATE: from=Developer | status=complete | result="auth_service.py created"]

[PHASE: VERIFY | progress=5/7]
[DELEGATE: agent=Reviewer | task="Validate auth implementation"]
→ [INTEGRATE: from=Reviewer | status=complete | result="All tests pass"]

[PHASE: LEARN | progress=6/7]
[KNOWLEDGE: added=3 | updated=0 | type=project]

[PHASE: COMPLETE | progress=7/7]
[COMPLETE: task="Add JWT auth" | result="Auth implemented and tested" | learnings=3]
```

## Bug Fix with Investigation

```
[SESSION: role=Lead | task="Fix token expiry" | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]

[PHASE: COORDINATE | progress=3/7]
[DELEGATE: agent=Researcher | task="Investigate token expiry issue"]
→ [INTEGRATE: from=Researcher | status=complete | result="Token set to 5min, too short"]

[DELEGATE: agent=Developer | task="Fix expiry to 30min"]
→ [INTEGRATE: from=Developer | status=complete | result="security.py updated"]

[PHASE: VERIFY | progress=5/7]
[DELEGATE: agent=Reviewer | task="Verify fix works"]
→ [INTEGRATE: from=Reviewer | status=complete | result="Tests pass"]

[PHASE: COMPLETE | progress=7/7]
[COMPLETE: task="Fix token expiry" | result="Expiry set to 30min" | learnings=1]
```

## Direct Specialist Use

```
User: @Architect Should we use REST or GraphQL?

[SESSION: role=Architect | task="REST vs GraphQL decision" | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]
Loading project context...

[PHASE: COORDINATE | progress=3/7]
Exploring options...

[PHASE: PLAN | progress=2/7]
Decision: REST
├── Pro: Simple, cacheable, team knows it
├── Con: Over-fetching
GraphQL rejected: Caching complexity, learning curve

[PHASE: INTEGRATE | progress=4/7]
Documenting decision rationale...

[PHASE: COMPLETE | progress=7/7]
[INTEGRATE: to=User | status=complete | result="REST recommended"]
```

## Key Patterns
- **Orchestrator**: CONTEXT (load knowledge) → PLAN/COORDINATE (delegate) → INTEGRATE (combine) → VERIFY → LEARN → COMPLETE
- **Specialists**: CONTEXT (receive) → COORDINATE/PLAN (execute) → INTEGRATE/VERIFY → COMPLETE (return)
- **All agents**: Use standard [PHASE:] markers for consistency
