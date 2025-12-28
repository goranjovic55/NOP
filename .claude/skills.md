# Claude Skills

**Purpose**: Codified patterns preventing rediscovery | **Version**: 1.0.0  
**Usage**: Copy `.claude/` to any project, run `update_skills` workflow

---

## Skill Index (12 Core Skills)

| # | Skill | Category | Trigger |
|---|-------|----------|---------|
| 1 | [Code Standards](#1-code-standards) | Quality | Writing code |
| 2 | [Error Handling](#2-error-handling) | Quality | Exceptions, APIs |
| 3 | [Security](#3-security) | Critical | Auth, input, secrets |
| 4 | [Testing](#4-testing) | Quality | New code, changes |
| 5 | [Git & Deploy](#5-git--deploy) | Process | Commits, releases |
| 6 | [Knowledge](#6-knowledge) | Ecosystem | Session start/end |
| 7 | [Orchestration](#7-orchestration) | Ecosystem | Multi-step tasks |
| 8 | [Handover](#8-handover) | Ecosystem | Agent delegation |
| 9 | [Logging](#9-logging) | Process | Workflows, debug |
| 10 | [API Patterns](#10-api-patterns) | Backend | Endpoints |
| 11 | [UI Patterns](#11-ui-patterns) | Frontend | Components |
| 12 | [Infrastructure](#12-infrastructure) | DevOps | Docker, CI/CD |

---

## 1. Code Standards

**Trigger**: Writing/modifying code

```
Files: <500 lines | Functions: <50 lines | Names: descriptive
Types: required | Docs: public APIs | DRY: no duplication
```

**Language Detection**:
| File | Stack | Apply |
|------|-------|-------|
| `*.py` | Python | PEP8, type hints, docstrings |
| `*.ts` | TypeScript | strict mode, interfaces |
| `*.go` | Go | gofmt, error returns |

---

## 2. Error Handling

**Trigger**: Exceptions, API responses

```python
# Pattern: Custom exceptions + consistent API response
class AppError(Exception):
    def __init__(self, msg: str, code: str, status: int = 500):
        self.msg, self.code, self.status = msg, code, status

# API Response: {"error": "msg", "code": "CODE", "details": {}}
```

**Rules**:
- ✅ No unhandled exceptions
- ✅ Consistent error format
- ✅ Appropriate HTTP codes
- ✅ Errors logged with context

---

## 3. Security

**Trigger**: Auth, input, secrets, dependencies

```
AUTH:     Hash passwords (bcrypt) | JWT with expiry | Validate ownership
INPUT:    Validate all inputs | Use ORM (no raw SQL) | Sanitize output
SECRETS:  No hardcoded secrets | Use env vars | .env in .gitignore
DEPS:     Audit regularly | No known vulnerabilities
```

**Checklist**:
- [ ] Passwords hashed
- [ ] Tokens expire
- [ ] Inputs validated
- [ ] No secrets in code
- [ ] Dependencies audited

---

## 4. Testing

**Trigger**: New code, changes

```
PYRAMID:  Unit (many) → Integration (some) → E2E (few)
PATTERN:  Arrange → Act → Assert
COVERAGE: Unit 80%+ | Critical paths 100%
```

**When to Test**:
| Change | Test Required |
|--------|--------------|
| New feature | Unit + integration |
| Bug fix | Regression test |
| Refactor | Existing tests pass |

---

## 5. Git & Deploy

**Trigger**: Commits, releases

```
BRANCHES: feature/[ticket]-desc | bugfix/[ticket]-desc | hotfix/[ticket]-desc
COMMITS:  feat|fix|docs|refactor|test|chore: description
```

**Deploy Risk**:
| Factor | Risk |
|--------|------|
| DB migration | +3 |
| Auth changes | +3 |
| Breaking API | +3 |
| No tests | +2 |
| Has rollback | -2 |

Score: 0-3 🟢 | 4-6 🟡 | 7+ 🔴

---

## 6. Knowledge

**Trigger**: Session start/end, decisions, discoveries

**Files**:
```
project_knowledge.json     → Project entities, codegraph, relations
.github/global_knowledge.json → Universal patterns (cross-project)
```

**JSONL Format** (matches actual project_knowledge.json):
```json
{"type":"entity","name":"Project.Module.Component","entityType":"Service","observations":["description","upd:YYYY-MM-DD,refs:N"]}
{"type":"codegraph","name":"Component.tsx","nodeType":"component","dependencies":["Store","Service"],"dependents":["Layout"]}
{"type":"relation","from":"Component","to":"Feature","relationType":"IMPLEMENTS|USES|CONSUMES|DEPENDS_ON"}
```

**Protocol**:
| Event | Action |
|-------|--------|
| Session start | Load knowledge, query relevant entities |
| Decision made | Document rationale, alternatives |
| Bug fixed | Add pattern to knowledge |
| Session end | Update knowledge, create handover |

---

## 7. Orchestration

**Trigger**: Multi-step tasks, complex operations

**Phases** (syncs with _DevTeam):
```
CONTEXT → PLAN → COORDINATE → INTEGRATE → VERIFY → LEARN → COMPLETE
   1        2         3           4          5        6        7
```

**Emissions**:
```
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
[PHASE: PLAN | progress=2/7 | next=COORDINATE]
[TASK: <desc>]
├── [x] CONTEXT
├── [ ] DELEGATE→Agent  ← current
└── [ ] COMPLETE
```

**Task Types**:
| Type | Phases |
|------|--------|
| Quick fix | CONTEXT→COORDINATE→COMPLETE |
| Feature | Full 7-phase |
| Bug | CONTEXT→COORDINATE→INTEGRATE→VERIFY→COMPLETE |

---

## 8. Handover

**Trigger**: Agent delegation, session end

**Delegation** (syncs with agents):
```
[DELEGATE: agent=<Name> | task="<desc>"]
Context: {"task":"...", "context":{"problem":"...", "files":[]}, "expected":"..."}

[INTEGRATE: from=<Agent> | status=complete|partial|blocked | result="<summary>"]
```

**Session Handover**:
```markdown
## Handover - [Date]
**Task**: [current] | **Phase**: [N/7] | **Branch**: [name]
### Completed: [x] item
### Pending: [ ] item  
### Blockers: [if any]
### Key Files: path/file.ext - [change summary]
```

---

## 9. Logging

**Trigger**: Workflow execution, debugging

**Levels**: DEBUG → INFO → WARN → ERROR → CRITICAL

**Workflow Log**:
```
[WORKFLOW_LOG: task=<desc>]
Summary | Steps | Files | Quality Gates | Learnings
[/WORKFLOW_LOG]
```

**What to Log**:
- ✅ Requests (no PII)
- ✅ Auth events
- ✅ Errors + stack
- ✅ Business operations

**What NOT to Log**:
- ❌ Passwords, tokens
- ❌ API keys
- ❌ Personal data

---

## 10. API Patterns

**Trigger**: Creating/modifying endpoints

**Detected by**: `requirements.txt` (FastAPI/Django/Flask) | `package.json` (Express)

```python
# FastAPI Pattern
@router.get("/", response_model=list[ItemResponse])
async def list_items(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[ItemResponse]:
    """List items."""
    pass
```

**Rules**:
- ✅ Response models defined
- ✅ Async where applicable
- ✅ Auth on protected routes
- ✅ Input validation
- ✅ Docstrings

---

## 11. UI Patterns

**Trigger**: Creating/modifying components

**Detected by**: `package.json` (React/Vue/Svelte)

```tsx
// React Pattern
interface Props { item: Item; onSelect?: (item: Item) => void; }

export const ItemCard: React.FC<Props> = ({ item, onSelect }) => {
  const handleClick = useCallback(() => onSelect?.(item), [item, onSelect]);
  return <div onClick={handleClick}>{item.name}</div>;
};
```

**Rules**:
- ✅ TypeScript interfaces
- ✅ Memoization (useCallback, useMemo)
- ✅ Loading/error states
- ✅ Accessible

---

## 12. Infrastructure

**Trigger**: Docker, CI/CD, deployment

**Detected by**: `Dockerfile`, `docker-compose.yml`, `.github/workflows/`

```yaml
# Docker Compose Pattern
services:
  app:
    build: .
    depends_on:
      db: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

**Rules**:
- ✅ Multi-stage builds
- ✅ Health checks
- ✅ Non-root users
- ✅ Secrets from env

---

## Auto-Detection

**Core Skills (1-9)**: Always active
**Stack Skills (10-12)**: Enabled based on detected files

| Detection | Files | Skills Enabled |
|-----------|-------|----------------|
| Python | `*.py`, `requirements.txt` | 10 (API Patterns) |
| TypeScript/React | `*.ts`, `package.json` | 11 (UI Patterns) |
| Docker | `Dockerfile`, `docker-compose.yml` | 12 (Infrastructure) |
| CI/CD | `.github/workflows/` | 5, 12 |
| Knowledge | `project_knowledge.json` | 6,7,8 (always active, enhanced) |

**Note**: Skills 6,7,8 (Knowledge, Orchestration, Handover) are always active as core skills. When `project_knowledge.json` exists, they use the actual knowledge; otherwise, they operate in template mode.

---

## Integration

| Component | Location | Synergy |
|-----------|----------|---------|
| Agents | `.github/agents/` | Skills 7,8 follow agent protocols |
| Workflows | `.github/workflows/` | Skills 6,9 match workflow format |
| Knowledge | `project_knowledge.json` | Skill 6 maintains knowledge |
| Commands | `.claude/commands/` | Quick access to common operations |

---

## Maintenance

Run `update_skills` workflow to:
1. Detect project stack
2. Enable applicable skills
3. Update context
4. Sync with knowledge

**Template Version**: 1.0.0
