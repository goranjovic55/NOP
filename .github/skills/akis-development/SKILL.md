---
name: akis-development
description: Load when editing .github/copilot-instructions*, .github/instructions/*, .github/skills/* for AKIS framework patterns
---

# AKIS Development v6.0

Patterns for editing Agent Knowledge and Instruction System files. Focus: token efficiency + prompt minimization.

## Critical Rules

- **Token efficiency**: Every word must earn its place - aim for <200 tokens per file
- **Skill caching**: Don't reload skills - load once per domain per session
- **Context awareness**: Knowledge is pre-attached, don't read explicitly
- **Tables > prose**: Use tables for mappings, patterns, triggers
- **Symbols over text**: ✓ ◆ ○ ⊘ → ⚠️ ❌ ✅ ⭐

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Verbose paragraphs | Numbered steps |
| Repeated instructions | Single source, reference |
| Multiple file reads | Use attachment context |
| Reload same skill | Cache loaded skills |
| Long code examples | Essential pattern only |
| Bullet lists for mappings | 2-column tables |

## Prompt Optimization Patterns

### Eliminate Redundant Reads
```markdown
# Before (wasteful)
1. Read project_knowledge.json
2. Read skills/INDEX.md  
3. Read skill file

# After (optimized)
1. Context pre-loaded via attachment ✓
2. Check skill cache before reading
3. Read skill only if new domain
```

### Skill Caching Pattern
```markdown
# Track in session
**Session skills loaded:** [frontend-react, backend-api]

# Before loading skill, check:
- Is skill already in session cache? → Skip read
- New domain? → Read once, add to cache
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
# Run prompt optimization analysis
python .github/scripts/akis_prompt_optimizer.py --count 100000

# Check compliance with improvements
python .github/scripts/analyze_akis.py --full --count 100000
```

## Key Metrics (v6.0 targets)

| Metric | v5.8 | v6.0 Target |
|--------|------|-------------|
| API calls/session | 19.5 | 16.1 (-17%) |
| Tokens/session | 2193 | 644 (-71%) |
| Perfect sessions | 9.6% | 15%+ |
