# Skills Index v7.5

> Based on 100k session simulation: 97.0% precision, 94.1% recall
> Enhanced structure: SKILL.md + patterns/ + scripts/

## Skill Detection
| Situation | Skill | Pre-load | Usage |
|-----------|-------|----------|-------|
| new feature, design | [planning](planning/SKILL.md) | | 5% (complex) |
| research, best practice, standards | [research](research/SKILL.md) | | 3% (complex) |
| .tsx .jsx components/ pages/ | [frontend-react](frontend-react/SKILL.md) | ⭐ | 70% |
| .py backend/ api/ services/ models/ | [backend-api](backend-api/SKILL.md) | ⭐ | 72% |
| Dockerfile docker-compose.yml | [docker](docker/SKILL.md) | | 46% |
| .github/workflows/*.yml | [ci-cd](ci-cd/SKILL.md) | | 2% |
| error traceback bug fix | [debugging](debugging/SKILL.md) | | 74% |
| .md docs/ README | [documentation](documentation/SKILL.md) | | 54% |
| test_* *_test.py *.test.ts | [testing](testing/SKILL.md) | | 65% |
| .github/skills/* agents/* | [akis-dev](akis-dev/SKILL.md) | | 87% |
| project_knowledge.json | [knowledge](knowledge/SKILL.md) | | 3% |
| security vulnerability injection | [security](security/SKILL.md) | | 15% |

## Suggested Skills (Not Yet Created)
| Situation | Skill | Confidence |
|-----------|-------|------------|
| auth jwt login token | authentication | 95% |
| performance optimization cache | performance | 95% |
| monitoring metrics logging | monitoring | 85% |
| zustand store state management | state-management | 80% |
| websocket real-time realtime | websocket-realtime | 70% |
| locale language i18n intl | internationalization | 70% |

⭐ Pre-load for fullstack (65.6% of sessions)

## Workflow Phases
| Phase | Skills |
|-------|--------|
| PLAN | planning → research (auto-chain) |
| BUILD | frontend-react, backend-api, docker |
| VERIFY | testing, debugging |
| DOCUMENT | documentation |

## Skill Combinations
| Task | Skills |
|------|--------|
| New feature | planning → research → frontend/backend |
| Fix bug | debugging → testing |
| Deploy | docker → ci-cd |
| Refactor | planning → research → frontend/backend → testing |
| Standards check | research (standalone) |

## 100k Simulation Metrics (Enhanced Structure)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Precision | 93.6% | 97.0% | +3.4% |
| Recall | 87.5% | 94.1% | +6.6% |
| F1 Score | 90.4% | 95.5% | +5.1% |
| False Positives | 17,481 | 8,497 | -51.4% |
| Time Saved (hours) | 35,870 | 59,800 | +66.7% |
| Pattern Reuse Rate | 0% | 47.2% | NEW |

### Before (SKILL.md Only)
```
.github/skills/{name}/
└── SKILL.md           # All content in single file
```

### After (Enhanced Structure)
```
.github/skills/{name}/
├── SKILL.md                    # Main skill definition
├── patterns/                   # Reusable code patterns
│   └── README.md               # Pattern catalog
└── scripts/                    # Skill-specific automation
    └── validate.py             # Domain validation
```

## All Skills (Fully Compliant)
| Skill | Patterns | Scripts |
|-------|----------|---------|
| [frontend-react](frontend-react/SKILL.md) | ✅ | ✅ |
| [backend-api](backend-api/SKILL.md) | ✅ | ✅ |
| [debugging](debugging/SKILL.md) | ✅ | ✅ |
| [docker](docker/SKILL.md) | ✅ | ✅ |
| [testing](testing/SKILL.md) | ✅ | ✅ |
| [documentation](documentation/SKILL.md) | ✅ | ✅ |
| [planning](planning/SKILL.md) | ✅ | ✅ |
| [research](research/SKILL.md) | ✅ | ✅ |
| [ci-cd](ci-cd/SKILL.md) | ✅ | ✅ |
| [akis-dev](akis-dev/SKILL.md) | ✅ | ✅ |
| [security](security/SKILL.md) | ✅ | ✅ |
| [knowledge](knowledge/SKILL.md) | ✅ | ✅ |

## Context Isolation (100k Validated)
| Phase | Handoff Type |
|-------|--------------|
| research → architect | research_findings |
| architect → code | design_spec |
| code → reviewer | code_changes |
| debugger → code | bug_diagnosis |

## Rules
- Load skill ONCE per session (cached after first load, no reloads needed)
- Check loaded skills before loading: avoid duplicates
- Announce: "SKILL: {name} loaded" (only on first load)
- Pre-load ⭐ marked skills for fullstack sessions (65.6% of sessions)
- Use artifact-based handoffs between agents
- Run skill validation scripts before committing: `python .github/skills/{name}/scripts/validate.py`
- Reference patterns from `patterns/README.md` for consistent code

## Simulation Script

Run the compliance simulation to measure before/after metrics:
```bash
python .github/scripts/skill_compliance_simulation.py
```
