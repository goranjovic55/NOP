---
title: Documentation Standards
type: guide
category: contributing
last_updated: 2026-01-14
---

# Documentation Standards

This document defines the documentation standards for the Network Observatory Platform, based on industry best practices including the **Diátaxis framework** and **Google Developer Documentation Style Guide**.

---

## 📚 Documentation Framework

NOP documentation follows the **Diátaxis framework**, which organizes documentation into four distinct types based on user needs:

```
                    PRACTICAL                    THEORETICAL
              ┌─────────────────────────┬─────────────────────────┐
              │                         │                         │
    LEARNING  │       TUTORIALS         │      EXPLANATION        │
              │   (Learning-oriented)   │  (Understanding-oriented)│
              │   "Follow me"           │   "Here's how it works" │
              │                         │                         │
              ├─────────────────────────┼─────────────────────────┤
              │                         │                         │
    WORKING   │       HOW-TO GUIDES     │       REFERENCE         │
              │    (Task-oriented)      │  (Information-oriented) │
              │    "Do this"            │   "Look this up"        │
              │                         │                         │
              └─────────────────────────┴─────────────────────────┘
```

### Document Types

| Type | Purpose | Audience | Example |
|------|---------|----------|---------|
| **Tutorial** | Teach concepts through practice | New users | Getting Started Guide |
| **How-To Guide** | Complete specific tasks | All users | How to Deploy |
| **Reference** | Provide technical facts | Developers | API Specification |
| **Explanation** | Explain concepts and decisions | Architects | System Architecture |

---

## 📁 Folder Structure

```
docs/
├── INDEX.md                     # Master navigation
├── contributing/                # Contributor docs
├── guides/                      # Task-oriented how-to guides
├── features/                    # Feature documentation (explanation)
├── technical/                   # Technical specs (reference)
├── architecture/                # System design (explanation)
├── design/                      # UI/UX specifications
├── development/                 # Development guides
├── analysis/                    # Project reports
├── testing/                     # Test documentation
├── research/                    # Research findings
└── archive/                     # Historical docs

.github/templates/               # Documentation templates
├── doc_tutorial.md              # Learning-oriented guides
├── doc_guide.md                 # Task-oriented how-to
├── doc_reference.md             # API/config reference
├── doc_explanation.md           # Architecture/concepts
└── doc_analysis.md              # Reports and audits
```

---

## 📝 YAML Frontmatter

All documentation files **must** include YAML frontmatter at the top:

```yaml
---
title: Document Title
type: tutorial | guide | reference | explanation | analysis
category: category_name
version: "1.0"  # optional
auto_generated: true  # if auto-generated
last_updated: YYYY-MM-DD
---
```

### Required Fields

| Field | Description | Values |
|-------|-------------|--------|
| `title` | Document title | String |
| `type` | Diátaxis document type | tutorial, guide, reference, explanation, analysis |
| `last_updated` | Last update date | YYYY-MM-DD format |

### Optional Fields

| Field | Description | Values |
|-------|-------------|--------|
| `category` | Sub-category | String |
| `version` | Document version | Semantic version |
| `auto_generated` | If auto-generated | true/false |
| `prerequisites` | Required knowledge | Array of strings |
| `time_minutes` | Reading/completion time | Number |
| `difficulty` | Tutorial difficulty | beginner, intermediate, advanced |
| `status` | Document status | draft, review, final, archived |

---

## ✍️ Writing Style

Follow the **Google Developer Documentation Style Guide**:

### Voice and Tone

- **Use second person** ("you") to address the reader
- **Use active voice** ("Click the button" not "The button should be clicked")
- **Write in present tense** ("The system displays" not "The system will display")
- **Be direct and concise**

### Sentence Structure

- Keep sentences **under 26 words**
- One idea per sentence
- Lead with the main point

### Examples

| ❌ Avoid | ✅ Prefer |
|----------|-----------|
| "It should be noted that the system..." | "The system..." |
| "The button will be clicked by the user" | "Click the button" |
| "In order to configure the settings..." | "To configure settings..." |
| "There are three steps that need to be followed" | "Follow these three steps" |

---

## 📋 Document Structure

### Headings

Use headings hierarchically (H1 → H2 → H3):

```markdown
# Document Title (H1 - one per document)

## Major Section (H2)

### Subsection (H3)

#### Detail (H4 - use sparingly)
```

### Tables

Use tables for structured data:

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
```

### Code Examples

Always include working code examples:

````markdown
```python
# Include language identifier
def example():
    """Include docstrings"""
    return "result"
```
````

### Admonitions

Use callouts for important information:

```markdown
> **Note:** Additional helpful information.

> **Warning:** Critical information that could cause problems.

> **Tip:** Optional best practice suggestion.
```

---

## 🔗 Linking

### Internal Links

Use relative paths for internal documentation:

```markdown
[Related Guide](../guides/related.md)
[API Reference](../reference/api/endpoint.md)
```

### Link Best Practices

- **Link, don't duplicate** - Reference existing docs instead of copying content
- **Use descriptive link text** - "See the [API Reference]()" not "Click [here]()"
- **Update INDEX.md** when adding new documents
- **Check broken links** before committing

---

## 🏷️ Templates

Use templates from `.github/templates/` for new documents:

| Template | When to Use | Location |
|----------|-------------|----------|
| `doc_tutorial.md` | Step-by-step learning guides | `docs/guides/` |
| `doc_guide.md` | Task-oriented how-to instructions | `docs/guides/` |
| `doc_reference.md` | Technical specifications, API docs | `docs/technical/` |
| `doc_explanation.md` | Concept explanations, architecture | `docs/architecture/`, `docs/features/` |
| `doc_analysis.md` | Reports, audits, analysis | `docs/analysis/` |

### Creating New Documents

1. Choose the appropriate template from `.github/templates/doc_*.md`
2. Copy to the correct docs directory
3. Fill in the YAML frontmatter
4. Write content following the template structure
5. Update `docs/INDEX.md` with a link

---

## ✅ Quality Checklist

Before committing documentation:

- [ ] YAML frontmatter is complete
- [ ] Title is clear and descriptive
- [ ] Content follows Diátaxis type guidelines
- [ ] All code examples are tested and work
- [ ] Internal links are valid
- [ ] Spelling and grammar are correct
- [ ] INDEX.md is updated with new doc link
- [ ] Document is in the correct folder

---

## 📚 Resources

- [Diátaxis Framework](https://diataxis.fr/) - Documentation framework
- [Google Developer Documentation Style Guide](https://developers.google.com/style) - Writing style
- [Markdown Guide](https://www.markdownguide.org/) - Markdown syntax

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-14  
**Status:** Published
