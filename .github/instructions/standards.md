---
applyTo: '**'
---

# Standards

## Knowledge System
| File | Location | Contents |
|------|----------|----------|
| project_knowledge.json | Root | Entities + Codegraph + Relations |
| global_knowledge.json | .github/ | Universal patterns (portable) |

### Format (JSONL)
```json
{"type":"entity","name":"Project.Domain.Cluster.Name","entityType":"Type","observations":["desc","upd:YYYY-MM-DD,refs:N"]}
{"type":"codegraph","name":"Component","nodeType":"module|class|function","dependencies":[],"dependents":[]}
{"type":"relation","from":"Entity.A","to":"Entity.B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
```

### Naming: `[Scope].[Domain].[Cluster].[Type]_[Name]`

## Code Standards
- Files <500 lines, functions <50 lines
- Type hints, docstrings for public functions
- Meaningful names, explicit error handling
- Follow project conventions

## Testing (AAA Pattern)
```python
def test_feature():
    # Arrange
    data = prepare()
    # Act
    result = function(data)
    # Assert
    assert result == expected
```

## File Structure
```
project/
├── src/           # Source code
├── tests/         # Tests (unit/, integration/)
├── docs/          # Documentation
├── .github/       # Agent framework
│   ├── agents/    # Agent definitions
│   ├── instructions/
│   └── global_knowledge.json
└── project_knowledge.json
```

## Quality Gates
| Phase | Owner | Check |
|-------|-------|-------|
| Context | Orchestrator | Knowledge loaded |
| Design | Architect | Alternatives considered |
| Implementation | Developer | Tests pass |
| Review | Reviewer | Quality verified |
| Complete | Orchestrator | User acceptance |
