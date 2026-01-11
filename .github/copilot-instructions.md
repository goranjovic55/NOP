# AKIS v9.0 (Skills-Based Workflow)

## ⛔ HARD GATES (STOP if violated)
| Gate | Violation | Action | Rate* |
|------|-----------|--------|-------|
| G1 | No ◆ task active | Create TODO with ◆ first | 4.4% |
| G2 | Editing without skill | Load skill, announce it | 8.4% |
| G3 | START not done | Do START steps 1-5 first | 3.6% |
| G4 | Session ending without END | Do END steps 1-5 before closing | 6.8% |
| G5 | Edit without verification | Verify syntax/tests after edit | 5.0% |
| G6 | Multiple ◆ tasks | Only ONE ◆ active at a time | 2.2% |

*100k simulation optimized deviation rates

## START (Do ALL steps - ⛔ G3 enforcement)
```
1. Read project_knowledge.json lines 1-4 (hot_cache, domain_index, gotchas)
2. Read .github/skills/INDEX.md (skill catalog)
3. Read docs/INDEX.md (documentation map)
4. Create todos: <MAIN> → <WORK>... → <END>
5. Say: "AKIS v9.0 ready. [Simple/Medium/Complex]. Plan: [N tasks]"
```

**Session skills cache:** [track loaded skills here - don't reload!]

## WORK (⛔ G1, G2, G5, G6 enforcement)
**BEFORE: Mark ◆ → Load skill if NEW → EDIT → VERIFY ✓ → AFTER: Mark ✓**

### Skill Detection (auto-load based on situation)

| Situation | Skill | Trigger Keywords |
|-----------|-------|------------------|
| PLAN phase | planning | "design", "new feature", "research", "brainstorm" |
| Backend work | backend-api ⭐ | *.py, backend/, api/, "FastAPI" |
| Frontend work | frontend-react ⭐ | *.tsx, components/, pages/, "React" |
| Errors/Bugs | debugging | "error", "bug", "traceback", "fix" |
| Tests | testing | test_*, *_test.py, "tests" |
| Docs | documentation | *.md, docs/, README |
| Containers | docker | Dockerfile, docker-compose, "container" |
| CI/Deploy | ci-cd | .github/workflows/, deploy.sh, "pipeline" |
| AKIS files | akis-development | .github/skills/*, copilot-instructions* |

**⭐ = Pre-load for fullstack work**

**G5 Verify:** After EVERY edit → syntax check + imports + tests if applicable

**Cache rule:** Don't reload skill already loaded this session!

## END (⛔ G4 - MANDATORY before session close)
**Triggers:** "wrap up" | "done" | "end session" | "commit" | "finished"
```
1. Close ⊘ orphans (check TODO for any ⊘ or multiple ◆)
2. Verify all edits: syntax check, tests if applicable
3. Run scripts WITHOUT flag: knowledge.py, skills.py, instructions.py, docs.py
4. Ask: "Implement? [y/n/select]"
5. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md → commit
```

⛔ **G4 CHECK:** Before closing, have you created the workflow log?

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused

## Workflow Phases

| Phase | Skills | Use For |
|-------|--------|---------|
| **PLAN** | planning | Feature design, blueprints, research |
| **BUILD** | backend-api, frontend-react, docker, ci-cd | Implementation |
| **VERIFY** | testing, debugging | Quality assurance |
| **DOCUMENT** | documentation | Docs, README, comments |

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
3. Check skill cache
4. Continue
```
