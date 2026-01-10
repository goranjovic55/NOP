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
| G7 | Skip parallel for eligible tasks | Use parallel agents when compatible | 10.7% |

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
**BEFORE: Mark ◆ → Load skill if NEW → EDIT → VERIFY ✓ → AFTER: Mark ✓**

| Pattern | Skill (load ONCE) |
|---------|-------------------|
| .tsx .jsx components/ pages/ | frontend-react ⭐ |
| .py backend/ api/ routes/ | backend-api ⭐ |
| Dockerfile docker-compose .yml | docker |
| .github/workflows/* deploy.sh | ci-cd |
| .md docs/ README | documentation ⚠️31% |
| error traceback failed | debugging |
| test_* *_test.py | testing |
| .github/skills/* copilot-instructions* | akis-development ⚠️ |

**⭐ = Pre-load for fullstack | ⚠️31% = Low compliance, ALWAYS load**

**G5 Verify:** After EVERY edit → syntax check + imports + tests if applicable

**Cache rule:** Don't reload skill already loaded this session!

**6+ files?** → ⛔ MUST delegate (23.4% skip rate)

**Interrupt:** ⊘ current → <SUB:N> → handle → ⊘→◆ resume (no orphans!)

## END (⛔ G4 - 21.9% skip rate - MANDATORY before session close)
**Triggers:** "wrap up" | "done" | "end session" | "commit" | "finished"
```
1. Close ⊘ orphans (check TODO for any ⊘ or multiple ◆)
2. Verify all edits: syntax check, tests if applicable
3. Run scripts WITHOUT flag: knowledge.py, skills.py, instructions.py, docs.py, agents.py
4. Ask: "Implement? [y/n/select]"
5. y → Run with --update → VERIFY files → Report ✓
6. select → Agent implements manually
7. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md → commit
```

⛔ **G4 CHECK:** Before closing, have you created the workflow log?

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Delegation (use ⧖) - Optimized from 100k simulation

| Complexity | Action | Efficiency* |
|------------|--------|-------------|
| Simple (<3 files) | Handle directly or smart delegate | 72% vs 94% |
| Medium (3-5 files) | **Smart delegation** (task-match) | 93.5% |
| Complex (6+ files) | **Always delegate** to specialist | 93.8% |

*No delegation: 72% success, 27 min. With delegation: 94% success, 16 min.

| Agent | Triggers | Success Rate* |
|-------|----------|---------------|
| architect | design, blueprint, plan | 97.7% |
| debugger | error, bug, traceback | 97.3% |
| documentation | doc, readme, explain | 88.5% |
| code | implement, create, write | ~95% |
| reviewer | review, audit, check | ~90% |
| research | research, compare, evaluate | 76.2% |
| devops | deploy, docker, ci | ~90% |

*From 100k delegation optimization simulation

## Parallel Execution (⛔ G7 enforcement - saves 9,395 hrs/100k sessions)

**Compatible pairs - RUN IN PARALLEL when possible:**
| Pair 1 | Pair 2 | Use Case |
|--------|--------|----------|
| code | documentation | Code + docs simultaneously |
| code | reviewer | Implement A + review B |
| research | code | Research + implement overlap |
| architect | research | Design + research overlap |
| debugger | documentation | Debug + docs together |

**Parallel Rules:**
1. ⚡ Check for compatible pairs before sequential delegation
2. ⚡ Analyze dependencies - only parallelize independent tasks
3. ⚡ Synchronize results after parallel completion
4. ⚡ Detect conflicts early (same files = sequential)

**Mark parallel in TODO:** `<PARALLEL> → agent1 ⧖ + agent2 ⧖`

**Sequential ONLY:** architect→code→debugger→reviewer (dependency chain)

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
