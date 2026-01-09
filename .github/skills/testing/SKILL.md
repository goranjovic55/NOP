---
name: testing
description: Load when editing test_*, *.test.*, or *_test.py files, or working with pytest/jest frameworks. Provides testing patterns for Python and TypeScript projects.
---

# Testing

## ⚠️ Critical Gotchas
- **Async fixtures:** Use `@pytest.fixture` with `async def` for async tests
- **Mock boundaries:** Only mock at service boundaries, not internal logic
- **Flaky tests:** Add `pytest.mark.flaky` or fix the race condition

## Rules
- **Test behavior, not implementation**
- **Isolate tests:** No shared state
- **Fast first:** Unit fast, integration separate
- **Meaningful names:** Describe expected behavior

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Testing implementation | Testing behavior |
| Shared state | Fresh setup each |
| Mocking everything | Mock boundaries only |

## Python (pytest)

```python
class TestItemService:
    @pytest.fixture
    async def service(self, db_session):
        return ItemService(db_session)
    
    async def test_create_returns_item_with_id(self, service):
        result = await service.create(ItemCreate(name="Test"))
        assert result.id is not None

@pytest.mark.parametrize("input,expected", [
    ("v1.2.3", "1.2.3"),
    ("1.2.3", "1.2.3"),
])
def test_normalize_version(input, expected):
    assert normalize_version(input) == expected
```

## TypeScript (jest)

```tsx
it('calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  fireEvent.click(screen.getByText('Click'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```
