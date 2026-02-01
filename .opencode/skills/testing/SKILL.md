---
name: testing
description: pytest, Jest, and testing patterns. Load when working with test files (test_*, *.test.ts) or writing tests.
---

# Testing

## Test File Patterns

| Framework | Pattern |
|-----------|---------|
| pytest | `test_*.py`, `*_test.py` |
| Jest | `*.test.ts`, `*.test.tsx`, `*.spec.ts` |

## Commands

| Task | Command |
|------|---------|
| Run Python tests | `cd backend && pytest -v` |
| Run specific test | `pytest test_file.py::test_function -v` |
| Run with coverage | `pytest --cov=app --cov-report=html` |
| Run Jest tests | `cd frontend && npm test` |
| Run Jest coverage | `npm test -- --coverage` |
| Watch mode | `npm test -- --watch` |

## pytest Patterns

```python
# Pattern 1: Async test with fixture
@pytest.fixture
async def db_session():
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.mark.asyncio
async def test_create_item(db_session):
    item = await create_item(db_session, {"name": "test"})
    assert item.name == "test"

# Pattern 2: Parametrized tests
@pytest.mark.parametrize("input,expected", [
    ("valid", True),
    ("invalid", False),
])
def test_validation(input, expected):
    assert validate(input) == expected

# Pattern 3: Mock external service
@pytest.fixture
def mock_api(mocker):
    return mocker.patch("app.services.api.call", return_value={"success": True})

async def test_with_mock(mock_api, db_session):
    result = await service_that_calls_api(db_session)
    mock_api.assert_called_once()
```

## Jest Patterns

```typescript
// Pattern 1: Component test with testing-library
import { render, screen, fireEvent } from '@testing-library/react';

test('button click updates state', async () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByText('Updated')).toBeInTheDocument();
});

// Pattern 2: Mock hook
jest.mock('../hooks/useStore', () => ({
  useStore: () => ({
    items: [{ id: 1, name: 'Test' }],
    addItem: jest.fn(),
  }),
}));

// Pattern 3: Async operation test
test('fetches data on mount', async () => {
  render(<DataComponent />);
  expect(await screen.findByText('Loaded')).toBeInTheDocument();
});
```

## Rules

| Rule | Requirement |
|------|-------------|
| Coverage | Aim for 80%+ coverage |
| Isolation | Tests should be independent |
| Naming | Test names describe behavior |
| Fixtures | Use fixtures for common setup |
| Mocking | Mock external dependencies |

## Gotchas

| Category | Pattern | Solution |
|----------|---------|----------|
| Async | Test exits before completion | Use `await` or `waitFor` |
| State | Tests affect each other | Reset state in beforeEach |
| Mocks | Mock not cleared | Use `jest.clearAllMocks()` |
| Fixtures | Scope issues | Use appropriate fixture scope |
