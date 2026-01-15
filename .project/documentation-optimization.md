# Blueprint: Documentation Optimization & Standardization

**Status:** ✅ COMPLETED (2026-01-14)

## Scope
- **Goal:** Standardize, organize, and optimize all 112 markdown documentation files using industry best practices
- **IN:** 
  - ✅ Create documentation templates based on industry standards (Diátaxis, Google Developer Documentation Style)
  - ✅ Reorganize folder structure for clarity
  - ✅ Condense redundant documentation
  - ✅ Create comprehensive index system
  - ✅ Standardize all active docs to templates
- **OUT:** 
  - Changing actual code functionality
  - External hosting or documentation platforms
  - Archive folder reorganization (keep as-is for history)

## Completion Summary

| Task | Status | Files |
|------|--------|-------|
| Create templates | ✅ Done | 5 templates in `.github/templates/doc_*.md` |
| New folder structure | ✅ Done | guides/, features/, technical/, architecture/, contributing/ |
| Update INDEX.md | ✅ Done | Diátaxis-compliant navigation |
| Add YAML frontmatter | ✅ Done | 88 files with frontmatter |
| Create standards doc | ✅ Done | `contributing/DOCUMENTATION_STANDARDS.md` |
| Migrate templates | ✅ Done | Moved to `.github/templates/` with `doc_` prefix |
| Update AKIS refs | ✅ Done | Updated skill, INDEX.md, standards doc |

## Industry Standards Research

### Diátaxis Documentation Framework
The industry standard for technical documentation organization:

| Type | Purpose | Example |
|------|---------|---------|
| **Tutorials** | Learning-oriented, get started | Quick Start, Getting Started |
| **How-To Guides** | Task-oriented, solve problems | How to Deploy, How to Configure |
| **Reference** | Information-oriented, describe | API Reference, CLI Reference |
| **Explanation** | Understanding-oriented, explain concepts | Architecture, Design Decisions |

### Google Developer Documentation Style Guide
Key principles:
- Use second person (you, your)
- Use active voice
- Write in present tense
- Keep sentences short (max 26 words)
- Use headings hierarchically
- Include code examples
- Provide clear prerequisites

### README Driven Development (RDD)
Standard README structure:
1. Title + Description
2. Prerequisites
3. Installation
4. Usage
5. Configuration
6. Contributing
7. License

## Current State Analysis

| Category | Current Count | Issues |
|----------|---------------|--------|
| Analysis | 19 | Many are one-time reports, should be archived |
| Architecture | 3 | Well structured |
| Design | 3 | Needs consolidation |
| Development | 8 | Some overlap with guides |
| Features | 6 | Good structure |
| Guides | 7 | Core guides, well maintained |
| Research | 1 | Minimal |
| Screenshots | 1 | Index only |
| Technical | 7 | Good structure |
| Archive | 53+ | Already archived |

**Total Active: ~56 files (excluding archive)**

## Proposed New Structure

```
docs/
├── INDEX.md                     # Master navigation
├── tutorials/                   # Learning-oriented (Diátaxis)
│   ├── getting-started.md      # First-time setup
│   └── your-first-workflow.md  # Tutorial walkthrough
├── guides/                      # Task-oriented (Diátaxis)
│   ├── deployment.md           # How to deploy
│   ├── configuration.md        # How to configure
│   ├── testing.md              # How to test
│   └── ...
├── reference/                   # Information-oriented (Diátaxis)
│   ├── api/                    # API documentation
│   │   └── rest-v1.md
│   ├── cli/                    # CLI documentation
│   │   └── scripts.md
│   ├── config/                 # Configuration reference
│   │   └── environment.md
│   └── architecture/           # System architecture
│       ├── system.md
│       └── state-management.md
├── explanation/                 # Understanding-oriented (Diátaxis)
│   ├── concepts/               # Core concepts
│   │   ├── agents.md
│   │   ├── workflows.md
│   │   └── topology.md
│   └── decisions/              # ADRs (Architecture Decision Records)
│       └── adr-001-*.md
├── contributing/                # Contributor docs
│   ├── CONTRIBUTING.md
│   ├── code-style.md
│   └── testing-guide.md
├── analysis/                    # Keep for ongoing analysis (AKIS specific)
│   └── [current analysis files]
└── archive/                     # Historical (unchanged)
    └── [all archived files]
```

## Documentation Templates

### Template 1: Tutorial
```markdown
---
title: [Tutorial Title]
type: tutorial
difficulty: beginner | intermediate | advanced
time: X minutes
prerequisites:
  - [Prerequisite 1]
  - [Prerequisite 2]
last_updated: YYYY-MM-DD
---

# [Tutorial Title]

## Overview
[1-2 sentences describing what you'll learn]

## Prerequisites
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

## What You'll Build
[Description with optional screenshot/diagram]

## Steps

### Step 1: [Action]
[Instructions]

```code
[example]
```

### Step 2: [Action]
[Instructions]

## Verification
[How to verify success]

## Next Steps
- [Link to next tutorial]
- [Link to related guide]

## Troubleshooting
| Problem | Solution |
|---------|----------|
| [Issue 1] | [Fix 1] |
```

### Template 2: How-To Guide
```markdown
---
title: How to [Task]
type: guide
category: [deployment | configuration | operations | security]
last_updated: YYYY-MM-DD
---

# How to [Task]

## Overview
[1-2 sentences describing the goal]

## Prerequisites
- [Requirement 1]
- [Requirement 2]

## Steps

### 1. [First Action]
[Instructions with code examples]

### 2. [Second Action]
[Instructions with code examples]

## Verification
[How to verify success]

## Common Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| [Issue 1] | [Cause 1] | [Solution 1] |

## Related Guides
- [Link 1]
- [Link 2]
```

### Template 3: Reference Document
```markdown
---
title: [Component] Reference
type: reference
version: X.Y
last_updated: YYYY-MM-DD
---

# [Component] Reference

## Overview
[Brief description of what this reference covers]

## [Section 1]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field1` | string | Yes | Description |

### [Subsection]
[Detailed information]

## [Section 2]
...

## See Also
- [Related Reference]
```

### Template 4: Architecture/Explanation Document
```markdown
---
title: [Topic] Architecture
type: explanation
last_updated: YYYY-MM-DD
---

# [Topic] Architecture

## Overview
[High-level description]

## Key Concepts
| Concept | Description |
|---------|-------------|
| [Concept 1] | [Description] |

## Architecture Diagram
```
[ASCII diagram or link to image]
```

## Components

### [Component 1]
- **Purpose:** [What it does]
- **Responsibilities:** [List]
- **Dependencies:** [List]

## Design Decisions
| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| [Decision 1] | [Why] | [What else was considered] |

## Related Documents
- [Link 1]
```

### Template 5: Analysis/Report Document
```markdown
---
title: [Analysis Topic]
type: analysis
date: YYYY-MM-DD
author: [Author/System]
status: draft | review | final
---

# [Analysis Topic]

## Executive Summary
[2-3 sentence summary of findings]

## Methodology
[How the analysis was conducted]

## Findings

### Finding 1: [Title]
[Details with data/evidence]

### Finding 2: [Title]
[Details with data/evidence]

## Recommendations
| Priority | Recommendation | Impact |
|----------|----------------|--------|
| High | [Rec 1] | [Expected impact] |

## Appendix
[Supporting data, raw results]
```

## Tasks

### Phase 1: Create Templates [documentation]
1. [ ] Create `docs/_templates/` directory with all 5 templates
2. [ ] Create template README explaining usage

### Phase 2: Reorganize Structure [documentation]
3. [ ] Create new folder structure (tutorials, guides, reference, explanation, contributing)
4. [ ] Move files to appropriate locations
5. [ ] Update all internal links

### Phase 3: Consolidate & Condense [documentation]
6. [ ] Merge duplicate/overlapping documents
7. [ ] Archive completed one-time analysis reports
8. [ ] Condense verbose documents

### Phase 4: Standardize Documents [documentation]
9. [ ] Add YAML frontmatter to all active documents
10. [ ] Standardize formatting across all documents
11. [ ] Add "Last Updated" dates

### Phase 5: Index & Navigation [documentation]
12. [ ] Update INDEX.md with new structure
13. [ ] Add navigation links between related docs
14. [ ] Create category-level index files

## Files Affected
- `docs/INDEX.md` - Complete rewrite
- `docs/_templates/` - New directory
- All files in `docs/` subfolders - Reformatting
- Estimated: 56 active documents + 5 templates + new indexes

## Success Criteria
- [ ] All active docs have YAML frontmatter
- [ ] All docs follow one of 5 templates
- [ ] No duplicate content (linked instead)
- [ ] Clear navigation from INDEX.md to any doc
- [ ] Diátaxis-compliant folder structure
