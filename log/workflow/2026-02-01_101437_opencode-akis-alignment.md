---
session:
  id: "2026-02-01_opencode-akis-alignment"
  complexity: simple

skills:
  loaded: [akis-dev, session, knowledge]

files:
  modified:
    - {path: ".opencode/instructions/protocols.md", domain: akis}
    - {path: ".opencode/instructions/workflow.md", domain: akis}
    - {path: ".opencode/instructions/architecture.md", domain: akis}
    - {path: ".opencode/instructions/quality.md", domain: akis}
    - {path: ".opencode/instructions/fullstack.md", domain: akis}
    - {path: ".opencode/instructions/build.md", domain: akis}
    - {path: ".opencode/skills/INDEX.md", domain: akis}
    - {path: "opencode.json", domain: config}
    - {path: ".opencode/agents/akis.md", domain: akis}
    - {path: ".opencode/agents/code.md", domain: akis}
    - {path: ".opencode/agents/debugger.md", domain: akis}
    - {path: ".opencode/agents/devops.md", domain: akis}
    - {path: ".opencode/agents/general.md", domain: akis, action: deleted}
    - {path: ".opencode/agents/explore.md", domain: akis, action: deleted}

agents:
  delegated: []

root_causes: []

gotchas:
  - "OpenCode uses 'mode: primary/subagent' instead of VS Code 'name:' field"
  - "OpenCode permissions use 'permission: bash: *: allow' format"
  - "OpenCode config is opencode.json, VS Code uses copilot-instructions.md"
---

# Session: OpenCode AKIS Alignment

## Summary
Replicated the .github AKIS framework structure in .opencode for OpenCode compatibility. Enabled YOLO mode and updated all agent permissions.

## Tasks
- ✅ [akis:START:session] Load knowledge + skills index
- ✅ [akis:WORK:akis-dev] Verify OpenCode AKIS structure matches VS Code  
- ✅ [akis:VERIFY:session] Confirm all gates passing

## Changes Made

### Files Created (8)
| File | Purpose |
|------|---------|
| `.opencode/instructions/protocols.md` | G2 enforcement, skill triggers, stats |
| `.opencode/instructions/workflow.md` | END phase, verification, log format |
| `.opencode/instructions/architecture.md` | Project structure, file placement |
| `.opencode/instructions/quality.md` | 50+ gotchas table, error protocol |
| `.opencode/instructions/fullstack.md` | Frontend+backend coordination |
| `.opencode/instructions/build.md` | Docker commands, command batching |
| `.opencode/skills/INDEX.md` | Skill detection table, combinations |

### Files Modified (5)
| File | Change |
|------|--------|
| `opencode.json` | Added `yolo: true` + `yolo_patterns` |
| `.opencode/agents/akis.md` | Updated permissions to YOLO mode |
| `.opencode/agents/code.md` | Updated permissions to YOLO mode |
| `.opencode/agents/debugger.md` | Updated permissions to YOLO mode |
| `.opencode/agents/devops.md` | Updated permissions to YOLO mode |
| `.opencode/agents/general.md` | Updated permissions to YOLO mode |

### Files Deleted (2)
| File | Reason |
|------|--------|
| `.opencode/agents/explore.md` | Not in VS Code AKIS framework |
| `.opencode/agents/general.md` | Not in VS Code AKIS framework |

## Structure Comparison (Final)

| Component | VS Code (.github) | OpenCode (.opencode) |
|-----------|-------------------|---------------------|
| Agents | 8 | 8 ✅ |
| Instructions | 6 | 6 ✅ |
| Skills | 13 | 13 ✅ |
| Skills Index | ✅ | ✅ |
| YOLO Mode | N/A | ✅ Enabled |

## Gates Passed
- G0: Knowledge loaded ✅
- G1: TODO tool used ✅
- G2: Skill loaded first ✅
- G3: START announced ✅
- G4: END phase complete ✅
- G5: Syntax verified ✅
- G6: Single ◆ active ✅
