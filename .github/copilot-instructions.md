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

## Skills vs Agents

| Concept | Type | How to Use |
|---------|------|------------|
| **Skills** | Callable | `skill("frontend-react")` loads context |
| **Agents** | Conceptual | Follow patterns in `.github/agents/*.md` |

**Note:** Delegation = follow agent methodology, not spawn process.
See: `docs/development/SKILLS_VS_AGENTS.md`

## Delegation (use ⧖) - Workflow Patterns

| Complexity | Action |
|------------|--------|
| Simple (<3 files) | Direct execution |
| Medium (3-5 files) | Follow agent patterns |
| Complex (6+ files) | Trace with ⧖ in log |

| Agent Pattern | Triggers | Use For |
|---------------|----------|---------|
| architect | design, blueprint, plan | Design before code |
| debugger | error, bug, traceback | Root cause analysis |
| documentation | doc, readme, explain | Docs with examples |
| code | implement, create, write | Standards + tests |
| reviewer | review, audit, check | Pass/fail audit |
| research | research, compare | Gather info |
| devops | deploy, docker, ci | Infrastructure |


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

## Project Planning

| Document Type | Location | Use For |
|---------------|----------|---------|
| Blueprints | `.project/blueprints/` | Feature design |
| Roadmaps | `.project/roadmaps/` | Milestones |
| Mockups | `.project/mockups/` | UI/UX design |

See templates in each folder.

## If Lost
```
1. Show worktree  
2. Find ◆ or ⊘ or next ○
3. Check skill cache, orphans
4. Continue
```
