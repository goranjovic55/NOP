# AKIS v5.6

## ⚠️ START → Before Any Work

```
1. view project_knowledge.json (1-50) + .github/skills/INDEX.md
2. Create todos: <MAIN> → <WORK> items → <END>
3. Tell user: context + plan
```

## ⚠️ WORK → For Each Task

**EVERY EDIT (even 1 line):**
```
Mark ◆ → Check skill trigger → Edit → Mark ✓
```
**NO EXCEPTIONS. NO "quick fixes" without ◆ first.**

| Files | Load First | Enforcement |
|-------|------------|-------------|
| `.tsx` `.jsx` `pages/` `components/` | `frontend-react.md` | MANDATORY |
| `backend/` `.py` `api/` `routes/` | `backend-api.md` | MANDATORY |
| `docker` `Dockerfile` `.yml` | `docker.md` | MANDATORY |
| `.md` `docs/` `README` | `documentation.md` | **MANDATORY** |
| Error in output | `debugging.md` | MANDATORY |
| `test` `spec` `pytest` | `testing.md` | recommended |

**Interrupt:** ⊘ current → `<SUB:1>` → handle → resume (no orphan ⊘!)

## ⚠️ END → After "approved/done"

**BEFORE COMMIT (all required):**
```
1. ⊘ orphans? → close them
2. Run: generate_codemap.py && suggest_skill.py
3. Create: log/workflow/YYYY-MM-DD_HHMMSS_task.md
4. THEN commit
```

## Todo Format

```
<MAIN> User request    ✓ done  ◆ working  ○ pending  ⊘ paused
├─ <WORK> Task 1
├─ <WORK> Task 2
└─ <END> Commit
```

## ⚠️ NON-NEGOTIABLE RULES

1. **◆ before ANY edit**
   ✗ "Let me quickly fix this typo..."  
   ✓ Mark ◆ → fix typo → Mark ✓

2. **No quick fixes**
   ✗ "I'll just add this import..."
   ✓ Create `<WORK>` → Mark ◆ → add import → Mark ✓

3. **Scripts before commit**
   ✗ git commit (user said "done")
   ✓ generate_codemap.py && suggest_skill.py → THEN commit

## If Lost

```
1. Show worktree
2. Find ◆ or ⊘ or next ○
3. Continue
```
