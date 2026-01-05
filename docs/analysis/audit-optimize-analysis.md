# Audit-Optimize Workflow: In-Depth Analysis & Optimizations

## Executive Summary

**Current State**: audit-optimize.md is 629 lines, 95% template compliant, designed for documentation but adaptable to other components.

**Analysis Focus**: Optimize for real-world use on Skills, Instructions, Knowledge, Code, and AKIS Framework.

**Key Finding**: Workflow is solid but has hardcoded assumptions. Needs parameterization and component-specific guidance.

---

## Critical Optimizations (High Priority)

### 1. Parameterized Paths & Targets

**Problem**: Hardcoded to `docs/` in Phase 1
```bash
find docs -type f -name "*.md"  # Only works for documentation
```

**Solution**: Add component configuration section at start
```markdown
## Component Configuration

Set these variables based on your target:

**For Documentation:**
```bash
TARGET_DIR="docs"
FILE_PATTERN="*.md"
TEMPLATE_DIR=".github/templates"
TEMPLATE_FILE="feature-doc.md"  # or guide-doc.md
INDEX_FILE="docs/INDEX.md"
```

**For Skills:**
```bash
TARGET_DIR=".github/skills"
FILE_PATTERN="*.md"
TEMPLATE_DIR=".github/templates"
TEMPLATE_FILE="skill.md"
INDEX_FILE=".github/skills/INDEX.md"
```

**For Instructions:**
```bash
TARGET_FILE=".github/copilot-instructions.md"
MAX_LINES=150
# No template - keep terse
```

**For Knowledge:**
```bash
TARGET_FILE="project_knowledge.json"
FORMAT="JSONL"
# Line 1 = map
```

**For Code:**
```bash
TARGET_DIR="backend/app"  # or frontend/src
FILE_PATTERN="*.py"  # or *.ts, *.tsx
# Check for duplicate functions, patterns
```

**For Prompts:**
```bash
TARGET_DIR=".github/prompts"
FILE_PATTERN="*.md"
TEMPLATE_FILE="workflow-prompt.md"
INDEX_FILE=".github/prompts/README.md"
```
```

**Impact**: Makes workflow truly universal instead of doc-centric.

---

### 2. Component-Specific Audit Commands

**Problem**: Generic audit doesn't capture component-specific checks

**Solution**: Add component decision tree in Phase 1

```markdown
### 1. AUDIT - Component Discovery & Analysis

**Objective:** Inventory target component and assess current state

**Step 1: Identify Component Type**

Determine what you're auditing:
- [ ] Documentation (docs/)
- [ ] Skills (.github/skills/)
- [ ] Instructions (.github/copilot-instructions.md)
- [ ] Knowledge (project_knowledge.json)
- [ ] Code (backend/, frontend/)
- [ ] Prompts (.github/prompts/)
- [ ] AKIS Framework (multiple components)

**Step 2: Run Component-Specific Audit**

#### For Documentation:
```bash
find ${TARGET_DIR:-docs} -type f -name "*.md" | wc -l
python /tmp/doc_audit.py  # Check template compliance
```

#### For Skills:
```bash
find .github/skills -name "*.md" -not -name "INDEX.md" | wc -l
# Check each skill for: When to Use, Avoid, Overview, Examples
for skill in .github/skills/*.md; do
  [ "$skill" = ".github/skills/INDEX.md" ] && continue
  echo "Checking $skill..."
  grep -q "## When to Use" "$skill" || echo "  Missing: When to Use"
  grep -q "## Avoid" "$skill" || echo "  Missing: Avoid"
  grep -q "## Overview" "$skill" || echo "  Missing: Overview"
  grep -q "## Examples" "$skill" || echo "  Missing: Examples"
done
```

#### For Instructions:
```bash
wc -l .github/copilot-instructions.md
# Target: <150 lines
# Check for:
# - Redundant guidance
# - Decisions that should be in skills instead
# - Missing repeated patterns from logs
```

#### For Knowledge:
```bash
wc -l project_knowledge.json
# Check line 1 is valid map
head -1 project_knowledge.json | python -c "import sys, json; json.loads(sys.stdin.read())"
# Validate all lines are valid JSON
python -c "import json; [json.loads(line) for line in open('project_knowledge.json')]"
# Find stale entities (not touched in 20+ sessions)
grep '"upd:' project_knowledge.json | cut -d'"' -f4 | sort | uniq -c
```

#### For Code:
```bash
# Find duplicate functions
find backend -name "*.py" -exec grep -l "^def " {} \; | \
  xargs -I {} sh -c 'grep "^def " {} | cut -d"(" -f1' | \
  sort | uniq -c | sort -rn | awk '$1 > 1'

# Find long files (>500 lines)
find backend -name "*.py" -exec wc -l {} \; | awk '$1 > 500' | sort -rn

# Find files without type hints (Python)
find backend -name "*.py" -exec grep -L "from typing import\|import typing" {} \;
```

#### For Prompts:
```bash
find .github/prompts -name "*.md" | wc -l
# Check against workflow-prompt.md template
for prompt in .github/prompts/*.md; do
  [ "$prompt" = ".github/prompts/README.md" ] && continue
  echo "Checking $prompt..."
  grep -q "## Phases" "$prompt" || echo "  Missing: Phases"
  grep -q "## Success Criteria" "$prompt" || echo "  Missing: Success Criteria"
  grep -q "## Anti-Patterns" "$prompt" || echo "  Missing: Anti-Patterns"
done
```
```

**Impact**: Provides actionable audit for each component type.

---

### 3. Template Mapping Matrix

**Problem**: Different components use different templates, not clear which to use

**Solution**: Add template reference table

```markdown
## Template Reference Matrix

| Component | Template | Required Sections | Max Length |
|-----------|----------|-------------------|------------|
| Feature Doc | `feature-doc.md` | Features, Quick Start, Usage, Config, Troubleshooting, Related Docs | ~300 lines |
| Guide Doc | `guide-doc.md` | Prerequisites, Quick Start, Steps, Troubleshooting, Related Resources | ~400 lines |
| Skill | `skill.md` | When to Use, Avoid, Overview, Examples | <100 lines |
| Workflow Prompt | `workflow-prompt.md` | Phases, Success Criteria, Patterns, Anti-Patterns, Example, Integration, Related Files | 300-600 lines |
| Instructions | None | Terse guidance only | <150 lines |
| Knowledge | None | JSONL format, line 1 = map | No limit |
| Code | Project standards | Type hints, docstrings, <500 lines/file | Varies |

**How to use:**
1. Identify your component type
2. Look up corresponding template
3. Check required sections
4. Validate length constraints
```

**Impact**: Clear guidance on which template to use.

---

### 4. Gap Analysis by Component

**Problem**: Generic gap commands don't work for all components

**Solution**: Component-specific gap detection

```markdown
### 2. PLAN - Step 4: Identify Gaps from Workflow Logs

**Gap Analysis Commands by Component:**

#### Documentation Gaps:
```bash
# Find features mentioned in logs but not in docs/features/
grep -rh "Implemented\|Created.*feature\|Added.*feature" log/workflow/*.md | \
  grep -v "^#" | sort | uniq > /tmp/implemented_features.txt
ls docs/features/*.md | sed 's/docs\/features\///' | sed 's/\.md//' | \
  sort > /tmp/existing_features.txt
comm -23 /tmp/implemented_features.txt /tmp/existing_features.txt
```

#### Skill Gaps:
```bash
# Find patterns used 3+ times but not in .github/skills/
grep -rh "pattern\|technique\|approach\|method" log/workflow/*.md | \
  grep -v "^#" | tr '[:upper:]' '[:lower:]' | \
  sed 's/[^a-z ]//g' | tr ' ' '\n' | \
  grep -v "^$" | sort | uniq -c | sort -rn | awk '$1 >= 3'

# Compare with existing skills
ls .github/skills/*.md | sed 's/.github\/skills\///' | sed 's/\.md//'
```

#### Instruction Gaps:
```bash
# Find decisions made 3+ times
grep -rh "always\|never\|prefer\|avoid\|must\|should" log/workflow/*.md | \
  grep -v "^#" | sort | uniq -c | sort -rn | awk '$1 >= 3'

# Check if already in instructions
grep -f /tmp/repeated_decisions.txt .github/copilot-instructions.md
```

#### Knowledge Gaps:
```bash
# Find entities mentioned 5+ times but not tracked
grep -rh "entity\|component\|service\|module\|class" log/workflow/*.md | \
  grep -v "^#" | sed 's/.*entity[^:]*://;s/.*component[^:]*://;s/.*service[^:]*://' | \
  tr '[:upper:]' '[:lower:]' | sort | uniq -c | sort -rn | awk '$1 >= 5'

# Check against project_knowledge.json
grep '"name":' project_knowledge.json | cut -d'"' -f4 | sort
```

#### Code Gaps:
```bash
# Find refactorings mentioned 3+ times
grep -rh "refactor\|extract\|consolidate\|deduplicate" log/workflow/*.md | \
  grep -v "^#" | sort | uniq -c | sort -rn | awk '$1 >= 3'
```
```

**Impact**: Finds component-specific gaps accurately.

---

### 5. Success Criteria by Component

**Problem**: Generic success criteria don't validate component-specific quality

**Solution**: Add component-specific validation

```markdown
## Success Criteria (Component-Specific)

### For All Components:
✅ Audit complete with metrics
✅ Workflow logs reviewed for gaps
✅ Gaps identified and filled
✅ Duplicates merged where appropriate
✅ Old versions archived with datestamps

### Additional for Documentation:
✅ Template compliance >80%
✅ INDEX.md comprehensive and up-to-date
✅ All internal links verified
✅ Version footers on all docs

### Additional for Skills:
✅ All skills follow skill.md template (4 required sections)
✅ Each skill <100 lines
✅ Patterns from 3+ sessions captured
✅ INDEX.md categorizes all skills
✅ No overlapping skills (>50% content overlap)

### Additional for Instructions:
✅ Length <150 lines
✅ No redundant guidance
✅ Repeated decisions (3+ sessions) codified
✅ Skills referenced instead of duplicating patterns

### Additional for Knowledge:
✅ Line 1 is valid map
✅ All lines valid JSONL
✅ Entities from 5+ sessions tracked
✅ Relations between entities defined
✅ Stale entities (<20 sessions) reviewed

### Additional for Code:
✅ No duplicate functions across modules
✅ All files <500 lines
✅ Type hints present (Python/TypeScript)
✅ Consistent patterns across modules

### Additional for Prompts:
✅ All prompts follow workflow-prompt.md template
✅ Required sections present (Phases, Criteria, etc.)
✅ README.md updated with new prompts
```

**Impact**: Clear validation for each component type.

---

## Medium Priority Optimizations

### 6. Consolidation Decision Matrix

**Problem**: Not clear when to merge vs keep separate

**Solution**: Add decision flowchart

```markdown
## Merge Decision Matrix

**Should you merge these components?**

```
┌─ Start ─┐
    │
    ├─ Same topic/purpose? ─ No ─> Keep Separate
    │   Yes ↓
    │
    ├─ >50% content overlap? ─ No ─> Keep Separate (may need cross-reference)
    │   Yes ↓
    │
    ├─ Different audiences? ─ Yes ─> Keep Separate (different use cases)
    │   No ↓
    │
    ├─ Combined <500 lines? ─ No ─> Consider splitting by sub-topic
    │   Yes ↓
    │
    └─ MERGE ─> Consolidate, archive old versions
```

**Examples:**
- Merge: "Docker Setup" + "Docker Configuration" → "Docker Deployment"
- Keep: "React Components" + "React Hooks" (different sub-topics)
- Keep: "User Guide" + "Admin Guide" (different audiences)
```

**Impact**: Reduces subjective decisions on merging.

---

### 7. Archive Strategy

**Problem**: No clear rules on what to archive

**Solution**: Add archive decision tree

```markdown
## Archive Decision Rules

**When to archive a component:**

1. **Superseded**: New version exists with same/better content
   - Action: Archive old version with date: `archive/component-YYYY-MM-DD/`
   - Note in new doc: "Replaces: old-doc.md (archived YYYY-MM-DD)"

2. **Merged**: Content consolidated into another component
   - Action: Archive with reference: `archive/merged-YYYY-MM-DD/`
   - Add redirect note in archived file pointing to new location

3. **Outdated**: Technology/approach no longer used (>6 months inactive)
   - Action: Archive to `archive/deprecated-YYYY-MM-DD/`
   - Add note: "Deprecated: No longer applicable as of YYYY-MM-DD"

4. **Unused Skill**: Referenced in <2 sessions in last 20 logs
   - Action: Archive to `archive/skills-YYYY-MM-DD/`
   - Can be restored if pattern resurfaces

**Never archive:**
- Current documentation for active features
- Skills used in recent sessions (last 10)
- Instructions (refine instead)
- Knowledge entities (mark stale but keep)
```

**Impact**: Clear archiving strategy prevents accidental loss.

---

### 8. Cross-Component Dependencies

**Problem**: Components reference each other, need to track

**Solution**: Add dependency checking

```markdown
## Cross-Component Reference Check

**After changes, verify links:**

```bash
# Check documentation links to skills
grep -r "\.github/skills/" docs/ | cut -d: -f1 | sort -u

# Check instructions reference to skills
grep "skill\.md\|\.github/skills" .github/copilot-instructions.md

# Check prompts reference to templates
grep "\.github/templates" .github/prompts/*.md

# Verify all cross-references work
find docs -name "*.md" -exec grep -l "\[.*\](.*.md)" {} \; | \
  while read file; do
    echo "Checking $file..."
    grep -o "\[.*\]([^)]*\.md)" "$file" | \
      grep -o "([^)]*)" | tr -d "()" | \
      while read link; do
        [ -f "$(dirname $file)/$link" ] || \
        [ -f "$link" ] || \
        echo "  Broken link: $link"
      done
  done
```
```

**Impact**: Prevents broken cross-references after reorganization.

---

## Low Priority Enhancements

### 9. Metrics Dashboard

**Problem**: Hard to track improvements over time

**Solution**: Add metrics tracking

```markdown
## Metrics Tracking

**Create metrics file after each audit-optimize run:**

```json
{
  "date": "2026-01-05",
  "component": "skills",
  "metrics": {
    "before": {
      "count": 7,
      "template_compliance": 43,
      "avg_length": 156,
      "gaps_identified": 0
    },
    "after": {
      "count": 11,
      "template_compliance": 100,
      "avg_length": 87,
      "gaps_filled": 4
    },
    "improvements": {
      "new_components": 4,
      "merged": 0,
      "archived": 0,
      "standardized": 7
    }
  }
}
```

Save to: `log/audit-optimize/YYYY-MM-DD_component-name.json`
```

**Impact**: Track progress, justify optimization efforts.

---

### 10. Quick Reference Card

**Problem**: 629 lines is long for quick lookup

**Solution**: Add TL;DR at top

```markdown
## Quick Reference

**Running audit-optimize:**
1. Set target: `TARGET_DIR=.github/skills` (or docs, etc.)
2. Audit: Check compliance, find gaps in logs
3. Plan: Identify merges, gaps to fill
4. Merge: Consolidate duplicates, archive old
5. Standardize: Apply templates
6. Index: Update navigation
7. Verify: Check compliance, links
8. Document: Create workflow log

**One-liners by component:**

```bash
# Documentation
"Audit and optimize documentation in docs/"

# Skills  
"Audit and optimize skills in .github/skills/"

# Instructions
"Audit and optimize .github/copilot-instructions.md"

# Knowledge
"Audit and optimize project_knowledge.json"

# AKIS Framework (all components)
"Audit and optimize AKIS framework (skills, instructions, prompts, knowledge)"
```

**Component-specific focus:**
- **Skills**: Template compliance, gap filling, <100 lines each
- **Instructions**: Stay <150 lines, codify repeated decisions
- **Knowledge**: Add missing entities, validate JSONL
- **Docs**: Already optimized (this PR)
- **Code**: Find duplicates, enforce patterns
```

**Impact**: Quick lookup without reading 629 lines.

---

## Implementation Priority

### Phase 1 (Critical - Implement Now):
1. ✅ Parameterized Paths & Targets (Optimization #1)
2. ✅ Component-Specific Audit Commands (Optimization #2)
3. ✅ Template Mapping Matrix (Optimization #3)
4. ✅ Gap Analysis by Component (Optimization #4)
5. ✅ Success Criteria by Component (Optimization #5)

### Phase 2 (Medium - Next iteration):
6. ⏳ Consolidation Decision Matrix (Optimization #6)
7. ⏳ Archive Strategy (Optimization #7)
8. ⏳ Cross-Component Dependencies (Optimization #8)

### Phase 3 (Nice to have):
9. 💡 Metrics Dashboard (Optimization #9)
10. 💡 Quick Reference Card (Optimization #10)

---

## Recommended Changes to audit-optimize.md

### Structure Reorganization:

```markdown
# Audit & Optimize Workflow

{One-line description}

**Trigger:** {When to use}

## Quick Reference ← NEW
{10-optimization TL;DR}

## Component Configuration ← NEW
{Optimization #1: Parameterized paths}

## Template Reference Matrix ← NEW
{Optimization #3: Template mapping}

## Phases

### 1. AUDIT
{Enhanced with optimization #2: Component-specific commands}

### 2. PLAN
{Enhanced with optimization #4: Component-specific gap analysis}

### 3. MERGE & CONSOLIDATE
{Enhanced with optimization #6: Decision matrix}

### 4-7. STANDARDIZE, INDEX, VERIFY, DOCUMENT, COMPLETE
{Enhanced with optimization #5: Component-specific criteria}

## Success Criteria
{Enhanced with optimization #5}

## Consolidation & Merging Patterns
{Enhanced with optimization #6, #7}

## Anti-Patterns

## Example Session

## Integration with AKIS

## Related Files
{Enhanced with optimization #8: Cross-component check}
```

---

## Summary

**Current workflow**: Solid foundation, 95% template compliant, works well for documentation

**Gaps for multi-component use**:
1. Hardcoded paths (docs/)
2. Generic audit commands
3. No template mapping
4. Generic gap analysis
5. Generic success criteria

**Optimizations proposed**: 10 improvements, prioritized into 3 phases

**Impact if implemented**:
- **Skills**: Can standardize all 7, create 4 new from logs, achieve 100% compliance
- **Instructions**: Can codify 3 repeated decisions, stay under 150 lines
- **Knowledge**: Can add 3 missing entities, validate format
- **Code**: Can find duplicates, enforce standards
- **AKIS Framework**: Can audit entire framework systematically

**Effort**: Phase 1 (5 optimizations) = ~2-3 hours to implement = HIGH ROI

**Recommendation**: Implement Phase 1 optimizations now, Phase 2 after first use on skills/instructions.
