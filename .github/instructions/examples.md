---
applyTo: '**'
---

# Examples

## Feature Implementation

```
[SESSION: role=Lead | task="Add JWT auth" | phase=CONTEXT]
Loading knowledge... FastAPI detected.

[DELEGATE: agent=Architect | task="Design JWT auth"]
→ [RETURN: status=complete | result="JWT with refresh tokens"]

[DELEGATE: agent=Developer | task="Implement auth"]
→ [RETURN: status=complete | result="auth_service.py created"]

[DELEGATE: agent=Reviewer | task="Validate auth"]
→ [RETURN: status=complete | result="All tests pass"]

[KNOWLEDGE: added=3 | updated=0 | type=project]
[COMPLETE: task="Add JWT auth" | result="Auth implemented" | learnings=3]
```

## Bug Fix with Investigation

```
[SESSION: role=Lead | task="Fix token expiry" | phase=CONTEXT]

[DELEGATE: agent=Researcher | task="Investigate token expiry"]
→ [RETURN: status=complete | result="Token set to 5min, too short"]

[DELEGATE: agent=Developer | task="Fix expiry to 30min"]
→ [RETURN: status=complete | result="security.py updated"]

[DELEGATE: agent=Reviewer | task="Verify fix"]
→ [RETURN: status=complete | result="Tests pass"]

[COMPLETE: task="Fix token expiry" | result="Expiry set to 30min" | learnings=1]
```

## Direct Specialist Use

```
User: @Architect REST vs GraphQL?

[SESSION: role=Architect | task="REST vs GraphQL decision"]

Decision: REST
├── Pro: Simple, cacheable, team knows it
├── Con: Over-fetching
GraphQL rejected: Caching complexity, learning curve

[RETURN: to=User | status=complete | result="REST recommended"]
```

## Key Patterns
- Orchestrator: Load knowledge → Delegate → Integrate → Learn → Complete
- Specialists: Receive → Execute → Return structured result + learnings
