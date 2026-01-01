---
applyTo: '**'
---

# Protocols

## Session Boundaries

**Start**:
```
[SESSION: task_description] @mode
[CONTEXT] objective, scope, constraints
[AKIS_LOADED]
  entities: N entities from project_knowledge.json
  skills: skill-name, skill-name, skill-name (relevant to task)
  patterns: pattern1, pattern2
```

**Finish**:
```
[COMPLETE: task=desc | result=summary]
[DECISIONS] key choices with rationale
[TOOLS_USED] categories and purpose
[DELEGATIONS] agent tasks and outcomes
[COMPLIANCE] skills, patterns, gates
[AKIS_UPDATED] knowledge: added=N/updated=M | skills: used=#N,#M
```

## Delegation Format (_DevTeam only)

```
[DELEGATE: agent=Name | task=desc | skills=skill1,skill2]
#runSubagent Name "
Task: <description>
Context: <info>
Scope: <bounds>
Skills: skill1, skill2
Expect: RESULT_TYPE
"
```

**Specialist Return Format**:
```
[COMPLETE: task=desc | result=summary]
[DESIGN_DECISION] approach, rationale (Architect)
[IMPLEMENTATION_RESULT] changes, files (Developer)
[VALIDATION_REPORT] status, findings (Reviewer)
[FINDINGS] insights, recommendations (Researcher)

Skills: [skill1, skill2]
```

## Interrupts (100% MANDATORY)

**Auto-detect when**:
- User requests new task during active session
- Topic differs from current work
- User says "also", "meanwhile", "quick question"

**MANDATORY sequence**:
```
[PAUSE: task=current | phase=PHASE | progress=H/V]
State: <files modified, next operation, context>

[STACK: push | task=interrupt | depth=V+1 | parent=current]

<work on interrupt: progress=1/(V+1) → 7/(V+1)>

[STACK: pop | task=interrupt | depth=V | result=summary]

[RESUME: task=current | phase=PHASE | progress=H/V]
Restoring: <saved state>
```

**Example**: Main `progress=4/0` → interrupt → nested `progress=1/1` → complete `progress=7/1` → pop → resume `progress=4/0`

**Max depth**: 3 levels (L0, L1, L2, L3)
- At depth 3: Reject new interrupts, complete current first

## Examples

**Feature**:
```
[SESSION: Add JWT auth] @_DevTeam

#runSubagent Architect
Task: Design JWT auth with refresh tokens

#runSubagent Developer  
Task: Implement per design

#runSubagent Reviewer
Task: Validate implementation

[COMPLETE] Auth implemented | changed: 3 files
```

**Bug Fix**:
```
[SESSION: Fix token expiry] @_DevTeam

#runSubagent Researcher
Task: Investigate expiry issue
Result: Token set to 5min, too short

#runSubagent Developer
Task: Update to 30min

[COMPLETE] Expiry fixed | changed: security.py
```

**Direct Work**:
```
[SESSION: Fix typo] @Developer
[ATTEMPT #1] Correct spelling \u2192 \u2713
[COMPLETE] Typo fixed | changed: README.md
```
