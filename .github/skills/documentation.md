# Documentation

Keep docs clear, current, close to code. Use templates from `.github/templates/`.

## When to Use
- Creating workflow logs (>15min tasks)
- Writing feature docs
- Documenting APIs
- After completing features

## Avoid
- ❌ Stale docs → ✅ Update with code
- ❌ No examples → ✅ Include samples
- ❌ Verbose → ✅ Keep concise
- ❌ Random placement → ✅ Follow structure.md

## Examples

### Structure
```
docs/
├── INDEX.md
├── guides/          # User guides, deployment
├── features/        # Feature docs
├── technical/       # API references
├── architecture/    # System design, ADRs
├── development/     # Contributing, testing
├── analysis/        # Current analysis
└── archive/         # Historical
```

### Naming
- `CATEGORY_NAME.md` (e.g., `DEPLOYMENT.md`)
- `FEATURE_NAME.md` (e.g., `STORM_FEATURE.md`)
- Uppercase with underscores

### Placement
```bash
# Check existing
ls docs/*/
cat docs/INDEX.md

# Place correctly
# Guides → docs/guides/
# Features → docs/features/
# API → docs/technical/
# Design → docs/architecture/
```

### Workflow Log
```bash
# Create for >15min tasks
cp .github/templates/workflow-log.md log/workflow/$(date +%Y-%m-%d_%H%M%S)_task.md
```

### Consolidate Duplicates
```bash
# Archive old versions
mkdir -p docs/archive/category-YYYY-MM-DD/
mv docs/OLD_DOC.md docs/archive/category-YYYY-MM-DD/

# Update INDEX.md
```

### Templates
- `skill.md` - Skills
- `feature-doc.md` - Features
- `guide-doc.md` - Guides
- `workflow-log.md` - Workflow logs

## Related
- knowledge.md
- debugging.md
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

**Template:** `.github/templates/feature-doc.md`

**Include:**
- Feature description
- User flow
- Screenshots (if UI)
- Configuration
- Limitations

**Generic Template:**
```markdown
# [Feature Name]

[Brief description of what it does]

## Usage
[Step-by-step instructions or code examples]

## Configuration
[Environment variables, settings, options]

## Limitations
[Known limitations or constraints]

## Related
[Links to related features or documentation]
```

---

## Session-Driven Documentation Updates

**When:** During LEARN phase at end of session

**How:** Run `python .github/scripts/update_docs.py`

**Process:**
1. Script analyzes session changes (commits, files, workflow log)
2. Suggests documentation updates based on impact
3. Agent reviews suggestions and applies approved updates
4. Updates are lightweight and focused

**Principles:**
- **Minimal updates only** - only update sections directly affected
- **No bloat** - keep changes concise and targeted
- **Avoid duplication** - check existing docs before adding
- **Update dates** - add date when making significant updates
- **Preserve structure** - don't reorganize, just update content

**Example workflow:**
```bash
# During LEARN phase
python .github/scripts/update_docs.py

# Review output (JSON with suggestions)
# Apply approved updates to affected docs
# Note updates in workflow log
```

**What to update:**
- API docs when endpoints change
- UI/UX docs when components change
- Deployment docs when infrastructure changes
- Feature lists when adding features
- README when user-facing changes occur

**What NOT to update:**
- Docs unrelated to session changes
- Docs that are still accurate
- Minor implementation details
- Internal refactoring details

---

## Cross-Session Workflow Analysis

**When:** 
- **Automatically**: Every 10 sessions (prompted in COMPLETE phase)
- **Manually**: User can trigger anytime

**Purpose:** **Maintenance task** - Analyze ALL sessions independently to identify patterns and improve AKIS framework

**Session Tracking:** Uses `.github/scripts/session_tracker.py` to track session numbers and automatically prompt for maintenance

**Important:** This is **NOT part of the regular session LEARN phase**. This is a separate maintenance workflow that runs after session completion when maintenance is due.

**How:** Use the AKIS Workflow Analyzer as a standalone maintenance task

**Process:**
1. **Check if maintenance is due** (automatic in COMPLETE phase):
   ```bash
   python .github/scripts/session_tracker.py check-maintenance
   ```

2. **Run analyzer script**:
   ```bash
   python .github/scripts/analyze_workflows.py --output markdown
   ```

3. Review analysis output:
   - Skill candidates (recurring patterns across sessions)
   - Documentation needs (frequently updated areas)
   - Instruction improvements (common decisions)
   - Knowledge updates (cross-session entities)

4. Follow prompt: `.github/prompts/akis-workflow-analyzer.md`

5. Implement approved improvements:
   - Create/update skills based on patterns
   - Organize and update documentation
   - Enhance framework instructions
   - Update knowledge base

6. **Mark maintenance as complete**:
   ```bash
   python .github/scripts/session_tracker.py mark-maintenance-done
   ```

**Workflow phases:**
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```

**Difference from single-session LEARN phase:**
- **Single session (baked into LEARN)**: Analyzes current session only, updates knowledge/skills for that session
- **Multi-session maintenance (this workflow)**: Analyzes sessions since last maintenance (typically 10), standardizes patterns, cleans documentation, adjusts instructions

**What it provides:**
- Pattern analysis across all sessions
- Skill creation suggestions (frequency-based)
- Documentation organization recommendations
- Instruction standardization proposals
- Knowledge base improvements

**Example output:**
```
Pattern Analysis:
- frontend-ui: 12 sessions
- api-endpoints: 8 sessions
- docker-deployment: 5 sessions

Skill Candidates:
- ui-consistency.md (12 sessions, high priority)
- api-debugging.md (8 sessions, high priority)

Documentation Needs:
- API Reference (high priority)
- Component Library Guide (medium priority)
```

**Use cases:**
- Standardizing skills across project
- Organizing scattered documentation
- Codifying frequently-made decisions
- Tracking frequently-modified areas
- Framework continuous improvement

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
- `knowledge.md` - Project knowledge management
- `git-workflow.md` - Commit documentation

## Related Prompts
- `.github/prompts/akis-workflow-analyzer.md` - Cross-session analysis and framework improvement
