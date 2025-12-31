---
description: 'AKIS optimization from empirical workflow analysis'
mode: agent
---
# Update AKIS (Agents, Knowledge, Instructions, Skills)

**Agents**: Researcher→Developer→Reviewer  
**Sources**: `log/workflow/*.md`, `project_knowledge.json`, `.github/agents/`, `.github/instructions/`, `.github/skills/`

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
| 4 | Skills | Usage %, activation rate, pattern following | Add YAML frontmatter, update checklists, create new skills |

---

## Measurements

**Parse workflow logs**:
```bash
# Protocol compliance
grep -rh "\[SESSION\|\[AKIS_LOADED\|\[SKILLS" log/workflow/ | wc -l

# Skills usage
grep -rh "\[SKILLS_USED\]" log/workflow/*.md | sort | uniq -c
grep -rh "skills:" log/workflow/*.md | grep -oP '(?<=skills: )[^\n]+'

# YAML metadata
grep -rh "^complexity:\|^duration_min:\|^skills_used:" log/workflow/*.md

# Skill activation patterns
grep -rh "SKILLS:" log/workflow/ | grep -oP '(?<=SKILLS: )[^\]]+'
```

**Analyze skills**:
```bash
# Count skills
ls -1d .github/skills/*/ | wc -l

# Check YAML frontmatter
for skill in .github/skills/*/SKILL.md; do
  echo "$skill:"
  head -5 "$skill" | grep -E "^(name|description):"
done

# Skill usage frequency
grep -rh "SKILLS_USED" log/workflow/ | tr ',' '\n' | sort | uniq -c | sort -rn
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
| Skill usage | <30% | Review description, improve discoverability |
| Skill activation | <10% | Update YAML frontmatter, add keywords |
| Overhead | >40% quick tasks | Simplify emissions |
| Duplication | >50% overlap | Consolidate skills |
| Checklist ratio | <0.15 | Add actionable checklist items |
| Quality | <70/100 | Cleanup, add examples |
| Staleness | >60 days | Archive/update |
| Missing frontmatter | Any | Add YAML with name/description |

---

## Targets

| Component | Before | Target | Validation |
|-----------|--------|--------|------------|
| Agents | Delegation gaps | 80%+ success | Clear handoffs |
| Knowledge | 70/100 quality | 85+/100 | No dupes, timestamps |
| Instructions | 352 lines | <200 lines | 60%+ adoption |
| Skills | 17 skills, progressive disclosure | 20+ skills, 50%+ activation | YAML frontmatter, usage tracking |
| Framework | Protocol compliance | 80%+ sessions | HOW tracking, skill emissions |

---

## Outputs

- `.github/agents/*.agent.md` - Protocol fixes
- `project_knowledge.json` - Cleaned, deduplicated
- `.github/instructions/*.md` - Simplified protocols
- `.github/skills/*/SKILL.md` - Individual skills with YAML frontmatter, checklists, examples
- `docs/analysis/AKIS_OPTIMIZATION_YYYY-MM-DD.md` - Metrics, recommendations

### Skill Structure Requirements

Each skill must have:
```yaml
---
name: skill-name
description: When to use description. Use when [scenarios].
---

# Skill Title

## When to Use
- Scenario 1
- Scenario 2

## Pattern
Description

## Checklist
- [ ] Item 1
- [ ] Item 2

## Examples
```code```
```

---

## Success Criteria

Remeasure after 10 sessions:
```yaml
protocol_compliance: 80%+     # [SESSION], [AKIS_LOADED], [SKILLS] emissions
skills_activation: 50%+       # Skills auto-loaded by Copilot
skills_usage_tracking: 100%   # All sessions emit [SKILLS_USED]
knowledge_usage: 40%+         # from 14.3%
quality_score: 85+/100        # from 70
overhead_quick: <15%          # from 40%
skills_with_yaml: 100%        # All skills have frontmatter
```

### Skill-Specific Metrics
```bash
# Top 10 most used skills
grep -rh "SKILLS_USED" log/workflow/ | tr ',' '\n' | sort | uniq -c | sort -rn | head -10

# Skills never used (candidates for review)
comm -23 <(ls -1 .github/skills/) <(grep -rh "SKILLS_USED" log/workflow/ | tr ',' '\n' | sort -u)

# Average skills per session
grep -rh "SKILLS_USED" log/workflow/ | wc -l
grep -rh "\[SESSION" log/workflow/ | wc -l
```
