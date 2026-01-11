---
name: knowledge
description: Load when working with project_knowledge.json, context files, or managing knowledge cache. Provides patterns for efficient project context management with 90% token reduction.
---

# Knowledge v3.1

## ⛔ MANDATORY: Knowledge First
**BEFORE any file read/search, ALWAYS query project_knowledge.json:**
1. Check `hot_cache` (line 1) for entity/file info
2. Check `gotchas` (line 4) for known issues/solutions
3. Check `domain_index` (line 2) for file locations
4. ONLY read files if knowledge cache misses

## ⚠️ Critical Gotchas
- **JSON Lines format:** Each line is separate JSON, not one object
- **Hot cache first:** MUST check before ANY file read
- **Gotchas populated:** Debug issues go to gotchas, not entities
- **Cache hit = skip file read:** If found in knowledge, don't read source

## Schema
```
Line 1: HOT_CACHE (top 20 entities + answers)
Line 2: DOMAIN_INDEX (per-domain lookup)
Line 3: CHANGE_TRACKING (file hashes)
Line 4: GOTCHAS (issues + solutions)
Lines 5+: ENTITIES
```

## Rules
- **Read hot_cache first** (line 1)
- **Use domain_index** for O(1) lookup
- **Auto-generate preferred** via scripts

## Query Order (MANDATORY)
```
1. hot_cache  → Entity names, exports, paths (31% hit)
2. gotchas    → Known bugs, solutions (11% hit)  
3. domain_index → Files by domain (22% hit)
4. file read  → ONLY if above miss (15% cases)
```

## Quick Access
```bash
# Hot cache (usually sufficient)
head -1 project_knowledge.json | jq '.'

# Domain lookup
sed -n '2p' project_knowledge.json | jq '.backend'

# Gotchas (debug patterns)
sed -n '4p' project_knowledge.json | jq '.items'

# Regenerate
python .github/scripts/knowledge.py
```

## When to Read Files
| Situation | Action |
|-----------|--------|
| Entity in hot_cache | USE cached info, skip file read |
| Path in domain_index | Check hot_cache first |
| Error/bug | Check gotchas FIRST |
| Not in knowledge | Then read file |
| Need full implementation | Read file after cache check |
