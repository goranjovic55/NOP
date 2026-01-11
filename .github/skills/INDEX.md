# Skills Index v7.1

## Skill Detection
| Situation | Skill | Pre-load |
|-----------|-------|----------|
| new feature, design | [planning](planning/SKILL.md) | |
| research, best practice, standards | [research](research/SKILL.md) | |
| .tsx .jsx components/ | [frontend-react](frontend-react/SKILL.md) | ⭐ |
| .py backend/ api/ | [backend-api](backend-api/SKILL.md) | ⭐ |
| Dockerfile docker-compose | [docker](docker/SKILL.md) | |
| .github/workflows/* | [ci-cd](ci-cd/SKILL.md) | |
| error traceback | [debugging](debugging/SKILL.md) | |
| .md docs/ | [documentation](documentation/SKILL.md) | |
| test_* *_test.py | [testing](testing/SKILL.md) | |
| .github/skills/* | [akis-development](akis-development/SKILL.md) | |
| project_knowledge.json | [knowledge](knowledge/SKILL.md) | |

⭐ Pre-load for fullstack

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

## Rules
- Load skill ONCE per session
- Check cache before loading
- Announce: "SKILL: {name} loaded"
