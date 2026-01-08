---
name: testing
description: test_*, *_test.py - pytest, React Testing Library
---
# Testing

## ⚠️ Critical
- Test behavior, not implementation
- Isolate tests (no shared state)
- Mock only external boundaries

## Python
```python
@pytest.fixture
async def db_session():
    async with async_session() as s: yield s; await s.rollback()

async def test_create_item(service):
    result = await service.create(ItemCreate(name="Test"))
    assert result.id and result.name == "Test"
```

## React
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
it('calls onClick', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  fireEvent.click(screen.getByText('Click'));
  expect(handleClick).toHaveBeenCalled();
});
```

## Commands
```bash
pytest tests/unit           # Python
npm test -- --coverage      # JS/TS
```
