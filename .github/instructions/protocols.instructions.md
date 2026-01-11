---
applyTo: "**"
---

# Protocols v7.1

## Gates (7)
| G | Check | Fix |
|---|-------|-----|
| 1 | No ◆ | Create TODO |
| 2 | No skill | Load skill |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## Skill Triggers
| Situation | Skill |
|-----------|-------|
| new feature, design | planning |
| .tsx .jsx | frontend-react ⭐ |
| .py backend/ | backend-api ⭐ |
| Dockerfile | docker |
| error | debugging |
| .md docs/ | documentation |
| test_* | testing |

⭐ Pre-load fullstack

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
