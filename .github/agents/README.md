# GitHub Copilot Agents

This directory contains the **Universal Agent Framework** - a multi-agent system for collaborative software development.

## Overview

The agent framework implements a team-based approach where specialized agents work together to accomplish complex development tasks:

```
DevTeam (Orchestrator)
├── Architect  → Design decisions, patterns, structure
├── Developer  → Implementation, debugging, code
├── Reviewer   → Testing, validation, quality
└── Researcher → Investigation, analysis, documentation
```

## Agents

### DevTeam (Orchestrator)
**File**: `DevTeam.agent.md`  
**Role**: Lead orchestrator for multi-agent development workflows  
**Responsibilities**:
- Analyze user requests and break into tasks
- Delegate to appropriate specialists
- Integrate results from specialists
- Track progress and maintain context
- Coordinate knowledge updates

**Use when**: Complex multi-step tasks, coordinating multiple specialists

---

### Architect (Design Specialist)
**File**: `Architect.agent.md`  
**Role**: Design and architecture specialist  
**Responsibilities**:
- Design system architecture and component structure
- Analyze trade-offs and document alternatives
- Define interfaces, patterns, and data flow
- Make technology and framework decisions
- Document design decisions for knowledge graph

**Use when**: Design decisions, architectural planning, pattern selection

---

### Developer (Implementation Specialist)
**File**: `Developer.agent.md`  
**Role**: Implementation and coding specialist  
**Responsibilities**:
- Write clean, idiomatic code following patterns
- Implement features based on designs
- Debug issues and fix problems
- Create initial tests for new code
- Refactor and optimize code

**Use when**: Code implementation, bug fixes, refactoring

---

### Reviewer (Quality Specialist)
**File**: `Reviewer.agent.md`  
**Role**: Quality assurance and validation specialist  
**Responsibilities**:
- Review code for quality and standards
- Run and create comprehensive tests
- Validate changes work correctly
- Check for regressions
- Approve or request changes

**Use when**: Code review, testing, quality validation

---

### Researcher (Investigation Specialist)
**File**: `Researcher.agent.md`  
**Role**: Investigation and analysis specialist  
**Responsibilities**:
- Investigate problems and gather context
- Explore codebase structure and patterns
- Analyze dependencies and relationships
- Document findings for knowledge graph
- Identify gaps and opportunities

**Use when**: Codebase exploration, pattern discovery, investigation

## Architecture

### Agent Hierarchy

The framework uses a **orchestrator-specialist** pattern:

1. **Orchestrator (DevTeam)**: Maintains overall task control, delegates to specialists
2. **Specialists**: Focus on specific domains, return structured results

### Communication Protocol

Agents communicate using structured formats:

#### Session Start
```
[SESSION: role=Lead | task=<description> | phase=CONTEXT]
```

#### Delegation
```
[DELEGATE: agent=<specialist> | task=<description>]
```

#### Context Handoff
```json
{
  "task": "specific task",
  "context": {
    "problem": "what needs solving",
    "constraints": ["list"],
    "expected_output": "deliverable"
  }
}
```

#### Return Contract
```json
{
  "status": "complete|partial|blocked",
  "result": "what was accomplished",
  "artifacts": ["files created/modified"],
  "learnings": ["for knowledge graph"]
}
```

## Integration

### Instructions
Agents integrate with instruction modules in `/.github/instructions/`:
- **protocols.md**: Communication protocols
- **phases.md**: Workflow phases
- **standards.md**: Quality standards
- **structure.md**: Project structure
- **examples.md**: Usage examples

### Workflows
Agents execute structured workflows in `/.github/workflows/`:
- **init_project.md**: Greenfield project creation
- **import_project.md**: Adopt existing codebase
- **refactor_code.md**: Code optimization
- **update_knowledge.md**: Sync knowledge graph
- **update_documents.md**: Sync documentation
- **update_tests.md**: Improve test coverage

### Knowledge System
Agents maintain a unified knowledge system:

| File | Location | Content | Scope |
|------|----------|---------|-------|
| `project_knowledge.json` | Project root | Entities + codegraph + relations | Project-specific |
| `global_knowledge.json` | `.github/` | Universal patterns | Cross-project |

#### Knowledge Format (JSONL)
```json
{"type":"entity","name":"Project.Domain.Type_Name","entityType":"Type","observations":["desc","upd:YYYY-MM-DD,refs:N"]}
{"type":"codegraph","name":"ComponentName","nodeType":"class","dependencies":["Dep1"],"dependents":["User1"]}
{"type":"relation","from":"Entity.A","to":"Entity.B","relationType":"USES"}
```

## Usage

### Direct Agent Invocation
Select a specific agent for focused work:
```
# For design work
Use: Architect

# For implementation
Use: Developer

# For review and testing
Use: Reviewer

# For investigation
Use: Researcher
```

### Orchestrated Workflow
Use DevTeam for complex tasks requiring multiple specialists:
```
# DevTeam automatically delegates to:
- Architect for design
- Developer for implementation  
- Reviewer for validation
- Researcher for investigation
```

## Workflow Patterns

### Feature Implementation
```
DevTeam
├── Architect: Design feature
├── Developer: Implement feature
└── Reviewer: Validate implementation
```

### Bug Investigation
```
DevTeam
├── Researcher: Investigate root cause
├── Developer: Fix bug
└── Reviewer: Validate fix
```

### Refactoring
```
DevTeam
├── Researcher: Analyze code quality
├── Architect: Design improvements
├── Developer: Implement refactoring
└── Reviewer: Validate no breakage
```

## Quality Gates

Each agent enforces quality gates:

| Phase | Gate | Owner |
|-------|------|-------|
| Context | Knowledge loaded | DevTeam |
| Design | Alternatives considered | Architect |
| Implementation | Tests pass | Developer |
| Review | Quality verified | Reviewer |
| Complete | User acceptance | DevTeam |

## Portability

### Framework Files (Portable)
These files can be copied to any project:
```
.github/
├── agents/              # This directory
├── instructions/        # Instruction modules
├── workflows/           # Workflow templates
└── global_knowledge.json # Universal patterns
```

### Project-Specific Files
These stay with each project:
```
project_knowledge.json   # Project entities and codegraph
```

## Best Practices

### For Orchestrator (DevTeam)
- Load knowledge before planning
- Delegate to appropriate specialists
- Track all delegations
- Integrate results coherently
- Update knowledge after work

### For Specialists
- Focus on assigned domain
- Follow handoff protocols
- Return structured results
- Report learnings
- Flag blockers immediately

### For All Agents
- Use standard communication tags
- Maintain context awareness
- Follow project conventions
- Document decisions
- Update knowledge graph

## Examples

### Example 1: Add Authentication
```
[SESSION: role=Lead | task="Add JWT authentication"]

[DELEGATE: agent=Architect | task="Design auth system"]
→ Architect returns JWT + refresh token design

[DELEGATE: agent=Developer | task="Implement auth service"]
→ Developer creates auth_service.py, security.py

[DELEGATE: agent=Reviewer | task="Validate implementation"]
→ Reviewer runs tests, approves

[COMPLETE: task="JWT auth" | result="complete" | learnings=3]
[KNOWLEDGE: added=5 | updated=2 | type=project]
```

### Example 2: Refactor Large File
```
[SESSION: role=Lead | task="Refactor auth_service.py (800 lines)"]

[DELEGATE: agent=Researcher | task="Analyze file structure"]
→ Researcher identifies 3 cohesive components

[DELEGATE: agent=Architect | task="Design split approach"]
→ Architect proposes split into service, utils, validators

[DELEGATE: agent=Developer | task="Split files and update imports"]
→ Developer creates 3 files, updates 8 imports

[DELEGATE: agent=Reviewer | task="Validate no breakage"]
→ Reviewer confirms all tests pass

[COMPLETE: task="refactor" | result="800→3x200 lines" | learnings=2]
```

## Troubleshooting

### Knowledge Not Loading
- Check `project_knowledge.json` exists in project root
- Verify JSON format is valid JSONL
- Create empty file if missing: `echo '' > project_knowledge.json`

### Agent Communication Issues
- Ensure using standard session tags
- Check handoff format matches specification
- Review `/.github/instructions/protocols.md`

### Quality Gate Failures
- Review standards in `/.github/instructions/standards.md`
- Check specific agent requirements
- Consult workflow documentation

## Version

**Version**: 2.0  
**Last Updated**: 2025-12-27  
**Compatibility**: GitHub Copilot, Universal Agent Framework

## References

- **Main Instructions**: `/.github/copilot-instructions.md`
- **Protocols**: `/.github/instructions/protocols.md`
- **Workflows**: `/.github/workflows/`
- **Knowledge Format**: See standards.md

---

For detailed information on each agent, refer to individual `.agent.md` files in this directory.
