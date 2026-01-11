# Blueprint Template

Copy this template when creating a new feature blueprint.

> **Usage:** Copy everything below the `---` line. Replace all `{placeholder}` text with actual content. Delete this instruction block and any unused sections.

---

# Blueprint: {Feature Name}

**Version:** 1.0  
**Author:** {Name}  
**Date:** {YYYY-MM-DD}  
**Status:** Draft | Review | Approved | Implemented | Archived

---

## Overview

{One paragraph describing what this feature does and why it's needed}

## Problem Statement

{What problem does this solve? Who has this problem?}

## Proposed Solution

{High-level description of the solution approach}

## Components

| Component | Type | Description |
|-----------|------|-------------|
| {Name} | Frontend/Backend/Service | {What it does} |

## Data Flow

```
{Describe the data flow or include a diagram}
User → Frontend → API → Service → Database
```

## API Changes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/{resource}` | {Description} |
| POST | `/api/v1/{resource}` | {Description} |

## UI/UX Changes

{Describe any UI changes, reference mockups if available}

See: `.project/mockups/{feature}_mockup.md`

## Dependencies

| Dependency | Type | Impact |
|------------|------|--------|
| {Name} | Required/Optional | {What happens if missing} |

## Constraints

- {Technical constraint 1}
- {Business constraint 2}
- {Resource constraint 3}

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| {Option A} | {Pros} | {Cons} | {Why rejected/accepted} |
| {Option B} | {Pros} | {Cons} | {Why rejected/accepted} |

## Implementation Plan

| Phase | Tasks | Estimate |
|-------|-------|----------|
| 1 | {Setup, scaffolding} | {X days} |
| 2 | {Core implementation} | {X days} |
| 3 | {Testing, polish} | {X days} |

## Testing Strategy

- [ ] Unit tests for {component}
- [ ] Integration tests for {flow}
- [ ] E2E tests for {scenario}

## Rollback Plan

{How to revert if something goes wrong}

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| {Metric} | {Value} | {How to measure} |

## Open Questions

- [ ] {Question 1}
- [ ] {Question 2}

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Author | | | ○ Draft |
| Reviewer | | | ○ Pending |
| Approver | | | ○ Pending |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {Date} | {Name} | Initial draft |
