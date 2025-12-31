# AKIS Analysis Reports

This directory contains periodic analysis reports for the AKIS (Agents, Knowledge, Instructions, Skills) framework.

## Latest Analysis

**Date**: 2025-12-31  
**Report**: [AKIS_OPTIMIZATION_2025-12-31.md](./AKIS_OPTIMIZATION_2025-12-31.md)

### Key Findings
- ✅ Knowledge quality: 85.2/100 (Target: 85+)
- ✅ Skills structure: 13 skills with 100% YAML frontmatter
- ✅ Framework size: All components within limits
- ❌ Protocol compliance: 11.5% (Target: 80%+)
- ❌ Skills tracking: 3.8% (Target: 100%)

### Primary Issue
Framework **structure is excellent**, but agents are not consistently emitting required protocol markers in workflow logs. This is an **enforcement issue**, not a design issue.

### Solution
Automated compliance tools created:
- `scripts/check_workflow_compliance.sh` - Validate single log
- `scripts/check_all_workflows.sh` - Batch analysis

## Running Analysis

### Quick Check
```bash
# Check compliance of all workflow logs
bash scripts/check_all_workflows.sh
```

### Detailed Analysis
```bash
# Run measurements from update_akis workflow
bash .github/prompts/update_akis.prompt.md  # Commands in Measurements section

# Analyze knowledge quality
python3 -c "
import json
with open('project_knowledge.json', 'r') as f:
    knowledge = [json.loads(line) for line in f if line.strip()]
entities = len([e for e in knowledge if e.get('type') == 'entity'])
print(f'Total entities: {entities}')
"
```

### Full AKIS Optimization Cycle
Follow the workflow in `.github/prompts/update_akis.prompt.md`:
1. **Researcher**: Measure all components → effectiveness signals
2. **Developer**: Apply optimizations → update files
3. **Reviewer**: Validate improvements → verify metrics

## Analysis Schedule

Recommended frequency: **Every 25 sessions** or **quarterly**

### Next Review
**Target Date**: 2026-01-07 (after 10 new sessions)

**Metrics to Track**:
- Protocol compliance: Should improve to 80%+
- Skills usage tracking: Should improve to 100%
- Knowledge quality: Maintain 85+/100
- Skills activation: Measure new baseline

## Archive

Past analyses will be listed here as they accumulate.

---

**Related Documentation**:
- [Update AKIS Workflow](.github/prompts/update_akis.prompt.md) - Analysis methodology
- [AKIS Framework](.github/copilot-instructions.md) - Framework documentation
- [Project Knowledge](project_knowledge.json) - Knowledge graph
