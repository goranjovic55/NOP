---
name: knowledge
description: Load when working with project_knowledge.json, context files, or managing knowledge cache. Provides patterns for efficient project context management with 90% token reduction.
---

# Knowledge v4.2 (Memory-First)

## ⛔ MANDATORY: Load Once at START
**Read first 100 lines of project_knowledge.json ONCE at session start. Keep in memory.**

```bash
head -100 project_knowledge.json
```

**This gives you (in memory for entire session):**
- Line 1: HOT_CACHE (top 20 entities + paths)
- Line 2: DOMAIN_INDEX (81 backend, 71 frontend file paths)
- Line 3: CHANGE_TRACKING
- Line 4: GOTCHAS (38 known issues + solutions)
- Line 5: INTERCONNECTIONS (chains)
- Line 6: SESSION_PATTERNS (preload hints)
- Lines 7-12: Layer entities
- Lines 13-93: Layer relations (caches, indexes, has_gotcha)

**After loading, you have instant access to:**
- All file paths by domain (no grep needed)
- All known bugs + solutions (no search needed)
- Top 20 frequent entities (cached)
- Import/dependency relations

## ⚠️ Anti-Pattern: Multiple Queries
```
❌ WRONG: Run --query 5 times to gather info
✓ RIGHT: Read first 100 lines ONCE, use that context
```

## Query Order (Using In-Memory Knowledge)
```
1. Check hot_cache.top_entities     → Already in memory
2. Check gotchas.issues             → Already in memory
3. Check domain_index.backend/frontend → Already in memory
4. Check layer relations            → Already in memory
5. ONLY use --query for specific deep lookups
6. ONLY read file if above all miss
```

## When to Use --query CLI
| Use --query | Don't use --query |
|-------------|-------------------|
| Deep entity lookup (imports/imported_by) | Finding file paths (use domain_index) |
| Specific gotcha search | Checking if entity exists (use hot_cache) |
| After START, for ONE specific entity | Gathering general info (use first 100 lines) |

## Quick Reference (From First 100 Lines)

### hot_cache (Line 1)
```json
"top_entities": ["database", "websocket", "security", ...]
"entity_refs": {"database": "backend/app/core/database.py", ...}
```

### domain_index (Line 2)  
```json
"backend_entities": {"websocket": "backend/app/api/websocket.py", ...}
"frontend_entities": {"App": "frontend/src/App.tsx", ...}
```

### gotchas (Line 4)
```json
"issues": {
  "401 Unauthorized": {"solution": "Check nop-auth key", ...},
  "Black screen": {"solution": "Add error boundary", ...}
}
```

## File Structure Summary
```
Lines 1-6:    Headers (ALL lookup data)
Lines 7-12:   Layer entities (KNOWLEDGE_GRAPH, HOT_CACHE, ...)
Lines 13-93:  Layer relations (caches → entity, indexes → file)
Lines 94+:    Code entities (sorted by weight)
Lines 300+:   Code relations (imports, calls)
```

## Memory Pattern
```
START:
  1. Read first 100 lines → Keep in context
  2. You now have: paths, gotchas, hot entities, relations
  
WORK:
  1. Need file path? → Check domain_index (in memory)
  2. Hit error? → Check gotchas (in memory)
  3. Need entity? → Check hot_cache (in memory)
  4. Need deep relations? → THEN use --query
  
END:
  1. Run knowledge.py --update
```

## Stats (v4.2)
- First 100 lines: ~15KB (fits in context)
- Contains: 100% of lookup data
- File reads saved: 76.8%
- Queries saved: 90%+ (vs multiple --query calls)
