# AKIS Prompts

This directory contains specialized workflow prompts for the AKIS framework. These prompts guide agents through complex, multi-phase workflows that go beyond typical single-session tasks.

## Purpose

Prompts in this folder are designed to:
- Guide agents through specialized multi-phase workflows
- Standardize complex analysis and improvement processes
- Provide step-by-step instructions for framework maintenance
- Enable cross-session insights and improvements

## Available Prompts

### akis-workflow-analyzer.md

**Purpose**: **Maintenance workflow** - Analyze all workflow sessions to identify patterns and propose framework improvements

**Type**: Independent maintenance task (runs outside of regular sessions)

**When to Use**:
- After accumulating 30-50 new workflow logs
- Periodically (e.g., monthly) for framework maintenance
- When standardizing skills and documentation
- For cross-session pattern analysis and cleanup

**Important**: This is NOT part of the regular session LEARN phase. This is a separate maintenance workflow.

**What it Does**:
1. Analyzes all workflow logs in `log/workflow/`
2. Identifies recurring patterns (tasks, technologies, decisions)
3. Suggests skills to create/update/remove
4. Recommends documentation organization and cleanup
5. Proposes instruction improvements
6. Suggests knowledge base updates

**Workflow**:
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```

**Related Script**: `.github/scripts/analyze_workflows.py`

**Example Usage**:
```bash
# Run analysis independently (not during a regular session)
python .github/scripts/analyze_workflows.py --output markdown

# Follow the prompt to implement improvements
# See .github/prompts/akis-workflow-analyzer.md for full workflow
```

## Creating New Prompts

When creating a new prompt in this directory:

1. **Use descriptive names**: `{purpose}-{action}.md` (e.g., `akis-workflow-analyzer.md`)

2. **Follow standard structure**:
   - Purpose and when to use
   - Overview of the workflow
   - Phase-by-phase instructions (CONTEXT, ANALYZE, etc.)
   - Success criteria
   - Guidelines and anti-patterns
   - Related files and scripts

3. **Include examples**: Show expected inputs and outputs

4. **Keep actionable**: Focus on concrete steps, not theory

5. **Reference scripts**: Link to any automation scripts

6. **Update this README**: Add entry for the new prompt

## Relationship to AKIS Framework

These prompts are **independent maintenance workflows** that complement but are separate from the core AKIS workflow:

**Individual Session** (`.github/copilot-instructions.md` - runs during regular sessions):
```
CONTEXT → PLAN → IMPLEMENT → VERIFY → LEARN → COMPLETE
```
- Analyzes current session only
- Updates knowledge/skills for that session
- Baked into every session's LEARN phase

**Cross-Session Maintenance** (this directory - runs independently outside sessions):
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```
- Analyzes 30-50 sessions collectively
- Standardizes patterns across sessions
- Organizes and cleans documentation
- Adjusts framework instructions
- Maintenance task every 30-50 sessions

The prompts in this folder operate at a higher level, analyzing multiple sessions to improve the framework itself. They are NOT part of the regular session workflow.

## Standards

- **Format**: Markdown with clear phase headings
- **Length**: Comprehensive but scannable (use headings and lists)
- **Actionable**: Each phase should have concrete steps
- **Examples**: Include example sessions and outputs
- **Integration**: Reference related scripts and skills

## Related Files

- **Instructions**: `.github/copilot-instructions.md` (main AKIS instructions)
- **Skills**: `.github/skills/` (reusable patterns)
- **Scripts**: `.github/scripts/` (automation tools)
- **Templates**: `.github/templates/` (workflow log templates)
- **Logs**: `log/workflow/` (session history)

---

*These prompts enable the AKIS framework to improve itself based on actual usage patterns.*
