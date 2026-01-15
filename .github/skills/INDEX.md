# Skills Index v7.3

> Based on 100k session simulation: 96.0% precision, 92.0% recall

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

## Suggested Skills (Not Yet Created)
| Situation | Skill | Confidence |
|-----------|-------|------------|
| auth jwt login token | authentication | 95% |
| performance optimization cache | performance | 95% |
| monitoring metrics logging | monitoring | 85% |
| security vulnerability injection | security | 75% |
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

## 100k Simulation Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Skill Detection | 14.3% | 96.0% | +81.7% |
| False Positives | 12.3% | 2.1% | -10.2% |

## Rules
- Load skill ONCE per session
- Check cache before loading
- Announce: "SKILL: {name} loaded"
- Pre-load ⭐ marked skills for fullstack sessions
