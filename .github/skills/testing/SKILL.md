---
name: testing
description: Load when editing test_*, *.test.*, *_test.py files or working with pytest, jest testing frameworks
triggers: ["test_", ".test.", "_test.py", "pytest", "jest", "tests/"]
---

# Testing Patterns

## When to Use
Load this skill when: writing tests, running pytest/jest, editing test files.

Testing strategies for Python and TypeScript/React projects.

## Critical Rules

- **Test behavior, not implementation:** Focus on what, not how
- **Isolate tests:** Each test independent, no shared state
- **Fast first:** Unit tests fast, integration tests separate
- **Meaningful names:** Test name describes expected behavior

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Testing implementation | Testing behavior |
| Shared state between tests | Fresh setup each test |
| Mocking everything | Mock only boundaries |
| Brittle selectors | Data-testid attributes |

## Python Testing (pytest)

### Basic Test Structure
```python
import pytest
from app.services import ItemService

class TestItemService:
    @pytest.fixture
    def service(self, db_session):
        return ItemService(db_session)
    
    async def test_create_item_returns_item_with_id(self, service):
        # Arrange
        data = ItemCreate(name="Test")
        
        # Act
        result = await service.create(data)
        
        # Assert
        assert result.id is not None
        assert result.name == "Test"
    
    async def test_get_nonexistent_returns_none(self, service):
        result = await service.get_by_id(99999)
        assert result is None
```

### Fixtures
```python
@pytest.fixture
async def db_session():
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
def sample_item(db_session):
    item = Item(name="Test Item")
    db_session.add(item)
    db_session.commit()
    return item

@pytest.fixture
def api_client(app):
    return TestClient(app)
```

### Parameterized Tests
```python
@pytest.mark.parametrize("input,expected", [
    ("v1.2.3", "1.2.3"),
    ("1.2.3", "1.2.3"),
    ("v0.0.1", "0.0.1"),
])
def test_normalize_version(input, expected):
    assert normalize_version(input) == expected
```

### API Testing
```python
async def test_create_item_endpoint(api_client, auth_headers):
    response = api_client.post(
        "/api/items",
        json={"name": "Test"},
        headers=auth_headers,
    )
    
    assert response.status_code == 201
    assert response.json()["name"] == "Test"
    assert "id" in response.json()
```

## TypeScript/React Testing

### Component Testing (React Testing Library)
```tsx
import { render, screen, fireEvent } from '@testing-library/react';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('displays loading state', () => {
    render(<Button loading>Submit</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});
```

### Hook Testing
```tsx
import { renderHook, act } from '@testing-library/react';

describe('useCounter', () => {
  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

### API Mocking
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/items', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Item' }]));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Organization

```
tests/
├── unit/              # Fast, isolated tests
│   ├── services/
│   └── utils/
├── integration/       # Tests with real dependencies
│   ├── api/
│   └── db/
├── e2e/               # Full system tests
├── fixtures/          # Shared test data
└── conftest.py        # pytest configuration
```

## Commands

```bash
# Python
pytest                          # All tests
pytest tests/unit               # Unit tests only
pytest -k "test_create"         # Match pattern
pytest --cov=app                # With coverage

# JavaScript/TypeScript
npm test                        # All tests
npm test -- --watch             # Watch mode
npm test -- --coverage          # With coverage
npm run test:e2e                # E2E tests
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Flaky tests | Remove shared state, fix async handling |
| Slow tests | More unit, fewer integration |
| Hard to test | Refactor for dependency injection |
| Mocking too much | Only mock external boundaries |
