---
description: 'Skills discovery and sync'
mode: agent
---
# Update Skills

**Agents**: Researcher→Developer→Reviewer

## Flow
```
[DELEGATE: agent=Researcher | task="Detect stack"]
→ Languages, frameworks, tools

[DELEGATE: agent=Researcher | task="Scan patterns"]
→ Project conventions

[DELEGATE: agent=Developer | task="Update skills"]
→ Enable applicable skills, add domain patterns

[DELEGATE: agent=Developer | task="Sync context"]
→ Update context.md, commands/

[DELEGATE: agent=Reviewer | task="Validate"]
→ Completeness check
```

## Detection Matrix
| File | Stack | Skills Enabled |
|------|-------|----------------|
| `*.py` | Python | 1,2,3,4,10 |
| `*.ts` | TypeScript | 1,2,3,4,11 |
| `Dockerfile` | Docker | 12 |
| `docker-compose.yml` | Compose | 12 |
| `.github/workflows/` | CI/CD | 5,12 |
| `project_knowledge.json` | Knowledge | 6,7,8 |

## Outputs
- [ ] `skills.md` - Applicable skills enabled
- [ ] `context.md` - Project overview updated
- [ ] `commands/` - Build/test commands updated
- [ ] `settings.json` - Permissions configured
