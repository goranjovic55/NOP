---
name: akis-development
description: Load when editing .github/copilot-instructions*, skills/*, agents/*, or project_knowledge.json.
---

# AKIS Development

## ⚠️ Critical Gotchas
- **Script output:** Present suggestions in TABLE, ASK before applying
- **END summary:** MUST show metrics table to user
- **Skill balance:** Include Gotchas section (not too terse)
- **Context:** NOT pre-attached, require explicit reads

## Targets

| Target | Goal | Method |
|--------|------|--------|
| Tokens | MIN | Tables > prose |
| API Calls | MIN | Batch reads |
| Resolution | MAX | Gotchas + patterns |

## Format Rules

| Content | Format |
|---------|--------|
| Skills | Gotchas → Rules → Patterns (<350 words) |
| Agents | Triggers → Checklist (<500 words) |
| Instructions | Bullet tables (<200 words) |

## END Phase

1. Run scripts → Present table → ASK user
2. Apply only if approved

| Metric | Value |
|--------|-------|
| Tasks | X/Y |
| Resolution | X% |
| Files | X |
