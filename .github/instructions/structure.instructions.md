# Structure (Condensed)

## Root Files
- .py: agent.py only
- .sh: deploy.sh only
- .md: README, CHANGELOG, CONTRIBUTING
- config: docker-compose.yml, .env, project_knowledge.json

## Folders
| Folder | Purpose |
|--------|---------|
| `.github/` | AKIS framework |
| `docs/` | Documentation by type |
| `log/workflow/` | Session logs |
| `scripts/` | Automation |
| `{service}/` | App code (src/, tests/, requirements.txt) |

## Placement
| Type | Location |
|------|----------|
| Source code | {service}/src/ or {service}/app/ |
| Tests | {service}/tests/ |
| Documentation | docs/{type}/ |
| Workflow logs | log/workflow/ |
| Automation | scripts/ |
| Infrastructure | Root (docker-compose.yml)
