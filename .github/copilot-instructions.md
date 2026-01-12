# AKIS v7.1 (Token-Optimized)

## ⛔ GATES (8)
| G | Check | Fix |
|---|-------|-----|
| 0 | No knowledge check | Query project_knowledge.json FIRST |
| 1 | No ◆ | Create TODO, mark ◆ |
| 2 | No skill for edit OR command | Load skill FIRST |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Syntax/test check |
| 6 | Multi ◆ | One ◆ only |
| 7 | No parallel | Use parallel pairs |

## ⚡ G0: Knowledge First
**BEFORE reading/searching files:**
1. `hot_cache` → entity info, exports, paths
2. `gotchas` → known issues + solutions  
3. `domain_index` → file locations by domain
4. Read file ONLY if cache miss

## START (⛔ G3 Mandatory)
1. **Query `project_knowledge.json`** (hot_cache → gotchas → domain_index)
2. **Read `skills/INDEX.md`** → pre-load: frontend-react ⭐ + backend-api ⭐
3. **Use `manage_todo_list` tool** → Create TODO (NOT text TODOs)
4. **Announce:** "AKIS v7.1 [complexity]. Skills: [skill1, skill2]. [N] tasks. Ready."

**TODO Format:** `○ Task description [skill-name]` or `○ Task description` (no skill needed)

⚠️ **G3 Enforcement:** MUST read skills/INDEX.md, MUST use manage_todo_list tool, MUST announce skills

**Knowledge reduces file reads by 85%** - Always check cache first!

## WORK
**◆ → Skill → Edit/Command → Verify → ✓**

| Trigger | Skill | Applies To |
|---------|-------|------------|
| .tsx .jsx components/ | frontend-react ⭐ | edits |
| .py backend/ api/ | backend-api ⭐ | edits |
| docker compose build restart | docker | commands |
| Dockerfile docker-compose.yml | docker | edits |
| .github/workflows/* | ci-cd | edits |
| .md docs/ | documentation | edits |
| error traceback | debugging | analysis |
| test_* pytest jest | testing | edits + commands |
| .github/skills/* agents/* | akis-development | edits |
| new feature, design | planning | analysis |

⭐ Pre-load fullstack

⚠️ **G2 Enforcement:** Load skill BEFORE edits AND domain commands (docker, npm, pytest, etc.)

## Workflow Phases
| Phase | Action | Skill |
|-------|--------|-------|
| PLAN | Analyze, design | planning |
| BUILD | Implement | frontend/backend |
| VERIFY | Test, check | testing/debugging |
| DOCUMENT | Update docs | documentation |

## END
1. Close ⊘ orphans
2. Verify all edits
3. **Create workflow log FIRST** (YAML front matter format)
4. Run: `knowledge.py --update`, `skills.py --suggest`, `docs.py --suggest`, `agents.py --suggest`, `instructions.py --suggest`
5. Present END Summary Table (metrics + script results)
6. **Present Script Suggestions Table** (REQUIRED - show ALL actual suggestions)
7. ASK before applying script suggestions
8. ASK before `git push`

**Script Suggestions Table (show actual output):**
| Script | Suggestion | Priority | Action |
|--------|------------|----------|--------|
| skills.py | Create skill: authentication | Medium | Apply/Skip |
| docs.py | Update API_rest_v1.md | High | Apply/Skip |
| agents.py | Enable doc pre-loading | Low | Apply/Skip |
| instructions.py | Add security_review | High | Apply/Skip |

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## TODO Skill Annotation
```
○ Create FlowConfigService [backend-api]
○ Add DynamicDropdown component [frontend-react]
○ Update docker-compose [docker]
○ Write unit tests [testing]
○ Simple task (no skill needed)
```
When creating TODOs, annotate each with `[skill-name]` if skill applies.

## Delegation
| Complexity | Strategy |
|------------|----------|
| Simple (<3) | Direct or delegate |
| Medium (3-5) | Smart delegate |
| Complex (6+) | Delegate |

| Agent | Triggers |
|-------|----------|
| architect | design, blueprint |
| code | implement, create |
| debugger | error, bug |
| reviewer | review, audit |
| documentation | docs, readme |
| research | research, compare |
| devops | deploy, docker |

## Parallel (G7)
| Pair 1 | Pair 2 |
|--------|--------|
| code | documentation |
| code | reviewer |
| research | code |
| architect | research |

**Sequential:** architect→code→debugger→reviewer

## Recovery
`git status` → Find ◆/⊘ → Continue

## ⚡ Optimizations

| Optimization | Method |
|--------------|--------|
| Batch reads | Read 50+ lines, parallel reads |
| Batch edits | Use multi_replace for multiple changes |
| Pre-load docs | Read INDEX.md for structure awareness |
| Test-aware | Check tests exist before debugging |
| Knowledge first | G0: Cache before file reads |
