# Project Documents

**Purpose:** Store project-level planning documents separate from code/repository documentation.

## Folder Structure

| Folder | Purpose | Template |
|--------|---------|----------|
| `blueprints/` | Feature design specifications | [BLUEPRINT.md](blueprints/BLUEPRINT.md) |
| `roadmaps/` | Planning and milestones | [ROADMAP.md](roadmaps/ROADMAP.md) |
| `mockups/` | UI/UX design documents | [MOCKUP.md](mockups/MOCKUP.md) |

## When to Use

| Document Type | Use When |
|---------------|----------|
| **Blueprint** | Designing a new feature before implementation |
| **Roadmap** | Planning project phases, milestones, priorities |
| **Mockup** | Describing UI/UX, user flows, visual design |

## Workflow

1. **Discussion** → Create blueprint/mockup in `.project/`
2. **Approval** → Blueprint reviewed and approved
3. **Implementation** → Reference blueprint during development
4. **Archive** → Move to `archive/` when complete

## Naming Convention

```
blueprints/FEATURE-NAME_v1.md
roadmaps/Q1-2026_ROADMAP.md
mockups/FEATURE-NAME_mockup.md
```

## Difference from `docs/`

| `.project/` | `docs/` |
|-------------|---------|
| Planning, design, pre-implementation | Technical reference, guides, API |
| Evolves during discussion | Stable after implementation |
| May be discarded | Maintained long-term |
