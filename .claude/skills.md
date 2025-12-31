# Claude Skills

**Purpose**: Quick reference patterns | **Version**: 2.0.0  
**Usage**: Query at [SESSION] for relevant checklists

---

## 1. Error Handling
**Trigger**: Exceptions, APIs  
**Pattern**: Custom exceptions + JSON responses

- [ ] No unhandled exceptions
- [ ] Consistent format {"error","code","details"}
- [ ] HTTP codes (400/401/403/404/500)
- [ ] Log with context (user, action, payload)

## 2. Security
**Trigger**: Auth, input, secrets  
**Pattern**: Defense in depth

- [ ] Passwords hashed (bcrypt/argon2)
- [ ] Tokens expire (JWT with TTL)
- [ ] All inputs validated (type, range, format)
- [ ] No secrets in code (env vars only)
- [ ] Dependencies audited (no CVEs)

## 3. Testing
**Trigger**: New code, changes  
**Pattern**: Arrange-Act-Assert

- [ ] Unit tests for logic (80%+ coverage)
- [ ] Integration tests for APIs
- [ ] E2E for critical user flows
- [ ] Regression test for bug fixes

## 4. Backend Patterns
**Trigger**: Endpoints, services  
**Pattern**: Layered architecture

- [ ] Endpoint → Service → Model separation
- [ ] Request validation (Pydantic schemas)
- [ ] Error handling (custom exceptions)
- [ ] Async where I/O-bound (database, external APIs)

## 5. Frontend Patterns
**Trigger**: Components, state  
**Pattern**: Component composition

- [ ] Small components (<200 lines)
- [ ] Props typed (TypeScript interfaces)
- [ ] State in stores (Zustand/Redux)
- [ ] Effects cleanup (useEffect return)

## 6. Git & Deploy
**Trigger**: Commits, releases  
**Pattern**: Conventional commits

- [ ] Branch: feature/bugfix/hotfix-[desc]
- [ ] Commit: feat|fix|docs|refactor|test|chore: message
- [ ] PR: title matches commit convention
- [ ] Deployment risk assessed (migrations +3, auth +3, breaking +3)

## 7. Infrastructure
**Trigger**: Docker, CI/CD  
**Pattern**: Container orchestration

- [ ] Multi-stage Dockerfile (build → runtime)
- [ ] Health checks defined
- [ ] Secrets via env vars (not baked in)
- [ ] Resource limits set (memory, CPU)

## 8. Context Switching
**Trigger**: User interrupt  
**Pattern**: [PAUSE] → [RESUME]

- [ ] Emit [PAUSE: task=<current> | phase=<phase>]
- [ ] Handle interruption
- [ ] Emit [RESUME: task=<original> | phase=<phase>]
- [ ] Continue from saved state

## 9. UI Component Patterns
**Trigger**: Theme consistency  
**Pattern**: Styled components

- [ ] Cyberpunk theme colors (cyan/purple gradients)
- [ ] Consistent spacing (Tailwind scale)
- [ ] Animated transitions (glowing borders)
- [ ] Accessibility (ARIA labels, keyboard nav)

---

**Domain Skills**: See `.claude/skills/domain.md` for NOP-specific patterns

**New Pattern?** Suggest:
```
[SKILL_SUGGESTION: name=<Name> | category=<Quality|Process|Backend|Frontend|DevOps>]
Trigger: <when> | Pattern: <approach> | Rules: [3-5 checklist items]
```
