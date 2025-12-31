# AKIS Analysis Reports

This directory contains periodic analysis reports for the AKIS (Agents, Knowledge, Instructions, Skills) framework.

## Running Analysis

### Quick Compliance Check
```bash
# Check compliance of all workflow logs
bash scripts/check_all_workflows.sh

# Check single workflow log
bash scripts/check_workflow_compliance.sh log/workflow/2025-12-31_120000_task.md
```

### Automated Measurements
The compliance checker validates 5 required emissions:
1. `[SESSION]` - Task start marker
2. `[AKIS_LOADED]` - Knowledge and skills loaded
3. `[PHASE:]` - Progress tracking
4. `[SKILLS_USED]` or `[METHOD]` - Skill application tracking
5. `[COMPLETE]` - Task completion marker

### Analysis Schedule

Recommended frequency: **Every 25 sessions** or **quarterly**

**Metrics to Track**:
- Protocol compliance: Target 80%+
- Skills usage tracking: Target 100%
- Knowledge quality: Maintain 85+/100
- Skills activation: Baseline measurement

## AKIS Components

| Component | Target | Status |
|-----------|--------|--------|
| Agents | <100 lines each | ✅ All compliant |
| Instructions | <200 lines each | ✅ All compliant |
| Skills | 100% YAML frontmatter | ✅ 13/13 complete |
| Knowledge | 85+/100 quality | ✅ Target met |

## Related Documentation

- [AKIS Framework](../../.github/copilot-instructions.md) - Main instructions
- [Compliance Scripts](../../scripts/check_workflow_compliance.sh) - Automated validation
- [Project Knowledge](../../project_knowledge.json) - Knowledge graph
