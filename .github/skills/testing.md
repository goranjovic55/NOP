# Testing Patterns

Unit, integration, and E2E test patterns.

## When to Use
- After implementing features
- Fixing bugs (regression tests)
- Refactoring code
- Before merging PRs

## Checklist
- [ ] Unit tests for logic (80%+ coverage)
- [ ] Integration tests for APIs
- [ ] E2E for critical user flows
- [ ] Regression test for bug fixes

## Examples

### Python Unit Test
```python
import pytest

def test_calculate_stats():
    data = [{"value": 100}, {"value": 200}, {"value": 150}]
    result = calculate_stats(data)
    
    assert result["total"] == 3
    assert result["sum"] == 450
```

### Python Integration Test
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_item():
    payload = {"name": "Test Item", "value": 100}
    response = client.post("/api/items", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Item"
    assert "id" in data
```

### Pytest Fixtures
```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine) as session:
        yield session
    
    await engine.dispose()

@pytest.fixture
def sample_item():
    return {"name": "Test", "value": 100}
```

### TypeScript/Jest Test
```typescript
describe('ItemService', () => {
  it('should create an item', async () => {
    const data = { name: 'Test', value: 100 };
    const result = await service.create(data);
    
    expect(result.name).toBe('Test');
    expect(result.id).toBeDefined();
  });
});
```

### E2E Test (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('create item workflow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  await page.fill('[data-testid="name-input"]', 'New Item');
  await page.click('[data-testid="submit-btn"]');
  
  await expect(page.locator('[data-testid="item-list"]')).toContainText('New Item');
});
```

## Avoid
- ❌ Testing implementation details → ✅ Test user behavior
- ❌ No test isolation → ✅ Independent tests
- ❌ Skipping edge cases → ✅ Test error paths

## Related Skills
- `backend-api.md` - API endpoint patterns
- `debugging.md` - Test failure debugging
- `frontend-react.md` - Component testing
