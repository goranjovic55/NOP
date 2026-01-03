# Documentation

## When to Use
- Creating workflow logs
- Writing README files
- Documenting APIs
- After completing features

## Avoid
- ❌ Stale documentation → ✅ Update with code changes
- ❌ No examples → ✅ Include code samples
- ❌ Verbose explanations → ✅ Keep concise

## Overview

Keep documentation clear, current, and close to code. Workflow logs for history, READMEs for usage, inline for complexity.

---

## Workflow Logs

**When:** Tasks >15 min or significant changes

**Location:** `log/workflow/YYYY-MM-DD_HHMMSS_task.md`

**Template:** `.github/templates/workflow-log.md`

**Create during COMPLETE phase:**
```bash
# Template format
cp .github/templates/workflow-log.md log/workflow/$(date +%Y-%m-%d_%H%M%S)_task-name.md
```

**Include:**
- Task objective
- Approach/decisions
- Changes made
- Verification steps
- Lessons learned

**Example:**
```markdown
# Task: Add CVE Scanner Integration

## Context
Need real CVE data from NVD API instead of mock data.

## Approach
- Integrate NVD API 2.0
- Add version detection
- Cache CVE results

## Changes
- backend/app/services/cve_scanner.py
- Added CVE caching (24h TTL)
- Version string normalization

## Verification
- [x] Unit tests pass
- [x] Integration test with real API
- [x] Version detection accurate

## Lessons
- NVD API rate limit: 5 req/sec
- Version normalization critical for matching
```

---

## README Files

**Purpose:** Quick start, setup, usage

**Structure:**
```markdown
# Project/Component Name

Brief description (1-2 sentences)

## Setup
Installation/build steps

## Usage
Basic examples

## Configuration
Environment variables, options

## Development
How to contribute, run tests
```

**Keep current:**
- Update when features change
- Add new endpoints/components
- Document breaking changes
- Include examples

---

## Inline Documentation

**When to use:**
- Complex algorithms
- Non-obvious business logic
- Workarounds/hacks
- Integration points

**Keep concise:**
```python
# ✅ Good
def normalize_version(version: str) -> str:
    """Normalize version string for CVE matching.
    
    Handles: 1.2.3, v1.2.3, 1.2.3-beta
    Returns: 1.2.3
    """
    ...

# ❌ Too verbose
def normalize_version(version: str) -> str:
    """
    This function takes a version string and normalizes it.
    It can handle many different formats including...
    First we check if it starts with v...
    Then we split on dash...
    """
    ...
```

**TypeScript/JavaScript:**
```typescript
/**
 * Fetch CVE data with automatic retry
 * @param cveId - CVE identifier (e.g., "CVE-2024-1234")
 * @returns CVE details or null if not found
 */
async function fetchCVE(cveId: string): Promise<CVEData | null> {
  ...
}
```

---

## API Documentation

**FastAPI (automatic):**
```python
@router.post("/scan", response_model=ScanResult)
async def create_scan(
    scan: ScanCreate,
    db: Session = Depends(get_db)
) -> ScanResult:
    """
    Create new vulnerability scan.
    
    - **target**: IP or hostname
    - **scan_type**: quick, full, custom
    - Returns scan ID and status
    """
    ...
```

**Access:** `http://localhost:8000/docs`

**Keep updated:**
- Response models accurate
- Example values realistic
- Error codes documented

---

## Architecture Docs

**Location:** `docs/architecture/`

**When to create:**
- Major design decisions
- System architecture changes
- Integration patterns
- Data models

**Format (ADR - Architecture Decision Record):**
```markdown
# ADR-001: Use NVD API 2.0

## Status
Accepted

## Context
Need real CVE data. Options: NVD API 1.0, 2.0, or scraping.

## Decision
Use NVD API 2.0 with caching.

## Consequences
- Rate limited (5 req/sec)
- Need caching layer
- Better data quality
- Official source
```

---

## Feature Documentation

**Location:** `docs/features/`

**Include:**
- Feature description
- User flow
- Screenshots (if UI)
- Configuration
- Limitations

**Example:**
```markdown
# CVE Scanner

Scans assets for known vulnerabilities using NVD database.

## Usage
1. Navigate to Vulnerabilities page
2. Click "Scan Asset"
3. Select asset and scan type
4. View results

## Configuration
- `NVD_API_KEY` - Optional, increases rate limit
- `CVE_CACHE_TTL` - Cache duration (default: 24h)

## Limitations
- Rate limited without API key
- Requires accurate version detection
```

---

## Best Practices

**Do:**
- Update docs with code changes
- Use examples
- Keep concise
- Link related docs
- Date significant updates

**Don't:**
- Duplicate information
- Write obvious comments
- Let docs go stale
- Over-document simple code
- Skip workflow logs for complex tasks

---

## Checklist

Before commit:
- [ ] Workflow log created (if >15 min task)
- [ ] README updated (if user-facing change)
- [ ] API docs current (if endpoint changed)
- [ ] Inline docs for complex logic
- [ ] Architecture docs (if design decision)

Documentation review:
- [ ] Clear and concise
- [ ] Examples provided
- [ ] Up to date
- [ ] No duplicates
- [ ] Properly linked

## Related Skills
- `knowledge-management.md` - Project knowledge
- `git-workflow.md` - Commit documentation
