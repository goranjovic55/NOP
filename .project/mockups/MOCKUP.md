# Mockup Template

Copy this template when creating a new UI/UX mockup document.

---

# Mockup: {Feature Name}

**Version:** 1.0  
**Author:** {Name}  
**Date:** {YYYY-MM-DD}  
**Status:** Draft | Review | Approved | Implemented

---

## Overview

{Brief description of the UI/UX being designed}

## User Story

**As a** {user type}  
**I want to** {action}  
**So that** {benefit}

## User Flow

```
[Entry Point] → [Step 1] → [Step 2] → [Step 3] → [Success State]
     │              │           │          │            │
  {Trigger}     {Action}    {Action}   {Action}    {Outcome}
```

## Screen Layouts

### Screen 1: {Name}

**Purpose:** {What this screen does}

```
┌─────────────────────────────────────────────┐
│  Header / Navigation                        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Main Content Area                  │    │
│  │                                     │    │
│  │  [Component 1]                      │    │
│  │                                     │    │
│  │  [Component 2]     [Component 3]    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Primary Action]    [Secondary Action]     │
│                                             │
├─────────────────────────────────────────────┤
│  Footer / Status Bar                        │
└─────────────────────────────────────────────┘
```

**Components:**

| Component | Type | Description |
|-----------|------|-------------|
| {Name} | Button/Input/Table/Card | {Behavior} |

**States:**

| State | Description | Visual Change |
|-------|-------------|---------------|
| Default | Normal state | {Description} |
| Hover | Mouse over | {Description} |
| Active | Clicked/Selected | {Description} |
| Disabled | Not available | {Description} |
| Error | Validation failed | {Description} |
| Loading | Fetching data | {Description} |

---

### Screen 2: {Name}

**Purpose:** {What this screen does}

```
┌─────────────────────────────────────────────┐
│  {ASCII mockup}                             │
└─────────────────────────────────────────────┘
```

---

## Component Specifications

### {Component Name}

**Type:** Button | Input | Card | Modal | Table | List

**Props/Inputs:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| {name} | string | "" | {Description} |
| {enabled} | boolean | true | {Description} |

**Events:**

| Event | Trigger | Handler |
|-------|---------|---------|
| onClick | User clicks | {Action} |
| onChange | Value changes | {Action} |

**Styling:**

| Property | Value | Notes |
|----------|-------|-------|
| Background | {color} | Cyberpunk theme |
| Border | {style} | Neon glow |
| Font | {family/size} | Monospace |

---

## Interactions

### Interaction 1: {Name}

**Trigger:** {User action}  
**Response:** {System response}  
**Feedback:** {Visual/audio feedback}

```
User clicks [Button] 
  → API call starts
  → Loading spinner shows
  → Response received
  → Success toast appears
  → UI updates
```

---

## Responsive Design

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | <768px | Single column, stacked |
| Tablet | 768-1024px | Two columns |
| Desktop | >1024px | Full layout |

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Keyboard Navigation | Tab order, Enter to activate |
| Screen Reader | ARIA labels on all interactive elements |
| Color Contrast | WCAG AA compliant (4.5:1 ratio) |
| Focus Indicators | Visible focus ring |

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty state | Show placeholder message |
| Loading | Display spinner/skeleton |
| Error | Show error message, retry option |
| Overflow | Truncate with ellipsis, tooltip on hover |
| Very long content | Scroll or pagination |

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | #00ffcc | Primary actions |
| `--color-secondary` | #ff00ff | Accents |
| `--color-error` | #ff3366 | Error states |
| `--spacing-sm` | 8px | Tight spacing |
| `--spacing-md` | 16px | Default spacing |
| `--spacing-lg` | 24px | Section spacing |

---

## Assets Required

| Asset | Type | Description | Status |
|-------|------|-------------|--------|
| {icon.svg} | Icon | {Purpose} | ○ Needed |
| {background.png} | Image | {Purpose} | ○ Needed |

---

## Related Documents

- Blueprint: `.project/blueprints/{feature}.md`
- Component Library: `docs/design/COMPONENTS.md`
- Style Guide: `docs/design/UNIFIED_STYLE_GUIDE.md`

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Designer | | | ○ Draft |
| Developer | | | ○ Pending |
| Stakeholder | | | ○ Pending |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {Date} | {Name} | Initial mockup |
