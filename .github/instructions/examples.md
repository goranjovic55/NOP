---
applyTo: '**'
---

# Multi-Agent Workflow Examples

Practical examples of orchestrator-specialist collaboration.

---

## Example 1: Feature Implementation

### User Request
"Add user authentication with JWT"

### DevTeam (Orchestrator) Flow

```
[SESSION: role=Lead | task="Add JWT authentication" | phase=CONTEXT]

Loading project knowledge... Python/FastAPI project detected.
Existing patterns: ServiceLayer, Repository

[TASK: Add JWT authentication]
├── [x] CONTEXT: Loaded project state
├── [ ] DELEGATE→Architect: Design auth system
├── [ ] DELEGATE→Developer: Implement auth
├── [ ] DELEGATE→Reviewer: Validate
└── [ ] COMPLETE: Summarize
```

### Delegate to Architect
```
[DELEGATE: agent=Architect | task="Design JWT auth system"]
Context: {
  problem: "Need user authentication",
  constraints: ["stateless", "refresh tokens", "existing FastAPI patterns"],
  existing_patterns: "ServiceLayer",
  expected_output: "Design decision with implementation guidance"
}
```

### Architect Returns
```
[RETURN: to=DevTeam | status=complete | result="JWT with refresh tokens"]
Decision: {
  chosen_approach: "JWT access + refresh token pattern",
  rationale: "Stateless, scalable, industry standard",
  files_affected: ["auth_service.py", "security.py", "user_routes.py"]
}
Learnings: ["Refresh token rotation pattern"]
Codegraph_updates: ["AuthService", "TokenValidator"]
```

### Integrate and Continue
```
[INTEGRATE: from=Architect | result="JWT with refresh tokens"]
Merged: Design decision, file list, implementation notes

[DELEGATE: agent=Developer | task="Implement JWT auth"]
Context: {
  design: "JWT access + refresh token pattern",
  files_to_modify: ["auth_service.py", "security.py", "user_routes.py"],
  conventions: "FastAPI patterns, ServiceLayer"
}
```

### Developer Returns
```
[RETURN: to=DevTeam | status=complete | result="Auth implemented"]
Artifacts: ["auth_service.py", "security.py", "user_routes.py"]
Learnings: ["JWT rotation implementation"]
Codegraph_updates: ["AuthService→Security", "UserRoutes→AuthService"]
```

### Delegate to Reviewer
```
[DELEGATE: agent=Reviewer | task="Validate auth implementation"]
Context: {
  feature: "JWT authentication",
  files: ["auth_service.py", "security.py", "user_routes.py"],
  requirements: ["token expiry", "refresh flow", "logout"]
}
```

### Complete
```
[INTEGRATE: from=Reviewer | result="All tests pass"]
[KNOWLEDGE: added=3 | updated=1 | type=project]
[COMPLETE: task="Add JWT authentication" | result="Auth system implemented" | learnings=3]
```

---

## Example 2: Bug Fix with Investigation

### User Request
"Auth tokens expire too quickly"

### DevTeam Flow
```
[SESSION: role=Lead | task="Fix token expiry issue" | phase=CONTEXT]

[DELEGATE: agent=Researcher | task="Investigate token expiry"]
Context: {
  question: "Why do tokens expire too quickly?",
  scope: "auth_service.py, security.py, config",
  known: "Users reporting frequent logouts"
}
```

### Researcher Returns
```
[RETURN: to=DevTeam | status=complete | result="Root cause found"]
Findings: {
  root_cause: "Token expiry set to 5 minutes, refresh not implemented",
  evidence: "security.py:L45 - ACCESS_TOKEN_EXPIRE_MINUTES = 5",
  recommendation: "Increase to 30min, implement refresh token"
}
Codegraph_updates: ["Security.token_config"]
```

### Integrate and Delegate Fix
```
[INTEGRATE: from=Researcher | result="Token expiry too short"]

[DELEGATE: agent=Developer | task="Fix token expiry"]
Context: {
  root_cause: "5 minute expiry",
  fix: "Set to 30 minutes, add refresh token rotation",
  file: "security.py:L45"
}
```

### Developer Returns and Complete
```
[RETURN: to=DevTeam | status=complete | result="Expiry fixed"]
Artifacts: ["security.py"]

[DELEGATE: agent=Reviewer | task="Verify token fix"]
...

[COMPLETE: task="Fix token expiry" | result="Token expiry increased to 30min" | learnings=1]
```

---

## Example 3: Codebase Analysis

### User Request
"Help me understand the authentication flow"

### DevTeam Flow
```
[SESSION: role=Lead | task="Explain auth flow" | phase=CONTEXT]

[DELEGATE: agent=Researcher | task="Map auth flow"]
Context: {
  question: "Complete authentication flow",
  scope: "All auth-related files",
  output: "Sequence diagram + explanation"
}
```

### Researcher Returns
```
[RETURN: to=DevTeam | status=complete | result="Auth flow mapped"]
Findings: {
  flow: "Login→Token→Refresh→Access",
  components: ["LoginRoute", "AuthService", "TokenValidator"],
  diagram: "sequence diagram in markdown"
}
Codegraph_updates: ["Auth flow documented"]
```

### Complete (No Further Delegation)
```
[INTEGRATE: from=Researcher | result="Auth flow mapped"]
[COMPLETE: task="Explain auth flow" | result="Flow documented" | learnings=0]

Presenting to user:
- Flow explanation
- Sequence diagram
- Key components
```

---

## Example 4: Code Refactoring

### User Request
"Refactor the auth service, it's getting messy"

### DevTeam Flow
```
[SESSION: role=Lead | task="Refactor auth service" | phase=CONTEXT]

Loading project knowledge...
File: auth_service.py (450 lines, multiple responsibilities)

[DELEGATE: agent=Architect | task="Design refactoring strategy"]
Context: {
  problem: "auth_service.py too large, multiple responsibilities",
  constraints: ["maintain API compatibility", "incremental changes"],
  current_structure: "monolithic service"
}
```

### Architect Returns
```
[RETURN: to=DevTeam | status=complete | result="Refactoring plan"]
Design: {
  approach: "Extract by responsibility",
  new_files: ["token_service.py", "user_auth_service.py", "password_service.py"],
  shared: "Keep common interface"
}
Learnings: ["Service extraction pattern"]
```

### Delegate Implementation
```
[DELEGATE: agent=Developer | task="Extract token_service.py"]
...
[DELEGATE: agent=Developer | task="Extract user_auth_service.py"]
...
[DELEGATE: agent=Developer | task="Extract password_service.py"]
...
```

### Validate and Complete
```
[DELEGATE: agent=Reviewer | task="Validate refactoring"]
Context: {
  changes: ["token_service.py", "user_auth_service.py", "password_service.py"],
  requirements: ["no API changes", "all tests pass"]
}

[KNOWLEDGE: added=4 | updated=2 | type=project]
[COMPLETE: task="Refactor auth service" | result="Service split into 3 modules" | learnings=4]
```

---

## Example 5: Direct Specialist Use

### User Invokes Architect Directly
```
User: @Architect I need to decide between REST and GraphQL for the new API

[SESSION: role=Architect | task="REST vs GraphQL decision"]

Analyzing trade-offs...

Decision Framework:
├── REST:
│   ├── Pro: Simple, cacheable, well-understood
│   ├── Pro: Works with existing infrastructure
│   └── Con: Over-fetching, multiple endpoints
├── GraphQL:
│   ├── Pro: Flexible queries, single endpoint
│   ├── Pro: Strongly typed
│   └── Con: Caching complexity, learning curve

Recommendation: REST for this project
Rationale: Team familiarity, simpler infrastructure, caching needs

Learnings for knowledge:
- Pattern.Architecture.REST_vs_GraphQL trade-off analysis

[RETURN: to=User | status=complete | result="REST recommended"]
```

---

## Key Patterns

### Orchestrator Always
1. Loads knowledge first
2. Identifies which specialists needed
3. Provides structured context to specialists
4. Integrates results back
5. Updates knowledge at end

### Specialists Always
1. Focus on assigned task only
2. Return structured results
3. Report learnings
4. Suggest codegraph updates
5. Flag blockers immediately
