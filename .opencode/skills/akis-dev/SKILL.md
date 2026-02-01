---
name: akis-dev
description: Load when editing .github/skills/*, agents/*, instructions/*, or .opencode/*. Provides AKIS framework development patterns.
---

# AKIS Development

> Target: -68% tokens, 100% completeness, identical behavior

## Core Principle: Single-Source DRY

| Rule | Description |
|------|-------------|
| One source of truth | Each rule exists in ONE file only |
| Reference don't repeat | Other files say "see X" not copy X |
| Unique content only | Each file has ONE purpose, no overlap |

## File Architecture

| File | Contains | Does NOT Contain |
|------|----------|------------------|
| `copilot-instructions.md` | All core rules, gates, workflow | Details, examples beyond 1 |
| `workflow.instructions.md` | END phase details, log format | Gates, START (in main) |
| `protocols.instructions.md` | Skill triggers, pre-commit, stats | Gates, workflow (in main) |
| `quality.instructions.md` | Gotchas table only | Rules (in main) |

## Optimization Rules

| Rule | Before | After | Savings |
|------|--------|-------|---------|
| Tables over prose | Paragraph explaining X | Table with X | -60% |
| One example not four | 4 identical examples | 1 example | -75% |
| Deduplicate | Same table in 3 files | Table in 1 file | -66% |
| Compress headers | `## Section Name (REQUIRED)` | `## Section` | -40% |

## Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| Same example 4 times | 1 example in main file | -75% tokens |
| Gates table in 3 files | Gates in copilot-instructions only | -66% tokens |
| Verbose explanation | Table row | Same info, fewer tokens |
| Numbered sub-sub-steps | Flat list | Easier to scan |

## Template: Compact Instruction File

```markdown
---
applyTo: '**'
description: 'One line: what unique content this adds.'
---

# Title

> Core rules in copilot-instructions.md. This file: [unique purpose].

## Unique Section 1
| Col | Col |
|-----|-----|
| ... | ... |
```

## Metrics Target

| Metric | Target |
|--------|--------|
| Token reduction | ≥65% vs verbose |
| Line reduction | ≥60% vs verbose |
| Completeness | 100% (all rules present) |
| Behavior | Identical (same simulation results) |

## Commands

| Task | Command |
|------|---------|
| Measure tokens | `wc -w file.md` × 1.3 |
| Check duplication | `grep -h "pattern" files \| sort \| uniq -c` |
| Verify completeness | `grep "required_pattern" files` |
| Run simulation | `python .github/scripts/akis_compliance_simulation.py` |
