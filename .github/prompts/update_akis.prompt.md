---
description: 'AKIS optimization from empirical workflow analysis'
mode: agent
---
# Update AKIS (Agents, Knowledge, Instructions, Skills)

**Agents**: Researcher→Developer→Reviewer  
**Sources**: `log/workflow/*.md`, `project_knowledge.json`, `.github/agents/`, `.github/instructions/`, `.claude/skills.md`

---

## Flow

```
Researcher: Measure all components → effectiveness signals
Developer: Apply optimizations → update files
Reviewer:  Validate improvements → verify metrics
```

| Step | Component | Measure | Optimize |
|------|-----------|---------|----------|
| 1 | Agents | Delegation success, handoff clarity | Fix protocols, clarify scope |
| 2 | Knowledge | Usage %, quality score, duplicates | Merge, standardize, archive |
| 3 | Instructions | Adoption %, size, overlap | Consolidate, make terse |
| 4 | Skills | Usage %, actionability ratio | Checklist format, integrate |

---

## Measurements

**Parse workflow logs**:
```bash
# Protocol compliance
grep -rh "\[SESSION\|\[KNOWLEDGE\|\[SKILLS" log/workflow/ | wc -l

# YAML metadata
grep -rh "^complexity:\|^duration_min:\|^skills_used:" log/workflow/*.md

# Pattern usage
grep -rh "skill #\|error handling\|security" log/workflow/ | wc -l
```

**Analyze knowledge**:
```bash
wc -l project_knowledge.json
python3 scripts/validate_knowledge.py  # duplicates, staleness, quality
```

**Calculate metrics**:
- Protocol compliance: `[SESSION]`, `[KNOWLEDGE]`, `[SKILLS]` count / total sessions
- Usage rate: Sessions using component / total sessions  
- Quality score: Freshness(20) + Relations(30) + NoDupes(20) + Observations(20) + Timestamps(10)
- Actionability: Checklist items / descriptive lines
- Overhead: Emissions count / duration for quick tasks

---

## Effectiveness Signals

| Signal | Threshold | Action |
|--------|-----------|--------|
| Usage | <30% | Make optional/remove |
| Overhead | >40% quick tasks | Simplify emissions |
| Duplication | >50% overlap | Consolidate |
| Actionability | <0.15 ratio | Transform to checklist |
| Quality | <70/100 | Cleanup pass |
| Staleness | >60 days | Archive/update |
| Delegation success | <80% | Fix handoffs |

---

## Targets

| Component | Before | Target | Validation |
|-----------|--------|--------|------------|
| Agents | Delegation gaps | 80%+ success | Clear handoffs |
| Knowledge | 70/100 quality | 85+/100 | No dupes, timestamps |
| Instructions | 352 lines | <200 lines | 60%+ adoption |
| Skills | 431 lines, 0% use | <100 lines, 40%+ use | 0.20+ actionability |
| Framework | 1,455 lines | <900 lines | 40%+ reduction |

---

## Outputs

- `.github/agents/*.agent.md` - Protocol fixes
- `project_knowledge.json` - Cleaned, deduplicated
- `.github/instructions/*.md` - Simplified
- `.claude/skills.md` - Terse checklists
- `docs/analysis/AKIS_OPTIMIZATION_YYYY-MM-DD.md` - Metrics, recommendations

---

## Success Criteria

Remeasure after 10 sessions:
```yaml
protocol_compliance: 80%+  # from 52.4%
knowledge_usage: 40%+      # from 14.3%
skills_usage: 40%+         # from 0%
framework_size: <900       # from 1,455
quality_score: 85+/100     # from 70
overhead_quick: <15%       # from 40%
```
