---
applyTo: '**'
---

# Protocols

## Session
```
[SESSION: task] @mode
[COMPLETE] result | changed: files
```

## Delegation
```
#runSubagent Agent
Task: description
Context: relevant info
```

**Return**:
```
[COMPLETE] result | artifacts: files
```

## Interrupts
```
[PAUSE: current]
[RESUME: original]
```

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
