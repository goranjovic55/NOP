# Universal Agent Framework

> **Format**: GitHub Official Custom Agents | **Docs**: https://gh.io/customagents/config

## ⚠️ CRITICAL - Session Start Protocol

**IF user message involves ANY action (not pure Q&A), IMMEDIATELY emit**:
```
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]
```

**Action indicators** (not exhaustive):
- Verbs: check, fix, add, create, update, refactor, investigate, implement, test, debug, optimize
- Will involve: file edits, git commits, docker operations, code changes, testing, deployment
- Multi-step work requiring coordination

**Skip protocol ONLY for**:
- Pure information queries ("what is X?", "explain Y")
- Single-sentence clarifications
- No files will be touched

**When in doubt → EMIT the protocol markers**

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

**Required emissions throughout session**:
1. `[SESSION: ...]` ← FIRST ACTION, before any tool use
2. `[PHASE: CONTEXT | progress=1/7]` ← SECOND ACTION, immediately after SESSION
3. `[SKILLS: loaded=N | available: #1,#2,#3...]` ← THIRD ACTION, list loaded skills
4. `[KNOWLEDGE: loaded | entities=N | sources=M]` ← FOURTH ACTION, confirm knowledge loaded
5. `[PHASE: PLAN | progress=2/7]` when designing solution
6. `[DECISION: ?]` for EVERY choice between alternatives
7. `[SKILL: #N Name | applied]` when USING a skill from loaded set
8. `[ATTEMPT #N]` for EVERY implementation iteration
9. `[SUBAGENT: Name]` for EVERY delegation (#runSubagent)
10. Track ALL phase transitions

**ENFORCEMENT**: These are REQUIRED, not optional. Protocol compliance tracked in workflow logs.
**VIOLATION CHECK**: Before any file edit, verify [SESSION:], [PHASE: CONTEXT], [SKILLS:], and [KNOWLEDGE:] were emitted.

**Knowledge Loading Protocol**:
```
Load order: `.claude/skills.md` → `project_knowledge.json` → `.github/global_knowledge.json`

[SKILLS: loaded=14 | available: #1-Code Standards, #2-Error Handling, #3-Security, #4-Testing, #5-Git & Deploy, #6-Knowledge, #7-Orchestration, #8-Handover, #9-Logging, #10-API Patterns, #11-UI Patterns, #12-Infrastructure, #13-Workflow Logs, #14-Context Switching]
[KNOWLEDGE: loaded | entities=50 | sources=2 (project_knowledge.json, global_knowledge.json)]
```

**Skill Usage Tracking**:
When applying a skill during work, emit:
```
[SKILL: #3 Security | applied] → Validating input sanitization
[SKILL: #10 API Patterns | applied] → Using FastAPI response model pattern
```

## Delegation

**Use #runSubagent for specialist work**:
| Situation | Agent |
|-----------|-------|
| Design decision | #runSubagent Architect |
| Code implementation | #runSubagent Developer |
| Testing/validation | #runSubagent Reviewer |
| Investigation | #runSubagent Researcher |

**Don't delegate**: Simple edits, clarifications, knowledge updates

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
Add to `.claude/skills.md` or `.claude/skills/domain.md`

## Knowledge
```
[KNOWLEDGE: added=N | updated=M | type=project|global]
```

**Format (JSONL)**:
```json
{"type":"entity","name":"Project.Domain.Name","entityType":"Type","observations":["desc","upd:YYYY-MM-DD"]}
{"type":"codegraph","name":"Component","nodeType":"class","dependencies":[],"dependents":[]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
```

**Files**: `project_knowledge.json` (root) | `global_knowledge.json` (.github/)

## Completion
```
[COMPLETE: task=<desc> | result=<summary> | learnings=N]

[WORKFLOW_LOG: task=<desc>]
Summary | Decision Diagram | Agent Interactions | Files | Quality Gates | Learnings
[/WORKFLOW_LOG]
```

**Checklist Before [COMPLETE]**:
- [ ] All quality gates passed
- [ ] Knowledge updated (project_knowledge.json)
- [ ] **Workflow log with Decision Diagram**
- [ ] All [DECISION:], [ATTEMPT:], [SUBAGENT:] documented
- [ ] Rejected alternatives with reasons
- [ ] Changes committed (if applicable)

**Workflow Log**: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`
- **MUST include Decision Diagram** showing: [DECISION: ?], [ATTEMPT #N], [SUBAGENT: Name], ✓/✗, rejected paths

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

## Session Tracking Checklist

**START OF EVERY TASK - Emit immediately**:
```
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]
[SKILLS: loaded=N | available: #1,#2,#3...]
[KNOWLEDGE: loaded | entities=N | sources=M]
```

**During task execution**:
- [ ] Emit `[SESSION:]` at start ← **FIRST ACTION**
- [ ] Emit `[PHASE: CONTEXT | progress=1/7]` ← **SECOND ACTION**
- [ ] Emit `[SKILLS: loaded=N | available: ...]` ← **THIRD ACTION**
- [ ] Emit `[KNOWLEDGE: loaded | entities=N | sources=M]` ← **FOURTH ACTION**
- [ ] Emit `[PHASE: PLAN | progress=2/7]` when designing
- [ ] Emit `[DECISION: ?]` for every choice
- [ ] Emit `[SKILL: #N Name | applied]` when using a skill
- [ ] Emit `[ATTEMPT #N]` for every implementation try
- [ ] Use `#runSubagent` for specialist work → Emit `[SUBAGENT: Name]`
- [ ] Emit `[PHASE: INTEGRATE | progress=4/7]`
- [ ] Emit `[PHASE: VERIFY | progress=5/7]` with validation
- [ ] Emit `[KNOWLEDGE:]` for learnings captured
- [ ] Emit `[COMPLETE:]` with workflow log ← **Decision Diagram required**

**STOP and check**: If implementing without emitting these, you're drifting.
