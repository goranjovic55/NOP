# Skills Index v7.0

**Situation-Based Skills** - Load skills based on what you're doing, not just what files you're touching.

## Core Rule: Skill Caching
- **Load once:** Don't reload skill already loaded this session
- **Track loaded:** Keep list: [frontend-react, backend-api, ...]
- **Announce:** Say "SKILL: frontend-react loaded" when loading

## Workflow Phases → Skills

| Phase | Situation | Load Skill |
|-------|-----------|------------|
| **PLAN** | "new feature", "design", "how should we" | [planning](planning/SKILL.md) |
| **BUILD** | Python/FastAPI code | [backend-api](backend-api/SKILL.md) |
| **BUILD** | React/TypeScript code | [frontend-react](frontend-react/SKILL.md) |
| **BUILD** | Containers, docker-compose | [docker](docker/SKILL.md) |
| **BUILD** | CI/CD, workflows | [ci-cd](ci-cd/SKILL.md) |
| **VERIFY** | Tests, test files | [testing](testing/SKILL.md) |
| **VERIFY** | Errors, bugs, failures | [debugging](debugging/SKILL.md) |
| **DOCUMENT** | README, docs/, .md files | [documentation](documentation/SKILL.md) |
| **META** | AKIS framework files | [akis-development](akis-development/SKILL.md) |
| **META** | project_knowledge.json | [knowledge](knowledge/SKILL.md) |

## Skill Combinations (Common Workflows)

| Workflow | Skills Needed |
|----------|---------------|
| New feature (full) | planning → backend-api + frontend-react → testing → documentation |
| Bug fix | debugging → backend-api or frontend-react → testing |
| API only | backend-api → testing |
| UI only | frontend-react → testing |
| Deployment | docker + ci-cd |
| Documentation | documentation |

## Auto-Detection Triggers

### Conversation Context (what user says)
```
"design a feature" → planning
"implement" → backend-api or frontend-react (based on files)
"fix this error" → debugging
"deploy" → docker + ci-cd
"document" → documentation
"write tests" → testing
```

### File Patterns (what you're touching)
```
*.py, backend/, api/ → backend-api
*.tsx, *.jsx, components/ → frontend-react
Dockerfile, docker-compose* → docker
.github/workflows/* → ci-cd
test_*, *.test.* → testing
*.md, docs/ → documentation
```

## Efficiency Tips

1. **Planning first:** For new features, always start with planning skill
2. **Combine skills:** backend-api + frontend-react for fullstack
3. **Sequential flow:** PLAN → BUILD → VERIFY → DOCUMENT
4. **Cache skills:** Don't reload within same session
