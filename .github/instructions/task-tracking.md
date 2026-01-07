# Task Tracking Protocol

**MANDATORY** during PLAN and EXECUTION phases. All work tracked via TODO lists.

---

## Blocking Gate

Before starting implementation:

```
✅ MUST: Create actionable TODO list with subtasks
❌ MUST NOT: Start coding without explicit plan
```

---

## TODO Structure

### Main Tasks
Break work into discrete units, each <50 lines of change.

```markdown
- [ ] Task 1: Clear action (specific file/component)
  - [ ] Subtask 1a: Specific change
  - [ ] Subtask 1b: Verification step
- [ ] Task 2: Next action
  - [ ] Subtask 2a
```

### Good vs Bad Examples

**❌ Bad:** "Implement feature"
**✅ Good:** "Add /api/v1/scan endpoint in backend/app/api/v1/endpoints/scans.py"

**❌ Bad:** "Fix bugs"
**✅ Good:** "Fix 404 on /api/v1/assets by adding missing route"

**❌ Bad:** "Update UI"
**✅ Good:** "Add StatusBadge component to frontend/src/components/StatusBadge.tsx"

---

## Execution Rules

### 1. Sequential Execution
Work through TODOs in order. Mark progress:
- `[ ]` → Pending
- `[x]` → Complete
- `[~]` → In progress (optional)

### 2. One Task at a Time
Complete current task before starting next.

### 3. Verify Before Moving On
Each task should have verification:
- Code compiles/lints
- Tests pass (if applicable)
- Manual check confirms behavior

---

## Progress Reporting

After completing meaningful units:

1. **Mark completed items** in checklist
2. **Call report_progress** to commit and push
3. **Update checklist** in PR description

### Report Frequency
- After each major task completion
- After fixing a bug
- Before switching to different area of code
- When plan changes significantly

---

## Handling Scope Changes

If new requirements emerge during work:

1. **Document deviation** - Note why scope changed
2. **Add to TODO list** - New task with subtasks
3. **Prioritize** - Insert at appropriate position
4. **Continue execution** - Resume sequential work

**Example:**
```markdown
- [x] Task 1: Original work
- [ ] Task 1.5: New requirement discovered during Task 1
  - [ ] Subtask: Specific change needed
- [ ] Task 2: Continue original plan
```

---

## Subtask Guidelines

### When to Create Subtasks
- Task involves multiple files
- Task has distinct verification steps
- Task could be interrupted/resumed
- Complex logic requiring multiple changes

### Subtask Granularity
Each subtask should be:
- Completable in 5-15 minutes
- Independently verifiable
- Self-contained (doesn't break build mid-task)

---

## Anti-Drift Integration

At each task boundary, verify:
- [ ] Current task aligns with original goal
- [ ] No scope creep into unrelated areas
- [ ] Plan still reflects actual work needed

If misaligned → Update plan, document reason.

---

## Session Handoff

If session ends mid-work:

1. **Mark current state** in TODO
2. **Document context** in workflow log
3. **Save progress** via report_progress
4. **Note next action** clearly

---

## Related

- [context-loading.md](context-loading.md) - Pre-work context
- [session-discipline.md](session-discipline.md) - Anti-drift
- [session-end.md](session-end.md) - Completion protocol
