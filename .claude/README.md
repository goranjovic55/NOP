# Claude Skills - Universal Template

**Version**: 1.0.0 | **Usage**: Copy `.claude/` to any project, run `update_skills`

## Quick Start
```bash
cp -r .claude /path/to/new/project/
# Then run update_skills workflow
```

## Structure
```
.claude/
├── skills.md      # 12 core skills (condensed)
├── context.md     # Project state
├── settings.json  # Config
├── commands/      # Quick commands
└── README.md      # This file
```

## Skills (12 Core)
| # | Skill | Category |
|---|-------|----------|
| 1 | Code Standards | Quality |
| 2 | Error Handling | Quality |
| 3 | Security | Critical |
| 4 | Testing | Quality |
| 5 | Git & Deploy | Process |
| 6 | Knowledge | Ecosystem |
| 7 | Orchestration | Ecosystem |
| 8 | Handover | Ecosystem |
| 9 | Logging | Process |
| 10 | API Patterns | Backend |
| 11 | UI Patterns | Frontend |
| 12 | Infrastructure | DevOps |

## Ecosystem Integration
| Component | Location | Synergy |
|-----------|----------|---------|
| Agents | `.github/agents/` | Skills 7,8 |
| Workflows | `.github/workflows/` | Skills 6,9 |
| Knowledge | `project_knowledge.json` | Skill 6 |

## Commands
```
/build    → Build project
/test     → Run tests
/deploy   → Deploy check
/health   → Health check
```

## Maintenance
Run `update_skills` workflow monthly or after major changes.
