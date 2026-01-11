---
applyTo: "**"
---

# Structure v7.1

## Root Files
- .py: agent.py only
- .sh: deploy.sh only  
- .md: README, CHANGELOG, CONTRIBUTING
- config: docker-compose.yml, .env, project_knowledge.json

## Folders

| Folder | Purpose |
|--------|---------|
| `.github/` | AKIS framework |
| `.project/` | Blueprints, design docs, feature specs |
| `docs/` | Documentation by type |
| `log/workflow/` | Session logs |
| `scripts/` | Automation |
| `{service}/` | App code |

## Placement

| Type | Location |
|------|----------|
| Source | {service}/src/ or {service}/app/ |
| Tests | {service}/tests/ |
| Docs | docs/{type}/ |
| Blueprints | .project/{feature}/ |
| Logs | log/workflow/ |
| Infra | Root docker-compose.yml |
