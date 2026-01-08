---
name: akis-development
description: Load when editing .github/copilot-instructions*, .github/instructions/*, .github/skills/* for AKIS framework patterns
---

# AKIS Development

Patterns for editing Agent Knowledge and Instruction System files. Follow token optimization principles.

## Critical Rules

- **Token efficiency**: Every word must earn its place - aim for <200 tokens per file
- **Tables > prose**: Use tables for mappings, patterns, triggers
- **Single-block format**: Related info in one visual block
- **Bold critical actions**: Use `**◆ BEFORE any edit**` emphasis style
- **Symbols over text**: ✓ ◆ ○ ⊘ → ⚠️ ❌ ✅

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Verbose paragraphs | Numbered steps |
| Repeated instructions | Single source, reference |
| Long code examples | Essential pattern only |
| Multiple small sections | Combined sections |
| Explanation + example | Self-documenting example |
| Bullet lists for mappings | 2-column tables |

## Token Optimization Patterns

### Condensing Prose
```markdown
# Before (verbose)
**Important:** You must mark the task as working before making any edits.
**Critical:** Never skip this step. It is non-negotiable.

# After (condensed)
**◆ BEFORE any edit** (non-negotiable)
```

### Condensing Lists to Tables
```markdown
# Before
- .tsx files → load frontend-react skill
- .jsx files → load frontend-react skill
- .py files → load backend-api skill

# After
| Pattern | Skill |
|---------|-------|
| .tsx .jsx | frontend-react |
| .py | backend-api |
```

## Token Targets

| File Type | Target | Maximum |
|-----------|--------|---------|
| Main instructions | <200 | 300 tokens |
| Skills | <200 | 350 tokens |
| Instructions | <150 | 200 tokens |
| INDEX.md | <100 | 150 tokens |

## Validation

```bash
# Check token usage
python .github/scripts/akis_token_optimizer.py --analyze

# Run compliance simulation
python .github/scripts/akis_token_optimizer.py --simulate --count 100000
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Token count too high | Verbose prose | Apply condensation patterns |
| Low compliance in simulation | Missing emphasis | Add bold/warning markers |
| Skill not triggering | Wrong pattern in INDEX | Check trigger patterns |
