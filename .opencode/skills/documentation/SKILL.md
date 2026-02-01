---
name: documentation
description: Documentation patterns and standards. Load when working with .md files, docs/, or README updates.
---

# Documentation

## Types

| Type | Template |
|------|----------|
| Feature | Overview, Usage, Examples, API |
| Guide | Introduction, Steps, Examples, Troubleshooting |
| Reference | Description, Parameters, Returns, Examples |
| README | Overview, Quick Start, Installation, Usage |

## Rules

| Rule | Requirement |
|------|-------------|
| Examples | Code samples mandatory |
| Usage | Quickstart section required |
| Updated | Include last-updated date |
| Index | Update INDEX.md for new docs |
| Style | Match existing documentation style |

## Standard Sections

### For Feature Docs
```markdown
# Feature Name

> Brief description

## Quick Start
[Minimal working example]

## Usage
[Detailed usage instructions]

## Examples
[Code examples with explanations]

## API Reference
[If applicable]

## Troubleshooting
[Common issues and solutions]

---
Last updated: YYYY-MM-DD
```

### For READMEs
```markdown
# Project/Component Name

> One-line description

## Quick Start
[Get running in < 1 minute]

## Installation
[Step-by-step setup]

## Usage
[Common use cases]

## Configuration
[Options and settings]

## Contributing
[How to contribute]
```

## Gotchas

| Category | Pattern | Solution |
|----------|---------|----------|
| Index | Doc not listed | Update docs/INDEX.md |
| Style | Inconsistent format | Match existing style |
| Examples | Missing code | Add code samples |
| Links | Broken references | Verify all links work |

## Commands

| Task | Command |
|------|---------|
| Preview MD | Use VS Code preview or `grip` |
| Check links | `markdown-link-check *.md` |
| Generate TOC | Use doctoc or VS Code extension |
