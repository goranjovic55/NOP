# Session End Protocol

**MANDATORY** before completing any work session. Ensures knowledge capture and documentation.

---

## Blocking Gate

Before marking work complete:

```
✅ MUST: Complete all verification steps below
✅ MUST: Create workflow log (if >15min task)
✅ MUST: Commit all changes via report_progress
❌ MUST NOT: Skip knowledge updates for significant changes
```

---

## Session End Checklist

### 1. Verify Work Complete
- [ ] All TODO items addressed (complete or documented as deferred)
- [ ] Changes compile/lint successfully
- [ ] Tests pass (if applicable)
- [ ] Manual verification confirms behavior

### 2. Structure Enforcement
Check files are in correct locations per `structure.md`:

| File Type | Correct Location |
|-----------|------------------|
| Source code | `{service}/src/` or `{service}/app/` |
| Tests | `{service}/tests/` |
| Documentation | `docs/{category}/` |
| Workflow logs | `log/workflow/` |
| Scripts | `scripts/` |
| AKIS files | `.github/` |

**If misplaced files found:**
```bash
# Move to correct location
mv misplaced_file.md docs/{category}/
```

### 3. Knowledge Update (If Applicable)
For significant changes (new features, architecture, patterns):

```bash
# Generate updated codemap
python .github/scripts/generate_codemap.py
```

**Manual additions for:**
- New entities (services, features, components)
- New relations (dependencies, implementations)
- Updated observations with date

```json
{"type":"entity","name":"NewFeature","entityType":"feature","observations":["Description","upd:YYYY-MM-DD"]}
```

### 4. Skill Suggestion (If Pattern Emerged)
If work revealed reusable pattern (appeared in 3+ sessions):

```bash
# Check if skill already exists
grep -r "pattern_keyword" .github/skills/

# If new pattern, consider creating skill
# Follow template: .github/templates/skill.md
```

### 5. Workflow Log Creation
**Required for:** Tasks >15 minutes, complex changes, significant decisions

```bash
# Create from template
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
TASK="task-name"
cp .github/templates/workflow-log.md log/workflow/${TIMESTAMP}_${TASK}.md
```

**Fill in:**
- Summary: One paragraph of what was done
- Changes: Files created/modified/deleted
- Decisions: Key choices and rationale
- Verification: Checklist of tests performed
- Notes: Context for future reference

### 6. Final Commit
```bash
# Via report_progress tool
report_progress with:
  - commitMessage: "feat/fix/docs: brief description"
  - prDescription: Updated checklist showing completion
```

---

## Workflow Log Template

```markdown
# {Task Name}

**Date**: YYYY-MM-DD HH:MM
**Duration**: ~N minutes

## Summary
{One paragraph describing work completed}

## Changes
- Created: `path/file.ext` - {why}
- Modified: `path/file.ext` - {what}
- Deleted: `path/file.ext` - {why}

## Decisions
| Decision | Rationale |
|----------|-----------|
| {Choice} | {Why} |

## Verification
- [x] Tests pass
- [x] Manual check confirms behavior
- [x] Code lints/compiles

## Notes
{Context, gotchas, future considerations}
```

---

## Codemap Generation

The codemap script (`generate_codemap.py`) automatically:
- Scans Python, TypeScript, JavaScript files
- Extracts imports and exports
- Builds dependency graph
- Updates `project_knowledge.json` with codegraph entries
- Generates/updates domain map (line 1)

**Run at session end for:**
- New files created
- Significant refactoring
- Architecture changes

**Skip for:**
- Minor text/config changes
- Bug fixes in existing code
- Documentation-only changes

---

## Skill Suggestion Criteria

Consider creating new skill when:
- Pattern appeared in 3+ sessions
- Solution is reusable across projects
- Commands/code can be copy-pasted
- Would save future agent time

**Do NOT create skill for:**
- Project-specific details
- One-off solutions
- Rapidly changing patterns

**Skill format:**
- <50 lines
- When to Use / Avoid sections
- Executable examples
- Related skills linked

---

## Session Counter

Track session number for maintenance scheduling:

```bash
# Increment session count
python .github/scripts/session_tracker.py increment

# Check if maintenance due
python .github/scripts/session_tracker.py check-maintenance
```

**Every 10 sessions:** Run workflow analyzer for framework maintenance.

---

## Cleanup Tasks

Before final commit:

1. **Remove temporary files**
   - Delete `/tmp/` work files
   - Remove debug outputs
   - Clear test artifacts

2. **Check .gitignore**
   - Build artifacts excluded
   - Dependencies excluded
   - Local config excluded

3. **Verify commit scope**
   - Only intended files staged
   - No secrets committed
   - No binary blobs

---

## Related

- [context-loading.md](context-loading.md) - Session start
- [task-tracking.md](task-tracking.md) - During execution
- [session-discipline.md](session-discipline.md) - Anti-drift
- [structure.md](structure.md) - File placement
