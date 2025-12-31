# Universal Agent Framework

> **Format**: GitHub Official Custom Agents | **Docs**: https://gh.io/customagents/config

## AKIS Framework

**AKIS** = **A**gents, **K**nowledge, **I**nstructions, **S**kills

**Query AKIS** = Load framework components:
- **Agents**: `.github/agents/*.agent.md`
- **Knowledge**: `project_knowledge.json` (entities, codegraph, relations)
- **Instructions**: `.github/instructions/*.md`
- **Skills**: `.claude/skills.md`

**Emit AKIS** = Structured emissions at [SESSION], [PAUSE], [COMPLETE]

---

## Session Boundaries

**Start** (query AKIS, use template):
```
[SESSION: task_description] @mode
[CONTEXT] objective, scope, constraints
[AKIS_LOADED] entities, patterns, skills
```

**Finish** (emit AKIS, use template):
```
[COMPLETE: task=desc | result=summary]
[DECISIONS] key choices with rationale
[TOOLS_USED] categories and purpose
[DELEGATIONS] agent tasks and outcomes
[COMPLIANCE] skills, patterns, gates
[AKIS_UPDATED] knowledge: added=N/updated=M | skills: used=#N,#M
```

**User interrupt**:
```
[PAUSE: task=current | phase=PHASE]
Progress, blocking, state
[RESUME: task=original | phase=PHASE]
```

**Template**: `.github/instructions/templates.md#agent-emission`  
**Skip for**: Q&A, clarifications

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

```
[PHASE: CONTEXT|PLAN|COORDINATE|INTEGRATE|VERIFY|LEARN|COMPLETE | progress=N/7]
```

**Required**:
- `[SESSION: task] @mode`
- `[COMPLETE] outcome | changed: files`
- `[PAUSE/RESUME]` on interrupts

**Optional**:
- `[DECISION: ?] → answer`
- `[ATTEMPT #N] → ✓/✗`
- `[→VERIFY]` before completion

**Knowledge Loading**:
- `.claude/skills.md` → `project_knowledge.json` → `global_knowledge.json`
- No emission required
- Reference skills inline when used

## Delegation

**Use #runSubagent when complexity justifies overhead**:
- Complex design → Architect
- Major implementation → Developer
- Comprehensive testing → Reviewer
- Investigation → Researcher

**Don't delegate**: Quick fixes, simple edits

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

## Knowledge
```
[KNOWLEDGE: added=N | updated=M | type=project|global]
```

**Format (JSONL)**:
```json
{"type":"entity","name":"Project.Domain.N]
[DECISIONS] <choices with rationale>
[TOOLS_USED] <categories and purpose>
[DELEGATIONS] <agent tasks and outcomes>
[COMPLIANCE] <skills, patterns, gates>
[KNOWLEDGE: added=N | updated=M]

[WORKFLOW_LOG: task=<desc>]  ← significant work only
Summary | Decision Diagram | Agent Interactions | Files | Quality Gates | Learnings
[/WORKFLOW_LOG]
```

**Before [COMPLETE]**:
- [ ] Task objective met
- [ ] Files changed as expected
- [ ] Tests pass (if code changes)
- [ ] Structured emission completed (template
[WORKFLOW_LOG: task=<desc>]
Summary | Decision Diagram | Agent Interactions | Files | Quality Gates | Learnings
[/WORKFLOW_LOG]
```

**Before [COMPLETE]**:
- [ ] Task objective met
- [ ] Files changed as expected
- [ ] Tests pass (if code changes)
- [ ] Workflow log created (significant work only)

**Workflow Log**: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`
- Document key decisions and outcomes
- 30-50 lines target (not exhaustive ceremony)

## Quality Gates

| Gate | Owner | Check |
|------|-------|-------|
| Context | Orchestrator | Knowledge loaded |
| Design | Architect | Alternatives considered |
| Code | Developer | Tests pass, linters pass, builds succeed |
| Quality | Reviewer | Standards met |

**User Confirmation Gate**:
```
[VERIFY: complete | awaiting user confirmation]
→ PAUSE: Confirm testing passed before proceeding to LEARN/COMPLETE
```

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
