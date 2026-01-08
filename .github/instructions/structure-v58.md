# Structure (Condensed)

## Root Files
- .py: agent.py only
- .sh: deploy.sh only
- .md: README, CHANGELOG, CONTRIBUTING
- config: docker-compose.yml, .env, project_knowledge.json

## Folders
- `.github/` - AKIS framework
- `docs/` - Documentation by type
- `log/workflow/` - Session logs
- `scripts/` - Automation
- `{service}/` - App code (src/, tests/, requirements.txt)

## Placement
Source → {service}/src/ | Tests → {service}/tests/
Docs → docs/{type}/ | Logs → log/workflow/
