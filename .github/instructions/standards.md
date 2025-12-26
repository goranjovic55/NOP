---
applyTo: '**'
---

# Project Standards

Universal standards for code, knowledge, and documentation.

---

## Knowledge System

### Unified Knowledge Architecture
| File | Location | Contents |
|------|----------|----------|
| `project_knowledge.json` | Project root | Entities + Codegraph + Relations |
| `global_knowledge.json` | `.github/` | Universal patterns (portable) |

### Naming Convention
`[Scope].[Domain].[Cluster].[EntityType]_[Name]`

**Scopes**: Project, Global
**Domains**: Backend, Frontend, Architecture, Integration, DevOps
**Clusters**: API, UI, Database, Testing, CI
**EntityTypes**: Service, Component, Pattern, Workflow, Config

### Knowledge Format (JSONL)
```json
{"type":"entity","name":"Project.Backend.API.Service_Auth","entityType":"Service","observations":["JWT authentication service","FastAPI implementation","upd:2025-12-26,refs:2"]}
{"type":"codegraph","name":"AuthService","nodeType":"class","dependencies":["Security","Database"],"dependents":["UserRoutes"]}
{"type":"relation","from":"Project.Backend.API.Service_Auth","to":"Project.Backend.Core.Security","relationType":"USES"}
```

### Knowledge Types
| Type | Purpose | Fields |
|------|---------|--------|
| entity | Domain concepts | name, entityType, observations |
| codegraph | Code structure | name, nodeType, dependencies, dependents |
| relation | Connections | from, to, relationType |

### Observation Guidelines
- 80-120 characters per observation
- Include creation/update date: `upd:YYYY-MM-DD`
- Include reference count: `refs:N`
- Be specific, not vague

---

## Code Standards

### General
- **Files**: Under 500 lines
- **Functions**: Under 50 lines
- **Naming**: Descriptive, not abbreviated
- **Single responsibility**: One reason to change

### Style
- Follow existing project conventions
- Consistent formatting (use project linter)
- Meaningful comments for complex logic
- Type hints where applicable

### Error Handling
- Graceful degradation
- Meaningful error messages
- Appropriate logging levels
- No silent failures

### Documentation
- Docstrings for public functions
- Comments for complex logic
- README updates for new features
- Inline comments for non-obvious code

---

## Testing Standards

### Coverage
- Unit tests for business logic
- Integration tests for component interaction
- Edge case coverage

### Quality
- Independent tests (no order dependency)
- Clear assertions
- Meaningful test names
- Proper setup/teardown

### Pattern (AAA)
```python
def test_feature():
    # Arrange
    input_data = prepare()
    
    # Act
    result = function(input_data)
    
    # Assert
    assert result == expected
```

---

## File Structure

### Project Root
```
project/
├── .github/
│   ├── chatmodes/           # Agent definitions
│   ├── instructions/        # Standards & protocols
│   ├── workflows/           # Multi-agent workflows
│   └── global_knowledge.json # Universal patterns
├── project_knowledge.json   # Project-specific knowledge
├── src/                     # Source code
├── tests/                   # Test suites
└── docs/                    # Documentation
```

### Knowledge Files
| File | Scope | Portable |
|------|-------|----------|
| `project_knowledge.json` | Single project | No |
| `global_knowledge.json` | All projects | Yes |

---

## Agent Standards

### Orchestrator (DevTeam)
- Always load knowledge before planning
- Track all delegations
- Integrate specialist results
- Coordinate knowledge updates

### Specialists
- Focus on assigned domain
- Return structured results
- Report learnings
- Follow handoff contracts

### Communication
- Use standard session tags
- Structured JSON for context
- Clear status reporting
- No skipped handoffs

---

## Quality Gates

| Phase | Gate | Owner |
|-------|------|-------|
| Context | Knowledge loaded | Orchestrator |
| Design | Alternatives considered | Architect |
| Implementation | Tests pass | Developer |
| Review | Quality verified | Reviewer |
| Complete | User acceptance | Orchestrator |
