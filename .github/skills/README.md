# Skills Directory

**Purpose**: Agent Skills for GitHub Copilot with progressive disclosure  
**Format**: Each skill in its own directory with SKILL.md  
**Usage**: Copilot automatically loads relevant skills based on task context

## Structure

```
.github/skills/
├── README.md                    # This file
│
├── error-handling/              # Exception and error response patterns
│   └── SKILL.md
├── security/                    # Auth, validation, secrets management
│   └── SKILL.md
├── testing/                     # Unit, integration, E2E testing
│   ├── SKILL.md
│   └── commands/                # Example: Test execution scripts
│       └── run_backend_tests.sh
├── backend-api/                 # FastAPI patterns (merged from backend-patterns + fastapi-endpoint)
│   └── SKILL.md
├── frontend-react/              # React patterns (merged from frontend-patterns + react-components)
│   └── SKILL.md
├── git-deploy/                  # Git workflow and deployment
│   └── SKILL.md
├── infrastructure/              # Docker, containers, network services (merged with network-service)
│   └── SKILL.md
├── context-switching/           # Task interrupt handling
│   └── SKILL.md
│
├── protocol-dissection/         # NOP: Packet parsing patterns
│   └── SKILL.md
├── zustand-store/               # NOP: State management patterns
│   └── SKILL.md
├── api-service/                 # NOP: Frontend API client patterns
│   └── SKILL.md
├── ui-components/               # NOP: Generic UI component patterns
│   └── SKILL.md
└── cyberpunk-theme/             # NOP: UI theming patterns
    └── SKILL.md
```

## How Skills Work

**Progressive Disclosure** (3 levels):
1. **Level 1**: Copilot scans skill descriptions in YAML frontmatter
2. **Level 2**: Loads SKILL.md body if skill is relevant
3. **Level 3**: Accesses additional files in skill directory if needed

**Auto-Activation**: Skills are automatically loaded when Copilot detects relevant keywords in your request.

## Skill Categories

### Core Skills (Universal) - 8 skills
- **error-handling**: Exception handling and JSON error responses
- **security**: Authentication, validation, secrets management
- **testing**: Unit, integration, E2E test patterns (with commands/ subfolder)
- **backend-api**: FastAPI patterns with layered architecture
- **frontend-react**: React component patterns with TypeScript and hooks
- **git-deploy**: Conventional commits and deployment risk assessment
- **infrastructure**: Docker, containers, and network service lifecycle
- **context-switching**: Task interrupt and state preservation

### Domain Skills (NOP-Specific) - 5 skills
- **protocol-dissection**: Multi-layer packet parsing with Scapy
- **zustand-store**: State management patterns
- **api-service**: Frontend API client with Axios
- **ui-components**: Generic UI component patterns
- **cyberpunk-theme**: Neon theming and styling

## Creating New Skills

### 1. Create Skill Directory
```bash
mkdir .github/skills/my-skill
```

### 2. Create SKILL.md with Frontmatter
```markdown
---
name: my-skill
description: Brief description of when to use this skill. Use when doing X or Y.
---

# My Skill Title

## When to Use
- Scenario 1
- Scenario 2

## Pattern
Description of the pattern/approach

## Checklist
- [ ] Check item 1
- [ ] Check item 2

## Examples
```code examples```
```

### 3. (Optional) Add Resource Files
```
my-skill/
├── SKILL.md
├── template.py
└── example.ts
```

## Usage in Copilot

**Enable Agent Skills**: 
- Settings → Search "Use Agent Skills" (chat.useAgentSkills)
- Available in VS Code Insiders (stable support early 2026)

**Prompt naturally**:
- "Create Playwright tests" → auto-loads `testing` skill
- "Add error handling" → auto-loads `error-handling` skill
- "Style this button" → auto-loads `ui-components` skill
- "Parse network packets" → auto-loads `protocol-dissection` skill

## AKIS Integration

Skills are part of the AKIS framework:
- **A**gents: `.github/agents/*.agent.md` - Who executes
- **K**nowledge: `project_knowledge.json` - What exists
- **I**nstructions: `.github/instructions/*.md` - How to behave
- **S**kills: `.github/skills/*/SKILL.md` - Patterns to apply

**At [SESSION]**: Copilot queries relevant skills  
**At [COMPLETE]**: Updates skills if new patterns discovered

## Migration Notes

**Migrated**: 2025-12-31  
**From**: Flat files (core.md, domain.md) → Individual skill directories  
**Reason**: Align with GitHub Copilot Agent Skills best practices (progressive disclosure)

Legacy `.claude/` directory remains for backward compatibility.

## Community Skills

Explore community skills:
- [github/awesome-copilot](https://github.com/github/awesome-copilot)
- [anthropics/skills](https://github.com/anthropics/skills)

Copy skills to `.github/skills/` to use them in your project.
