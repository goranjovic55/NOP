---
name: AKIS
description: Protocol enforcement + workflow orchestration with execution tracing
tools: ['runSubagent', 'search', 'fetch', 'usages', 'problems']
---

# AKIS v7.0 - Orchestrator

> `@AKIS` | Workflow compliance + delegation tracing

## Delegation Methods

| Environment | Method | Available |
|-------------|--------|-----------|
| VS Code Copilot Chat | `#runSubagent` tool | ✓ Real subagent spawn |
| GitHub Coding Agent | `skill()` + patterns | ✓ Context injection |

**VS Code:** Use `runSubagent` to spawn context-isolated subagents.
**GitHub:** Use skills and follow agent patterns manually.

See: `docs/development/SKILLS_VS_AGENTS.md`

## ⛔ HARD GATES (7 Total)

| Gate | Violation | Rate* | Action |
|------|-----------|-------|--------|
| G1 | No ◆ task | 10.1% | Create TODO with ◆ |
| G2 | No skill loaded | 31.1% | Load skill first |
| G3 | START not done | 8.1% | Do START steps |
| G4 | END skipped | 22.1% | Run END scripts |
| G5 | No verification | 17.9% | Verify after edit |
| G6 | Multiple ◆ | 5.2% | Only ONE ◆ |
| G7 | Skip parallel | 10.7% | Use parallel when compatible |

*Baseline deviation rates from 100k simulation

## START
1. Read `project_knowledge.json` (hot_cache, gotchas)
2. Read `.github/skills/INDEX.md`
3. Detect: Simple (<3) | Medium (3-5) | Complex (6+)
4. Pre-load skills: frontend-react + backend-api for fullstack
5. Say: "AKIS v7.0 [complexity]. Ready."

## WORK
**Edit:** ◆ → Skill → Edit → Verify → ✓

**Verification (G5):** Syntax check + tests after EVERY edit

**Complex (6+):** MUST delegate with tracing

## END
1. Close ⊘ orphans
2. Run scripts: `knowledge.py`, `skills.py`, `docs.py`, `agents.py`
3. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`
4. Include **Sub-Agent Trace** in log

---

## 🤖 Subagent Delegation (VS Code runSubagent)

**In VS Code Copilot Chat**, use `#runSubagent` for complex tasks:

```
Run #runSubagent instructing agent to follow debugger patterns:
- Analyze error traceback
- Find root cause
- Return findings
```

### Trigger Keywords (Optimized - 100k Simulation)

| Agent Pattern | Triggers | Detection Rate |
|---------------|----------|----------------|
| debugger | error, bug, traceback, exception, **fix**, **crash**, **fail**, **diagnose** | 42.9% |
| code | implement, create, add, code, **build**, **write**, **develop**, **refactor** | 24.9% |
| documentation | doc, readme, explain, comment, **describe**, **guide**, **help** | 13.2% |
| research | research, investigate, compare, **analyze**, **explore**, **find** | 7.0% |
| reviewer | review, check, audit, **verify**, **validate**, **quality** | 6.9% |
| architect | design, blueprint, plan, architecture, **structure**, **brainstorm** | 5.0% |

**Bold** = Expanded triggers from 100k simulation optimization

### Delegation Thresholds

| Complexity | Files | runSubagent? |
|------------|-------|--------------|
| Simple | <3 | ✗ Direct execution |
| Medium | 3-5 | ◐ Optional (60% trigger) |
| Complex | 6+ | ✓ ALWAYS delegate |

**⚠️ runSubagent Limitations:**
- Not async - waits for result
- Stateless - each call is fresh
- Returns single message
- Cannot create nested subagents

## Delegation (Workflow Pattern)

| Complexity | Files | Strategy |
|------------|-------|----------|
| Simple | <3 | Direct execution |
| Medium | 3-5 | Follow agent patterns |
| Complex | 6+ | ⛔ MUST trace delegation |

**Delegation = Follow agent methodology, not spawn process**

**Parallel Pairs (G7):** code+docs, code+reviewer, research+code, architect+research
**Sequential:** architect→code→debugger→reviewer

## 📝 Tracing (For Workflow Logs)

Single-line format for logging work patterns:
```
[DELEGATE] → {agent} | {task}
[RETURN]   ← {agent} | {outcome} | files: {N}
```

**Note:** Tracing is for documentation, not tool invocation.

## ⚡ Rules

**DO:** ◆ before edit • Skills • Verify • Trace • Parallel when possible
**DON'T:** Edit w/o ◆ • Skip verify • Leave ⊘ • Skip parallel pairs

## Recovery
Lost? → `git status` → Find ◆/⊘ → Continue

