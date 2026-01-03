# Performance Patterns

Performance optimization patterns for frontend rendering and backend queries.

## When to Use

- Large list rendering (100+ items)
- Complex database queries
- Heavy computation in request handlers
- Slow page loads or interactions
- Memory usage concerns

## Checklist

- [ ] Virtualization for long lists
- [ ] useMemo/useCallback for expensive computations
- [ ] Database query optimization (indexes, eager loading)
- [ ] Pagination for large datasets
- [ ] Lazy loading for non-critical components
- [ ] Debouncing for frequent events
- [ ] Caching for repeated queries

## Examples

### React Virtualization for Long Lists
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
}

function VirtualList<T>({ items, renderItem, itemHeight }: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Render 5 extra items for smooth scrolling
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Memoization for Expensive Computations
```tsx
import { useMemo, useCallback } from 'react';

function Dashboard({ assets, filters }: DashboardProps) {
  // ✅ Memoize expensive filtering/sorting
  const filteredAssets = useMemo(() => {
    return assets
      .filter(a => filters.status === 'all' || a.status === filters.status)
      .filter(a => filters.search === '' || a.name.includes(filters.search))
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }, [assets, filters]);

  // ✅ Memoize callback to prevent child re-renders
  const handleAssetClick = useCallback((id: string) => {
    setSelectedAsset(id);
  }, []);

  // ✅ Memoize aggregations
  const stats = useMemo(() => ({
    total: filteredAssets.length,
    online: filteredAssets.filter(a => a.status === 'online').length,
    critical: filteredAssets.filter(a => a.severity === 'critical').length,
  }), [filteredAssets]);

  return (
    <div>
      <StatsPanel stats={stats} />
      <AssetList assets={filteredAssets} onAssetClick={handleAssetClick} />
    </div>
  );
}
```

### Database Query Optimization
```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload

# ❌ N+1 Query Problem
async def get_assets_bad(db: AsyncSession):
    result = await db.execute(select(Asset))
    assets = result.scalars().all()
    # Each access to asset.vulnerabilities triggers a query
    return [{"name": a.name, "vulns": len(a.vulnerabilities)} for a in assets]

# ✅ Eager Loading - One Query
async def get_assets_good(db: AsyncSession):
    result = await db.execute(
        select(Asset)
        .options(selectinload(Asset.vulnerabilities))
    )
    assets = result.scalars().all()
    return [{"name": a.name, "vulns": len(a.vulnerabilities)} for a in assets]

# ✅ Join Loading for Single Object
async def get_asset_with_details(asset_id: int, db: AsyncSession):
    result = await db.execute(
        select(Asset)
        .options(
            joinedload(Asset.owner),
            selectinload(Asset.vulnerabilities)
        )
        .where(Asset.id == asset_id)
    )
    return result.scalar_one_or_none()
```

### Pagination Pattern
```python
from fastapi import Query
from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/assets", response_model=PaginatedResponse[AssetResponse])
async def list_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    # Count total
    count_result = await db.execute(select(func.count(Asset.id)))
    total = count_result.scalar_one()
    
    # Fetch page
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Asset)
        .order_by(Asset.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )
```

### Debouncing User Input
```tsx
import { useState, useEffect, useRef } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Lazy Loading Components
```tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const PacketInspector = lazy(() => import('./PacketInspector'));
const TopologyGraph = lazy(() => import('./TopologyGraph'));

function App() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <Routes>
        <Route path="/traffic" element={<PacketInspector />} />
        <Route path="/topology" element={<TopologyGraph />} />
      </Routes>
    </Suspense>
  );
}
```

## Anti-Patterns

- ❌ Rendering 1000+ items without virtualization → ✅ Use virtual lists
- ❌ Computing in render without memoization → ✅ useMemo for heavy computations
- ❌ `SELECT *` on large tables → ✅ Select specific columns, add pagination
- ❌ API call on every keystroke → ✅ Debounce user input
- ❌ Loading all components upfront → ✅ Lazy load non-critical routes

## Related

- `frontend-react` - React component patterns
- `backend-api` - API endpoint patterns
- `database-patterns` - Query optimization

---
*Created: 2026-01-03*
*Priority: Medium*
*Estimated Impact: 65%*
