# Universal Agent Framework

> **Format**: GitHub Official Custom Agents | **Docs**: https://gh.io/customagents/config

## Hierarchy
```
_DevTeam (Orchestrator)
├── Architect  → Design, patterns
├── Developer  → Code, debug
├── Reviewer   → Test, validate
└── Researcher → Investigate, document
```

## Session Start
```
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
```
Load: `project_knowledge.json` → `.github/global_knowledge.json` → detect type

## Phase Flow
```
[PHASE: CONTEXT|PLAN|COORDINATE|INTEGRATE|VERIFY|LEARN|COMPLETE | progress=N/7]
```

## Delegation
```
[DELEGATE: agent=<Architect|Developer|Reviewer|Researcher> | task=<desc>]
Context: {"task":"...", "context":{"problem":"...", "files":[]}, "expected":"..."}

[INTEGRATE: from=<agent> | status=complete|partial|blocked | result=<summary>]
```

| Situation | Agent |
|-----------|-------|
| Design decision | Architect |
| Code implementation | Developer |
| Testing/validation | Reviewer |
| Investigation | Researcher |

**Don't delegate**: Simple edits, clarifications, knowledge updates

## Nesting
```
[NEST: parent=<main> | child=<sub> | reason=<why>]
[RETURN: to=<main> | result=<findings>]

# Multi-level:
[STACK: push | task=<sub> | depth=N | parent=<main>]
[STACK: pop | task=<sub> | depth=N-1 | result=<findings>]
```

## Knowledge
```
[KNOWLEDGE: added=N | updated=M | type=project|global]
```
| File | Location | Contents |
|------|----------|----------|
| project_knowledge.json | Root | Entities + Codegraph + Relations |
| global_knowledge.json | .github/ | Universal patterns |

### Format (JSONL)
```json
{"type":"entity","name":"Project.Domain.Name","entityType":"Type","observations":["desc","upd:YYYY-MM-DD"]}
{"type":"codegraph","name":"Component","nodeType":"class","dependencies":[],"dependents":[]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
```

## Completion
```
[COMPLETE: task=<desc> | result=<summary> | learnings=N]

[WORKFLOW_LOG: task=<desc>]
Summary | Agent Interactions | Files | Quality Gates | Learnings
[/WORKFLOW_LOG]
```

## Quality Gates
| Gate | Owner | Check |
|------|-------|-------|
| Context | Orchestrator | Knowledge loaded |
| Design | Architect | Alternatives considered |
| Code | Developer | Tests pass |
| Quality | Reviewer | Standards met |

## Workflows
| Workflow | Purpose | Agents |
|----------|---------|--------|
| init_project | New project | Architect→Developer→Reviewer |
| import_project | Adopt existing | Researcher→Developer→Reviewer |
| refactor_code | Improve quality | Researcher→Developer→Reviewer |
| update_knowledge | Sync knowledge | Researcher→Developer |
| update_documents | Sync docs | Researcher→Developer→Reviewer |
| update_tests | Improve coverage | Researcher→Developer→Reviewer |

## Project Detection
| File | Type |
|------|------|
| package.json | Node/JS/TS |
| requirements.txt | Python |
| docker-compose.yml | Containerized |
| tsconfig.json | TypeScript |

## Portability
Copy `.github/` to any project. Create empty `project_knowledge.json` in root.

## Quick Reference
```
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7 | next=PLAN]
[DELEGATE: agent=Architect | task="Design"]
[INTEGRATE: from=Architect | result="Design complete"]
[NEST: parent=main | child=sub | reason=why]
[STACK: push | task=sub | depth=1 | parent=main]
[KNOWLEDGE: added=3 | updated=1 | type=project]
[COMPLETE: task=<desc> | result=<summary> | learnings=3]
[WORKFLOW_LOG: task=<desc>]...[/WORKFLOW_LOG]
```
