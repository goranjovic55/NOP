# Update Skills

**Purpose**: Skills discovery and synchronization | **Agents**: Researcher→Developer→Reviewer

**Scope**: This workflow operates ONLY on skills framework files:
- `.claude/skills.md` - Core skills (13 universal patterns)
- `.claude/skills/domain.md` - Project-specific domain skills
- `.claude/context.md` - Project state and stack information
- `.claude/settings.json` - Configuration
- `.claude/commands/` - Quick command references

**Not Included**: Knowledge files (handled by `update_knowledge`), Documentation (handled by `update_documents`)

## Structure
```
.claude/
├── skills.md      # 13 core skills (Quality, Process, Backend, Frontend, DevOps)
├── skills/
│   └── domain.md  # Domain-specific skills (project patterns)
├── context.md     # Project state, stack, commands
├── settings.json  # Config
└── commands/      # Quick commands
```

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
| `*.go` | Go | 1,2,3,4 |
| `Dockerfile` | Docker | 12 |
| `docker-compose.yml` | Compose | 12 |
| `.github/workflows/` | CI/CD | 5,12 |
| `project_knowledge.json` | Knowledge | 6,7,8 |

## Commands
```bash
# Detect stack (with explicit output)
[ -n "$(find . -name '*.py' -type f | head -1)" ] && echo "Python detected"
[ -n "$(find . -name '*.ts' -type f | head -1)" ] && echo "TypeScript detected"
[ -n "$(find . -name '*.go' -type f | head -1)" ] && echo "Go detected"
[ -f "Dockerfile" ] && echo "Docker detected"
[ -f "docker-compose.yml" ] && echo "Compose detected"
[ -d ".github/workflows" ] && echo "CI/CD detected"

# Scan patterns
grep -rn "class.*Service" --include="*.py" 2>/dev/null | head -3
grep -rn "interface.*Props" --include="*.ts" 2>/dev/null | head -3
```

## Outputs
- [ ] `skills.md` - Applicable skills enabled
- [ ] `context.md` - Project overview updated
- [ ] `commands/` - Build/test commands updated
- [ ] `settings.json` - Permissions configured

## Sync Points
| Source | Target | Sync |
|--------|--------|------|
| `project_knowledge.json` | Skill 6 | Entities, patterns |
| `.github/agents/` | Skills 7,8 | Protocol format |
| `.github/workflows/` | Skill 9 | Log format |

## Schedule
| Trigger | Action |
|---------|--------|
| New project | Full scan |
| Major refactor | Pattern rescan |
| Monthly | Maintenance |
