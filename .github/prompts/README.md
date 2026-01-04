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

**Purpose**: Analyze all workflow sessions to identify patterns and propose framework improvements

**When to Use**:
- After accumulating 10+ new workflow logs
- Periodically (e.g., monthly) for framework maintenance
- When standardizing skills and documentation
- For cross-session pattern analysis

**What it Does**:
1. Analyzes all workflow logs in `log/workflow/`
2. Identifies recurring patterns (tasks, technologies, decisions)
3. Suggests skills to create/update/remove
4. Recommends documentation organization
5. Proposes instruction improvements
6. Suggests knowledge base updates

**Workflow**:
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```

**Related Script**: `.github/scripts/analyze_workflows.py`

**Example Usage**:
```bash
# Run analysis
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

These prompts complement the core AKIS workflow:

**Individual Session** (`.github/copilot-instructions.md`):
```
CONTEXT → PLAN → IMPLEMENT → VERIFY → LEARN → COMPLETE
```

**Cross-Session Analysis** (this directory):
```
CONTEXT → ANALYZE → REVIEW → IMPLEMENT → VERIFY → DOCUMENT → COMPLETE
```

The prompts in this folder operate at a higher level, analyzing multiple sessions to improve the framework itself.

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
