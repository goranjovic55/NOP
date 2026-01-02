---
name: testing
description: Testing patterns for unit, integration, and E2E tests. Use when writing or debugging tests.
---

# Testing

## When to Use
- Writing new tests for features
- Debugging failing tests
- Setting up test infrastructure
- Reviewing test coverage

## Pattern
Arrange-Act-Assert

## Checklist
- [ ] Unit tests for logic (80%+ coverage)
- [ ] Integration tests for APIs
- [ ] E2E for critical user flows
- [ ] Regression test for bug fixes

## Examples

### Unit Test
```python
import pytest
from app.services import calculate_network_stats

def test_calculate_network_stats():
    # Arrange
    packets = [
        {"size": 100, "protocol": "TCP"},
        {"size": 200, "protocol": "UDP"},
        {"size": 150, "protocol": "TCP"}
    ]
    
    # Act
    result = calculate_network_stats(packets)
    
    # Assert
    assert result["total_packets"] == 3
    assert result["total_bytes"] == 450
    assert result["protocols"]["TCP"] == 2
```

### Integration Test
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_scan():
    # Arrange
    payload = {"target": "192.168.1.0/24", "ports": "1-1000"}
    
    # Act
    response = client.post("/api/scans", json=payload)
    
    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["target"] == "192.168.1.0/24"
    assert "id" in data
```

### E2E Test (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('network scan workflow', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');
  
  // Start scan
  await page.fill('[data-testid="scan-target"]', '192.168.1.0/24');
  await page.click('[data-testid="start-scan"]');
  
  // Wait for results
  await expect(page.locator('[data-testid="scan-results"]')).toBeVisible();
  await expect(page.locator('.host-item')).toHaveCount({ minimum: 1 });
});
```
