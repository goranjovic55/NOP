# AKIS v7.0 (100k Simulation Optimized)

## ⛔ HARD GATES (STOP if violated)
| Gate | Violation | Action | Rate* |
|------|-----------|--------|-------|
| G1 | No ◆ task active | Create TODO with ◆ first | 10.1% |
| G2 | Editing without skill | Load skill, announce it | 31.1% |
| G3 | START not done | Do START steps 1-5 first | 8.1% |
| G4 | Session ending without END | Do END steps 1-6 before closing | 22.1% |
| G5 | Edit without verification | Verify syntax/tests after edit | 17.9% |
| G6 | Multiple ◆ tasks | Only ONE ◆ active at a time | 5.2% |

*Pre-optimization deviation rates from 100k simulation

## START (Do ALL steps - ⛔ G3 enforcement)
```
1. Read project_knowledge.json lines 1-4 (hot_cache, domain_index, gotchas)
2. Read .github/skills/INDEX.md (skill catalog)
3. Read docs/INDEX.md (documentation map)
4. Create todos: <MAIN> → <WORK>... → <END>
5. Say: "AKIS v7.0 ready. [Simple/Medium/Complex]. Plan: [N tasks]"
6. Pre-load skills: frontend-react + backend-api for fullstack
```

**Session skills cache:** [track loaded skills here - don't reload!]

## WORK (⛔ G1, G2, G5, G6 enforcement)
**BEFORE: Mark ◆ → Load skill if NEW → EDIT → VERIFY → AFTER: Mark ✓**

| Pattern | Skill (load ONCE) |
|---------|-------------------|
| .tsx .jsx components/ pages/ | frontend-react ⭐ |
| .py backend/ api/ routes/ | backend-api ⭐ |
| Dockerfile docker-compose .yml | docker |
| .github/workflows/* deploy.sh | ci-cd |
| .md docs/ README | documentation ⚠️ |
| error traceback failed | debugging |
| test_* *_test.py | testing |
| .github/skills/* copilot-instructions* | akis-development ⚠️ |

**⭐ = Pre-load for fullstack | ⚠️ = Low compliance, always load**

**Cache rule:** Don't reload skill already loaded this session!

**Interrupt:** ⊘ current → <SUB:N> → handle → ⊘→◆ resume (no orphans!)

## END (⛔ G4 - MANDATORY before session close)
```
1. Close ⊘ orphans (check TODO for any ⊘ or multiple ◆)
2. Verify all edits: syntax check, tests if applicable
3. Run scripts WITHOUT flag: knowledge.py, skills.py, instructions.py, docs.py, agents.py
4. Ask: "Implement? [y/n/select]"
5. y → Run with --update → VERIFY files → Report ✓
6. select → Agent implements manually
7. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md → commit
```

**Flow:** Analyze → Ask → (y? --update → Verify) or (select? Agent writes)

**Trigger:** User says "wrap up", "done", "end session", "commit"

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Delegation (use ⧖)
| Complexity | Action |
|------------|--------|
| Simple (<3 files) | Handle directly |
| Medium (3-5 files) | Consider delegation |
| Complex (6+ files) | **Delegate** to specialist |

| Agent | Triggers |
|-------|----------|
| architect | design, blueprint, plan |
| research | research, compare, evaluate |
| code | implement, create, write |
| debugger | error, bug, traceback |
| reviewer | review, audit, check |
| documentation | doc, readme, explain |
| devops | deploy, docker, ci |

**Parallel OK:** code(A)+code(B), code+docs, reviewer+docs
**Sequential:** architect→code→debugger→reviewer

**Mark in TODO:** `<DELEGATE> → agent-name ⧖`

## Efficiency
- **Knowledge:** Read once at START (lines 1-4 only)
- **Skills:** Load ONCE per domain per session
- **Scripts:** Run at END only

## If Lost
```
1. Show worktree  
2. Find ◆ or ⊘ or next ○
3. Check skill cache, orphans
4. Continue
```
