# Templates

Standard formats for consistent output. Reference in agents and copilot-instructions.md.

---

## Agent Emission

**At [SESSION]**:
```
[SESSION: task_description] @mode

[CONTEXT]
- Objective: <clear goal>
- Scope: <what's included>
- Constraints: <limitations>

[AKIS_LOADED]
- Entities: <relevant entity names>
- Skills: #N, #M applicable
- Patterns: <from instructions>
```

**During work** (optional visibility):
```
[DECISION: question] → answer | rationale

[TOOLS: purpose]
- tool_name: specific_use
- tool_name: specific_use

[DELEGATE: agent=Name | task=description | reason=why]
```

**At interruption**:
```
[PAUSE: task=current | phase=PHASE_NAME]
- Progress: <what's done>
- Blocking: <what's needed>
- State: <context to resume>
```

**At completion**:
```
[COMPLETE: task=description | result=summary]

[DECISIONS]
- Key choice: rationale
- Key choice: rationale

[TOOLS_USED]
- tool(N): purpose
- tool(N): purpose

[DELEGATIONS]
- Agent: task → outcome

[COMPLIANCE]
- Skills: #N, #M applied
- Patterns: pattern_name followed
- Gates: all_passed

[AKIS_UPDATED]
- Knowledge: added=N | updated=M
- Skills: used=#N,#M
```

**Keep terse**: 3-5 decisions max, tool categories not every call, only significant delegations.

---

## Workflow Log

Use for significant work (>30 min). Includes measurable data for empirical analysis.

```markdown
# Workflow Log: [Task Description]

**Session**: YYYY-MM-DD_HHMMSS  
**Task**: [One-line description]  
**Agent**: [_DevTeam|Architect|Developer|Reviewer|Researcher]  
**Complexity**: [simple|medium|complex]  
**Duration**: [Xmin estimated]  
**Status**: [Completed|Blocked|Partial]

---

## Summary (2-3 sentences)

What was done, what was learned, what changed.

---

## Measurable Data

### Skills Used
- [ ] Skill name (from .claude/skills.md)
- [ ] Skill name

### Patterns Discovered
- Pattern name: brief description

### Tests
Status: [pass|fail|skip]  
Coverage: [N/A|unit|integration|e2e]  
Details: [what was tested or why skipped]

---

## Key Decisions

- Decision 1 → rationale
## Key Decisions

- Decision 1 → rationale
- Decision 2 → rationale

---

## Tool Usage

**Purpose**: [what tools accomplished]

- tool_name(N calls): specific use case
- tool_name(N calls): specific use case

---

## Files Changed

### `path/to/file.ext`
**Changes**: [one-line summary]  
**Impact**: [why it matters]

---

## Agent Interactions (if delegated)

### Agent Name
- **Role**: [responsibility]
- **Task**: [what was delegated]
- **Result**: [outcome]
- **Handoff**: [blocker|success]

---

## Compliance

- **Skills**: #N, #M applied from .claude/skills.md
- **Patterns**: pattern_name followed
- **Quality Gates**: [all passed|specific failures]

---

## Learnings

What would speed up similar work? What pattern is reusable?

---

## Metadata (automated analysis)

```yaml
session_id: YYYY-MM-DD_HHMMSS
agent: [name]
complexity: [simple|medium|complex]
duration_min: [N]
files_changed: [N]
skills_used: [N]
patterns_discovered: [N]
tests_status: [pass|fail|skip]
delegation_used: [true|false]
delegation_success: [true|false|N/A]
knowledge_updated: [true|false]
tools_used: [N unique tools]
decisions_made: [N key decisions]
compliance_score: [0-100]
```
```

**File**: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`

---

## Knowledge Entry

Format for `project_knowledge.json` and `global_knowledge.json` (JSONL).

**Entity**:
```json
{"type":"entity","name":"Domain.Module.Component","entityType":"type","observations":["desc, upd:YYYY-MM-DD"]}
```

**Codegraph**:
```json
{"type":"codegraph","name":"Component","nodeType":"class|service|page|component","dependencies":["Dep1","Dep2"],"dependents":["User1"]}
```

**Relation**:
```json
{"type":"relation","from":"ComponentA","to":"ComponentB","relationType":"USES|IMPLEMENTS|MODIFIES|VALIDATES|PROVIDES"}
```

**Rules**:
- Observations: 30-50 chars, include `upd:YYYY-MM-DD`
- Entity types: lowercase (service, feature, endpoint, model, page, component, pattern)
- Relation types: 5 core only (USES, IMPLEMENTS, MODIFIES, VALIDATES, PROVIDES)

---

## Skill Suggestion

For new reusable patterns discovered during work.

```
[SKILL_SUGGESTION: name=<SkillName> | category=<Quality|Process|Backend|Frontend|DevOps>]
Trigger: <when to apply>
Pattern: <approach>
Rules: 
- [ ] Checklist item 1
- [ ] Checklist item 2
- [ ] Checklist item 3
[/SKILL_SUGGESTION]
```

**Target**: `.claude/skills.md` (core) or `.claude/skills/domain.md` (project-specific)

---

## Design Decision (Architect)

```
## Decision: [What]
### Approach: [Solution]
### Why: [Benefits]
### Alternatives: [Rejected + reason]
```

---

## Investigation Report (Researcher)

```
## Investigation: [Topic]
### Found: [Key findings]
### Structure: [Organization]
### Patterns: [What + where]
```

---

**Usage**: Templates ensure consistency for automated analysis and cross-session learning.
