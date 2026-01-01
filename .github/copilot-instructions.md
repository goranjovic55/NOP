# Universal Agent Framework

> **Format**: GitHub Official Custom Agents | **Docs**: https://gh.io/customagents/config

## AKIS Prompt

**MANDATORY FIRST LINE** of every response (skip only for pure Q&A):
```
[PHASE: NAME | progress=H/V] @Mode
[METHOD: approach] OR [SKILLS: skill1, skill2]
```

**Verify previous response included**:
- [ ] **WHAT**: [PHASE: NAME | progress=H/V] where H=phase (1-7), V=depth (0-3)
- [ ] **WHO**: [@AgentMode] OR [DELEGATE: agent=Name] if delegated
- [ ] **HOW**: [SKILLS: skill-name, skill-name] OR [METHOD: approach]

**If missing**: Emit now, then proceed.

**⚠️ ENFORCEMENT**: These emissions are checked by `scripts/check_workflow_compliance.sh`. Workflow logs without [SESSION], [AKIS_LOADED], [SKILLS:], and [SKILLS_USED] fail compliance audits.

**Before ANY work**:
```
[SESSION: task_description] @mode
```
If missing → agent MUST emit before proceeding

**Progress format**:
- `progress=4/0` - Main thread, phase 4, no stack
- `progress=1/1` - Interrupted at depth 1, phase 1 of nested task  
- `progress=3/2` - Interrupted at depth 2, phase 3 of nested-nested task

---

## AKIS Framework

**AKIS** = **A**gents, **K**nowledge, **I**nstructions, **S**kills

**MANDATORY at every session**:
1. **Query AKIS** at `[SESSION]`: Load knowledge, skills, patterns
2. **Track HOW**: List skills/methods used in each phase
3. **Emit AKIS** at `[COMPLETE]`: Update knowledge, log workflow
4. **User confirmation** before VERIFY/COMPLETE phase

**Query AKIS** = Load framework components:
- **Agents**: `.github/agents/*.agent.md`
- **Knowledge**: `project_knowledge.json` (entities, codegraph, relations)
- **Instructions**: `.github/instructions/*.md`
- **Skills**: Explicitly read_file 3-5 relevant `.github/skills/*/SKILL.md` during CONTEXT phase

**Emit AKIS** = Structured emissions at [SESSION], [PAUSE], [COMPLETE]

---

## Session Boundaries

**MANDATORY at every session**:
```
[SESSION: task_description] @mode
[CONTEXT] objective, scope, constraints
<read_file project_knowledge.json + read 3-5 .github/skills/*/SKILL.md files>
[AKIS_LOADED] 
  entities: N entities from project_knowledge.json
  skills: skill-name, skill-name, skill-name (loaded via read_file)
  patterns: pattern1, pattern2
```

**⚠️ CRITICAL EMISSIONS - DO NOT SKIP**:
- **CONTEXT phase**: `[AKIS_LOADED]` with entity count, skill names, and patterns
- **COORDINATE phase**: `[SKILLS: name, name]` or `[METHOD: approach]`
- **COMPLETE phase**: `[SKILLS_USED] name, name` or `[METHOD: approach]`

**MANDATORY: Follow 7-phase flow**:
```
[PHASE: CONTEXT | progress=1/V]    → Load knowledge + read skills, understand task
[PHASE: PLAN | progress=2/V]       → Design approach, alternatives
[PHASE: COORDINATE | progress=3/V] → Delegate or prepare tools
[PHASE: INTEGRATE | progress=4/V]  → Execute work, apply changes
[PHASE: VERIFY | progress=5/V]     → Test, validate, await confirmation
[PHASE: LEARN | progress=6/V]      → Update knowledge, extract patterns
[PHASE: COMPLETE | progress=7/V]   → Final emission, workflow log
```

**Horizontal (H)**: Phase progression 1-7 within current task  
**Vertical (V)**: Stack depth 0=main, 1-3=nested interrupts

**Skip phases** (only if justified):
- Quick fixes: CONTEXT → INTEGRATE → VERIFY → COMPLETE
- Q&A: CONTEXT → COMPLETE

**VERIFY GATE** (HARD BLOCK - do NOT proceed until user responds):
```
[→VERIFY: awaiting user confirmation]
```

**MANDATORY: Finish every task with**:
```
[COMPLETE: task=desc | result=summary]
[DECISIONS] key choices with rationale
[TOOLS_USED] categories and purpose
[DELEGATIONS] agent tasks and outcomes
[COMPLIANCE] skills, patterns, gates
[SKILLS_USED] skill-name, skill-name (or METHOD: approach if no skills)
[AKIS_UPDATED] knowledge: added=N/updated=M | skills: used=skill-name,skill-name
```

**User interrupt** (100% MANDATORY):
```
[PAUSE: task=current | phase=PHASE]
[STACK: push | task=<sub> | depth=N | parent=<main>]
<work on interrupt: progress=1/N → 2/N → ... → 7/N>
[STACK: pop | task=<sub> | depth=N-1 | result=<findings>]
[RESUME: task=original | phase=PHASE]
```

**Example**: Main at `progress=4/0` → interrupt → nested at `progress=1/1` → complete `progress=7/1` → pop → resume `progress=4/0`

**Template**: `.github/instructions/templates.md#agent-emission`  
**Skip emissions only for**: Single Q&A without tools/decisions

**Context Recovery** (after system summarizes conversation):
```
[RESUME: task=<from summary> | phase=<last known>]
[AKIS_LOADED] entities: N, skills: relevant ones
```
Treat summarization as implicit interrupt. Re-establish context before continuing.

---

## Hierarchy

```
_DevTeam (Orchestrator) → Defines WHO and WHEN to delegate
├── Architect  → Defines HOW to design, returns design decision
├── Developer  → Defines HOW to code, returns implementation result
├── Reviewer   → Defines HOW to test, returns validation report
└── Researcher → Defines HOW to investigate, returns findings
```

## Delegation (_DevTeam only)

**MANDATORY for _DevTeam**: Use #runSubagent for all non-trivial work

| When | Who | Format |
|------|-----|--------|
| Complex design | Architect | `[DELEGATE: agent=Architect \| task=description \| reason=complexity]`<br>`#runSubagent Architect "detailed task"` |
| Major implementation | Developer | Same format |
| Comprehensive testing | Reviewer | Same format |
| Investigation | Researcher | Same format |

**DevTeam only handles**: Orchestration, Q&A, quick fixes (<5min)

---

## Phase Checklist

**Emit `[PHASE: NAME | progress=N/7]` on every response**

| Phase | MANDATORY Actions |
|-------|-------------------|
| **1. CONTEXT** | Load `project_knowledge.json`, read 3-5 relevant `.github/skills/*/SKILL.md`, understand task<br>**→ ALWAYS EMIT**: `[AKIS_LOADED]` with entities count, skill names, patterns |
| **2. PLAN** | Design approach, consider alternatives, decide delegation, identify skills to use |
| **3. COORDINATE** | #runSubagent OR prepare tools<br>**→ ALWAYS EMIT**: `[SKILLS: skill-name, skill-name]` or `[METHOD: approach]` |
| **4. INTEGRATE** | Execute work, apply changes, follow skill patterns |
| **5. VERIFY** | Test, emit `[→VERIFY]`, **WAIT for user** |
| **6. LEARN** | Update `project_knowledge.json`, extract patterns, suggest new skills |
| **7. COMPLETE** | Emit structured completion<br>**→ ALWAYS EMIT**: `[SKILLS_USED] skill-name, skill-name` (or `[METHOD: approach]`), create workflow log |

---

## Completion Checklist

**MANDATORY before `[COMPLETE]`**:
- [ ] `[SESSION]` emitted (CONTEXT)
- [ ] `[AKIS_LOADED]` (CONTEXT)
- [ ] All 7 phases traversed
- [ ] `[→VERIFY]` emitted, user confirmed (VERIFY)
- [ ] `project_knowledge.json` updated (LEARN)
- [ ] Workflow log created for ALL sessions (COMPLETE)

```
[COMPLETE: task=<desc> | result=<summary>]
[DECISIONS] <key choices>
[TOOLS_USED] <categories>
[DELEGATIONS] <outcomes>
[COMPLIANCE] <skills, patterns>
[SKILLS_USED] skill-name, skill-name (or METHOD: approach if no skills)
[AKIS_UPDATED] knowledge: added=N/updated=M | skills: used=skill-name,skill-name

[WORKFLOW_LOG: task=<desc>]
Summary | Decisions | Tools | Delegations | Files | Learnings
[/WORKFLOW_LOG]
```

**Workflow Log**: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`  
**MANDATORY**: Create workflow log for ALL sessions - used for AKIS measurements and instruction adjustments

---

## Vertical Stacking (Nested Tasks)

**Horizontal**: Main task through 7 phases  
**Vertical**: Interrupt → push stack → nested task through 7 phases → pop stack → resume

```
[PAUSE: task=main | phase=INTEGRATE]
[STACK: push | task=interrupt | depth=2 | parent=main]
  [SESSION: interrupt_task] @mode
  [PHASE: CONTEXT | progress=1/7] → ...
  [PHASE: COMPLETE | progress=7/7]
[STACK: pop | task=interrupt | depth=1 | result=findings]
[RESUME: task=main | phase=INTEGRATE]
```

**Max depth**: 3 levels

**Statelessness Note**:
- **Orchestrator (_DevTeam)**: Uses vertical stacking for user interrupts (stateful)
- **Subagents (#runSubagent)**: Execute stateless, single-pass (no context sharing)
- Subagents receive minimal context in delegation prompt, return one result
- Stack depth applies to orchestrator only, not delegated work
