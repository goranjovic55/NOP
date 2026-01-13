# Skills Index v7.2

> Based on 100k session simulation: 96.0% precision, 92.0% recall

## Skill Detection
| Situation | Skill | Pre-load |
|-----------|-------|----------|
| new feature, design | [planning](planning/SKILL.md) | |
| research, best practice, standards | [research](research/SKILL.md) | |
| .tsx .jsx components/ pages/ | [frontend-react](frontend-react/SKILL.md) | ⭐ |
| .py backend/ api/ services/ models/ | [backend-api](backend-api/SKILL.md) | ⭐ |
| Dockerfile docker-compose.yml | [docker](docker/SKILL.md) | |
| .github/workflows/*.yml | [ci-cd](ci-cd/SKILL.md) | |
| error traceback bug fix | [debugging](debugging/SKILL.md) | |
| .md docs/ README | [documentation](documentation/SKILL.md) | |
| test_* *_test.py *.test.ts | [testing](testing/SKILL.md) | |
| .github/skills/* agents/* | [akis-development](akis-development/SKILL.md) | |
| project_knowledge.json | [knowledge](knowledge/SKILL.md) | |

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
