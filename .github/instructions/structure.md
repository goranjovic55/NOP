# Project Structure

## Quick Rules

| Rule | Allowed | Location |
|------|---------|----------|
| Root .py | agent.py only | / |
| Root .sh | deploy.sh only | / |
| Root .md | README, CHANGELOG, CONTRIBUTING, LICENSE | / |
| Root config | docker-compose.yml, .env, .gitignore | / |
| Python scripts | *.py (non-app) | scripts/ |
| Shell scripts | *.sh (non-deploy) | scripts/ |
| Test files | test_*.py | scripts/ |
| Documentation | *.md (non-root) | docs/{category}/ |
| Workflow logs | YYYY-MM-DD_*.md | log/workflow/ |
| App code | source files | {service}/app/ or {service}/src/ |

---

## Standard Folders

**`.github/`** - AKIS framework files
- `copilot-instructions.md` - Main agent instructions
- `project_knowledge.json` - Knowledge base
- `instructions/` - Framework docs
- `skills/` - Reusable patterns
- `scripts/` - Knowledge tools
- `templates/` - File templates

**`docs/`** - All documentation organized by type
- `analysis/` - Research, investigations
- `architecture/` - System design, ADRs
- `design/` - Feature specs
- `development/` - Dev guides
- `features/` - Feature documentation
- `guides/` - How-tos
- `technical/` - API docs, protocols

**`log/`** - Historical execution records
- `workflow/` - Task logs (YYYY-MM-DD_HHMMSS_task.md)

**`scripts/`** - Automation, testing, utilities (not application code)

**`test-environment/`** - Integration test infrastructure

**`volumes/`** - Persistent data (gitignored)

## Application Code

Organize by component/service:
- `{service-name}/` - Source code, tests, dependencies, config
  - `src/` or `app/` - Application source
  - `tests/` - Unit/integration tests
  - Dependencies file (requirements.txt, package.json, go.mod, etc.)
  - Dockerfile, config files

## Placement Rules

- Source code → `{service}/src/` or `{service}/app/`
- Tests with code → `{service}/tests/`
- Documentation → `docs/` (by type, not by component)
- Workflow logs → `log/workflow/`
- Automation scripts → `scripts/`
- Dependencies with code → In service folder
- Infrastructure config → Root (docker-compose.yml, .env)
