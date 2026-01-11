---
applyTo: "**"
---

# Protocols v7.1

## Gates (7)
| G | Check | Fix |
|---|-------|-----|
| 1 | No ◆ | Create TODO |
| 2 | No skill for edit/command | Load skill FIRST |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## Skill Triggers
| Trigger | Skill | Applies To |
|---------|-------|------------|
| .tsx .jsx | frontend-react ⭐ | edits |
| .py backend/ | backend-api ⭐ | edits |
| docker compose build | docker | commands |
| Dockerfile | docker | edits |
| error traceback | debugging | analysis |
| .md docs/ | documentation | edits |
| test_* pytest | testing | edits + commands |
| new feature | planning | analysis |

⭐ Pre-load fullstack

⚠️ **G2:** Skill required for edits AND domain commands

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Delegation
| Complexity | Strategy |
|------------|----------|
| Simple (<3) | Direct or delegate |
| Medium (3-5) | Smart delegate |
| Complex (6+) | Delegate |

## Parallel (G7)
code+docs | code+reviewer | research+code | architect+research

## Verification
After edit: Syntax → Imports → Tests → ✓
