# Skills

**Load** relevant SKILL.md files **BEFORE** implementing.

## How to Use

1. **At CONTEXT**: Identify skills needed for task
2. **Read SKILL.md**: `read_file .github/skills/{skill}/SKILL.md`
3. **Follow checklist**: Each skill has required steps
4. **Apply patterns**: Use examples as templates
5. **Emit at COMPLETE**: `[SKILLS_USED] skill1, skill2`

---

## Core Skills (Universal)

These skills work across projects:

| Skill | When to Use |
|-------|-------------|
| `backend-api` | API endpoints, routes, services |
| `frontend-react` | UI components, pages, state |
| `testing` | Unit, integration, E2E tests |
| `security` | Auth, validation, secrets |
| `error-handling` | Exceptions, error responses |
| `infrastructure` | Docker, containers, deployment |
| `git-deploy` | Commits, branching, releases |
| `context-switching` | Task interrupts, state preservation |
| `akis-analysis` | Framework compliance, improvements |

---

## Project Skills (Add Your Own)

Create skills specific to your project domain:

```bash
mkdir .github/skills/{skill-name}
# Create .github/skills/{skill-name}/SKILL.md
```

**Examples of project skills**:
- Domain-specific patterns (e.g., payment processing, data pipelines)
- Technology-specific patterns (e.g., specific frameworks)
- Business logic patterns (e.g., workflow engines)

---

## Skill File Format

```markdown
---
name: skill-name
description: When to use this skill
---

# Skill Title

## When to Use
- Scenario 1
- Scenario 2

## Pattern
Architecture/approach description

## Checklist
- [ ] Required step 1
- [ ] Required step 2

## Examples
(code examples with comments)
```

---

## Directory Structure

```
.github/skills/
├── README.md              # This file
│
├── # Core Skills (copy to new projects)
├── backend-api/SKILL.md
├── frontend-react/SKILL.md
├── testing/SKILL.md
├── security/SKILL.md
├── error-handling/SKILL.md
├── infrastructure/SKILL.md
├── git-deploy/SKILL.md
├── context-switching/SKILL.md
├── akis-analysis/SKILL.md
│
└── # Project Skills (project-specific)
    └── {your-skill}/SKILL.md
```

---

## AKIS Integration

Skills are the **S** in AKIS:

| Pillar | Purpose |
|--------|---------|
| **A**gents | WHO does work |
| **K**nowledge | WHAT exists (history) |
| **I**nstructions | HOW to work (process) |
| **S**kills | PATTERNS for scenarios |

**Load at CONTEXT** → **Apply at INTEGRATE** → **Emit at COMPLETE**

---

## Creating New Skills

When you discover a reusable pattern:

1. Create directory: `.github/skills/{name}/`
2. Create `SKILL.md` with frontmatter
3. Document: When to Use, Pattern, Checklist, Examples
4. Reference in knowledge if significant

**Good skill candidates**:
- Patterns used 3+ times
- Complex procedures needing consistency
- Domain-specific knowledge
