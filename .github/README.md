# AKIS v3 - Project-Agnostic Framework

This directory contains the **AKIS (Agent Knowledge & Instruction System)** framework - a project-agnostic system for AI-assisted development.

## What is AKIS?

AKIS helps AI coding agents work more effectively by providing:
- **Knowledge System:** Project context graph (entities, relations, codemap)
- **Skills Library:** Reusable solution patterns for common problems
- **Workflow Prompts:** Multi-step workflows for complex tasks
- **Automation Scripts:** Session management and maintenance tools

## Portability

**AKIS v3 is completely project-agnostic.** You can copy this entire `.github/` directory to any codebase.

### Core Files (Project-Independent)

```
.github/
├── copilot-instructions.md    # 50-line instructions (no project references)
├── skills/
│   ├── INDEX.md               # Problem→solution lookup
│   ├── debugging.md           # Build/runtime error patterns
│   ├── knowledge.md           # Knowledge system usage
│   └── documentation.md       # Doc structure patterns
├── prompts/
│   ├── README.md              # Prompts overview
│   └── akis-workflow-analyzer.md  # Cross-session analysis workflow
├── templates/
│   ├── skill.md               # Skill template
│   ├── workflow-prompt.md     # Prompt template
│   └── workflow-log.md        # Log template
└── scripts/
    ├── session_start.py       # Display context banner
    ├── session_end.py         # Complete session workflow
    ├── generate_codemap.py    # Update knowledge graph
    ├── suggest_skill.py       # Analyze session for patterns
    └── session_tracker.py     # Track sessions, trigger maintenance
```

### Project-Specific Files (Created Per Project)

```
project_knowledge.json         # Knowledge graph (auto-generated)
docs/                          # Project documentation
log/workflow/                  # Session work logs
```

## Using AKIS in a New Project

1. **Copy `.github/` directory** from this repo to your new project
2. **Initialize knowledge:** Run `python .github/scripts/session_start.py`
3. **Work naturally:** Query skills/docs when stuck
4. **End session:** Run `python .github/scripts/session_end.py`
5. **Knowledge evolves:** Codemap auto-updates, skills suggested from patterns

## Technology-Specific Skills

Some skills reference specific technologies (FastAPI, React, Docker) but remain portable:
- `backend-api.md` → FastAPI patterns (use in any FastAPI project)
- `frontend-react.md` → React patterns (use in any React project)
- `debugging.md` → General debugging (Docker examples portable)

**Create your own tech-specific skills** for your stack (Django, Vue, etc.)

## Customization

### Adjust Standards
Edit `.github/copilot-instructions.md` → "Standards" section

### Add Skills
1. Copy `.github/templates/skill.md`
2. Fill in pattern (<50 lines, copy-paste ready)
3. Add entry to `.github/skills/INDEX.md`

### Add Workflow Prompts
1. Copy `.github/templates/workflow-prompt.md`
2. Define phases (CONTEXT → ANALYZE → ...)
3. Add entry to `.github/prompts/README.md`

## Philosophy

**Context over Process. Knowledge over Ceremony.**

- **Context-driven:** Resources queried when needed, not prescribed workflow
- **Knowledge-first:** Build institutional memory via knowledge graph
- **Skills as solutions:** Copy-paste patterns, not essays
- **Automated maintenance:** Scripts handle repetitive tasks

## Version History

- **v3 (2026-01-04):** Complete redesign - project-agnostic, terse instructions, executable skills
- **v2 (2025-12):** Phase-based workflow with todo tracking
- **v1 (2025-11):** Initial knowledge system and skills library

---

*For detailed instructions, see `.github/copilot-instructions.md`*
