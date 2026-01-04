# AKIS Workflow Analyzer Prompt

**Purpose**: Analyze all workflow sessions, identify patterns, and propose improvements to the AKIS framework including documentation, instructions, skills, and knowledge.

**When to Use**: 
- **Automatically**: Every 10 sessions (prompted in COMPLETE phase)
- **Manually**: User can trigger anytime for maintenance
- After major development cycles for cleanup
- When reviewing and standardizing the AKIS framework

**Trigger Options**: 
1. **Automatic (every 10 sessions)**: Agent checks session counter in COMPLETE phase and prompts user
2. **Manual invocation**: User can trigger this workflow anytime

**Important**: This is NOT part of the regular session LEARN phase. This is a separate maintenance task for multi-session analysis.

---

## Workflow Overview

**This is a maintenance workflow that runs independently, outside of regular sessions.**

This prompt guides the agent through analyzing historical workflow logs to:
1. Identify recurring patterns across sessions
2. **Consolidate and streamline existing skills** (merge duplicates, remove unused)
3. **Consolidate and organize documentation** (merge scattered docs, archive old versions)
4. **Refine instructions to be terse and effective** (remove verbosity, codify frequent patterns)
5. Update knowledge base with cross-session insights

**Core Principle**: **Terse and Effective** - Consolidate, streamline, remove redundancy. Quality over quantity.

**Key Difference**: Unlike the single-session LEARN phase (which analyzes only the current session), this workflow analyzes ALL sessions to identify patterns and perform framework-level maintenance.

---

## Phase 1: CONTEXT - Load & Index

**Objective**: Gather all workflow logs and current framework state

**Steps**:
1. Read line 1 of `project_knowledge.json` for domain overview
2. List all workflow logs in `log/workflow/`
3. Review current skills in `.github/skills/`
4. Check current documentation structure in `docs/`
5. Review `.github/copilot-instructions.md` for current instructions

**Output**: Understanding of current framework state and available session data

---

## Phase 2: ANALYZE - Run Analysis

**Objective**: Execute workflow analyzer to extract patterns

**Steps**:
1. Run analysis script:
   ```bash
   python .github/scripts/analyze_workflows.py --output json > /tmp/workflow-analysis.json
   ```

2. Review analysis output:
   - Pattern frequencies (task types, technologies, file types)
   - Skill candidates (recurring patterns that should become skills)
   - Documentation needs (areas requiring updates)
   - Instruction suggestions (framework improvements)
   - Knowledge updates (entities/relations from cross-session patterns)

3. Also generate human-readable report:
   ```bash
   python .github/scripts/analyze_workflows.py --output markdown > /tmp/workflow-analysis.md
   ```

**Output**: Comprehensive analysis in both JSON and Markdown formats

---

## Phase 3: REVIEW - Evaluate Findings

**Objective**: Present findings to user for review and prioritization

**Steps**:
1. Display markdown report summary
2. Highlight consolidation opportunities:
   - **Skills**: Unused skills to remove, overlapping skills to merge, gaps to fill
   - **Documentation**: Scattered docs to consolidate, outdated docs to archive
   - **Instructions**: Verbose sections to streamline, rarely-used patterns to remove

3. Present recommendations in categories:
   - **Skills Consolidation**: 
     - Remove: Unused skills (<2 sessions in analysis period)
     - Merge: Overlapping/similar skills
     - Create: High-frequency patterns (>=5 sessions)
   - **Documentation Consolidation**: 
     - Merge: Scattered docs on same topic
     - Archive: Outdated/superseded versions
     - Streamline: Verbose or redundant sections
   - **Instructions Refinement**: 
     - Remove: Rarely-applied patterns
     - Streamline: Verbose sections
     - Add: Frequently-made decisions (>=5 sessions)
   - **Knowledge**: Entities/relations to add, observations to update

4. Wait for user approval and prioritization

**Output**: User-approved action items with focus on consolidation and terseness

---

## Phase 4: IMPLEMENT - Apply Changes

**Objective**: Implement approved improvements

### 4.1 Skills Consolidation

**Remove Unused Skills** (priority action):
- Identify skills used in <2 sessions during analysis period
- Archive to `docs/archive/skills-YYYY-MM-DD/`
- Update references in documentation and instructions
- Principle: If not used, remove it

**Merge Overlapping Skills** (priority action):
- Identify skills with >50% content overlap
- Consolidate into single comprehensive skill
- Archive old versions
- Update all references

**Create New Skills** (only if high-frequency pattern):
- Frequency threshold: >=5 sessions
- Must be project-agnostic and reusable
- Follow terse format: When to Use, Avoid, Overview, Examples (keep minimal)
- No verbose explanations

**Streamline Existing Skills**:
- Remove verbose sections
- Keep only essential patterns
- Update examples to be concise
- Remove rarely-used sections

### 4.2 Documentation Consolidation

**Merge Scattered Documentation** (priority action):
- Identify docs covering same/similar topics
- Consolidate into single source of truth
- Archive old versions to `docs/archive/category-YYYY-MM-DD/`
- Update INDEX.md

**Archive Outdated Documentation**:
- Superseded versions
- Historical implementation details
- Old design decisions
- Keep minimal cross-references

**Streamline Verbose Sections**:
- Convert paragraphs to bullet points
- Remove redundant explanations
- Keep only essential information
- Follow "terse and effective" principle

**Update Only If Necessary**:
- Apply high-priority updates from analysis
- Skip minor/cosmetic updates
- Focus on areas with most session activity

### 4.3 Instructions Refinement

**Streamline `.github/copilot-instructions.md`** (priority action):
- Remove rarely-applied patterns (<2 sessions)
- Convert verbose sections to bullet points
- Consolidate similar guidance
- Target: <150 lines (currently aiming for maximum terseness)
- Remove redundant examples

**Add High-Frequency Patterns Only**:
- Threshold: >=5 sessions with same decision
- Keep guidance minimal (1-2 sentences)
- Focus on actionable patterns

**Remove Redundancy**:
- Consolidate similar instructions
- Remove overlapping guidance
- Keep single source of truth per pattern

### 4.4 Knowledge

**Update `project_knowledge.json`**:
- Add entities for frequently-modified areas (>=5 sessions)
- Add relations for common integration points
- Update observations with cross-session insights
- Ensure map (line 1) is accurate
- Remove stale entities

---

## Phase 5: VERIFY - Validate Changes

**Objective**: Ensure changes are consistent and correct

**Checks**:
- [ ] All new skills follow standard format
- [ ] No duplicate skill files
- [ ] Documentation links are valid
- [ ] Instructions remain concise (< 200 lines)
- [ ] Knowledge entries are valid JSON
- [ ] No broken references to moved/deleted files
- [ ] Generated codemap succeeds:
  ```bash
  python .github/scripts/generate_codemap.py --dry-run
  ```

**Output**: Validated changes ready for commit

---

## Phase 6: DOCUMENT - Create Analysis Log

**Objective**: Record the analysis and changes made

**Steps**:
1. Create workflow log: `log/workflow/YYYY-MM-DD_HHMMSS_akis-workflow-analysis.md`
2. Include:
   - Summary of sessions analyzed
   - Key patterns identified
   - Skills created/updated/removed
   - Documentation changes
   - Instruction updates
   - Knowledge updates
3. Attach full analysis report as reference

**Template**:
```markdown
# Workflow Log: AKIS Workflow Analysis

**Date**: YYYY-MM-DD HH:MM
**Duration**: ~X minutes
**Sessions Analyzed**: N sessions from DATE1 to DATE2

## Summary

Analyzed N workflow sessions to identify patterns and improve AKIS framework.
Created X new skills, updated Y documentation files, and refined framework instructions.

## Analysis Results

### Patterns Identified
- Most common task types: ...
- Most used technologies: ...
- Most frequent file modifications: ...

### Skills
- **Created**: skill1.md, skill2.md
- **Updated**: skill3.md (added new patterns)
- **Removed**: skill4.md (rarely used)

### Documentation
- **Updated**: doc1.md, doc2.md
- **Organized**: Moved X docs to proper locations
- **Created**: new-doc.md (high priority need)

### Instructions
- Added guidance for: pattern1, pattern2
- Codified decision: decision1

### Knowledge
- Added X entities for frequently-modified areas
- Added Y relations for common integrations

## Verification
- [x] Skills follow standard format
- [x] Documentation links valid
- [x] Instructions remain concise
- [x] Knowledge entries valid
- [x] Codemap generation succeeds

## Notes

Key insight: [Major finding from analysis]

Recommendations for future:
- [Suggestion 1]
- [Suggestion 2]
```

---

## Phase 7: COMPLETE - Commit & Close

**Objective**: Commit all changes with descriptive message

**Steps**:
1. Review all changes one final time
2. Commit with message: `feat(akis): workflow analysis - N sessions, X skills, Y docs`
3. Update project_knowledge.json:
   ```json
   {"type":"entity","name":"AKIS.WorkflowAnalysis","entityType":"tool","observations":["Analyzed N sessions","Created X skills, updated Y docs","upd:YYYY-MM-DD"]}
   ```

**Output**: Complete framework improvement cycle

---

## Success Criteria

✅ Analysis covers all available workflow logs (minimum 5 sessions)
✅ High-priority items are addressed
✅ Skills follow standardized format
✅ Documentation is organized and up-to-date
✅ Instructions remain concise and actionable
✅ Knowledge base reflects cross-session insights
✅ All changes are verified and tested
✅ Workflow log documents the analysis

---

## Guidelines

### Skills (Consolidation Priority)
- **Remove first**: Skills used in <2 sessions → archive immediately
- **Merge duplicates**: >50% overlap → consolidate into one
- **Create sparingly**: Only for patterns in >=5 sessions
- **Keep terse**: When to Use, Avoid, Overview, Examples only
- **Project-agnostic**: Must be reusable across projects

### Documentation (Consolidation Priority)
- **Merge scattered docs**: Same topic → single source of truth
- **Archive old versions**: Historical docs → `docs/archive/`
- **Streamline verbose sections**: Paragraphs → bullet points
- **Update only if necessary**: Skip cosmetic changes
- **Maintain INDEX.md**: Always update master index

### Instructions (Terseness Priority)
- **Remove rarely-used**: Patterns in <2 sessions → delete
- **Streamline verbose**: Paragraphs → bullet points, examples → minimal
- **Add high-frequency only**: >=5 sessions with same decision
- **Target <150 lines**: Maximum terseness and effectiveness
- **Single source of truth**: Consolidate overlapping guidance

### Knowledge
- **Add entities**: Areas modified in >=5 sessions
- **Remove stale**: Entities not touched in 20+ sessions
- **Update observations**: Session counts and dates
- **Maintain clean map**: Deduplicate and organize

---

## Consolidation Patterns

### Pattern: Unused Skills Removal
**Symptom**: Skills created but rarely/never used
**Action**: Archive to `docs/archive/skills-YYYY-MM-DD/`
**Threshold**: <2 sessions in analysis period
**Example**: Remove `git-workflow.md` if only used once in 55 sessions

### Pattern: Overlapping Skills Merge
**Symptom**: Multiple skills covering similar patterns
**Action**: Consolidate into single comprehensive skill
**Example**: Merge `frontend-components.md` and `ui-patterns.md` into `frontend-react.md`

### Pattern: Scattered Documentation Consolidation
**Symptom**: Multiple docs on same topic in different locations
**Action**: Merge into single doc, archive old versions
**Example**: 7 agent docs → `features/AGENTS_C2.md`

### Pattern: Verbose Instructions Streamlining
**Symptom**: Instructions >200 lines with redundant explanations
**Action**: Convert to bullet points, remove examples, consolidate patterns
**Target**: <150 lines total
**Action**: Update docs based on actual session work
**Example**: Update API docs after multiple endpoint additions

### Pattern: Repeated Decisions
**Symptom**: Same architectural decision in multiple sessions
**Action**: Add to instructions as standard guidance
**Example**: "Prefer TypeScript for new components" appears in 10+ sessions

### Pattern: Knowledge Gaps
**Symptom**: Areas frequently modified but not tracked in knowledge
**Action**: Add entities for these areas
**Example**: "Frontend.UIComponents" modified in 8 sessions but not tracked

---

## Anti-Patterns to Avoid

❌ **Over-consolidation**: Don't merge distinct skills
✅ Keep skills focused on specific patterns

❌ **Verbose documentation**: Don't write essays
✅ Keep docs concise with bullet points

❌ **Stale skills**: Don't keep rarely-used skills "just in case"
✅ Archive unused skills, can restore if needed

❌ **Ignoring user input**: Don't implement without approval
✅ Present findings, wait for user prioritization

❌ **Analysis paralysis**: Don't analyze forever
✅ Focus on high-frequency patterns (3+ sessions)

---

## Example Session

### Input
- 45 workflow logs
- Current: 6 skills, scattered docs
- Request: "Analyze and improve AKIS framework"

### Analysis Output
- Pattern: UI work in 12 sessions
- Pattern: Docker hot-reload in 5 sessions  
- Pattern: API debugging in 8 sessions
- Documentation gap: No API reference
- Instruction gap: No guidance on component creation

### Actions Taken
1. Created `ui-consistency.md` skill (12 sessions)
2. Created `docker-hot-reload.md` skill (5 sessions)
3. Updated `debugging.md` with API patterns
4. Created `docs/technical/API_reference.md`
5. Added component creation guidance to instructions
6. Updated knowledge with Frontend.UIComponents entity

### Outcome
- 2 new skills, 1 updated skill
- 1 new doc, organized existing docs
- Instructions enhanced with component guidance
- Knowledge tracking UI components
- Framework more robust and standardized

---

## Integration with AKIS

This workflow analyzer is a **maintenance tool** that operates independently from regular sessions:

```
Individual Session (regular workflow - baked into LEARN phase):
CONTEXT → PLAN → IMPLEMENT → VERIFY → LEARN → COMPLETE
- Analyzes current session only
- Updates knowledge/skills for that session

Cross-Session Maintenance (this workflow - independent task):
CONTEXT (load all logs) → ANALYZE (patterns) → REVIEW (with user) →
IMPLEMENT (improvements) → VERIFY → DOCUMENT → COMPLETE
- Analyzes all sessions since last maintenance (typically 10 sessions)
- Standardizes patterns across sessions
- Organizes and cleans documentation
- Adjusts framework instructions
- Triggered automatically every 10 sessions or manually
```

**Frequency**: 
- **Automatic**: Every 10 sessions (prompted in COMPLETE phase)
- **Manual**: User can trigger anytime

**Session Tracking**: Uses `.github/scripts/session_tracker.py` to automatically track sessions and prompt for maintenance every 10 sessions

**Purpose**: Framework-level maintenance to standardize skills, organize documentation, and adjust instructions based on actual usage patterns across multiple sessions

**Key Point**: This is NOT part of the regular session LEARN phase. It's a separate maintenance workflow triggered after session completion.

**Principle**: *Context over Process. Knowledge over Ceremony.*

---

## Related Files

- **Script**: `.github/scripts/analyze_workflows.py`
- **Instructions**: `.github/copilot-instructions.md`
- **Skills**: `.github/skills/*.md`
- **Templates**: `.github/templates/workflow-log.md`
- **Knowledge**: `project_knowledge.json`
- **Logs**: `log/workflow/*.md`

---

*This prompt is itself subject to improvement based on workflow analysis results.*
