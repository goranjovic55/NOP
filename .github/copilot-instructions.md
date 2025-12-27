# Universal Agent Framework - Multi-Agent Architecture

> **📋 Framework Type**: Custom organizational and documentation framework  
> **⚠️ Note**: This is NOT GitHub's official multi-agent format. GitHub Copilot does not automatically route to multiple agents. This framework serves as structured documentation and workflow guides for AI-assisted development.

**Version**: 2.0 | **Type**: Custom/Portable | **Scope**: Any project | **Architecture**: Orchestrator + Specialists

---

## Overview

This framework implements a **documented multi-agent architecture** for organizing development workflows:
- **DevTeam (Lead)** orchestrates and maintains task control
- **Specialists** (Architect, Developer, Reviewer, Researcher) handle domain-specific work
- **Structured handoffs** enable coherent collaboration
- **Unified knowledge** preserves context across sessions

---

## 1. Agent Hierarchy

```
DevTeam (Orchestrator)
├── Architect  → Design decisions, patterns, structure
├── Developer  → Implementation, debugging, code
├── Reviewer   → Testing, validation, quality
└── Researcher → Investigation, analysis, documentation
```

### Orchestrator (DevTeam)
- **Maintains**: Overall task control, progress tracking
- **Decides**: Which specialist to invoke when
- **Integrates**: Results from specialists
- **Coordinates**: Multi-agent workflows

### Specialists
- **Focus**: Single domain of expertise
- **Receive**: Structured context from orchestrator
- **Return**: Structured results with learnings
- **Independent**: Can be invoked directly by user too

---

## 2. Session Initialization

### First Response Protocol
```
[SESSION: role=Lead | task=<from_user> | phase=CONTEXT]
Loading project context...
```

### Load Order
1. Read `project_knowledge.json` (project root)
2. Read `.github/global_knowledge.json` (cross-project patterns)
3. Identify project type from structure
4. Determine specialist needs

### Recovery
- Knowledge missing → Create empty, continue
- Knowledge corrupted → Backup, create fresh
- Context lost → Re-emit SESSION, reload

---

## 3. Context Handoff Protocol

### Orchestrator → Specialist
```json
{
  "task": "specific task description",
  "context": {
    "problem": "what needs solving",
    "constraints": ["list", "of", "constraints"],
    "existing_patterns": "relevant patterns from knowledge",
    "files_involved": ["file1.py", "file2.py"],
    "expected_output": "what should come back"
  },
  "knowledge_snapshot": {
    "relevant_entities": ["Entity.A", "Entity.B"],
    "relevant_codegraph": ["Component.X", "Component.Y"],
    "recent_decisions": ["decision1", "decision2"]
  }
}
```

### Specialist → Orchestrator
```json
{
  "status": "complete|partial|blocked",
  "result": "what was accomplished",
  "artifacts": ["files created/modified"],
  "learnings": ["patterns discovered"],
  "codegraph_updates": ["nodes to add/update"],
  "blockers": ["if any"],
  "recommendations": ["next steps"]
}
```

---

## 4. Workflow Phases

### Orchestrator Phases
| Phase | Purpose |
|-------|---------|
| **CONTEXT** | Load knowledge, understand scope |
| **PLAN** | Break down, identify specialists |
| **COORDINATE** | Delegate to specialists |
| **INTEGRATE** | Combine results |
| **VERIFY** | Final validation |
| **LEARN** | Update knowledge |
| **COMPLETE** | Summarize, handoff |

### Specialist Phases (Abbreviated)
- Receive task → Execute → Return results
- Each specialist has domain-specific workflow
- See individual agent files in `.github/agents/` for details

---

## 5. Delegation Patterns

### When to Delegate

| Situation | Specialist | Why |
|-----------|------------|-----|
| Design decision | **Architect** | Trade-off analysis |
| Code implementation | **Developer** | Focused execution |
| Testing/validation | **Reviewer** | Quality focus |
| Investigation | **Researcher** | Deep exploration |

### When NOT to Delegate
- Simple, single-file changes
- Quick clarifications
- Knowledge updates
- Task tracking

### Parallel Delegation
When tasks are independent:
```
[DELEGATE: agent=Developer | task="Implement auth"]
[DELEGATE: agent=Developer | task="Implement logging"]
```
Results integrated when both complete.

---

## 6. Task Tracking

### Progress Format
```
[TASK: <main_description>]
├── [x] CONTEXT: Loaded project state
├── [x] PLAN: Identified 3 specialist tasks
├── [ ] DELEGATE→Architect: Design auth  ← current
├── [ ] DELEGATE→Developer: Implement auth
├── [ ] DELEGATE→Reviewer: Validate
└── [ ] COMPLETE: Summarize and learn
```

### Nested Work
```
[NEST: parent=<main> | child=<investigation> | reason=<why>]
... specialist handles nested task ...
[RETURN: to=<main> | result=<findings>]
```

---

## 7. Knowledge System

### Unified Knowledge Architecture
| File | Location | Contents |
|------|----------|----------|
| `project_knowledge.json` | Project root | Entities + Codegraph + Relations |
| `global_knowledge.json` | `.github/` | Universal patterns |

### Knowledge Format (JSONL)
```json
{"type":"entity","name":"Project.Domain.Cluster.Name","entityType":"Type","observations":["description","upd:YYYY-MM-DD,refs:N"]}
{"type":"codegraph","name":"Component.Name","nodeType":"module|class|function","dependencies":["Dep.A"],"dependents":["User.B"]}
{"type":"relation","from":"Entity.A","to":"Entity.B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
```

### Knowledge Categories
| Type | Purpose | Examples |
|------|---------|----------|
| entity | Domain concepts | Config.Auth, Pattern.Singleton |
| codegraph | Code structure | AuthService, validateToken |
| relation | Connections | Auth USES Database |

### Learning Coordination
- Orchestrator coordinates what to remember
- Specialists report learnings in return contract
- Project-specific → `project_knowledge.json`
- Universal patterns → `global_knowledge.json`

---

## 8. Quality Gates

| Gate | Owner | When | Check |
|------|-------|------|-------|
| **Context** | Orchestrator | Before planning | Knowledge loaded, scope clear |
| **Design** | Architect | After design | Alternatives considered |
| **Implementation** | Developer | After coding | Patterns followed |
| **Quality** | Reviewer | After testing | All tests pass |
| **Complete** | Orchestrator | Task end | User verification |

---

## 9. Communication Protocols

### Session Tags
```
[SESSION: role=Lead | task=<desc> | phase=<phase>]
[DELEGATE: agent=<specialist> | task=<desc>]
[INTEGRATE: from=<specialist> | result=<summary>]
[NEST: parent=<main> | child=<sub> | reason=<why>]
[RETURN: to=<main> | result=<outcome>]
[COMPLETE: task=<desc> | result=<summary> | learnings=<N>]
[KNOWLEDGE: added=<N> | updated=<M> | type=<project|global>]
```

### Language Guidelines
- **Active voice**: "Delegating to Architect" not "I'll delegate"
- **Direct**: State actions and results
- **Transparent**: Show delegation and integration
- **Concise**: No unnecessary ceremony

---

## 10. Project Detection

### Auto-Detection on Session Start
| Indicator | Project Type |
|-----------|--------------|
| `package.json` | Node/JS/TS |
| `requirements.txt` | Python |
| `docker-compose.yml` | Containerized |
| `Dockerfile` | Container build |
| `tsconfig.json` | TypeScript |

### Structure Awareness
- Read knowledge files first
- Infer architecture from structure
- Follow existing conventions

---

## 11. Portability

### Using This Framework

1. **Copy `.github/` folder** to new project
2. **Create `project_knowledge.json`** in project root (empty OK)
3. **Select agent** based on work type (see `.github/agents/`)
4. **Knowledge builds** organically through work

### What's Portable
- All agents (orchestrator + specialists in `.github/agents/`)
- Instruction modules (`.github/instructions/`)
- `global_knowledge.json` (universal patterns)
- Workflow templates (`.github/workflows/`)

### What's Project-Specific
- `project_knowledge.json`
- Project-specific decisions

---

## 12. Agent Reference

See `.github/agents/README.md` for complete documentation.

| Agent | Role | Use When |
|-------|------|----------|
| **DevTeam** | Orchestrator | Complex multi-step tasks, default |
| **Architect** | Design | Pure design thinking, no implementation |
| **Developer** | Implementation | Direct coding, no design needed |
| **Reviewer** | Quality | Pure testing/review focus |
| **Researcher** | Investigation | Exploration, documentation |

### Direct vs Orchestrated
- **Direct**: User invokes specific agent for focused work
- **Orchestrated**: DevTeam delegates to specialists as needed

---

## 13. Workflow Reference

| Workflow | Purpose | Agents |
|----------|---------|--------|
| **init_project** | New project setup | Architect→Developer→Reviewer |
| **import_project** | Adopt existing codebase | Researcher→Developer→Reviewer |
| **refactor_code** | Improve code quality | Researcher→Developer→Reviewer |
| **update_knowledge** | Sync knowledge graph | Researcher→Developer |
| **update_documents** | Sync documentation | Researcher→Developer→Reviewer |
| **update_tests** | Improve test coverage | Researcher→Developer→Reviewer |

---

## Quick Reference

```
# Session start (DevTeam)
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]

# Delegation
[DELEGATE: agent=Architect | task="Design auth"]
[DELEGATE: agent=Developer | task="Implement auth"]

# Integration
[INTEGRATE: from=Architect | result="JWT design"]
[INTEGRATE: from=Developer | result="auth_service.py"]

# Nesting
[NEST: parent=feature | child=debug | reason=test_failure]
[RETURN: to=feature | result=fixed]

# Completion
[COMPLETE: task=<desc> | result=<summary> | learnings=3]

# Knowledge
[KNOWLEDGE: added=3 | updated=1 | type=project]
```
