# AKIS Conceptual Audit: Brutally Honest Verdict

**Date:** January 2, 2026
**Auditor:** GitHub Copilot (Simulated Stress Test)
**Verdict:** **Mixed Bag (Strong Core, Fluffy Edges)**

## Executive Summary

The AKIS framework (Agents, Knowledge, Instructions, Skills) is a sophisticated attempt to structure LLM interactions. However, a stress test of its components reveals significant redundancy, "prompt fluff," and maintenance burdens that likely outweigh the benefits for smaller tasks. It shines in complex, multi-session workflows but drags down simple operations.

---

## 1. Agents (The "Who")
**Verdict: Mostly Fluff**

*   **Analysis:** The agent files (`_DevTeam.agent.md`, etc.) are extremely sparse.
    *   `_DevTeam` is just a routing table.
    *   `Developer`, `Architect`, etc., likely contain generic "persona" instructions that modern LLMs (like Gemini/GPT-4) already internalize.
*   **Stress Test:** If I ask a complex architectural question to the "Developer" agent vs. the "Architect" agent, the *quality* of the answer depends more on the *context provided* than the persona file.
*   **Failure Mode:** "Agent Switching" adds latency and token cost without necessarily changing the output quality. The rigid delegation protocol (`Architect -> Developer -> Reviewer`) is often overkill for 90% of tasks.
*   **Recommendation:** Collapse into two modes: **Planner** (Architect/Manager) and **Executor** (Dev/Reviewer).

## 2. Knowledge (The "What")
**Verdict: High Potential, High Maintenance**

*   **Analysis:** `project_knowledge.json` is a flat list of entities.
    *   **Good:** It provides a "map" of the project that doesn't require reading every file.
    *   **Bad:** It is manually maintained (or requires a script). `upd:2025-12-28` tags suggest it's already becoming stale.
*   **Stress Test:** If I rename `PacketCrafting.tsx` to `PacketBuilder.tsx` but forget to update the JSON, the "Knowledge" actively lies to the agent.
*   **Failure Mode:** **Hallucination by Authority.** The LLM trusts the JSON over the file system until it reads the file system, causing conflict.
*   **Recommendation:** Automate knowledge generation (AST parsing) or delete it. Manual knowledge graphs are technical debt traps.

## 3. Instructions (The "How")
**Verdict: The Strongest Pillar**

*   **Analysis:** `phases.md` and `protocols.md` provide necessary structure.
    *   The **7-Phase Flow** (Context -> Plan -> ... -> Complete) forces the LLM to "think before acting," which is the #1 way to improve code generation.
    *   **Anti-Drift Gates** (`[SCOPE]`, `[ANCHOR]`) are excellent for keeping long sessions on track.
*   **Stress Test:** In a long session (30+ turns), these gates prevent the "lazy dev" syndrome where the LLM forgets the original constraints.
*   **Critique:** The syntax is verbose. `[PHASE: PLAN | 2/7 | "Designing..."]` is a lot of typing for a robot.
*   **Recommendation:** Keep the logic, simplify the syntax.

## 4. Skills (The "Patterns")
**Verdict: Redundant**

*   **Analysis:** `skills/testing/SKILL.md` contains generic advice ("Arrange-Act-Assert").
    *   **Reality Check:** Any competent coding model *already knows* Arrange-Act-Assert. Loading this file consumes context window for zero information gain.
*   **Stress Test:** If I load `frontend-react` skill, it might tell me to use hooks. I already know that.
*   **Failure Mode:** **Context Pollution.** Loading 5 "skills" fills the context with generic tutorials, pushing out actual project code.
*   **Recommendation:** Delete generic skills. Only keep **Project-Specific Patterns** (e.g., "How we do Auth in *this* specific app").

---

## Final Scorecard

| Component | Score | Verdict | Action |
|-----------|-------|---------|--------|
| **A**gents | D | Roleplay adds little value. | **Merge/Simplify** |
| **K**nowledge| C+ | Useful but dangerous if stale. | **Automate or Die** |
| **I**nstructions| A- | Essential for complex tasks. | **Keep & Refine** |
| **S**kills | F | Generic tutorials are noise. | **Purge Generics** |

## The "Fix It" Plan

1.  **Purge Skills:** Delete any skill file that just explains a standard library or concept. Keep only *project-specific* recipes.
2.  **Flatten Agents:** Stop switching "personas." Just have a "Planning Mode" and "Coding Mode."
3.  **Automate Knowledge:** Write a script that generates `project_knowledge.json` from the codebase (imports, class names) on pre-commit.
4.  **Simplify Protocol:** Reduce the required "chatty" protocol messages.

**Conclusion:** The framework is over-engineered. It tries to solve "LLM stupidity" with bureaucracy. Modern LLMs are smarter; they need *context*, not *micro-management*.
