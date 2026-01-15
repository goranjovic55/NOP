# AKIS v7.4 (Memory-First Knowledge)

> Token reduction: -67.2% | File reads: -76.8% | Knowledge in memory: 100%

## ⛔ GATES (8)
| G | Check | Fix |
|---|-------|-----|
| 0 | Knowledge not in memory | Read first 100 lines ONCE at START |
| 1 | No ◆ | Create TODO, mark ◆ |
| 2 | No skill for edit/command | Load skill FIRST |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Syntax/test check |
| 6 | Multi ◆ | One ◆ only |
| 7 | No parallel | Use parallel pairs |

## ⚡ G0: Knowledge in Memory (CRITICAL)
**Read first 100 lines of project_knowledge.json ONCE at START. Keep in memory.**

```bash
head -100 project_knowledge.json  # Do this ONCE
```

**After loading, you have IN MEMORY:**
- Line 1: HOT_CACHE → top 30 entities + paths
- Line 2: DOMAIN_INDEX → 82 backend, 74 frontend file paths
- Line 4: GOTCHAS → 30 known issues + solutions
- Lines 7-12: Layer entities
- Lines 13-93: Layer relations

**Documentation Index (Diátaxis Framework):**

| Need | Location | Template |
|------|----------|----------|
| How-to guide | `docs/guides/` | `.github/templates/doc_guide.md` |
| Feature explanation | `docs/features/` | `.github/templates/doc_explanation.md` |
| API/config reference | `docs/technical/` | `.github/templates/doc_reference.md` |
| Architecture concepts | `docs/architecture/` | `.github/templates/doc_explanation.md` |
| Analysis/reports | `docs/analysis/` | `.github/templates/doc_analysis.md` |
| Standards | `docs/contributing/DOCUMENTATION_STANDARDS.md` | - |
| Doc navigation | `docs/INDEX.md` | - |

**Context Budget:** 3,000 tokens max per skill (reduced for efficiency)

**Anti-Pattern:**
```
❌ WRONG: Run --query 5 times to gather info
❌ WRONG: grep/search knowledge repeatedly
✓ RIGHT: Read first 100 lines ONCE, use that context
```

## START (⛔ G3 Mandatory)

### LOAD Phase (G0+G1+G2 Consolidated)
1. **Read first 100 lines of `project_knowledge.json`** → KEEP IN MEMORY
2. **Now you have:** hot_cache, domain_index (82 backend, 74 frontend), 30 gotchas, relations
3. **Read `skills/INDEX.md`** → identify skills, pre-load: frontend-react ⭐ + backend-api ⭐
4. **Use `manage_todo_list` tool** → Create TODO (NOT text TODOs)

### ANNOUNCE Phase (⛔ REQUIRED - Do NOT skip)
5. **Announce (MANDATORY):**
   ```
   AKIS v7.4 [simple|medium|complex]. 
   Skills: [loaded-list]. 
   Knowledge: [N] cache hits, [N] gotchas checked. 
   Tasks: [N]. Ready.
   ```
   ⚠️ **Do NOT proceed to WORK without this announcement**

**TODO Format:** `○ Task description [skill-name]`

⚠️ **G3 Enforcement:** LOAD + ANNOUNCE must complete before any file operations

## WORK (Using In-Memory Knowledge)
**Before reading ANY file, check your loaded knowledge:**

| Need | Check (in memory) | Only if miss |
|------|-------------------|--------------|
| File path | domain_index.backend/frontend_entities | list_dir |
| Entity info | hot_cache.entity_refs | read_file |
| Known bug | gotchas.issues | debugging |
| Deep relations | (use --query) | grep |

**◆ → Skill → Edit/Command → Verify → ✓**

| Trigger | Skill | Applies To |
|---------|-------|------------|
| .tsx .jsx components/ | frontend-react ⭐ | edits |
| .py backend/ api/ | backend-api ⭐ | edits |
| docker compose build | docker | commands |
| Dockerfile docker-compose.yml | docker | edits |
| .github/workflows/* | ci-cd | edits |
| .md docs/ | documentation | edits |
| error traceback | debugging | analysis |
| test_* pytest jest | testing | edits + commands |
| .github/skills/* agents/* | akis-dev | edits |
| new feature, design | planning | analysis |

⭐ Pre-load fullstack

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
4. Run scripts, present results table
5. ASK before applying suggestions
6. ASK before `git push`

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## ⛔ Delegation (MANDATORY for 6+ tasks)
| Complexity | Strategy | Action |
|------------|----------|--------|
| Simple (<3) | Direct | Handle yourself |
| Medium (3-5) | Consider | Suggest delegation |
| Complex (6+) | **MANDATORY** | **MUST use runSubagent** |

### runSubagent Usage (⛔ REQUIRED)
**When tasks ≥ 6, you MUST invoke `runSubagent` tool:**
```
runSubagent(
  agentName: "code",
  prompt: "Implement [specific task]. Context: [files]. Return: [expected output]",
  description: "[3-5 word summary]"
)
```

| Agent | Triggers | Use For |
|-------|----------|--------|
| architect | design, blueprint | Planning complex features |
| code | implement, create | Multi-file implementations |
| debugger | error, bug | Complex debugging |
| reviewer | review, audit | Code review, security |
| documentation | docs, readme | Doc updates alongside code |
| research | research, compare | Standards, best practices |
| devops | deploy, docker | Infrastructure changes |

### Delegation Chains
| Task Type | Chain |
|-----------|-------|
| Feature | architect → code → reviewer |
| Bug fix | debugger → code |
| Docs | documentation (parallel with code) |
| Infra | architect → devops → code |

## ⛔ Parallel (G7 - 60% Target)
**Goal: 60%+ of complex sessions MUST use parallel delegation**

| Pair | Use Case | Independence |
|------|----------|-------------|
| code + docs | Fullstack | ✓ Fully parallel |
| code + reviewer | Refactor | Sequential |
| research + code | New feature | Research first |
| architect + research | Design | Parallel research |

**Invoke parallel:**
```
runSubagent(agentName: "documentation", ...) // Start docs
runSubagent(agentName: "code", ...)          // Start code (parallel)
```

## Recovery
`git status` → Find ◆/⊘ → Continue

## ⚡ Memory-First Optimizations

| Before | After (v7.4) |
|--------|--------------|
| Query 5 times | Read once, use memory |
| grep knowledge.json | Check loaded gotchas |
| list_dir for paths | Check domain_index |
| Search for entity | Check hot_cache |
