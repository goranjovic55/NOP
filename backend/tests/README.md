# Backend Tests

This directory contains test suites for the NOP backend.

## Structure

```
tests/
├── unit/           # Unit tests for individual components
└── integration/    # Integration tests for service interactions
```

## Current Test Coverage

### Existing Tests (in scripts/)
- `scripts/test_source_only_tracking.py` - Tests for passive discovery source-only mode
- `scripts/test_broadcast_filter.py` - Tests for broadcast packet filtering

### Coverage Status
- **Current Coverage**: ~15% (limited to network discovery features)
- **Target Coverage**: ≥85%
- **Status**: In development

## Running Tests

### Unit Tests
```bash
pytest backend/tests/unit/ -v
```

### Integration Tests
```bash
# Start test environment first
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pytest backend/tests/integration/ -v
```

### All Tests
```bash
pytest backend/tests/ -v --cov=backend/app
```

## Test Requirements

Install test dependencies:
```bash
pip install pytest pytest-cov pytest-asyncio httpx
```

## Contributing Tests

When adding tests:
1. Follow AAA pattern (Arrange-Act-Assert)
2. Use descriptive test names
3. Mock external dependencies
4. Keep tests independent
5. Update this README with new test categories

---

**Status**: Test infrastructure established, comprehensive test coverage in progress
