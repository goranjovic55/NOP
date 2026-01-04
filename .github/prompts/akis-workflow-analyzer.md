# AKIS Workflow Analyzer Prompt

**Purpose**: Analyze all workflow sessions, identify patterns, and propose improvements to the AKIS framework including documentation, instructions, skills, and knowledge.

**When to Use**: 
- At the end of major feature development cycles
- After accumulating 10+ new workflow logs
- When reviewing and standardizing the AKIS framework
- Periodically (e.g., monthly) to maintain framework quality

**Trigger**: Manual invocation by user or as part of LEARN phase for framework improvement tasks

---

## Workflow Overview

This prompt guides the agent through analyzing historical workflow logs to:
1. Identify recurring patterns across sessions
2. Extract and standardize skills
3. Organize and update documentation
4. Propose instruction improvements
5. Update knowledge base with cross-session insights

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
2. Highlight high-priority items:
   - Skill candidates with frequency >= 5
   - High-priority documentation needs
   - Instruction improvements affecting multiple sessions

3. Present recommendations in categories:
   - **Skills**: New skills to create, existing skills to update/remove
   - **Documentation**: Docs to create/update, organization improvements
   - **Instructions**: Framework improvements, new patterns to codify
   - **Knowledge**: Entities/relations to add, observations to update

4. Wait for user approval and prioritization

**Output**: User-approved action items

---

## Phase 4: IMPLEMENT - Apply Changes

**Objective**: Implement approved improvements

### 4.1 Skills

**Create New Skills** (if approved):
- Use skill candidates from analysis
- Follow existing skill format in `.github/skills/`
- Include: When to Use, Avoid, Overview, Examples, Related Skills
- Ensure skills are project-agnostic and reusable

**Update Existing Skills** (if needed):
- Add new patterns discovered across sessions
- Update examples with better code snippets
- Remove obsolete patterns

**Remove Unused Skills** (if approved):
- Archive rarely-used skills to `docs/archive/skills/`
- Update references in documentation

### 4.2 Documentation

**Organize Documentation**:
- Identify scattered or duplicate docs
- Propose clear hierarchy (technical/, guides/, architecture/, design/)
- Move or merge documents as needed
- Update cross-references

**Update Documentation**:
- Apply high-priority updates from analysis
- Focus on areas with most session activity
- Keep updates lightweight (follow AKIS principle: concise > verbose)

**Create Missing Docs** (if needed):
- API reference (if API work is frequent)
- Deployment guides (if infrastructure work is frequent)
- Component library docs (if UI work is frequent)

### 4.3 Instructions

**Update `.github/copilot-instructions.md`**:
- Add new patterns discovered across sessions
- Codify frequently-made decisions
- Add guidance for common pitfalls
- Update skill references
- Keep instructions concise (AKIS v2 principle: < 200 lines)

**Update Templates** (if needed):
- `.github/templates/workflow-log.md`
- `.github/templates/doc-update-notes.md`

### 4.4 Knowledge

**Update `project_knowledge.json`**:
- Add entities for frequently-modified areas
- Add relations for common integration points
- Update observations with cross-session insights
- Ensure map (line 1) is accurate

**Example Updates**:
```json
{"type":"entity","name":"Frontend.UIComponents","entityType":"module","observations":["Standardized with CyberUI library","Modified in 8 sessions","upd:2026-01-04"]}
{"type":"relation","from":"Scans.Page","to":"Frontend.UIComponents","relationType":"USES"}
```

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

### Skills
- **Create** when pattern appears in 3+ sessions
- **Update** when new patterns emerge for existing skills
- **Remove** when skill used in < 2 sessions and no future need
- Keep skills project-agnostic and reusable

### Documentation
- **Organize** scattered docs into clear hierarchy
- **Update** high-priority areas first
- **Keep lightweight**: bullet points > paragraphs
- **Cross-reference** related docs

### Instructions
- **Codify** decisions made in 5+ sessions
- **Add guidance** for common pitfalls
- **Keep concise**: instructions should fit in one screen
- **Prioritize** actionable patterns over theory

### Knowledge
- **Track** areas modified in 5+ sessions
- **Document** common integration points
- **Update** observations with session count and dates
- **Maintain** clean, deduplicated entries

---

## Common Patterns

### Pattern: Skill Consolidation
**Symptom**: Multiple sessions with similar work, but no skill exists
**Action**: Create comprehensive skill covering the pattern
**Example**: "ui-consistency.md" for component library work

### Pattern: Documentation Drift
**Symptom**: Docs mention outdated approaches or missing features
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

This workflow analyzer is part of the AKIS v2 framework's continuous improvement cycle:

```
Individual Session (current model):
CONTEXT → PLAN → IMPLEMENT → VERIFY → LEARN → COMPLETE

Cross-Session Analysis (this workflow):
CONTEXT (load all logs) → ANALYZE (patterns) → REVIEW (with user) →
IMPLEMENT (improvements) → VERIFY → DOCUMENT → COMPLETE
```

**Frequency**: Run this workflow after every 10-15 sessions or monthly

**Purpose**: Ensure AKIS framework evolves based on actual usage patterns rather than theoretical needs

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
