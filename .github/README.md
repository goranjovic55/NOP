# AKIS v3 - Project-Agnostic Framework

AI coding agent framework providing:
- **Knowledge:** Project context graph (entities, relations, codemap)
- **Skills:** Reusable solution patterns (<50 lines, copy-paste ready)
- **Scripts:** Session management and automation

**Portable:** Copy entire `.github/` directory to any codebase.

## Core Structure

**Framework files:**
- `copilot-instructions.md` - MANDATORY 5 PHASES workflow
- `skills/INDEX.md` - Problem→solution lookup
- `scripts/session_*.py` - Session automation
- `templates/*.md` - File templates

**Project files (auto-created):**
- `project_knowledge.json` - Knowledge graph
- `docs/` - Documentation
- `log/workflow/` - Session logs

## Usage

1. Copy `.github/` to new project
2. Follow MANDATORY 5 PHASES in `copilot-instructions.md`
3. Query `skills/INDEX.md` when stuck
4. Scripts auto-manage knowledge/sessions

---

*Context over Process. Knowledge over Ceremony.*
