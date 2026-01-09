# AKIS v6.3 Enforced Discipline Fix | 2026-01-09 | ~20min

## Summary
Fixed AKIS instruction compliance issue where agent was not consistently following START rules in default sessions. Root cause was the v6.0+ assumption that "Context pre-loaded via attachment" - but context is NOT pre-attached in standard Copilot sessions. Added HARD GATES enforcement and explicit START actions. Also audited and optimized all instruction files to be under token targets.

## Session Metrics
| Metric | Value |
|--------|-------|
| Duration | ~20min |
| Tasks | 8 completed / 8 total |
| Files Modified | 6 |
| Skills Loaded | 1 (akis-development) |
| Complexity | Medium |

## Workflow Tree
```
<MAIN> Fix AKIS instruction compliance
├─ <WORK> Analyze instruction files              ✓
├─ <WORK> Identify root causes                   ✓
├─ <WORK> Fix copilot-instructions.md            ✓
├─ <WORK> Align protocols.instructions.md        ✓
├─ <WORK> Update skills/INDEX.md + agent version ✓
├─ <WORK> Audit instruction files                ✓
├─ <WORK> Optimize instruction token counts      ✓
└─ <END> Create workflow log                     ✓
```

## Files Modified
| File | Changes |
|------|---------|
| .github/copilot-instructions.md | Added HARD GATES, explicit START actions, removed "pre-loaded" assumption |
| .github/instructions/protocols.instructions.md | Removed duplication, reduced 245→92 tokens |
| .github/instructions/quality.instructions.md | Removed stats table, reduced 158→69 tokens |
| .github/skills/INDEX.md | Updated to v6.3, added "Announce" rule |
| .github/agents/AKIS.agent.md | Updated version to v6.3 |
| project_knowledge.json | Added 2 new gotchas documenting this issue |

## Root Cause Analysis

### Problem
Agent was not consistently following START rules in default sessions, only when explicitly told to respect rules.

### Root Causes
1. **Incorrect Assumption**: `copilot-instructions.md` v6.0+ said "Context pre-loaded via attachment ✓ (skip explicit reads)" - but **context is NOT pre-attached** in standard Copilot sessions
2. **Missing Enforcement**: Default instructions lacked HARD GATES blocking rules that exist in AKIS.agent.md
3. **Over-optimization**: v6.0 prompt optimization focused on token reduction (70%+) and inadvertently removed critical enforcement language
4. **Instruction Duplication**: protocols.instructions.md duplicated content from copilot-instructions.md

### Solution
1. Added HARD GATES section with G1-G3 blocking rules at TOP of copilot-instructions.md
2. Changed START to explicit read commands:
   - `Read project_knowledge.json lines 1-4`
   - `Read .github/skills/INDEX.md`
3. Added G3 gate: "START not done → Do START steps first"
4. Removed misleading "pre-loaded" and "skip explicit reads" language
5. Made instruction files complementary, not duplicative

## Instruction Files Audit

| File | Before | After | Target | Status |
|------|--------|-------|--------|--------|
| protocols.instructions.md | 245 tokens | 92 tokens | <150 | ✅ |
| quality.instructions.md | 158 tokens | 69 tokens | <150 | ✅ |
| structure.instructions.md | 131 tokens | 101 tokens | <150 | ✅ |

## Skills Used
- .github/skills/akis-development/SKILL.md (for AKIS framework updates)

## Verification
```bash
python .github/scripts/audit.py --target instructions # 0 issues, all under target
git diff --stat                                       # 6 files changed
```

## Notes
- The key insight is that AKIS.agent.md (invoked via @AKIS) has explicit read commands and works well - but the default copilot-instructions.md was optimized to assume pre-loading that doesn't exist
- v6.3 now enforces: "Do ALL steps" in START, not "skip explicit reads"
- Instruction files should be complementary to main instructions, not duplicate them
- Added gotchas to project_knowledge.json for future reference
