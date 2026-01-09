---
name: documentation
description: Load when editing docs/, README, any .md files for documentation structure and best practices
triggers: [".md", "docs/", "README", "CHANGELOG", "guides/"]
---

# Documentation

## When to Use
Load this skill when: editing any `.md` file, updating `docs/` content, creating README files, or writing documentation.

Keep docs clear, current, and close to code. Cross-project documentation patterns.

## Critical Rules

- **Update with code:** Doc changes in same commit as code
- **Include examples:** Code samples for every concept
- **Follow structure:** Consistent file organization
- **Link, don't duplicate:** Reference existing docs

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Stale docs | Update with code |
| No examples | Include samples |
| Wall of text | Concise, scannable |
| Random placement | Follow structure |
| Duplicate content | Link to source |

## Structure

```
docs/
├── INDEX.md           # Entry point, navigation
├── guides/            # How-to guides (task-oriented)
├── features/          # Feature documentation
├── technical/         # API references, specs
├── architecture/      # Design decisions, ADRs
├── development/       # Contributing, setup
└── archive/           # Historical, deprecated
```

## Placement Guide

| Content Type | Location | Example |
|-------------|----------|---------|
| How-to guide | `docs/guides/` | "How to deploy" |
| Feature doc | `docs/features/` | "Authentication" |
| API reference | `docs/technical/` | "REST API" |
| Design decision | `docs/architecture/` | "Why PostgreSQL" |
| Setup guide | `docs/development/` | "Local setup" |
| Changelog | `CHANGELOG.md` | Version history |
| Quick start | `README.md` | Getting started |

## Patterns

### README Structure
```markdown
# Project Name

Brief description (1-2 sentences).

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`

## Features
- Feature 1
- Feature 2

## Documentation
- [Setup Guide](docs/guides/setup.md)
- [API Reference](docs/technical/api.md)

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md)
```

### Feature Documentation
```markdown
# Feature Name

## Overview
What it does, why it exists.

## Usage
\`\`\`python
result = feature.do_thing()
\`\`\`

## Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `timeout` | 30 | Request timeout |

## Related
- [Other Feature](other-feature.md)
```

### API Endpoint Documentation
```markdown
## GET /api/items/{id}

Get item by ID.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | integer | Yes | Item ID |

**Response:**
\`\`\`json
{ "id": 1, "name": "Item" }
\`\`\`

**Errors:**
| Code | Description |
|------|-------------|
| 404 | Item not found |
```

### Inline Code Documentation
```python
def normalize_version(version: str) -> str:
    """Normalize version string for comparison.
    
    Args:
        version: Version string like "1.2.3" or "v1.2.3"
    
    Returns:
        Normalized version without prefix
    
    Examples:
        >>> normalize_version("v1.2.3")
        "1.2.3"
    """
    return version.lstrip("v")
```

### Architecture Decision Record (ADR)
```markdown
# ADR-001: Use PostgreSQL

## Status
Accepted

## Context
Need persistent storage with JSONB support.

## Decision
Use PostgreSQL 15 with async driver.

## Consequences
- Good: JSONB, full-text search, reliability
- Bad: More complex than SQLite for dev
```

## Checklist

- [ ] README updated for user-facing changes
- [ ] API docs current if endpoints changed
- [ ] Code comments for complex logic
- [ ] Examples provided for new features
