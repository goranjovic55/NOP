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
  entities: N entities from project_knowledge.json
  skills: skill-name, skill-name, skill-name (relevant to task)
  patterns: pattern1, pattern2
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
- [ ] Skill name (from .github/skills/*/SKILL.md)
- [ ] Skill name

### Patterns Discovered
- Pattern name: brief description

### Tests
Status: [pass|fail|skip]  
Coverage: [N/A|unit|integration|e2e]  
Details: [what was tested or why skipped]

---

## Key Decisions

**Decision Tree** (complete flow):
```
Question 1?
├─ Option A → rationale → Result
└─ Option B (chosen) → rationale → led to Decision 2

Question 2?
├─ Option X → rationale  
└─ Option Y (chosen) → rationale → final approach
```

**Summary**:
- Decision 1 → rationale
- Decision 2 → rationale

---

## Tool Usage

**Purpose**: [what tools accomplished]

| Tool | Calls | Purpose | Key Results |
|------|-------|---------|-------------|
| tool_name | N | specific use | outcome |
| tool_name | N | specific use | outcome |

**Total**: N tools, M calls

---

## Delegations (if used)

### #runSubagent: Agent Name
- **Task**: [what was delegated]
- **Reason**: [complexity justification]
- **Input**: [context provided]
- **Output**: [findings/result]
- **Handoff**: [success|blocked|partial]
- **Integration**: [how result was used]

---

## Files Changed

### `path/to/file.ext`
**Changes**: [one-line summary]  
**Impact**: [why it matters]

---

## Agent Interactions (see Delegations section above)

_Complete delegation details documented in Delegations section_

---

## Compliance

- **Skills**: skill-name applied from .github/skills/
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

**Target**: `.github/skills/<skill-name>/SKILL.md` with YAML frontmatter

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
