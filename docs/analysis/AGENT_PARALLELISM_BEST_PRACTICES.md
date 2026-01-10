# Custom Agents: Honest Assessment & Best Practices

**Date**: 2026-01-10  
**Author**: AKIS Analysis  
**Scope**: Value assessment, parallel execution, industry best practices

---

## Executive Summary: Honest Opinion

### Are Custom Agents Still Valuable?

**Short answer: YES, but with caveats.**

Modern LLMs (Claude, GPT-4, etc.) have many capabilities "baked in" - they can write code, debug, review, and document without explicit agent definitions. However, custom agents still provide value in specific scenarios:

| Aspect | LLM Alone | With Custom Agents | Verdict |
|--------|-----------|-------------------|---------|
| **Token efficiency** | Uses full context each time | Cached prompts, focused context | ✅ Agents win |
| **Consistency** | Variable output format | Standardized outputs | ✅ Agents win |
| **Workflow discipline** | Depends on user prompting | Enforced protocols | ✅ Agents win |
| **Capability** | Full capability | Same capability | ≈ Tie |
| **Speed (simple tasks)** | Faster (no overhead) | Slower (delegation overhead) | ❌ LLM wins |
| **Speed (complex tasks)** | Sequential only | Parallel possible | ✅ Agents win |

### When Custom Agents Add Value

| Scenario | Value of Custom Agent | Reason |
|----------|----------------------|--------|
| **Repeated task patterns** | HIGH | Cached prompts, consistent output |
| **Multi-file complex work** | HIGH | Parallel execution, specialization |
| **Team standardization** | HIGH | Enforced conventions across team |
| **Audit/compliance needs** | HIGH | Documented decision points |
| **Simple one-off tasks** | LOW | Overhead exceeds benefit |
| **Creative/exploratory work** | LOW | Constraints limit creativity |

### When to Skip Custom Agents

1. **Quick fixes** (<5 min tasks) - delegation overhead not worth it
2. **Novel problems** - LLM general capability better than specialized agent
3. **Highly interactive work** - back-and-forth with user, not suited for delegation

---

## Parallel Execution Analysis

### Can AKIS Orchestrate Parallel Agents?

**Technical Reality**: GitHub Copilot agent mode currently executes **sequentially**. True parallel execution (multiple agents working simultaneously) is not natively supported in the current architecture.

**However**, there are patterns that approximate parallelism:

### Pattern 1: Batch Planning (Pseudo-Parallel)

```markdown
AKIS identifies independent tasks upfront, then executes them in rapid sequence:

1. PLAN phase identifies:
   - Task A: Update backend API (independent)
   - Task B: Update frontend component (independent)
   - Task C: Update documentation (independent)

2. EXECUTE phase runs them sequentially but without inter-task blocking:
   - code → Task A → ✓
   - code → Task B → ✓  
   - documentation → Task C → ✓

Benefit: No wasted time on dependency analysis between tasks
```

### Pattern 2: Review-While-Working (Pipeline Parallelism)

```markdown
While code agent works on Task N+1, reviewer can review Task N:

Timeline:
  code:     [Task1]──────[Task2]──────[Task3]
  reviewer:        [Review1]────[Review2]────[Review3]

Current: Sequential (code→review→code→review)
Optimal: Pipeline (overlapping execution)
```

### Pattern 3: MCP-Based True Parallelism

The Model Context Protocol (MCP) enables actual parallel execution through:
- Multiple MCP server connections
- Each server handles independent tool calls
- Results aggregated by orchestrator

**This is the future direction** - but requires MCP infrastructure setup.

---

## Recommended Agent Architecture

Based on industry research and your use cases, here's the optimized architecture:

### Tier 1: Core Agents (Always Valuable)

| Agent | Purpose | When Used | Parallel? |
|-------|---------|-----------|-----------|
| **architect** | Blueprints, design before work | Project start, new features | No (planning) |
| **research** | Gather info from docs + external | Before implementation | No (investigation) |
| **code** | Write production code | Implementation phase | Yes (by file) |
| **debugger** | Trace logs, find bugs | When errors occur | No (sequential analysis) |

### Tier 2: Supporting Agents (Conditional Value)

| Agent | Purpose | When Used | Parallel? |
|-------|---------|-----------|-----------|
| **reviewer** | Independent pass/fail audit | After code complete | Yes (independent) |
| **tester** | Write tests | After/during code | Yes (by module) |
| **documentation** | Update docs | After implementation | Yes (independent) |

### Tier 3: Specialized Agents (High-Value Narrow Use)

| Agent | Purpose | When Used | Parallel? |
|-------|---------|-----------|-----------|
| **security** | Vulnerability audit | Before merge | Yes (independent) |
| **devops** | Infrastructure changes | Deployment work | No (sequential) |
| **refactorer** | Code improvement | Technical debt | Yes (by file) |

---

## Parallel Execution Recommendations

### What CAN Run in Parallel (Independent Tasks)

```
✅ Parallel-Safe Patterns:
├── code (file A) + code (file B)           # Different files
├── reviewer (module A) + tester (module B) # Different modules
├── documentation + security audit           # No dependencies
└── research (topic A) + research (topic B) # Independent research
```

### What CANNOT Run in Parallel (Dependencies)

```
❌ Must Be Sequential:
├── architect → code (design must precede implementation)
├── code → debugger (code must exist to debug)
├── code → reviewer (code must exist to review)
└── debugger → code (fix depends on diagnosis)
```

### Recommended Parallel Patterns for AKIS

```python
# Pattern: Fan-Out/Fan-In
#
# AKIS orchestrates like this:
#
#                    ┌─→ code (file1) ─────┐
#                    │                     │
# architect ─→ AKIS ─┼─→ code (file2) ─────┼─→ reviewer ─→ AKIS
#                    │                     │
#                    └─→ documentation ────┘
#
# The "fan-out" creates independent work items
# The "fan-in" aggregates results for review
```

---

## Industry Best Practices

### From MCP (Model Context Protocol)

1. **Toolset Customization**: Enable only needed capabilities
2. **Fewer tools = better accuracy**: Don't overload with agents
3. **Clear boundaries**: Each agent has distinct responsibility

### From Multi-Agent Research

1. **Orchestrator pattern**: One agent coordinates, specialists execute
2. **Result aggregation**: Central point collects all outputs
3. **Error escalation**: Failed agents report back, don't cascade

### Recommendations for AKIS

| Practice | Implementation |
|----------|---------------|
| **Minimal agent set** | 4 core + 3 supporting (not 10+) |
| **Clear triggers** | No overlap between agent triggers |
| **Independent execution** | Design tasks to minimize dependencies |
| **Fail-fast** | Agents report blockers immediately |
| **Cached context** | Use project_knowledge.json aggressively |

---

## Revised Agent Hierarchy

Based on this analysis, here's the recommended structure:

```
AKIS (Orchestrator)
├── PHASE 1: Planning (Sequential)
│   ├── research (if needed)
│   └── architect (if complex)
│
├── PHASE 2: Execution (Parallel where possible)
│   ├── code (file1) ──┐
│   ├── code (file2) ──┼── Parallel by file
│   └── code (file3) ──┘
│
├── PHASE 3: Verification (Parallel)
│   ├── reviewer ──┐
│   ├── tester ────┼── Parallel (independent)
│   └── security ──┘
│
└── PHASE 4: Finalization (Sequential)
    └── documentation (if needed)
```

---

## Conclusion

### Keep These Agents

| Agent | Reason |
|-------|--------|
| **architect** | Critical for complex work planning |
| **research** | Valuable for information gathering |
| **code** | Core implementation agent |
| **debugger** | Essential for error resolution |
| **reviewer** | Independent quality gate |

### Consider Deprecating/Merging

| Agent | Recommendation |
|-------|----------------|
| **refactorer** | Merge into code agent (modern LLMs handle this) |
| **tester** | Merge into code agent (tests part of implementation) |
| **security** | Merge into reviewer (security is part of review) |

### Final Recommendation

**Reduce from 10 agents to 6:**

1. **architect** - Design and blueprints
2. **research** - Information gathering
3. **code** - All implementation (including refactoring, tests)
4. **debugger** - Error diagnosis and tracing
5. **reviewer** - Quality audit (including security)
6. **documentation** - Doc updates

This reduces:
- Cognitive load (fewer agents to remember)
- Delegation overhead (fewer handoffs)
- Trigger confusion (clearer boundaries)

While maintaining:
- Parallel execution capability (code can parallelize by file)
- Specialization where it matters (architect, debugger)
- Quality gates (reviewer remains independent)

---

*Analysis based on 100k session simulation + MCP research + industry patterns*
