# Documentation Standardization Workflow

Audit, organize, and optimize project documentation to match AKIS templates with comprehensive indexing.

**Trigger:** When documentation is scattered, verbose, or doesn't follow templates. Typically every major release or when onboarding new contributors.

---

## Phases

### 1. AUDIT - Document Discovery & Analysis

**Objective:** Inventory all documentation and assess current state

**Steps:**
1. Count and list all markdown files:
   ```bash
   find docs -type f -name "*.md" | wc -l
   find docs -type f -name "*.md" | sort
   ```

2. Create audit script to check template compliance:
   ```python
   # Script checks for required sections in each document type
   # Feature docs: Features, Quick Start, Usage, Related Documentation
   # Guide docs: Prerequisites, Steps, Troubleshooting, Related Resources
   # Workflow logs: Date, Summary, Changes, Decisions
   ```

3. Analyze current organization:
   - Check thematic directory structure (features/, guides/, technical/, etc.)
   - Identify duplicate content across files
   - Find verbose or redundant sections
   - Note missing INDEX or navigation

4. Generate compliance report:
   ```bash
   python /tmp/doc_audit.py
   ```

**Output:** Compliance metrics (% following templates), file counts by category, list of issues

---

### 2. PLAN - Define Reorganization Strategy

**Objective:** Create action plan for standardization

**Steps:**
1. Group documents by theme:
   - **features/** - Feature documentation
   - **guides/** - Setup, deployment, configuration guides
   - **technical/** - API references, protocols, specs
   - **architecture/** - System design, ADRs
   - **design/** - UI/UX specifications
   - **development/** - Contributing, testing, roadmap
   - **analysis/** - Research, measurements, investigations
   - **archive/** - Historical/deprecated documentation

2. Identify optimization opportunities:
   - Documents to merge (same topic, redundant content)
   - Verbose sections to condense (>500 lines, repetitive)
   - Missing template sections to add
   - Content to make more terse (paragraphs → bullets)

3. Create checklist:
   - [ ] Audit complete with metrics
   - [ ] Feature docs standardized
   - [ ] Guide docs standardized  
   - [ ] Technical docs updated
   - [ ] INDEX.md created/updated
   - [ ] Template compliance verified

**Output:** Actionable checklist with prioritized items

---

### 3. STANDARDIZE - Apply Templates

**Objective:** Update documents to match templates

**Steps:**

#### 3.1 Feature Documentation
Template: `.github/templates/feature-doc.md`

Required sections:
```markdown
# Feature Name
{One-line description}

## Features
- ✅ Feature 1
- ✅ Feature 2

## Quick Start
```bash
{minimal code}
```

## Usage
### {Use Case}
```{language}
{example}
```

## Configuration
| Option | Default | Description |
|--------|---------|-------------|

## Troubleshooting
**Problem**: {Issue}
**Solution**: {Fix}

## Related Documentation
- [Link](path.md) - Description

---
**Document Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Status**: Production Ready
```

#### 3.2 Guide Documentation
Template: `.github/templates/guide-doc.md`

Required sections:
```markdown
# Guide Title
{One-line description}

## Prerequisites
- Requirement 1
- Requirement 2

## Quick Start
```bash
{commands}
```

## Steps
### 1. {Step Title}
```bash
{command}
```

## Troubleshooting
### {Issue}
**Problem**: {Description}
**Solution**: {Fix}

## Related Resources
- [Link](path.md) - Description

---
**Document Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Status**: Production Ready
```

#### 3.3 Content Optimization
- Replace verbose paragraphs with bullet points
- Convert walls of text into tables or code blocks
- Remove redundant explanations
- Add Quick Start sections for immediate value
- Include practical examples
- Target 60-70% reduction in verbosity

**Output:** All core documents following templates with version footers

---

### 4. INDEX - Create Comprehensive Navigation

**Objective:** Build master index for easy discovery

**Steps:**
1. Create `docs/INDEX.md` with structure:
   ```markdown
   # {Project} Documentation Index
   
   ## 📍 Navigation
   | Category | Description | Location |
   
   ## Quick Start
   | Document | Purpose | Audience |
   
   ## {Category}
   ### [DOC.md](path/DOC.md)
   **Description**
   - Topic 1
   - Topic 2
   **Audience**: {Who}
   
   ## Changelog
   ### YYYY-MM-DD (vX.Y) - Description
   - Change 1
   - Change 2
   ```

2. Include for each document:
   - Title and path
   - One-line description
   - Key topics covered
   - Target audience
   - Note if consolidated from multiple sources

3. Add navigation aids:
   - Quick Start section for common tasks
   - By-role navigation (Developers, DevOps, Users)
   - By-topic navigation
   - File counts per category

4. Maintain changelog:
   - Track major reorganizations
   - Note consolidations and archives
   - Document version changes

**Output:** Comprehensive INDEX.md (300-500 lines) with full navigation

---

### 5. VERIFY - Quality Assurance

**Objective:** Ensure all changes are correct and consistent

**Checks:**
```bash
# Re-run compliance audit
python /tmp/doc_audit.py

# Verify all links work
find docs -name "*.md" -exec grep -h "\[.*\](" {} \; | grep -o "(.*\.md" | sort -u

# Check for broken references
grep -r "docs/" docs/ | grep -v "Binary" | grep "\.md:" | grep -v "^docs/INDEX.md"

# Validate template sections present
grep -l "## Features" docs/features/*.md
grep -l "## Quick Start" docs/guides/*.md
grep -l "Document Version" docs/**/*.md
```

**Validation criteria:**
- [ ] Template compliance >80% for core docs
- [ ] All documents have version footers
- [ ] INDEX.md includes all non-archived docs
- [ ] No broken internal links
- [ ] Consistent formatting (bullets, code blocks, tables)
- [ ] Content is scannable and terse

**Output:** Validated documentation ready for commit

---

### 6. DOCUMENT - Create Workflow Log

**Objective:** Record the standardization work

**Steps:**
1. Create workflow log: `log/workflow/YYYY-MM-DD_HHMMSS_documentation-standardization.md`

2. Include metrics:
   ```markdown
   # Documentation Standardization
   
   **Date**: YYYY-MM-DD HH:MM
   **Duration**: ~X minutes
   
   ## Summary
   Audited and standardized all documentation to match AKIS templates.
   
   ## Changes
   - Standardized: N feature docs, M guide docs
   - Created: INDEX.md with comprehensive navigation
   - Condensed: X lines → Y lines (Z% reduction)
   - Compliance: A% → B%
   
   ## Files Modified
   - docs/features/*.md - Added template sections
   - docs/guides/*.md - Restructured with Steps sections
   - docs/INDEX.md - Created master index
   
   ## Verification
   - [x] Template compliance >80%
   - [x] All links verified
   - [x] INDEX.md complete
   ```

**Output:** Documented standardization session

---

### 7. COMPLETE - Finalize Changes

**Objective:** Commit all changes with clear message

**Steps:**
1. Review all modified files:
   ```bash
   git status
   git diff --stat
   ```

2. Commit with descriptive message:
   ```
   docs: standardize documentation to AKIS templates
   
   - Audited 72 markdown files across docs/
   - Standardized 8 core documents to match templates
   - Created comprehensive INDEX.md (418 lines)
   - Reduced content verbosity by 65% (865→300 lines)
   - Improved template compliance from 17.9% to 80%
   ```

3. Update knowledge:
   ```json
   {"type":"entity","name":"Documentation","observations":["Standardized to templates","Compliance 17.9%→80%","upd:YYYY-MM-DD"]}
   ```

**Output:** Clean commit with all documentation improvements

---

## Success Criteria

✅ All documents inventoried and categorized by theme
✅ Template compliance >80% for core documentation
✅ Comprehensive INDEX.md with navigation and summaries
✅ Content reduced by 60-70% while maintaining clarity
✅ All documents have version footers (vX.Y | YYYY-MM-DD | Status)
✅ No broken internal links
✅ Consistent formatting (bullets, tables, code blocks)
✅ Quick Start sections for practical value

---

## Consolidation Patterns

### Pattern: Verbose Feature Documentation
**Symptom:** Feature docs >400 lines with detailed explanations
**Action:** Extract key points, use bullets, add Quick Start
**Example:** IMPLEMENTED_FEATURES: 471→180 lines (62% reduction)

### Pattern: Scattered Documentation
**Symptom:** Multiple docs covering same topic
**Action:** Consolidate into single source, archive old versions
**Example:** 7 agent docs → features/AGENTS_C2.md

### Pattern: Missing Templates
**Symptom:** Documents without standard sections
**Action:** Add Features, Quick Start, Usage, Troubleshooting sections
**Example:** STORM_FEATURE: 40%→100% compliance

### Pattern: No Navigation
**Symptom:** No master index or table of contents
**Action:** Create INDEX.md with categories and summaries
**Example:** Created 418-line INDEX with full navigation

### Pattern: Inconsistent Formatting
**Symptom:** Mix of paragraphs, lists, tables without structure
**Action:** Standardize to bullets for features, tables for config, code blocks for examples
**Example:** All feature docs now use consistent formatting

---

## Anti-Patterns to Avoid

❌ **Over-condensing:** Don't remove essential information
✅ Keep key details, remove only redundancy

❌ **Breaking links:** Don't move files without updating references
✅ Update INDEX.md and all cross-references

❌ **Template rigidity:** Don't force templates where inappropriate
✅ Adapt templates for different document types (catalog vs feature)

❌ **Ignoring existing structure:** Don't reorganize well-organized docs
✅ Focus on problematic areas, leave good docs alone

❌ **No version tracking:** Don't update docs without version footers
✅ Always add version, date, and status to documents

---

## Example Session

### Input
- 72 markdown files in docs/ folder
- No master index
- Template compliance: 17.9%
- Verbose documents (471+ lines)
- Request: "Organize and optimize documentation"

### Actions Taken
1. Audited all 72 files with compliance script
2. Organized into 8 thematic categories
3. Standardized 5 feature docs (AGENTS_C2, STORM, FILTERING, etc.)
4. Standardized 3 guide docs (QUICK_START, DEPLOYMENT, CONFIGURATION)
5. Created comprehensive INDEX.md (418 lines)
6. Condensed IMPLEMENTED_FEATURES: 471→180 lines
7. Condensed FEATURE_PROPOSALS: 394→120 lines
8. Added version footers to all docs
9. Verified all links and template compliance

### Outcome
- Template compliance: 17.9% → 80%
- Content reduction: 865 → 300 lines (65%)
- Created master INDEX with full navigation
- All core docs follow templates
- Easy discovery with thematic organization

---

## Integration with AKIS

This workflow is a **documentation maintenance task** separate from regular development sessions:

```
Regular Session:
CONTEXT → PLAN → IMPLEMENT → VERIFY → LEARN → COMPLETE

Documentation Standardization (this workflow):
AUDIT → PLAN → STANDARDIZE → INDEX → VERIFY → DOCUMENT → COMPLETE
```

**Frequency:** 
- After major releases
- When onboarding new contributors
- Every 6-12 months for maintenance
- When documentation becomes scattered or verbose

**Trigger:** 
- User request for documentation organization
- Template compliance <50%
- No master index exists
- Documents scattered across multiple locations

**Purpose:** Standardize documentation structure, improve discoverability, reduce verbosity, ensure template compliance

**Key Principle:** *Terse and Effective* - Remove redundancy, add structure, maintain clarity

---

## Related Files

- **Templates:** `.github/templates/feature-doc.md`, `.github/templates/guide-doc.md`
- **Index:** `docs/INDEX.md`
- **Workflow Logs:** `log/workflow/*-documentation-standardization.md`
- **Knowledge:** `project_knowledge.json`

---

## Reusability

This workflow is **project-agnostic** and can be applied to any repository:

1. Adjust thematic categories based on project type
2. Use project-specific templates if available
3. Customize INDEX.md structure for project needs
4. Adapt compliance checks for project standards

The core process (AUDIT → STANDARDIZE → INDEX → VERIFY) remains the same across projects.

---

*This prompt was created from session work on 2026-01-05 and is subject to improvement.*
