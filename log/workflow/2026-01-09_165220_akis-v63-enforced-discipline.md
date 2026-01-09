# AKIS v6.3 Enforced Discipline Fix | 2026-01-09 | ~25min

## Summary
Fixed AKIS instruction compliance issue where agent was not consistently following START rules in default sessions. Root cause was the v6.0+ assumption that "Context pre-loaded via attachment" - but context is NOT pre-attached in standard Copilot sessions. Added HARD GATES enforcement and explicit START actions. Also audited and optimized all instruction files and enhanced skills with actionable guidance.

## Session Metrics
| Metric | Value |
|--------|-------|
| Duration | ~25min |
| Tasks | 10 completed / 10 total |
| Files Modified | 7 |
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
├─ <WORK> Enhance docker skill with gotchas      ✓
├─ <WORK> Add delegation guidance to main file   ✓
└─ <END> Create workflow log                     ✓
```

## Files Modified
| File | Changes |
|------|---------|
| .github/copilot-instructions.md | Added HARD GATES, explicit START, delegation guidance |
| .github/instructions/protocols.instructions.md | Removed duplication, added delegation, reduced tokens |
| .github/instructions/quality.instructions.md | Reduced 158→69 tokens |
| .github/skills/docker/SKILL.md | Added Critical Gotchas, Auto-Detect Environment table |
| .github/skills/INDEX.md | Updated to v6.3, added "Announce" rule |
| .github/agents/AKIS.agent.md | Updated version to v6.3 |
| project_knowledge.json | Added 2 new gotchas documenting this issue |

## Root Cause Analysis

### Problem
1. Agent not following START rules in default sessions
2. Docker skill not effectively guiding dev vs prod usage
3. Sub-agents not being used optimally

### Root Causes
1. **Incorrect Assumption**: Instructions assumed "Context pre-loaded" - NOT true in standard sessions
2. **Missing Enforcement**: Default instructions lacked HARD GATES
3. **Over-optimization**: v6.0 token reduction removed critical enforcement language
4. **Skills too terse**: Docker skill lacked decision logic (when to use dev)
5. **No delegation guidance**: Main instructions didn't explain when to delegate

### Solution
1. Added HARD GATES section with G1-G3 blocking rules
2. Changed START to explicit read commands
3. Enhanced docker skill with:
   - ⚠️ Critical Gotchas section (restart≠rebuild)
   - Auto-Detect Environment table
4. Added Delegation section to copilot-instructions.md
5. Made instruction files complementary, not duplicative

## Skills Audit

| Skill | Tokens | Status |
|-------|--------|--------|
| docker | 152 | ✅ Enhanced with gotchas |
| documentation | 150 | ✅ |
| backend-api | 164 | ✅ |
| frontend-react | 176 | ✅ |
| knowledge | 179 | ✅ |
| debugging | 153 | ✅ |
| testing | 148 | ✅ |
| akis-development | 137 | ✅ |
| ci-cd | 119 | ✅ |

## Verification
```bash
python .github/scripts/audit.py --target skills       # 0 issues
python .github/scripts/audit.py --target instructions # 0 issues
git diff --stat                                       # 7 files changed
```

## Notes
- Docker skill now has explicit "restart ≠ rebuild" warning at top
- Delegation table added to main instructions (Simple/Medium/Complex)
- All skills now under 200 token target
