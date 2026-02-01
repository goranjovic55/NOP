---
name: knowledge
description: Project knowledge querying, architecture lookup, and gotcha checks. Load for "where is X" questions, file lookups, and architecture understanding.
---

# Knowledge

## Knowledge Graph Query

The project_knowledge.json contains:
- **HOT_CACHE**: Top 30 entities with paths (quick lookup)
- **DOMAIN_INDEX**: All backend/frontend file paths
- **GOTCHAS**: 43+ known issues with solutions
- **Layer relations**: Entity connections

## Query Priority

1. **HOT_CACHE** → Most accessed entities with paths
2. **GOTCHAS** → Known issues and solutions
3. **DOMAIN_INDEX** → All file paths by domain
4. **File read** → Only if miss in above

## Load Knowledge (START phase)

```bash
head -100 project_knowledge.json
```

This gives you:
- Lines 7-12: Layer entities
- Lines 13-93: Layer relations (caches, indexes, gotchas)

## Common Queries

| Question | Source |
|----------|--------|
| Where is auth service? | domain_index → backend/app/services/ |
| Where are React components? | domain_index → frontend/src/components/ |
| How to fix JSONB issue? | gotchas → flag_modified() |
| What entities exist? | hot_cache → top 30 entities |

## Gotcha Lookup

Before debugging, check if issue is known:

| Category | Pattern | Solution |
|----------|---------|----------|
| JSONB | Won't save nested | `flag_modified(obj, 'field')` |
| API | 307 redirect | Add trailing slash |
| Auth | 401 on valid token | Check `nop-auth` key |
| State | Stale in async | Capture before async |
| JSX | Comment error | Use `{/* */}` |
| Docker | Old code | `--build --force-recreate` |

## File Path Patterns

| Domain | Pattern | Location |
|--------|---------|----------|
| Backend API | Endpoints | backend/app/api/v1/endpoints/ |
| Backend Services | Business logic | backend/app/services/ |
| Backend Models | Database models | backend/app/models/ |
| Frontend Components | React components | frontend/src/components/ |
| Frontend Pages | Page components | frontend/src/pages/ |
| Frontend Store | Zustand stores | frontend/src/store/ |
| Frontend Hooks | Custom hooks | frontend/src/hooks/ |

## Optimizations

- **Memory-first**: G0 reduces file reads by 85%, tokens by 67.2%
- **Cache hot paths**: 71.3% cache hit rate with knowledge graph
- **Skill pre-load**: Load frontend-react + backend-api for fullstack
