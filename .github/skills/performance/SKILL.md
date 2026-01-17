---
name: performance
description: Load when optimizing, profiling, caching, or addressing performance degradation. Provides patterns for efficient code execution.
---

# Performance

> Optimize speed, memory, and resource usage

## When This Applies
- Slow page loads, API response times
- Memory leaks, high CPU usage
- Database query optimization
- Caching implementation
- Bundle size reduction

## Optimization Checklist

| Layer | Check |
|-------|-------|
| Frontend | Lazy loading, code splitting, memo, debounce |
| Backend | Query optimization, indexing, connection pooling |
| Network | Compression, CDN, HTTP/2, caching headers |
| Database | Indexes, avoid N+1, batch queries |

## Common Patterns

| Issue | Solution |
|-------|----------|
| Slow React re-renders | useMemo, useCallback, React.memo |
| Large bundle size | Code splitting, tree shaking, lazy imports |
| N+1 queries | Use joinedload/selectinload (SQLAlchemy) |
| Slow API response | Add caching layer (Redis), pagination |
| Memory leak | Cleanup subscriptions, timers in useEffect |

## Frontend (React)

```typescript
// Memoization
const expensiveValue = useMemo(() => {
  return computeExpensive(data);
}, [data]);

// Callback memoization
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Lazy loading
const Component = lazy(() => import('./Component'));

// Debounce
const debouncedSearch = useMemo(
  () => debounce((value) => search(value), 300),
  []
);
```

## Backend (FastAPI/SQLAlchemy)

```python
# Query optimization - avoid N+1
users = db.query(User).options(
    joinedload(User.posts)
).all()

# Pagination
@router.get("/items")
async def get_items(skip: int = 0, limit: int = 100):
    return db.query(Item).offset(skip).limit(limit).all()

# Caching with Redis
@cache(ttl=300)
async def get_dashboard_data():
    return expensive_computation()

# Connection pooling
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)
```

## Profiling Tools

| Tool | Usage |
|------|-------|
| React DevTools Profiler | Identify slow components |
| Chrome DevTools Performance | Network, runtime profiling |
| Python cProfile | Backend profiling |
| py-spy | Production Python profiling |
| pgAdmin EXPLAIN | PostgreSQL query plans |

## Gotchas

| Issue | Solution |
|-------|----------|
| Infinite re-renders | Check useEffect dependencies |
| Large payload | Add pagination, limit fields |
| Stale cache | Implement cache invalidation strategy |
| Blocking operations | Use async/await, background tasks |
| Missing indexes | Add indexes on foreign keys, WHERE clauses |

## Metrics to Track
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- API p50/p95/p99 response times
- Database query duration
- Memory usage over time
- Bundle size (target <500KB initial)

## Testing
- Load testing with k6/locust
- Memory profiling over time
- Query execution plans
- Bundle analysis
