---
name: akis-dev
description: Load when editing .github/copilot-instructions*, skills/*, agents/*, instructions/*, or project_knowledge.json. Provides AKIS framework development patterns for skills, agents, and instructions.
---

# AKIS Development

## Merged Skills
- **skill-authoring**: Creating and editing skill files
- **agent-authoring**: Creating and editing agent configurations
- **instruction-authoring**: Creating and editing instruction files
- **knowledge-management**: Working with project_knowledge.json

## ⚠️ Critical Gotchas

| Category | Pattern | Solution |
|----------|---------|----------|
| Script output | Suggestions not shown to user | Present in TABLE format, ASK before applying |
| END summary | User doesn't see results | MUST show metrics table with Tasks/Resolution/Files |
| Condensing | Content lost when shortening | Use tables instead of deletion, keep all gotchas |
| Context | Assumes files pre-attached | Require explicit reads of skills/agents/instructions |
| Skill balance | Too terse to understand | Include examples, not just rules |
| Examples | Agent guesses without them | Keep 1+ example per pattern minimum |
| Completeness | Agent can't execute | Test: can agent do task with ONLY this file? |

## Rules

| Rule | Pattern |
|------|---------|
| Tables over prose | Convert paragraphs to tables (same info, fewer tokens) |
| Preserve actionable steps | Every concrete action must remain after condensing |
| Keep examples | Without examples, agent guesses wrong |
| Maintain gotchas | These prevent repeated mistakes |
| Test comprehension | If ambiguous after condensing, expand back |

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Remove details to save tokens | Convert prose to table |
| Assume agent will infer steps | Document all steps explicitly |
| Summarize multi-step to one line | Keep numbered steps |
| Word limits like "(<350 words)" | Structure limits like "1 example per pattern" |
| Generic placeholders | Concrete examples from actual codebase |

## Patterns

```markdown
# Pattern 1: Skill YAML frontmatter
---
name: skill-name
description: Load when... Provides... (max 1024 chars)
---

# Pattern 2: Gotchas table format
| Category | Pattern | Solution |
|----------|---------|----------|
| API | 307 redirect | Add trailing slash |

# Pattern 3: Code example in skill
```python
# Named pattern with comment
@router.get("/{id}")
async def get(id: int): ...
```

# Pattern 4: Commands table
| Task | Command |
|------|---------|
| Run scripts | `python .github/scripts/knowledge.py --update` |
```

## File Locations

| Type | Path | Template |
|------|------|----------|
| Skills | `.github/skills/{name}/SKILL.md` | `.github/templates/skill.md` |
| Agents | `.github/agents/{name}.md` | `.github/templates/agent.md` |
| Instructions | `.github/instructions/{name}.instructions.md` | - |
| Knowledge | `project_knowledge.json` | - |

## Commands

| Task | Command |
|------|---------|
| Update knowledge | `python .github/scripts/knowledge.py --update` |
| Suggest skills | `python .github/scripts/skills.py --suggest` |
| Suggest docs | `python .github/scripts/docs.py --suggest` |
| Suggest agents | `python .github/scripts/agents.py --suggest` |
| Suggest instructions | `python .github/scripts/instructions.py --suggest` |

## END Phase Protocol

1. Run all 5 scripts (knowledge, skills, docs, agents, instructions)
2. Present suggestions in table:

| Script | Suggestion | Priority |
|--------|------------|----------|
| skills.py | Create new skill: {name} | Medium |

3. ASK user: "Apply any suggestions?"
4. Apply only if approved
5. Show final metrics:

| Metric | Value |
|--------|-------|
| Tasks | X/Y completed |
| Resolution | X% |
| Files | X modified |

## Completeness Checklist

Before saving any skill/agent/instruction:
- [ ] Can agent execute without additional context?
- [ ] Are all conditional branches documented?
- [ ] Does each pattern have an example?
- [ ] Are gotchas preserved with solutions?
- [ ] Is format self-documenting (tables with headers)?
