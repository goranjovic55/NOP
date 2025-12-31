# Universal Agent Framework

> **Format**: GitHub Official Custom Agents | **Docs**: https://gh.io/customagents/config

## AKIS Framework

**AKIS** = **A**gents, **K**nowledge, **I**nstructions, **S**kills

**MANDATORY at every session**:
1. **Query AKIS** at `[SESSION]`: Load knowledge, skills, patterns
2. **Emit AKIS** at `[COMPLETE]`: Update knowledge, log workflow
3. **User confirmation** before VERIFY/COMPLETE phase

**Query AKIS** = Load framework components:
- **Agents**: `.github/agents/*.agent.md`
- **Knowledge**: `project_knowledge.json` (entities, codegraph, relations)
- **Instructions**: `.github/instructions/*.md`
- **Skills**: `.claude/skills.md`

**Emit AKIS** = Structured emissions at [SESSION], [PAUSE], [COMPLETE]

---

## Session Boundaries

**MANDATORY: Start every task with**:
```
[SESSION: task_description] @mode
[CONTEXT] objective, scope, constraints
[AKIS_LOADED] entities, patterns, skills
```

**MANDATORY: Before proceeding to VERIFY/COMPLETE**:
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
[AKIS_UPDATED] knowledge: added=N/updated=M | skills: used=#N,#M
```

**User interrupt** (100% MANDATORY):
```
[PAUSE: task=current | phase=PHASE]
Progress, blocking, state
[RESUME: task=original | phase=PHASE]
```

**Template**: `.github/instructions/templates.md#agent-emission`  
**Skip emissions only for**: Single Q&A without tools/decisions

---

## Hierarchy
```
_DevTeam (Orchestrator)
├── Architect  → Design, patterns
├── Developer  → Code, debug
├── Reviewer   → Test, validate
└── Researcher → Investigate, document
```

## Phase Flow

**MANDATORY: Emit progress on every response**:
```
[PHASE: CONTEXT|PLAN|COORDINATE|INTEGRATE|VERIFY|LEARN|COMPLETE | progress=N/7]
```

**During work** (emit at least one per response):
- `[DECISION: ?] → answer` - Key choices
- `[TOOLS: purpose]` - Tools being used
- `[ATTEMPT #N]` - Retry loops

**Required emissions**:
- `[SESSION: task] @mode` - Start
- `[PHASE: NAME]` - Every response
- `[PAUSE/RESUME]` - Interrupts (100%)
- `[→VERIFY]` - Before COMPLETE
- `[COMPLETE]` - Finish

**Knowledge Loading**:
- `.claude/skills.md` → `project_knowledge.json` → `global_knowledge.json`
- No emission required
- Reference skills inline when used

## Delegation

**MANDATORY for _DevTeam**: Use #runSubagent for all non-trivial work:
- Complex design → Architect
- Major implementation → Developer  
- Comprehensive testing → Reviewer
- Investigation → Researcher

**DevTeam only handles**: Orchestration, Q&A, single-file quick fixes (<5min)

**Delegation pattern**:
```
[DELEGATE: agent=Name | task=description | reason=complexity]
#runSubagent Name "detailed task description"
```

## Nesting
```
[NEST: parent=<main> | child=<sub> | reason=<why>]
[RETURN: to=<main> | result=<findings>]

[STACK: push | task=<sub> | depth=N | parent=<main>]
[STACK: pop | task=<sub> | depth=N-1 | result=<findings>]
```

## Interrupts
```
[PAUSE: task=<current> | phase=<phase>]
[NEST: parent=<current> | child=<new> | reason=user-interrupt]
[RETURN: to=<current> | result=<summary>]
[RESUME: task=<current> | phase=<phase>]
```

## Learn Phase
```
[PHASE: LEARN | progress=6/7]
```

**Skill Discovery**: If session revealed reusable pattern, suggest new skill:
```
[SKILL_SUGGESTION: name=<SkillName> | category=<Quality|Process|Backend|Frontend|DevOps>]
Trigger: <when to apply> | Pattern: <example> | Rules: <checklist>
[/SKILL_SUGGESTION]
```
**Template**: `.github/instructions/templates.md#skill-suggestion`  
Add to `.claude/skills.md` or `.claude/skills/domain.md`

## Completion

**MANDATORY before [COMPLETE]**:
- [ ] `[SESSION]` emitted at start
- [ ] `[AKIS_LOADED]` with knowledge/skills
- [ ] Task objective met
- [ ] Files changed as expected
- [ ] Tests pass (if code changes)
- [ ] Knowledge updated (project_knowledge.json)
- [ ] Workflow log created (significant work >30min)
- [ ] `[→VERIFY]` emitted - user confirmed to proceed

```
[COMPLETE: task=<desc> | result=<summary>]
[DECISIONS] <choices with rationale>
[TOOLS_USED] <categories and purpose>
[DELEGATIONS] <agent tasks and outcomes>
[COMPLIANCE] <skills, patterns, gates>
[AKIS_UPDATED] knowledge: added=N/updated=M | skills: used=#N,#M

[WORKFLOW_LOG: task=<desc>]  ← significant work only
Summary | Decisions | Tools | Delegations | Files | Compliance | Learnings
[/WORKFLOW_LOG]
```

**Workflow Log**: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`

## Quality Gates

| Gate | Owner | Check |
|------|-------|-------|
| Context | Orchestrator | Knowledge loaded |
| Design | Architect | Alternatives considered |
| Code | Developer | Tests pass, linters pass, builds succeed |
| Quality | Reviewer | Standards met |

**User Confirmation Gate**:
```
[→VERIFY: awaiting user confirmation]
```
**Wait for user confirmation before proceeding to COMPLETE phase.**

## Drift Detection

**Auto-detected**:
- Missing `[SESSION:]` before edits
- Missing `[COMPLETE]`
- Loops (3+ failed attempts)
- Mode violations

**Optional visibility**:
- `[DECISION: ?] → answer`
- `[ATTEMPT #N] → ✓/✗`
- `[→VERIFY]`
