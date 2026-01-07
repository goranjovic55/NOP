# Edge Cases and Error Recovery

**Reference for handling session drift, failures, and recovery scenarios.**

---

## Edge Case Categories

1. **Context Drift** - Losing focus on original task
2. **State Loss** - Session interruption or confusion
3. **Scope Creep** - Expanding beyond requirements
4. **Gate Violations** - Skipping mandatory steps
5. **Resource Failures** - Missing files, broken scripts

---

## 1. Context Drift Scenarios

### Scenario: Working on Unrelated Files
**Symptom:** Making changes to files not in the TODO list.

**Recovery:**
1. Stop current action
2. Review original task statement
3. Compare current file to TODO items
4. If unrelated: revert changes, return to TODO
5. If related but missing: add to TODO, continue

**Prevention:**
- Check at each file open: "Is this in my TODO?"
- Anchor statement: "Working on [file] for [TODO item]"

---

### Scenario: Fixing Unrelated Bugs
**Symptom:** Noticing and fixing bugs not in original scope.

**Recovery:**
1. Complete minimal fix if already started
2. Document as out-of-scope:
   ```markdown
   **Out of Scope (noted for later):**
   - [ ] Bug in file X: description
   ```
3. Return to original TODO

**Prevention:**
- Log bugs, don't fix immediately
- Ask: "Is this blocking my task?"

---

### Scenario: Extended Exploration
**Symptom:** Reading code without implementing.

**Recovery:**
1. Set time limit for exploration (5-10 min)
2. Document findings
3. Return to PLAN phase if needed
4. Continue with implementation

**Prevention:**
- Exploration has purpose: "Reading to understand X for Y"
- Anchor: "What specific question am I answering?"

---

## 2. State Loss Scenarios

### Scenario: Lost Track of Progress
**Symptom:** Unsure what's complete, what's pending.

**Recovery:**
1. Check git status for current changes
2. Review TODO list for checkmarks
3. Verify completed items actually work
4. Resume from first unchecked item

**Commands:**
```bash
git --no-pager status
git --no-pager diff --stat
```

---

### Scenario: Session Interrupted
**Symptom:** Returning to incomplete work.

**Recovery:**
1. Read last workflow log (if exists)
2. Check TODO progress
3. Review git history:
   ```bash
   git --no-pager log --oneline -5
   ```
4. Reload relevant context
5. Resume from documented position

**Prevention:**
- Use `report_progress` frequently
- Document state before breaks

---

### Scenario: Conflicting Information
**Symptom:** Knowledge says X, code shows Y.

**Recovery:**
1. Trust current code over stale knowledge
2. Update knowledge with current state
3. Note discrepancy in workflow log
4. Proceed with code reality

**Commands:**
```bash
# Refresh knowledge from code
python .github/scripts/generate_codemap.py
```

---

## 3. Scope Creep Scenarios

### Scenario: "While I'm Here" Additions
**Symptom:** Adding features beyond requirements.

**Recovery:**
1. Stop the addition
2. Complete only original requirements
3. Note enhancement ideas:
   ```markdown
   **Future enhancements:**
   - [ ] Idea from current work
   ```

**Prevention:**
- Anchor: "Does this match original request?"
- Defer improvements to separate session

---

### Scenario: Perfectionism
**Symptom:** Refactoring working code to be "better."

**Recovery:**
1. Ask: "Is this required for the task?"
2. If no: revert, move on
3. If yes: add to TODO, document reason

**Prevention:**
- "Good enough" over "perfect"
- Minimal changes principle

---

### Scenario: Rabbit Hole Debugging
**Symptom:** Debugging leads to debugging more things.

**Recovery:**
1. Set 15-minute limit for debugging chains
2. If exceeding: document, defer, or ask for help
3. Return to original task

**Prevention:**
- Track debugging depth: "Debug level 2 of issue"
- Exit if level > 3 from original task

---

## 4. Gate Violation Scenarios

### Scenario: Started Coding Without Plan
**Symptom:** In EXECUTE without TODO list.

**Recovery:**
1. Stop implementation
2. Create TODO for work done + remaining
3. Continue from TODO

**Prevention:**
- Gate check: "Do I have a TODO list?"

---

### Scenario: Skipped Context Loading
**Symptom:** Making assumptions about codebase.

**Recovery:**
1. Stop and load knowledge
2. Verify assumptions
3. Adjust approach if needed

**Prevention:**
- Gate check: "What entities are involved?"

---

### Scenario: No Workflow Log Created
**Symptom:** Session ending without documentation (>15min task).

**Recovery:**
1. Create workflow log immediately
2. Fill in from memory + git history
3. Complete before final commit

**Prevention:**
- Gate check: "Was this >15 minutes?"

---

## 5. Resource Failure Scenarios

### Scenario: Knowledge File Missing
**Symptom:** `project_knowledge.json` doesn't exist.

**Recovery:**
```bash
# Generate from scratch
python .github/scripts/generate_codemap.py
```

---

### Scenario: Skills INDEX Outdated
**Symptom:** Skills referenced don't exist.

**Recovery:**
```bash
# List actual skills
ls .github/skills/*.md

# Create missing skill from template
cp .github/templates/skill.md .github/skills/new-skill.md
```

---

### Scenario: Script Fails
**Symptom:** `session_start.py` or other script errors.

**Recovery:**
1. Read error message
2. Fix if simple (path, dependency)
3. If complex: proceed manually
4. Document issue for later fix

**Manual fallback for context:**
```bash
head -1 project_knowledge.json
ls .github/skills/
cat .github/instructions/structure.md
```

---

### Scenario: Template Missing
**Symptom:** Template file not found.

**Recovery:**
```bash
# Check templates exist
ls .github/templates/

# Create minimal workflow log
echo "# Task Name" > log/workflow/$(date +%Y-%m-%d_%H%M%S)_task.md
echo "" >> log/workflow/$(date +%Y-%m-%d_%H%M%S)_task.md
echo "## Summary" >> log/workflow/$(date +%Y-%m-%d_%H%M%S)_task.md
```

---

## Recovery Decision Tree

```
Problem detected
    ↓
Is work blocked?
    ├─ No → Note issue, continue
    └─ Yes → Stop, diagnose
              ↓
         Is it context drift?
              ├─ Yes → Restate task, realign
              └─ No → Is it state loss?
                       ├─ Yes → Check git, TODO, resume
                       └─ No → Is it resource failure?
                                ├─ Yes → Manual fallback
                                └─ No → Document, ask for help
```

---

## Enforcement Metrics

Track these to measure drift resistance:

| Metric | Target | Red Flag |
|--------|--------|----------|
| Files modified outside TODO | 0 | >2 |
| Mid-task realignments | <1 per session | >3 |
| Tasks completed without plan | 0 | Any |
| Sessions without workflow log (>15min) | 0 | Any |
| Knowledge loads per session | ≥1 | 0 |

---

## Related

- [session-discipline.md](session-discipline.md) - Prevention
- [context-loading.md](context-loading.md) - Correct startup
- [task-tracking.md](task-tracking.md) - TODO discipline
- [session-end.md](session-end.md) - Proper completion
