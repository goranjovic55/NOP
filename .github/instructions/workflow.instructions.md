---
applyTo: "**"
---

# Workflow v7.4 (Memory-First)

## Phases
| Phase | Actions |
|-------|---------|
| START | **Load Knowledge (100 lines)** → **Read skills/INDEX.md** → **manage_todo_list** → **Announce** |
| WORK | Use in-memory knowledge → ◆ → Skill → Edit → Verify → ✓ |
| END | Close ⊘ → **Create Log** → Scripts → Commit |

## ⛔ START Requirements (G3)
1. **Read first 100 lines of `project_knowledge.json`** → KEEP IN MEMORY
2. **Now you have:** hot_cache, domain_index, gotchas, relations (NO more queries needed)
3. **Read `skills/INDEX.md`** → identify skills to load
4. **Use `manage_todo_list` tool** → NOT text TODOs
5. **Announce:** "AKIS v7.4 [complexity]. Skills: [list]. Knowledge loaded. [N] tasks. Ready."

## ⛔ G0: Knowledge in Memory
```
First 100 lines give you:
├── Line 1: HOT_CACHE → top 20 entities + paths
├── Line 2: DOMAIN_INDEX → 81 backend, 71 frontend paths
├── Line 4: GOTCHAS → 38 known issues + solutions
├── Lines 7-12: Layer entities
└── Lines 13-93: Layer relations (caches, indexes, has_gotcha)
```

**Use in-memory knowledge:**
- Need file path? → Check domain_index (in memory)
- Hit error? → Check gotchas (in memory)
- Need entity? → Check hot_cache (in memory)
- Need deep relations? → THEN use --query (rare)

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## TODO Rules
1. Create before multi-step work
2. **Annotate with skill:** `○ Task [skill-name]` when skill applies
3. Mark ◆ BEFORE edit, ✓ AFTER verify
4. Only ONE ◆ active

## Complex Session Handling (6+ tasks)

| Complexity | Strategy |
|------------|----------|
| Simple (<3) | Handle directly |
| Medium (3-5) | Consider delegation |
| Complex (6+) | **Delegate + phase grouping** |

**Phase Grouping:**
```
## Phase 1: [domain] [skill]
○ Task 1.1
○ Task 1.2

## Phase 2: [domain] [skill]
○ Task 2.1
```

**Parallel Execution (G7):** For complex sessions, use pairs:
- code + documentation (independent)
- code + reviewer (sequential)
- research + code (research first)

## Verification
After EVERY edit:
1. Syntax check
2. Import validation
3. Test if applicable
4. Mark ✓

## ⛔ END Phase (Strict Order)

**Step 1: User Confirmation**
- Say: "Ready for END phase. Confirm?"
- Wait for user confirmation

**Step 2: Create Workflow Log (BEFORE scripts)**
- Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`
- Use YAML front matter format (see below)
- Include: skills loaded, files modified, gotchas, root_causes

**Step 3: Run END Scripts**
```bash
python .github/scripts/knowledge.py --update
python .github/scripts/skills.py --suggest
python .github/scripts/docs.py --suggest
python .github/scripts/agents.py --suggest
python .github/scripts/instructions.py --suggest
```

**Step 4: Present Summary Table**
| Metric | Value |
|--------|-------|
| Tasks | X/Y completed |
| Files | X modified |
| Knowledge | X entities merged |

**Script Results Table (REQUIRED):**
| Script | Output |
|--------|--------|
| knowledge.py | X entities merged |
| skills.py | X suggestions |
| docs.py | X suggestions |
| agents.py | X suggestions |
| instructions.py | X suggestions |

**Step 5: Present Script Suggestions Table (REQUIRED)**
Collect ALL suggestions from script output and present in table:

| Script | Suggestion | Priority | Action |
|--------|------------|----------|--------|
| skills.py | Create new skill: authentication | Medium | Apply/Skip |
| docs.py | Update docs/technical/API_rest_v1.md | High | Apply/Skip |
| agents.py | Enable documentation pre-loading | Low | Apply/Skip |
| instructions.py | Add security_review instruction | High | Apply/Skip |

**Rules:**
- Include EVERY suggestion from ALL scripts
- Group by script name
- Show actual suggestion text from output
- ASK user: "Apply any suggestions?" before implementing

**Step 6: Cleanup (Optional)**
- Remove temporary files: `/tmp/*.py`, `/tmp/*.json`
- Clean build artifacts if needed

**Step 7: Commit & Push**
- ⚠️ Always ASK user before `git push`. Never auto-push.

## Workflow Log Format (YAML Front Matter)

```yaml
---
session:
  id: "YYYY-MM-DD_task_name"
  date: "YYYY-MM-DD"
  complexity: medium  # simple | medium | complex
  domain: fullstack   # frontend_only | backend_only | fullstack | docker_heavy

skills:
  loaded: [skill1, skill2]
  suggested: [skill3]

files:
  modified:
    - {path: "path/to/file.tsx", type: tsx, domain: frontend}
  types: {tsx: 1, py: 1}

agents:
  delegated: []  # or [{name: agent, task: "desc", result: success}]

gotchas:
  - pattern: "Pattern that caused issue"
    warning: "What went wrong"
    solution: "How to fix"
    applies_to: [skill-name]

root_causes:
  - problem: "Description"
    solution: "How fixed"
    skill: skill-name

gates:
  passed: [G1, G2, G3, G4, G5, G6]
  violations: []
---

# Session Log: Task Name

## Summary
Brief description.

## Tasks Completed
- ✓ Task 1
- ✓ Task 2
```

## Workflow Phases
| Phase | Skill | Action |
|-------|-------|--------|
| PLAN | planning | Analyze, design, research |
| BUILD | frontend/backend | Implement |
| VERIFY | testing/debugging | Test, check |
| DOCUMENT | documentation | Update docs |

## Fullstack Sessions
When editing both frontend + backend:
1. Pre-load BOTH skills: `frontend-react` + `backend-api`
2. Group by domain in phases
3. Coordinate: API changes → Types → UI → Test
4. Check: trailing slashes, CORS, state sync
