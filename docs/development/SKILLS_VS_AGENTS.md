# Skills vs Agents vs runSubagent

**Purpose:** Clarify the different mechanisms for delegation in GitHub Copilot.

---

## Three Mechanisms

| Mechanism | Available In | Purpose |
|-----------|--------------|---------|
| **Skills** | All environments | Inject domain context |
| **Agent Files** | All environments | Define work patterns |
| **runSubagent** | VS Code Copilot Chat | Spawn context-isolated subagent |

---

## 1. Skills (Context Injection)

Skills are loaded by the `skill` tool to inject domain-specific context.

| Property | Value |
|----------|-------|
| Location | `.github/skills/*/SKILL.md` |
| Invocation | `skill("frontend-react")` |
| Available | All Copilot environments |

```
Agent: "Editing .tsx file"
→ skill("frontend-react") 
→ Skill content added to context
```

---

## 2. Agent Files (Instructional Markdown)

Agent files define work patterns and methodologies. They are **NOT directly callable**.

| Property | Value |
|----------|-------|
| Location | `.github/agents/*.agent.md` |
| Invocation | Read by agent, not invoked |
| Purpose | Define HOW to work |

**In VS Code Copilot Chat**, these files can also be used with `runSubagent` to specify which agent persona to use.

---

## 3. runSubagent (VS Code Copilot Chat Only)

**⭐ NEW: This is a real VS Code Copilot built-in tool!**

`runSubagent` spawns a context-isolated subagent for complex tasks.

| Property | Value |
|----------|-------|
| Location | Built-in VS Code Copilot Chat tool |
| Invocation | `#tool:runSubagent` in chat |
| Available | **VS Code Copilot Chat only** |

### How runSubagent Works

```json
{
  "function": {
    "name": "runSubagent",
    "parameters": {
      "prompt": "Detailed task description",
      "description": "3-5 word summary"
    }
  }
}
```

**Key Characteristics:**
- Subagents operate independently with their own context window
- They don't run async - you wait for the result
- Each invocation is stateless
- Returns a single message when done
- Can use same tools as main session (except creating other subagents)

### Enabling runSubagent

1. Enable in VS Code tool picker
2. Or specify in agent/prompt file frontmatter:
   ```yaml
   tools: ['runSubagent', 'search', 'fetch']
   ```

### Using Custom Agents with runSubagent

With `chat.customAgentInSubagent.enabled` setting:
```
Run the research agent as a subagent to research auth methods.
Use the plan agent in a subagent to create implementation plan.
```

---

## Environment Differences

| Environment | Skills | Agent Files | runSubagent |
|-------------|--------|-------------|-------------|
| VS Code Copilot Chat | ✓ | ✓ | ✓ |
| GitHub Copilot Coding Agent | ✓ | ✓ | ✗ |
| GitHub.com Copilot | ✗ | ✓ | ✗ |

**Note:** The GitHub Copilot Coding Agent (cloud-based) does NOT have access to `runSubagent`. Use the `skill` tool instead for context loading.

---

## AKIS Framework Delegation

### In VS Code (with runSubagent available)

```yaml
# In your agent file frontmatter
tools: ['runSubagent', 'search', 'fetch']
```

Then in chat:
```
Run #runSubagent to implement user authentication following code agent patterns.
```

### In GitHub Copilot Coding Agent (without runSubagent)

Delegation is conceptual - follow agent methodologies manually:

```markdown
[DELEGATE] → code | implement user authentication
# Follow code.agent.md patterns
# Execute the work directly
[RETURN]   ← code | result: ✓ | files: 3
```

---

## Best Practices

### VS Code Users
- Use `runSubagent` for complex multi-step research
- Enable in tool picker or agent frontmatter
- Subagents return results to main context

### GitHub Coding Agent Users
- Use `skill()` tool for domain context
- Follow agent file patterns manually
- Log delegation in workflow logs

### Agent File Authors
- Add `tools: ['runSubagent', ...]` in frontmatter for VS Code
- Include methodology for direct execution
- Support both callable and manual delegation

---

## Summary

| Question | Answer |
|----------|--------|
| Is runSubagent real? | **Yes**, in VS Code Copilot Chat |
| Do I have runSubagent? | Check your environment's tool list |
| What about agent files? | Work patterns (can be used with runSubagent in VS Code) |
| What about skills? | Context injection, available everywhere |

**References:**
- [VS Code Copilot Chat Sessions](https://code.visualstudio.com/docs/copilot/chat/chat-sessions)
- [microsoft/vscode-copilot-chat](https://github.com/microsoft/vscode-copilot-chat)
