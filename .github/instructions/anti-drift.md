# Anti-Drift

Quick fixes when you notice protocol violations.

---

## Common Drifts & Fixes

| If you... | Then... |
|-----------|---------|
| Started without loading knowledge | Stop. `view project_knowledge.json` lines 1-50. Continue. |
| Made changes without todo | Create todo now, mark ✓, continue tracking. |
| Said "I'll just quickly fix..." | STOP. Create todo first. Then fix. |
| Edited file without checking skill | Check trigger table. Load skill if match. |
| See an error and want to "just try" | Load `debugging.md` first. Then debug. |
| User said "done" and you're about to commit | Run both scripts first. Then commit. |
| Forgot where you were after interrupt | Show worktree. Find ⊘ paused. Resume it. |
| Have ⊘ paused task but moved on | Resume the paused task now. No orphans at END. |
| Did bulk edits across files | Verify no duplicate code or syntax errors. |

---

## Quick Checks

**Every ~5 tasks, ask yourself:**

```
□ Am I tracking work with todos?
□ Did I load skills for files I edited?
□ Any ⊘ paused tasks I forgot to resume?
```

---

## Recovery

**If badly off track:**

```
1. Stop
2. Show current worktree
3. Create todos for untracked work (mark ✓)
4. Resume any ⊘ paused tasks
5. Continue from clean state
```

---

## The Three Rules

Repeat when uncertain:

1. **Todo before code** (even quick fixes)
2. **Skill before edit**
3. **Scripts before commit**
