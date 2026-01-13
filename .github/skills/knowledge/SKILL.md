---
name: knowledge
description: Load when working with project_knowledge.json, context files, or managing knowledge cache. Provides patterns for efficient project context management with 90% token reduction.
---

# Knowledge v4.0 (Graph-Based)

## ⛔ MANDATORY: Knowledge Graph Query Order
**BEFORE any file read/search, query project_knowledge.json layers:**

```
KNOWLEDGE_GRAPH (root)
    ├── HOT_CACHE → Top 20 entities for instant lookup
    ├── DOMAIN_INDEX → O(1) file location by domain
    ├── GOTCHAS → Known issues + solutions (75% debug acceleration)
    ├── INTERCONNECTIONS → Service→Model→Endpoint chains
    └── SESSION_PATTERNS → Predictive entity preloading
```

## File Structure (Read First 100 Lines)
```
Lines 1-6:    Headers (hot_cache, domain_index, gotchas data)
Lines 7-12:   Layer entities (KNOWLEDGE_GRAPH, HOT_CACHE, DOMAIN_INDEX...)
Lines 13-93:  Layer relations (caches, indexes, has_gotcha, preloads)
Lines 94+:    Code entities (sorted by weight, highest first)
Lines 300+:   Code relations (imports, calls, extends)
```

**Agent reading first 100 lines gets:**
- All 6 layer entities + 80+ layer relations
- Can navigate to ANY entity via layer connections

## ⚠️ Critical Gotchas
- **JSONL format:** Each line is separate JSON object
- **Layers first:** Read lines 1-100 BEFORE any file read
- **Graph traversal:** Use relations to find connected entities
- **Weight = priority:** Higher weight entities accessed first
- **Cache hit = skip read:** If found in graph, don't read source

## Query Order (MANDATORY)
```
1. HOT_CACHE relations    → Entity names, paths (caches → entity)
2. GOTCHAS relations      → Known bugs, solutions (has_gotcha → entity)
3. DOMAIN_INDEX relations → Files by domain (indexes_backend/frontend)
4. Code relations         → imports, calls, extends between entities
5. File read              → ONLY if above miss (<15% of queries)
```

## Layer Relations

| Layer | Relation Type | Purpose |
|-------|---------------|---------|
| HOT_CACHE | `caches` | Top 20 frequently accessed |
| DOMAIN_INDEX | `indexes_backend`, `indexes_frontend` | File lookup |
| GOTCHAS | `has_gotcha` | Historical issues + solutions |
| SESSION_PATTERNS | `preloads_*` | Predictive preloading |
| INTERCONNECTIONS | `contains_orphan` | Orphan entity fallback |

## Quick Access
```bash
# Layer structure (first 100 lines - usually sufficient)
head -100 project_knowledge.json

# Hot cache entities
head -1 project_knowledge.json | jq '.top_entities'

# Domain lookup (backend)
sed -n '2p' project_knowledge.json | jq '.backend_entities'

# Gotchas (debug patterns)
sed -n '4p' project_knowledge.json | jq '.issues | keys'

# Find entity relations
grep '"to": "websocket"' project_knowledge.json

# Regenerate full graph
python .github/scripts/knowledge.py --generate
```

## Graph Traversal Patterns

### Find Entity Context
```
1. Search HOT_CACHE caches relations
2. If found → Get entity observations
3. Follow imports relations → Dependencies
4. Check GOTCHAS has_gotcha → Known issues
```

### Debug Acceleration (75% faster)
```
1. GOTCHAS has_gotcha → entity
2. Read gotcha solution from line 4 header
3. Apply known fix without investigating
```

## When to Read Files
| Situation | Action |
|-----------|--------|
| Entity in HOT_CACHE | USE cached path, skip file read |
| Entity in DOMAIN_INDEX | Check hot_cache first |
| Error/bug | Check GOTCHAS has_gotcha FIRST |
| Entity weight > 30 | Likely cached, check first |
| Not in any layer | Read file, consider adding |

## Entity Weights (Sorted High→Low)
- `weight > 50` → Core (database, security, websocket)
- `weight 30-50` → Frequent (services, endpoints)
- `weight 10-30` → Regular entities
- `weight < 10` → Rarely accessed

## Stats (v4.0 - 100k simulation)
- Entities: ~220, Relations: ~570
- Cache hit rate: 71.3%
- File read reduction: -76.8%
