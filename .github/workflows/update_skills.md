# Update Skills

**Purpose**: Skills discovery and sync | **Agents**: Researcher→Developer→Reviewer

## Structure
```
.claude/
├── skills.md      # 12 core skills (condensed)
├── context.md     # Project state
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
