---
name: testing
description: Load when editing test_*, *.test.*, or *_test.py files, or working with pytest/jest frameworks. Provides testing patterns for Python and TypeScript projects.
---

# Testing

## ⚠️ Critical Gotchas
- **Async fixtures:** Use `@pytest.fixture` with `async def` for async tests
- **Mock boundaries:** Only mock at service boundaries, not internal logic
- **Flaky tests:** Add `pytest.mark.flaky` or fix the race condition
- **E2E stability:** Use explicit waits, not sleep; check element visibility

## Testing Hierarchy

| Level | Target | When | Command |
|-------|--------|------|---------|
| 1. API | Backend endpoints | After API changes | `pytest backend/tests/api/` |
| 2. UI | Components, pages | After frontend changes | `npm test` |
| 3. E2E | Full flow | Final confirmation | `pytest backend/tests/e2e/` |

**Flow:** API → UI → E2E (final verification)

## Rules
- **Test behavior, not implementation**
- **Isolate tests:** No shared state
- **Fast first:** API/UI fast, E2E last
- **Meaningful names:** Describe expected behavior
- **E2E confirms:** Only run E2E after API+UI pass

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Testing implementation | Testing behavior |
| Shared state | Fresh setup each |
| Mocking everything | Mock boundaries only |
| E2E for unit logic | E2E for user flows |

## API Testing (pytest)

```python
class TestScriptAPI:
    async def test_create_script_returns_201(self, client):
        response = await client.post("/api/scripts/", json={"name": "test"})
        assert response.status_code == 201
        assert response.json()["id"] is not None

    async def test_list_scripts_returns_all(self, client, sample_scripts):
        response = await client.get("/api/scripts/")
        assert len(response.json()) == len(sample_scripts)
```

## UI Testing (jest)

```tsx
it('renders script list correctly', () => {
  render(<ScriptList scripts={mockScripts} />);
  expect(screen.getAllByTestId('script-item')).toHaveLength(3);
});

it('calls onRun when run button clicked', () => {
  const onRun = jest.fn();
  render(<ScriptCard script={mockScript} onRun={onRun} />);
  fireEvent.click(screen.getByRole('button', { name: /run/i }));
  expect(onRun).toHaveBeenCalledWith(mockScript.id);
});
```

## E2E Testing (pytest + httpx)

```python
@pytest.mark.e2e
class TestScriptWorkflow:
    """Final confirmation: full user flow"""
    
    async def test_create_run_delete_script(self, e2e_client):
        # Create
        create_resp = await e2e_client.post("/api/scripts/", json={"name": "E2E Test"})
        script_id = create_resp.json()["id"]
        
        # Run
        run_resp = await e2e_client.post(f"/api/scripts/{script_id}/run")
        assert run_resp.json()["status"] == "completed"
        
        # Delete
        delete_resp = await e2e_client.delete(f"/api/scripts/{script_id}")
        assert delete_resp.status_code == 204
```

## Test Commands

| Type | Command | Location |
|------|---------|----------|
| API | `cd backend && pytest tests/api/ -v` | `backend/tests/api/` |
| UI | `cd frontend && npm test` | `frontend/src/**/*.test.tsx` |
| E2E | `cd backend && pytest tests/e2e/ -v -m e2e` | `backend/tests/e2e/` |
| All | `pytest && npm test && pytest -m e2e` | Full suite |
