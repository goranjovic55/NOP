# AKIS Templates

Standardized templates for consistency.

## Available Templates

- `skill.md` - Skills (<200 lines, actionable patterns)
- `feature-doc.md` - Features in `docs/features/`
- `guide-doc.md` - Guides in `docs/guides/`
- `workflow-log.md` - Session logs (>15min tasks)
- `workflow-prompt.md` - Multi-phase workflows
- `doc-update-notes.md` - Doc update tracking

**Usage:** Copy template, fill sections, follow format conventions.

1. **Terse and Effective**: Bullet points > paragraphs
2. **Actionable**: Focus on what to do, not theory
3. **Consistent Structure**: Same sections in same order
4. **Cross-Referenced**: Link to related docs/skills
5. **Dated**: Include last updated date
6. **Versioned**: Note document version and status

---

## Template Workflow

### Creating New Skill

1. Copy `skill.md` to `.github/skills/[name].md`
2. Fill in all sections
3. Keep examples minimal and focused
4. Add to instructions table if high-usage pattern
5. Commit with descriptive message

### Creating New Documentation

1. Determine type (feature/guide/technical)
2. Copy appropriate template to `docs/[category]/`
3. Fill in sections with actual content
4. Update `docs/INDEX.md` with new entry
5. Commit and note in workflow log

### Updating Existing Skill/Doc

1. Check if follows current template format
2. If not, reformat using template
3. Update content while maintaining structure
4. Update last modified date
5. Commit changes

---

## Related Files

- `.github/prompts/akis-workflow-analyzer.md` - Multi-session analysis
- `.github/copilot-instructions.md` - Framework instructions
- `.github/skills/documentation.md` - Documentation skill with placement rules
