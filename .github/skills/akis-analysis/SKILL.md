---
name: akis-analysis
description: AKIS framework edge case analysis and continuous improvement. Use when analyzing compliance or improving framework.
---

# AKIS Edge Case Analysis

## When to Use
- Monthly compliance review
- Compliance drops below 75%
- User requests "analyze akis", "edge case analysis", "framework improvements"
- After major protocol changes

## Pattern
Load Logs → Analyze → Simulate → Propose → Implement

## Methodology

**1. Load Workflow Logs**
- Sample 20-30 recent from `log/workflow/*.md`
- Focus on last 30 days

**2. Run Compliance Check**
```bash
bash scripts/check_all_workflows.sh
```
Extract baseline metrics

**3. Identify Failure Patterns**
- Missing emissions (SESSION, AKIS_LOADED, SKILLS_USED)
- Protocol violations (skipped phases, no PAUSE/RESUME)
- Context loss (multi-thread sessions)
- Knowledge gaps (silent failures)

**4. Simulate Edge Cases**
- Extract frequency data from logs
- Categorize by type (protocol, context, knowledge, etc.)
- Determine severity (CRITICAL, HIGH, MEDIUM, LOW)
- Calculate impact (% affected)

**5. Propose Adjustments**
- Specific file changes (terse, high-impact)
- Blocking gates for critical emissions
- Auto-detect mechanisms
- Error recovery protocols

**6. Measure Improvement**
- Baseline → Target compliance
- Projected % reduction in failures
- ROI calculation

**7. Implement Critical Fixes**
- Week 1: Critical (highest impact)
- Apply to framework files
- Validate with compliance checker

## Checklist
- [ ] Load 20-30 workflow logs
- [ ] Run compliance checker, extract baseline
- [ ] Identify top 10 failure patterns
- [ ] Simulate edge cases with frequency data
- [ ] Create analysis document (scenarios, root causes, fixes)
- [ ] Create implementation guide (terse, actionable)
- [ ] Apply Week 1 critical fixes
- [ ] Measure improvement (re-run compliance)
- [ ] Update project_knowledge.json

## Output Format

**Analysis Document**:
- Executive summary (baseline, target, gap)
- 20-30 edge case scenarios
- Each: frequency, severity, root cause, prevention, AKIS adjustment, measured improvement
- Summary table with projections
- Implementation priority (phases)

**Implementation Guide**:
- Specific file modifications (diff format)
- Week-by-week roadmap
- Validation procedures
- Measurement plan

**Applied Fixes**:
- Actual edits to framework files
- Terse style, no bloat
- High-impact blocking gates

## Example Triggers
- "Analyze AKIS compliance and suggest improvements"
- "Run edge case analysis on workflow logs"
- "Framework compliance review"
- "Simulate failure scenarios from logs"

## Success Criteria
- Compliance increase >30% after Week 1 fixes
- All critical scenarios documented
- Terse adjustments applied to framework
- Validation shows improvement
