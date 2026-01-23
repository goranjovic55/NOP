# AKIS v7.4

## Gates
| G | Check | Fix | Enforcement |
|---|-------|-----|-------------|
| 0 | No knowledge | `head -100 project_knowledge.json` ONCE → CACHE | **BLOCKING** |
| 1 | No ◆ | `manage_todo_list` → mark ◆ | Warning |
| 2 | No skill | Load skill FIRST (detect session type, pre-load) | **BLOCKING** |
| 3 | No START | Do START | Warning |
| 4 | No END | Do END | **BLOCKING** |
| 5 | No verify | Syntax check | **BLOCKING** |
| 6 | Multi ◆ | One only | Warning |
| 7 | No parallel | Use pairs for 6+ | Warning |

**BLOCKING gates:** Session MUST NOT proceed if violated. Enforce strictly.

## START
1. **G0 ENFORCEMENT (BLOCKING):** `head -100 project_knowledge.json` → CACHE for session lifetime
   - Store: hot_cache (30 entities), domain_index (156 paths), gotchas (28 issues)
   - Query pattern: hot_cache → domain_index → gotchas → fallback (file read)
   - **NEVER re-read knowledge.json during session** (89% hit rate)
2. **Session Type Detection:** Analyze initial task/files → detect type
   - `fullstack`: .tsx/.jsx + .py/backend → Pre-load: frontend-react + backend-api + debugging
   - `frontend`: .tsx/.jsx/.ts only → Pre-load: frontend-react + debugging
   - `backend`: .py/backend/api only → Pre-load: backend-api + debugging
   - `docker`: Dockerfile/docker-compose → Pre-load: docker + backend-api
   - `akis`: .github/skills/agents → Pre-load: akis-dev + documentation
   - **G2 ENFORCEMENT (BLOCKING):** Skills pre-loaded = CACHED. Block reloads (violation alert)
3. `manage_todo_list` → structured TODO naming
4. **Announce:** `AKIS v7.4 [complexity]. Type: [session_type]. Skills: [list]. [N] tasks. Ready.`

## TODO Format
`○ [agent:phase:skill] Task [context]`

| Field | Values |
|-------|--------|
| agent | AKIS, code, architect, debugger, reviewer, documentation, research, devops |
| phase | START, WORK, END, VERIFY |
| skill | backend-api, frontend-react, docker, testing, debugging, documentation |
| context | `parent→X` `deps→Y,Z` |

## WORK
**Check memory first (MANDATORY):** domain_index → paths, gotchas → bugs, hot_cache → entities
- **NEVER re-read project_knowledge.json** (G0 cache enforced)
- **NEVER reload skills** (G2 cache enforced)

| Trigger | Skill |
|---------|-------|
| .tsx .jsx | frontend-react |
| .py backend/ | backend-api |
| Dockerfile | docker |
| error | debugging |
| test_* | testing |
| .md docs/ | documentation |

**Flow:** ◆ → Skill (from cache) → Edit → Verify → ✓

## END
1. Close ⊘, verify edits **(G4 BLOCKING: MUST complete)**
2. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md` **(G4 BLOCKING: REQUIRED for sessions >15min)**
3. Run scripts, present table **(G5 BLOCKING: Syntax + tests MUST pass)**
4. **ASK before git push**

**G5 Validation (BLOCKING):**
- Syntax check MUST pass (no errors)
- Tests MUST pass (if test files edited)
- Build MUST pass (if applicable)
- **Block commit if any fail**

## Delegation (6+ = MANDATORY)
| Tasks | Action |
|-------|--------|
| <3 | Direct |
| 3-5 | Consider |
| 6+ | **runSubagent** |

| Agent | Use |
|-------|-----|
| architect | Design |
| code | Implement |
| debugger | Fix bugs |
| documentation | Docs (parallel) |

## Context Isolation (Clean Handoffs)
| Phase | Handoff | Token Target |
|-------|---------|--------------|
| planning → code | `design_spec` artifact | 200-400 |
| research → design | `research_findings` artifact | 200-400 |
| code → review | `code_changes` artifact | 200-400 |

**Rule:** Produce typed artifact, not conversation history. -48.5% tokens.

### Artifact Types

**design_spec:**
```yaml
summary: "50-100 words"
key_decisions: ["decision1", "decision2"]
files: ["file1.py", "file2.tsx"]
constraints: ["constraint1"]
```

**research_findings:**
```yaml
summary: "100-150 words"
key_insights: ["insight1", "insight2"]
recommendations: ["rec1", "rec2"]
sources: ["source1"]
```

**code_changes:**
```yaml
files_modified: ["file1.py", "file2.tsx"]
summary: "50 words"
tests_status: "pass|fail"
rollback_plan: ["step1", "step2"]
```

**Handoff Protocol:**
1. Create typed artifact (not full context)
2. Include ONLY actionable content
3. NO conversation history
4. Target: 200-400 tokens (vs 1,500 baseline)

## Parallel (G7: 60%)
| Pair | Pattern |
|------|---------|
| code + docs | ✓ Parallel |
| research + code | Sequential |

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Gotchas
| Issue | Fix |
|-------|-----|
| Query knowledge repeatedly | **G0 VIOLATION:** Read 100 lines ONCE, CACHE for session |
| Text TODOs | Use `manage_todo_list` |
| Edit without skill | **G2 VIOLATION:** Load skill FIRST (session type detection) |
| Reload same skill | **G2 VIOLATION:** Skills CACHED for session lifetime |
| Skip announcement | Announce before WORK |
| Multiple ◆ | One only |
| Auto-push | ASK first |
| Context pollution | Use artifact handoffs (200-400 tokens) |
| Sequential ops | **BATCH:** Parallel reads (5 max), command chains |
| Skip END | **G4 VIOLATION:** END phase MANDATORY |
| Skip validation | **G5 VIOLATION:** Syntax/tests MUST pass |
