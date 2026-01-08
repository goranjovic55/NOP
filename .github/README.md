# AKIS v4 - Agent Knowledge & Instruction System

AI coding agent framework: **A**gent • **K**nowledge • **I**nstructions • **S**kills

**Portable:** Copy `.github/` to any codebase.

## Structure

| File | Purpose |
|------|--------|
| `copilot-instructions.md` | Terse rules (START→WORK→END) |
| `instructions/protocols.instructions.md` | Detailed procedures |
| `instructions/structure.instructions.md` | File organization rules |
| `skills/INDEX.md` | Domain→skill lookup |
| `skills/*/SKILL.md` | Agent Skills (per-domain) |
| `scripts/*.py` | Codemap, skill suggestions |
| `templates/*.md` | Workflow log, skill templates |

## Key Scripts

```bash
python .github/scripts/generate_knowledge.py  # Update knowledge
python .github/scripts/suggest_skill.py      # Get skill suggestions
python .github/scripts/session_tracker.py    # Maintenance tracking
```

## Usage

1. Agent reads `copilot-instructions.md` at session start
2. Follows START→WORK→END phases
3. Loads skills from `skills/` when touching relevant files
4. At END: runs scripts, creates workflow log

---

*Context over Process. Knowledge over Ceremony.*
