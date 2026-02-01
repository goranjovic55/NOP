---
name: research
description: Information gathering, comparison matrices, and best practice research. Load for evaluations, comparisons, or when exploring options.
---

# Research

## Methodology

1. **LOCAL** - Check project_knowledge.json, docs/, log/workflow/ (min 3 sources)
2. **EXTERNAL** - Add external sources if needed
3. **COMPARE** - Create comparison matrix
4. **RECOMMEND** - Provide recommendation with confidence

## Source Priority

1. `project_knowledge.json` → Project-specific knowledge
2. `docs/` → Project documentation
3. `log/workflow/` → Past solutions and decisions
4. External sources → Official docs, best practices

## Comparison Matrix Template

| Option | Pros | Cons | Fit for Project |
|--------|------|------|-----------------|
| Option A | + Pro 1, + Pro 2 | - Con 1 | Good / Moderate / Poor |
| Option B | + Pro 1 | - Con 1, - Con 2 | Good / Moderate / Poor |

## Confidence Levels

| Level | Meaning |
|-------|---------|
| High | 3+ quality sources agree, clear recommendation |
| Medium | Sources somewhat agree, minor uncertainty |
| Low | Limited sources, significant uncertainty |

## Output Format

```markdown
# Research: [Topic]

## Summary
[1-3 sentence summary of findings]

## Sources
1. [Source 1] - [what it provided]
2. [Source 2] - [what it provided]
3. [Source 3] - [what it provided]

## Comparison Matrix
| Option | Pros | Cons | Fit |
|--------|------|------|-----|
| ... | ... | ... | ... |

## Recommendation
**[Recommended option]** with **[confidence level]** confidence.

[Reasoning for recommendation]

## Next Steps
1. [Suggested action 1]
2. [Suggested action 2]
```

## Rules

| Rule | Requirement |
|------|-------------|
| Local first | Check local sources BEFORE external |
| Minimum sources | 3 sources with citations |
| Freshness | Sources less than 1 year old |
| Comparison | Matrix for multi-option research |
| Recommendation | Always provide recommendation |
