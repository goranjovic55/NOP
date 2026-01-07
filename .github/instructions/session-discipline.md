# Session Discipline Protocol

**MANDATORY** throughout session. Prevents drift, maintains context, ensures completion.

---

## Anti-Drift Gates

Insert these checkpoints to prevent losing focus:

### Gate 1: Session Start
Before any work:
```
✅ MUST: Restate task in own words
✅ MUST: Load knowledge, skills, relevant docs
❌ MUST NOT: Start working without context
```

### Gate 2: Plan Phase
Before implementation:
```
✅ MUST: Create explicit TODO list
✅ MUST: Break into <50 line changes
❌ MUST NOT: Start coding without plan
```

### Gate 3: Mid-Task Anchor
Every 3-5 actions, verify:
```
✅ CHECK: Still aligned with original task?
✅ CHECK: Current work advances plan?
✅ CHECK: No unrelated tangents?
```

### Gate 4: Pre-Commit
Before each commit:
```
✅ MUST: Changes match plan
✅ MUST: No unintended modifications
✅ MUST: Tests/lint passing (if applicable)
```

### Gate 5: Session End
Before completing:
```
✅ MUST: All planned items addressed
✅ MUST: Workflow log created (if >15min)
✅ MUST: Knowledge updated (if relevant)
```

---

## Drift Detection

### Signs of Drift
- Working on unrelated files
- Fixing bugs not in original scope
- Refactoring beyond requirements
- Adding features not requested
- Extended exploration without implementation

### Recovery Procedure
1. **Stop** - Pause current action
2. **Review** - Reread original task
3. **Compare** - Current work vs. task requirements
4. **Decide** - Return to task OR document scope change
5. **Continue** - Resume aligned work

---

## Context Preservation

### At Response Start
Each new response should:
1. Recall current phase (CONTEXT/PLAN/IMPLEMENT/etc.)
2. Recall current task from TODO
3. Verify alignment with original goal

### Session State Tracking
Track in memory:
- Current phase
- Current TODO item
- Files modified
- Decisions made
- Blockers encountered

### Handoff to Future Sessions
If work spans sessions:
1. Document state in workflow log
2. Mark TODO progress
3. Note next action clearly
4. Commit current progress

---

## Scope Management

### In-Scope
- Work explicitly requested
- Dependencies of requested work
- Bug fixes directly blocking task
- Documentation for changes made

### Out-of-Scope (Defer)
- Unrelated bugs noticed
- "Nice to have" improvements
- Refactoring beyond necessity
- Feature extensions

**When out-of-scope work discovered:**
```markdown
**Out of Scope (noted for later):**
- [ ] Unrelated issue in X
- [ ] Potential improvement in Y
```

---

## Phase Discipline

### CONTEXT Phase
**DO:** Load knowledge, skills, docs, understand task
**DON'T:** Start implementing, make changes

### PLAN Phase
**DO:** Create TODO list, identify approach
**DON'T:** Write code, make changes

### IMPLEMENT Phase
**DO:** Execute TODOs sequentially, verify each
**DON'T:** Skip verification, work on multiple tasks

### REVIEW Phase
**DO:** Verify changes, run tests, check quality
**DON'T:** Add new features, expand scope

### SESSION END Phase
**DO:** Update knowledge, create workflow log, commit
**DON'T:** Start new work, add "one more thing"

---

## Verification Checkpoints

### After Each File Change
- [ ] Change matches plan
- [ ] No syntax errors
- [ ] No unintended side effects

### After Each Task
- [ ] Task complete as defined
- [ ] Verification step passed
- [ ] Ready for next task

### Before Session End
- [ ] All planned work complete
- [ ] Changes committed
- [ ] Documentation updated (if needed)
- [ ] Workflow log created (if >15min task)

---

## Error Recovery

### Lost Context
If unsure of current state:
1. Review TODO list
2. Check git diff for changes made
3. Review last messages for decisions
4. Resume from known state

### Stale Session
If returning after interruption:
1. Review workflow log (if exists)
2. Check TODO progress
3. Reload relevant context
4. Continue from marked position

### Conflicting Requirements
If requirements seem contradictory:
1. Document the conflict
2. State assumptions clearly
3. Proceed with best interpretation
4. Flag for user review

---

## Related

- [context-loading.md](context-loading.md) - Session start
- [task-tracking.md](task-tracking.md) - TODO management
- [session-end.md](session-end.md) - Completion protocol
