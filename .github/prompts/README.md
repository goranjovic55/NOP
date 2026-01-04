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

**Type**: Independent maintenance task (runs after session completion when due)

**Trigger Options**:
- **Automatic**: Every 10 sessions (prompted in COMPLETE phase)
- **Manual**: User can trigger anytime

**Session Tracking**: Uses `.github/scripts/session_tracker.py` to track session numbers

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

**Related Scripts**: 
- `.github/scripts/analyze_workflows.py` (analyzer)
- `.github/scripts/session_tracker.py` (session tracking)

**Example Usage**:
```bash
# Check if maintenance is due
python .github/scripts/session_tracker.py check-maintenance

# Run analysis (when maintenance is due or manual trigger)
python .github/scripts/analyze_workflows.py --output markdown

# After completing maintenance
python .github/scripts/session_tracker.py mark-maintenance-done

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
- Session counter incremented in COMPLETE phase

**Cross-Session Maintenance** (this directory - triggered after session completion):
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```
- Analyzes sessions since last maintenance (typically 10)
- Standardizes patterns across sessions
- Organizes and cleans documentation
- Adjusts framework instructions
- Triggered automatically every 10 sessions or manually
- Uses session tracking (`.github/scripts/session_tracker.py`)

The prompts in this folder operate at a higher level, analyzing multiple sessions to improve the framework itself. They are triggered in COMPLETE phase when maintenance is due, NOT during the regular LEARN phase.

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
