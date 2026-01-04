# AKIS Workflow Prompts

This directory contains specialized workflow prompts for the AKIS framework. These prompts guide agents through complex, multi-phase workflows that go beyond typical free-form work.

## Purpose

Prompts in this folder are designed to:
- Guide agents through specialized **multi-phase workflows**
- Standardize complex analysis and improvement processes
- Provide step-by-step instructions for framework maintenance
- Enable cross-session insights and improvements

## Key Distinction

**Regular Work (Free-form):**
- No prescribed phases
- Context-driven, query resources when stuck
- Natural workflow based on task requirements
- Most development work falls here

**Workflow Prompts (Phase-based):**
- Prescribed phases (CONTEXT → ANALYZE → IMPLEMENT → ...)
- Step-by-step instructions for each phase
- Used for specialized, repeatable workflows
- Examples: Cross-session analysis, major refactoring, framework maintenance

## Available Prompts

### akis-workflow-analyzer.md

**Purpose:** Analyze all workflow sessions to identify patterns and propose framework improvements

**Type:** Maintenance workflow (runs after session completion when due)

**Trigger Options:**
- **Automatic:** Every 10 sessions (prompted by session_end.py)
- **Manual:** User can trigger anytime

**Phases:**
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```

**What it Does:**
1. Analyzes all workflow logs in `log/workflow/`
2. Identifies recurring patterns (tasks, technologies, decisions)
3. Suggests skills to create/update/remove
4. Recommends documentation organization and cleanup
5. Proposes instruction improvements
6. Suggests knowledge base updates

**Example Usage:**
```bash
# Check if maintenance is due
python .github/scripts/session_tracker.py check-maintenance

# Run analysis (when maintenance is due or manual trigger)
python .github/scripts/analyze_workflows.py --output markdown

# Follow the prompt workflow
# See .github/prompts/akis-workflow-analyzer.md for full instructions
```

## Creating New Workflow Prompts

When you have a **repeatable multi-step workflow** that benefits from prescribed phases:

1. **Use the template:** `.github/templates/workflow-prompt.md`

2. **Define clear phases:**
   - Each phase has: Objective, Steps, Output
   - Phases should be sequential and logical
   - Include commands/tools for each phase

3. **Include examples:**
   - Show expected inputs and outputs
   - Demonstrate the workflow in action

4. **Document integration:**
   - How it relates to regular AKIS workflow
   - When to trigger (auto/manual)
   - What purpose it serves

5. **Update this README:** Add entry for the new prompt

## When to Create a Workflow Prompt vs Regular Work

**Create a Workflow Prompt if:**
- ✅ Task repeats regularly (e.g., every N sessions)
- ✅ Multiple distinct phases with dependencies
- ✅ Benefits from standardized procedure
- ✅ Used by multiple people or sessions

**Use Regular Free-form Work if:**
- ✅ One-off implementation task
- ✅ Context-specific problem solving
- ✅ Natural discovery process
- ✅ Most feature development

## Templates

- **Workflow Prompt:** `.github/templates/workflow-prompt.md`
- **Skill (for free-form patterns):** `.github/templates/skill.md`

## Relationship to AKIS Framework

Workflow prompts are **independent specialized workflows** that complement free-form work:

**Regular Session Flow:**
```
Session Start (auto context) → Work Freely → Session End (required checklist)
```
- Query knowledge/docs/skills as needed
- No prescribed phases
- Natural problem-solving

**Workflow Prompt Flow:**
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```
- Prescribed step-by-step phases
- Triggered automatically or manually
- Specialized, repeatable procedures

Both approaches are part of AKIS, used for different purposes.
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
