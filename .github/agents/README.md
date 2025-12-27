# GitHub Custom Agents

> **✅ Official Format**: These agents use GitHub's official custom agent format and can be selected in GitHub Copilot when merged to the default branch.

This directory contains **GitHub Custom Agents** - optimized, action-oriented AI assistants for development tasks.

## Agent Design Philosophy

These agents are designed for **real-world effectiveness**:
- ✅ **Short & Focused** (80-120 lines each) - fits in context window
- ✅ **Action-Oriented** - clear "what to do" not "what you are"
- ✅ **Concrete Examples** - real code, actual commands
- ✅ **Standalone** - each agent is self-contained
- ✅ **Obedient** - simple instructions that will be followed

## Official GitHub Agent Format

These agents follow the official GitHub custom agent specification:
- **Location**: `.github/agents/*.agent.md`
- **Format**: YAML frontmatter with `name` and `description`
- **Documentation**: https://gh.io/customagents/config
- **CLI Testing**: https://gh.io/customagents/cli

## Agents

### DevTeam (Orchestrator) - 83 lines
**File**: `DevTeam.agent.md`  
**Purpose**: Coordinates specialist agents for complex tasks

**Capabilities**:
- Breaks down requests into steps
- Delegates to appropriate specialists
- Integrates results from multiple agents
- Manages workflow between agents

**When to use**: Multi-step tasks requiring design, implementation, and validation

---

### Architect - 85 lines
**File**: `Architect.agent.md`  
**Purpose**: System design and architecture decisions

**Capabilities**:
- Designs system architecture
- Evaluates technology trade-offs
- Defines component structure
- Documents design decisions

**When to use**: Need architectural guidance, technology choices, or system design

---

### Developer - 99 lines
**File**: `Developer.agent.md`  
**Purpose**: Code implementation and bug fixes

**Capabilities**:
- Writes clean, tested code
- Implements features following patterns
- Fixes bugs with regression tests
- Refactors code

**When to use**: Need code written, bugs fixed, or features implemented

---

### Reviewer - 97 lines
**File**: `Reviewer.agent.md`  
**Purpose**: Code review and quality validation

**Capabilities**:
- Reviews code quality
- Runs tests and checks coverage
- Validates security
- Ensures standards compliance

**When to use**: Need code reviewed, tested, or validated

---

### Researcher - 114 lines
**File**: `Researcher.agent.md`  
**Purpose**: Codebase investigation and analysis

**Capabilities**:
- Explores codebase structure
- Finds patterns and conventions
- Investigates issues
- Documents findings

**When to use**: Need to understand existing code or investigate problems

## How to Use

### In GitHub Copilot
1. Select agent from agent picker in Copilot
2. Or mention with `@AgentName` in chat
3. Provide clear, specific task

### Examples

```
@DevTeam add JWT authentication to the API
→ DevTeam will coordinate Architect, Developer, and Reviewer

@Architect design a caching strategy for our API
→ Architect will evaluate options and recommend approach

@Developer implement the authentication endpoints
→ Developer will write code with tests

@Reviewer check the auth implementation for security issues
→ Reviewer will validate and test

@Researcher how does our current auth system work?
→ Researcher will investigate and document findings
```

### Sub-Agent Delegation

DevTeam orchestrates by delegating to specialists:

```
User: "@DevTeam add user authentication"

DevTeam:
1. @Architect design JWT auth system
   [waits for response]
2. @Developer implement based on Architect's design
   [waits for response]
3. @Reviewer validate implementation and security
   [integrates all responses]
```

## Optimization Notes

**Previous version**: 2,863 lines (too verbose, won't fit in context)  
**Current version**: 478 lines (80% reduction)

**Changes**:
- Removed complex protocols and JSON handoffs
- Removed abstract workflow phases
- Added concrete examples and templates
- Focused on actionable instructions
- Made each agent standalone

**Result**: Agents are now effective in real-world use with GitHub Copilot.

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
