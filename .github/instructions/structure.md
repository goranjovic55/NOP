---
applyTo: '**'
---

# Project Structure

Universal project organization and file placement guidelines.

---

## Directory Layout

### Standard Project Structure
```
project/
├── src/                    # Source code (or lib/, app/, pkg/)
│   ├── main.*              # Entry point
│   ├── models/             # Data models
│   ├── services/           # Business logic
│   ├── controllers/        # Request handlers
│   └── utils/              # Utilities
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test data
├── docs/                   # Documentation
│   ├── architecture/       # System design
│   └── api/                # API docs
├── config/                 # Configuration files
├── scripts/                # Utility scripts
├── .github/                # Agent framework
│   ├── agents/             # Agent definitions (*.agent.md)
│   ├── chatmodes/          # Legacy chatmodes (deprecated, use agents/)
│   ├── instructions/       # Workflow modules
│   ├── workflows/          # CI/CD (optional)
│   └── global_memory.json  # Universal patterns
├── project_memory.json     # Project-specific memory
├── codegraph.json          # Code structure (optional)
└── [config files]          # package.json, requirements.txt, etc.
```

---

## Agent Framework Location

### Portable (.github/)
```
.github/
├── agents/
│   ├── DevTeam.agent.md          # Lead orchestrator
│   ├── Architect.agent.md        # Design specialist
│   ├── Developer.agent.md        # Implementation specialist
│   ├── Reviewer.agent.md         # Quality specialist
│   ├── Researcher.agent.md       # Investigation specialist
│   └── README.md                 # Agent documentation
├── chatmodes/                    # Legacy (deprecated, use agents/)
│   ├── DevTeam.chatmode.md
│   ├── Architect.chatmode.md
│   ├── Developer.chatmode.md
│   ├── Reviewer.chatmode.md
│   └── Researcher.chatmode.md
├── instructions/
│   ├── phases.md                # Workflow phases
│   ├── protocols.md             # Communication protocols
│   ├── standards.md             # Quality standards
│   └── structure.md             # This file
└── global_memory.json           # Universal patterns (portable)
```

### Project-Specific (Root)
```
project/
├── project_memory.json     # Project entities (stays with project)
└── codegraph.json          # Code structure (optional, stays)
```

---

## File Placement Rules

### Source Code
| Type | Location |
|------|----------|
| Entry point | `src/main.*` or project convention |
| Models | `src/models/` |
| Services | `src/services/` |
| Controllers/Handlers | `src/controllers/` or `src/api/` |
| Utilities | `src/utils/` |

### Tests
| Type | Location |
|------|----------|
| Unit tests | `tests/unit/` or `tests/test_*.py` |
| Integration | `tests/integration/` |
| Fixtures | `tests/fixtures/` |

### Documentation
| Type | Location |
|------|----------|
| Architecture | `docs/architecture/` |
| API docs | `docs/api/` |
| User guides | `docs/guides/` |
| README | Project root |

### Configuration
| Type | Location |
|------|----------|
| App config | `config/` or project convention |
| Environment | `.env` (git-ignored) |
| Package config | Root (package.json, requirements.txt) |

---

## Language-Specific Conventions

### Python
```
project/
├── src/project_name/       # Package directory
│   ├── __init__.py
│   └── ...
├── tests/
├── requirements.txt
├── setup.py or pyproject.toml
└── .github/
```

### Node.js / TypeScript
```
project/
├── src/
├── dist/                   # Build output (git-ignored)
├── node_modules/           # Dependencies (git-ignored)
├── package.json
├── tsconfig.json           # If TypeScript
└── .github/
```

### Docker/Containerized
```
project/
├── src/
├── docker/                 # Docker configs
├── docker-compose.yml
├── Dockerfile
└── .github/
```

---

## Memory File Locations

### project_memory.json
- **Location**: Project root
- **Contents**: Project-specific entities, decisions, patterns
- **Portability**: Stays with project

### global_memory.json
- **Location**: `.github/`
- **Contents**: Universal patterns, cross-project learnings
- **Portability**: Moves with framework

### codegraph.json (Optional)
- **Location**: Project root
- **Contents**: Code structure map (modules, classes, relations)
- **Portability**: Stays with project

---

## Git Ignore Patterns

### Always Ignore
```
node_modules/
__pycache__/
*.pyc
.env
dist/
build/
.DS_Store
*.log
```

### Project-Specific Decision
```
# Include in git (recommended)
project_memory.json
.github/global_memory.json

# Optional to ignore
codegraph.json              # Can be regenerated
```

---

## File Size Guidelines

| File Type | Limit |
|-----------|-------|
| Source files | 500 lines |
| Test files | 500 lines |
| Memory files | 5000 lines (trigger optimization) |
| Config files | As needed |

---

## Naming Conventions

### Files
- Python: `snake_case.py`
- JavaScript/TypeScript: `camelCase.ts` or `PascalCase.tsx` (components)
- Tests: `test_feature.py` or `feature.test.ts`
- Docs: `UPPER_CASE.md` or `kebab-case.md`

### Directories
- Lowercase with underscores or hyphens
- Match language convention
