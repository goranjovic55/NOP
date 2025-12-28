# GitHub Custom Agents

> **✅ Official Format**: These agents use GitHub's official custom agent format and can be selected in GitHub Copilot when merged to the default branch.

This directory contains **GitHub Custom Agents** - a multi-agent orchestration system for development tasks.

## Agent Design Philosophy

These agents are designed for **real-world effectiveness**:
- ✅ **Protocol Emissions** - transparent communication with [DELEGATE:], [RETURN:] tags
- ✅ **Action-Oriented** - clear "what to do" not "what you are"
- ✅ **Structured Handoffs** - JSON context passed between agents
- ✅ **Multi-Agent Orchestration** - _DevTeam coordinates specialists
- ✅ **Knowledge Integration** - Updates project_knowledge.json

## Official GitHub Agent Format

These agents follow the official GitHub custom agent specification:
- **Location**: `.github/agents/*.agent.md`
- **Format**: YAML frontmatter with `name` and `description`
- **Documentation**: https://gh.io/customagents/config
- **CLI Testing**: https://gh.io/customagents/cli

## Protocol Emissions

Users see transparent communication between agents:

| Tag | Purpose | Example |
|-----|---------|---------|
| `[SESSION:]` | Session start (Required) | `[SESSION: role=Lead \| task=add_auth]` |
| `#runSubagent` | Invoke specialist (Required) | `#runSubagent Architect` |
| `[PHASE:]` | Progress tracking (Required) | `[PHASE: VERIFY \| progress=5/7]` |
| `[TASK:]` | Progress tracking | Nested task list with checkboxes |
| `[KNOWLEDGE:]` | Knowledge update | `[KNOWLEDGE: added=3 \| updated=1]` |
| `[COMPLETE:]` | Task finished (Required) | `[COMPLETE: task=add_auth \| learnings=2]` |

### Specialist Phase Tags
- `[ARCHITECT: phase=ANALYZE|DESIGN|DECIDE|DOCUMENT]`
- `[DEVELOPER: phase=PLAN|IMPLEMENT|TEST|COMPLETE]`
- `[REVIEWER: phase=UNDERSTAND|REVIEW|TEST|REPORT]`
- `[RESEARCHER: phase=SCOPE|EXPLORE|ANALYZE|MAP|REPORT]`

## Agents

### _DevTeam (Orchestrator)
**File**: `_DevTeam.agent.md`  
**Purpose**: Coordinates specialist agents using `#runSubagent` tool

**Capabilities**:
- Emits `[SESSION:]` at start, `[COMPLETE:]` at end
- Uses `#runSubagent` to invoke specialists (Architect, Developer, Reviewer, Researcher)
- Tracks progress with `[TASK:]` nested lists
- Updates knowledge with `[KNOWLEDGE:]`
- Supports both sequential and parallel delegation patterns

**When to use**: Multi-step tasks requiring design, implementation, and validation

---

### Architect
**File**: `Architect.agent.md`  
**Purpose**: System design and architecture decisions

**Capabilities**:
- Emits `[ARCHITECT: phase=...]` during work
- Returns `[RETURN: to=_DevTeam | status=complete]`
- Evaluates alternatives with trade-off matrix
- Documents decisions with rationale

**When to use**: Need architectural guidance, technology choices, or system design

---

### Developer
**File**: `Developer.agent.md`  
**Purpose**: Code implementation and bug fixes

**Capabilities**:
- Emits `[DEVELOPER: phase=...]` during work
- Returns `[RETURN: to=_DevTeam | status=complete]`
- Writes clean, tested code
- Follows existing patterns

**When to use**: Need code written, bugs fixed, or features implemented

---

### Reviewer
**File**: `Reviewer.agent.md`  
**Purpose**: Code review and quality validation

**Capabilities**:
- Emits `[REVIEWER: phase=...]` during work
- Returns `[RETURN: to=_DevTeam | verdict=APPROVED|CHANGES|REJECTED]`
- Runs tests and checks coverage
- Validates security

**When to use**: Need code reviewed, tested, or validated

---

### Researcher
**File**: `Researcher.agent.md`  
**Purpose**: Codebase investigation and analysis

**Capabilities**:
- Emits `[RESEARCHER: phase=...]` during work
- Returns `[RETURN: to=_DevTeam | result=findings]`
- Explores codebase structure
- Identifies entities for knowledge graph

**When to use**: Need to understand existing code or investigate problems

## How to Use

### In GitHub Copilot
1. Select agent from agent picker in Copilot
2. Or mention with `@AgentName` in chat
3. Provide clear, specific task

### Examples

```
@_DevTeam add JWT authentication to the API
→ [SESSION: role=Lead | task=add_JWT_auth]
→ [DELEGATE: agent=Architect | task=design_auth]
→ [INTEGRATE: from=Architect | status=complete]
→ [DELEGATE: agent=Developer | task=implement_auth]
→ [INTEGRATE: from=Developer | status=complete]
→ [COMPLETE: task=add_JWT_auth | learnings=3]

@Architect design a caching strategy for our API
→ [SESSION: role=Architect | task=caching_strategy]
→ [ARCHITECT: phase=ANALYZE]
→ [ARCHITECT: phase=DESIGN]
→ Decision documented with alternatives and rationale

@Developer implement the authentication endpoints
→ [SESSION: role=Developer | task=auth_endpoints]
→ [DEVELOPER: phase=IMPLEMENT]
→ Code written with tests

@Reviewer check the auth implementation for security issues
→ [SESSION: role=Reviewer | task=security_review]
→ [REVIEWER: phase=REVIEW]
→ [REVIEWER: verdict=CHANGES | issues=2]

@Researcher how does our current auth system work?
→ [SESSION: role=Researcher | task=auth_investigation]
→ [RESEARCHER: phase=EXPLORE]
→ Findings documented with patterns and entities
```

### Sub-Agent Delegation with runSubagent

_DevTeam orchestrates using the `runSubagent` tool to invoke specialists:

```
User: "@_DevTeam add user authentication"

_DevTeam Output:
[SESSION: role=Lead | task=add_user_auth | phase=CONTEXT]
Loading project context...

[TASK: Add User Authentication]
├── [ ] CONTEXT: Load project state
├── [ ] PLAN: Identify specialist tasks
├── [ ] DELEGATE→Architect: Design auth
├── [ ] DELEGATE→Developer: Implement auth
├── [ ] DELEGATE→Reviewer: Validate
└── [ ] COMPLETE: Summarize

[DELEGATE: agent=Architect | task="Design JWT auth with access/refresh tokens"]
Context passed:
{
  "task": "Design authentication system",
  "context": {
    "problem": "Need user login/logout",
    "constraints": ["JWT tokens", "refresh tokens"],
    "expected_output": "Architecture decision with rationale"
  }
}

--- Architect works and returns ---
[INTEGRATE: from=Architect | status=complete | result="JWT design with 15min access, 7d refresh"]

[DELEGATE: agent=Developer | task="Implement auth based on design"]
--- Developer works and returns ---
[INTEGRATE: from=Developer | status=complete | result="auth_service.py created with tests"]

[DELEGATE: agent=Reviewer | task="Validate security"]
--- Reviewer works and returns ---
[INTEGRATE: from=Reviewer | status=complete | verdict=APPROVED]

[KNOWLEDGE: added=4 | updated=2 | type=project]
[COMPLETE: task=add_user_auth | result=Auth system implemented | learnings=4]
```

**Parallel Execution** for independent tasks:
```
[DELEGATE: agent=Developer | task="Create API endpoints"]
[DELEGATE: agent=Developer | task="Create database models"]
--- Both run in parallel ---
[INTEGRATE: from=Developer | status=complete | result="endpoints created"]
[INTEGRATE: from=Developer | status=complete | result="models created"]
```

## Optimization Notes

**Design principles**:
- Protocol emissions let users see agent communication
- JSON context handoffs preserve information between agents
- Structured return contracts ensure consistent responses
- Phase tags show what each specialist is doing
- Knowledge updates capture learnings for future sessions

**Result**: Multi-agent orchestration is transparent and debuggable.

## Integration with Repository

Agents can reference:
- **Knowledge**: `project_knowledge.json`, `.github/global_knowledge.json`
- **Instructions**: `.github/instructions/` (protocols, standards, etc.)
- **Workflows**: `.github/workflows/` (init_project, refactor_code, etc.)

But agents are designed to work standalone without requiring external files.

## References

- **Official Format**: https://gh.io/customagents/config
- **CLI Testing**: https://gh.io/customagents/cli
- **Main Instructions**: `/.github/copilot-instructions.md`

---

For detailed agent instructions, see individual `.agent.md` files in this directory.
