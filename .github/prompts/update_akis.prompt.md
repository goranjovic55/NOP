---
description: 'AKIS optimization through branch comparison and intelligent merge'
mode: agent
---
# Update AKIS (Agents, Knowledge, Instructions, Skills)

**Process**: Compare → Analyze → Merge → Validate

---

## Phase 1: Gather Sources

**Compare branches/versions**:
```bash
# Find optimization branches
git fetch origin && git branch -a | grep -i akis

# Diff framework files
git diff main origin/<branch> -- .github/ --stat

# Show specific file changes
git show origin/<branch>:.github/copilot-instructions.md
```

**Current state**:
```bash
wc -l .github/copilot-instructions.md
wc -l .github/instructions/*.md
wc -l .github/agents/*.md
```

---

## Phase 2: Analyze Differences

| Metric | Current | Target | Check |
|--------|---------|--------|-------|
| copilot-instructions | lines | <100 | Terse but complete |
| Instructions files | lines | <50 each | Essential only |
| Agent files | lines | <50 each | Role + format |
| Skills | lines | <100 each | Pattern + checklist |

**Key optimizations to look for**:
- Load-on-demand philosophy ("When to Load" columns)
- Blocking enforcement (fewer required emissions)
- Skill trigger mapping (keyword → skill)
- Emoji section markers (🔷) for scannability
- Tighter file limits

---

## Phase 3: Intelligent Merge

**Merge rules**:
1. **Keep from terse version**: Structure, brevity, trigger tables
2. **Keep from complete version**: Critical details, examples, edge cases
3. **Remove**: Redundancy, verbose examples, optional emissions

**Required format after merge**:
```
[SESSION: task] @AgentName
[AKIS] entities=N | skills=X,Y | patterns=Z
[PHASE: NAME | progress=N/7]
<work>
[COMPLETE] result | files: changed
```

**Blocking (HALT if missing)**: `[SESSION:]`, `[AKIS]`, `[COMPLETE]`

---

## Phase 4: Validate

**Line counts**:
```bash
wc -l .github/copilot-instructions.md  # <100
wc -l .github/instructions/*.md         # <50 each
wc -l .github/agents/*.md               # <50 each
```

**Completeness check**:
- [ ] 4 pillars documented (Agents, Knowledge, Instructions, Skills)
- [ ] 7-phase flow present
- [ ] Delegation format present
- [ ] Interrupt handling present
- [ ] File limits defined
- [ ] Portability instructions present

**Commit**:
```bash
git add .github/
git commit -m "Optimize AKIS framework - intelligent merge"
git push origin main
```

---

## Outputs

| File | Max Lines | Content |
|------|-----------|---------|
| `copilot-instructions.md` | 100 | Entry point, 4 pillars, response format |
| `instructions/*.md` | 50 each | phases, protocols, templates, structure |
| `agents/*.md` | 50 each | Role, delegation, format |
| `skills/*/SKILL.md` | 100 | When, pattern, checklist |

---

## Success Criteria

After merge, verify:
- Total framework <500 lines (down from 1000+)
- All blocking emissions documented
- Load-on-demand philosophy clear
- Skill triggers mapped
- Framework portable (no hardcoded tech)
