# Skills vs Agents - Understanding the AKIS Framework

**Purpose:** Clarify the distinction between Skills and Agents in GitHub Copilot's AKIS framework.

---

## Key Distinction

| Concept | Skills | Agents |
|---------|--------|--------|
| **Location** | `.github/skills/*/SKILL.md` | `.github/agents/*.agent.md` |
| **Mechanism** | Loaded via `skill` tool | Conceptual personas |
| **Invocation** | `skill("frontend-react")` | Not directly callable |
| **Purpose** | Inject domain-specific context | Define work patterns |
| **Type** | **Callable tools** | **Instructional markdown** |

---

## How They Work

### Skills (Callable)

Skills are loaded by the `skill` tool available in GitHub Copilot. When loaded, the skill's content is injected into the agent's context.

```
Agent: "I'm editing a .tsx file, let me load the frontend-react skill"
→ skill("frontend-react") 
→ Skill content added to context
→ Agent now has React/TypeScript patterns available
```

**Usage:** Skills are actively loaded and affect agent behavior.

### Agents (Conceptual)

Agents are **documentation that describes work patterns**. They are NOT separate callable entities. The main Copilot agent can read and follow agent instructions, but doesn't "delegate to" them as separate processes.

```
AKIS.agent.md → Orchestration patterns
code.agent.md → Coding standards to follow
debugger.agent.md → Debugging methodology
```

**Usage:** Agents define HOW to work, not separate workers.

---

## Delegation Clarification

### What AKIS Delegation Means

When AKIS instructions say "delegate to code agent," this means:
1. **Switch mental mode** to code agent patterns
2. **Follow** the code agent's methodology
3. **Report** using the code agent's output format

It does **NOT** mean:
- Spawning a separate AI agent
- Making an API call to another service
- Running a subprocess

### Tracing Format

The delegation tracing format is for **workflow logging**, not actual tool invocation:

```markdown
[DELEGATE] → code | implement user authentication
[RETURN]   ← code | result: ✓ | files: 3 | tests: added
```

This is a **log entry**, not a function call.

---

## Correct Understanding

### Skills ARE:
- ✓ Tools that inject context
- ✓ Loaded via `skill()` function
- ✓ Available in `.github/skills/`
- ✓ Domain-specific patterns (React, Python, Docker)

### Agents ARE:
- ✓ Documentation of work patterns
- ✓ Mental models for task types
- ✓ Workflow guides
- ✓ Output format specifications

### Agents ARE NOT:
- ✗ Separate callable entities
- ✗ Tools that can be invoked
- ✗ Subprocess or API endpoints
- ✗ GitHub Copilot's `@agent` feature (different concept)

---

## GitHub Copilot Context

In GitHub Copilot's architecture:
- **Skills** = Context injection via skill tool
- **Agents** = Instructional markdown that the main agent reads
- **Delegation** = Following different instruction sets, not spawning processes

The `.github/agents/*.agent.md` files use the YAML frontmatter format that GitHub Copilot recognizes, but they serve as **instructions for the main agent to follow**, not as separate callable agents.

---

## Best Practices

### When to Use Skills
- Load skills when touching domain-specific files
- Cache loaded skills per session (don't reload)
- Pre-load for fullstack work: frontend-react + backend-api

### When to Reference Agents
- Read agent instructions when starting a task type
- Follow the agent's methodology and output format
- Use tracing format for workflow logs

### Delegation Workflow
```
1. Identify task type (design, code, debug, review)
2. Read relevant agent instructions
3. Load required skills
4. Execute following agent patterns
5. Log completion in delegation trace format
```

---

## Summary

| Question | Answer |
|----------|--------|
| Can I call an agent? | No, agents are documentation |
| Can I call a skill? | Yes, via `skill()` tool |
| What is delegation? | Following agent patterns |
| Are agents sub-processes? | No, conceptual personas |

The AKIS framework uses "delegation" as a mental model for organizing complex work, not as a technical mechanism for spawning separate agents.
