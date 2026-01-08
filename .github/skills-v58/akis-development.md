---
name: akis-development
description: .github/copilot-instructions*, .github/instructions/*, .github/skills/* - AKIS framework editing
---
# AKIS Development

Patterns for editing Agent Knowledge and Instruction System files.

## ⚠️ Critical Rules

- **Token efficiency**: Every word must earn its place
- **Tables > prose**: Use tables for mappings, patterns, triggers
- **Single-block format**: Related info in one visual block
- **Bold critical actions**: `**◆ BEFORE any edit**` style

## Token Optimization Principles

| Principle | Example |
|-----------|---------|
| Condense prose | "Mark working before edit" → "◆ BEFORE edit" |
| Use symbols | ✓ ◆ ○ ⊘ → ⚠️ ❌ ✅ |
| Tables for lists | Bullet list → 2-column table |
| Inline patterns | Separate sections → "pattern → result" |
| Remove redundancy | Say once, reference after |

## ❌ Bad → ✅ Good

| Bad | Good |
|-----|------|
| Verbose paragraphs | Numbered steps |
| Repeated instructions | Single source, reference |
| Long code examples | Essential pattern only |
| Multiple headers | Combined sections |
| Explanation + example | Just example (self-documenting) |

## File Structure

### Main Instructions (`copilot-instructions.md`)
```markdown
# AKIS vX.X

## START
1. step one
2. step two

## WORK
**◆ BEFORE → action → ✓ AFTER**

| Pattern | Result |
|---------|--------|
| .tsx | frontend-react |

## END
1. step
2. step

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused
```

### Skills (`skills/{name}.md`)
```markdown
---
name: skill-name
description: trigger patterns - one line summary
---
# Skill Title

## ⚠️ Critical
- rule 1
- rule 2

## ❌ Bad → ✅ Good
| Bad | Good |
|-----|------|

## Patterns
```lang
// essential pattern only
```

## Errors
| Error | Fix |
|-------|-----|
```

### Instructions (`instructions/*.md`)
```markdown
# Topic (Condensed)

## Section
1. step → 2. step → 3. step

## Quick Ref
pattern → result | pattern → result
```

## Token Targets

| File Type | Target | Max |
|-----------|--------|-----|
| Main instructions | <200 tokens | 300 |
| Skills | <200 tokens | 350 |
| Instructions | <150 tokens | 200 |
| INDEX.md | <100 tokens | 150 |

## Editing Checklist

1. **Before editing**: Read current file, count tokens (chars/4)
2. **During edit**: Apply condensation patterns
3. **After edit**: Verify token reduction, test readability
4. **Validate**: Run `akis_token_optimizer.py --analyze`

## Common Patterns

### Condensing Steps
```markdown
# Before (verbose)
1. First, load the knowledge file
2. Then, check the skills index
3. Finally, create todos

# After (condensed)
1. view project_knowledge.json + skills/INDEX.md
2. Create todos: <MAIN> → <WORK>... → <END>
```

### Condensing Rules
```markdown
# Before
**Important:** You must mark the task as working before making any edits.
**Critical:** Never skip this step.

# After
**◆ BEFORE any edit** (non-negotiable)
```

### Condensing Tables
```markdown
# Before
| Pattern | Skill to Load |
|---------|---------------|
| .tsx files | frontend-react |
| .jsx files | frontend-react |

# After
| Pattern | Skill |
|---------|-------|
| .tsx .jsx | frontend-react |
```

## Scripts

```bash
# Analyze token usage
python .github/scripts/akis_token_optimizer.py --analyze

# Run simulations
python .github/scripts/akis_token_optimizer.py --simulate --count 100000

# Full optimization cycle
python .github/scripts/akis_token_optimizer.py --full
```

## Related
- `knowledge/SKILL.md` - project_knowledge.json patterns
- `documentation/SKILL.md` - general doc patterns
