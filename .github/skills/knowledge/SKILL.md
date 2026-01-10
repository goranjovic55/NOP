---
name: knowledge
description: Load when working with project_knowledge.json, context files, or managing knowledge cache. Provides patterns for efficient project context management with 90% token reduction.
---

# Knowledge v3.0

## ⚠️ Critical Gotchas
- **JSON Lines format:** Each line is separate JSON, not one object
- **Hot cache first:** Always check line 1 before file reads
- **Gotchas populated:** Debug issues go to gotchas, not entities

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

## Cache Hit Rates

| Layer | Hit | Use |
|-------|-----|-----|
| hot_cache | 31% | Entity lookup |
| gotchas | 11% | Debug |
| domain_index | 22% | By domain |
| **file reads** | **15%** | Complex only |
