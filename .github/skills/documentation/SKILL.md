---
name: documentation
description: Load when editing .md files, docs/ directory, README, or CHANGELOG. Provides documentation structure and best practices for technical writing.
---

# Documentation

## ⚠️ Critical Gotchas
- **Update with code:** Doc changes must be in same commit as code
- **Broken links:** Check relative paths after file moves
- **Stale examples:** Verify code samples still work

## Rules
- **Include examples:** Code samples for every concept
- **Link, don't duplicate:** Reference existing docs

## Structure
```
docs/
├── INDEX.md         # Navigation
├── guides/          # How-to (task-oriented)
├── features/        # Feature docs
├── technical/       # API refs, specs
└── architecture/    # Design decisions
```

## Placement

| Content | Location |
|---------|----------|
| How-to | `docs/guides/` |
| Feature | `docs/features/` |
| API ref | `docs/technical/` |
| Quick start | `README.md` |

## Patterns

```markdown
# Feature Name
## Overview
What + why.
## Usage
\`\`\`python
result = feature.do()
\`\`\`
```
