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

## Task Classification
| Type | Lines Changed | Files | Criteria | Phase Path |
|------|--------------|-------|----------|-----------|
| Simple edit | <20 | 1 | No breaking changes | CONTEXT→COORDINATE→COMPLETE |
| Medium task | 20-50 | 2-3 | Within single component | CONTEXT→COORDINATE→VERIFY→COMPLETE |
| Complex task | >50 | >3 | Multiple components | Full 7-phase |
| Major change | Any | Any | Breaking/security/schema | Full 7-phase (mandatory) |

## Delegation Criteria
- Always delegate: Architecture decisions, code >20 lines, test validation, investigation
- Never delegate: <5 line edits, typos, knowledge updates, simple queries
- Use judgment: 10-20 lines (delegate if security-critical)

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
| Implementation | Developer | Tests pass, linters pass, builds succeed |
| Review | Reviewer | Quality verified |
| Complete | Orchestrator | User acceptance |

## Session Metrics
- Emissions per session: <20 optimal, 20-25 warning, >25 split required
- Nesting depth: ≤3 maximum (use STACK when >2)
- Phase transitions: 2-7 (typical 4-6)

## Error Recovery
| Error Type | Max Retries | Escalate After | Rollback |
|------------|-------------|----------------|----------|
| Lint error | 3 | 3 failures | No |
| Build failure | 2 | 2 failures | Yes |
| Test failure | 1 | 1 failure | Yes |
| Specialist blocked | 0 | Immediate | Partial |
| Knowledge corrupt | 0 | Immediate | Full |
