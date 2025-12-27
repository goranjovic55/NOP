# Retry Mechanism Documentation

## Overview

The NOP (Network Operations Platform) implements comprehensive retry logic to handle transient failures in both frontend (API calls) and backend (external service calls) operations.

## Frontend Retry (JavaScript/TypeScript)

### Configuration

The frontend uses a centralized axios instance with automatic retry logic configured in `/frontend/src/utils/apiClient.ts`.

**Default Settings:**
- **Max Retries**: 3 attempts
- **Base Delay**: 1 second
- **Max Delay**: 10 seconds
- **Backoff**: Exponential with jitter (up to 30% randomization)

### Retry Conditions

Requests are automatically retried for:
- **Network errors** (no response from server)
- **5xx errors** (server errors: 500-599)
- **429 errors** (rate limiting)
- **408 errors** (request timeout)

Requests are NOT retried for:
- **4xx errors** (client errors like 400, 401, 403, 404) except 429
- **Authentication failures** (401) - redirects to login instead

### Usage

All services automatically use the retry mechanism by importing the centralized API client:

```typescript
import apiClient from '../utils/apiClient';

// This request will automatically retry on transient failures
const response = await apiClient.get('/assets/', {
  params: { page: 1, size: 100 }
});
```

### Custom Retry Configuration

For specific requests requiring different retry behavior:

```typescript
import { withRetry } from '../utils/axiosRetry';
import apiClient from '../utils/apiClient';

const response = await apiClient.get('/special-endpoint', withRetry({
  params: { ... }
}, {
  retries: 5,           // Override max retries
  retryDelay: 2000,     // Override base delay (ms)
  maxRetryDelay: 30000, // Override max delay (ms)
  retryCondition: (error) => {
    // Custom retry condition
    return error.response?.status === 503;
  }
}));
```

### Logging

Retry attempts are logged to the browser console:

```
[Retry 1/3] GET /api/v1/assets/ (delay: 1234ms, reason: Network Error)
[Retry 2/3] GET /api/v1/assets/ (delay: 2567ms, reason: Network Error)
```

## Backend Retry (Python)

### Configuration

The backend provides a `@retry` decorator for async and sync functions in `/backend/app/utils/retry.py`.

**Environment Variables:**
```bash
# .env configuration
MAX_RETRY_ATTEMPTS=3
RETRY_BASE_DELAY=1.0
RETRY_MAX_DELAY=60.0
RETRY_EXPONENTIAL_BACKOFF=true
```

### Usage

#### Basic Decorator

```python
from app.utils.retry import retry

@retry(max_attempts=3, base_delay=1.0)
async def fetch_external_data():
    # Code that might fail transiently
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()
```

#### With Specific Exceptions

```python
@retry(
    max_attempts=3,
    base_delay=2.0,
    exceptions=(ConnectionError, TimeoutError),
    logger_name='my_service'
)
async def call_external_api():
    # Only retries on ConnectionError or TimeoutError
    pass
```

#### With Callback

```python
def on_retry_callback(attempt: int, error: Exception):
    # Custom logic on retry
    metrics.increment('api_retry', tags=[f'attempt:{attempt}'])

@retry(
    max_attempts=3,
    on_retry=on_retry_callback
)
async def monitored_operation():
    pass
```

### Circuit Breaker

For preventing cascading failures when a service is consistently down:

```python
from app.utils.retry import CircuitBreaker

# Create circuit breaker instance
circuit_breaker = CircuitBreaker(
    failure_threshold=5,      # Open after 5 failures
    recovery_timeout=60.0,    # Wait 60s before retry
    expected_exception=Exception
)

async def call_with_circuit_breaker():
    # Circuit opens after repeated failures
    return await circuit_breaker.async_call(external_api_call, arg1, arg2)
```

### Exponential Backoff Algorithm

The retry delay is calculated using exponential backoff with jitter:

```
delay = min(base_delay * (2 ^ (attempt - 1)) + jitter, max_delay)
where jitter = random(0, 0.3 * exponential_delay)
```

**Example delays (base=1s, max=60s):**
- Attempt 1: ~1.0s (1s + 0-0.3s jitter)
- Attempt 2: ~2.0-2.6s (2s + 0-0.6s jitter)
- Attempt 3: ~4.0-5.2s (4s + 0-1.2s jitter)
- Attempt 4: ~8.0-10.4s (8s + 0-2.4s jitter)

## Applied Services

### Frontend Services
- ✅ `assetService.ts` - Asset management API calls
- ✅ `accessService.ts` - Access/credential operations
- ✅ `authService.ts` - Authentication requests
- ✅ `dashboardService.ts` - Dashboard statistics

### Backend Services
- ✅ `scanner.py` - NMAP scanning operations
  - `ping_sweep()` - Network discovery
  - `port_scan()` - Port scanning

## Best Practices

### When to Use Retry

✅ **DO use retry for:**
- Network requests to external APIs
- Database connection failures
- External service calls (NMAP, network tools)
- Rate-limited endpoints
- Temporary service unavailability

❌ **DON'T use retry for:**
- User input validation errors
- Authentication/authorization failures (redirect instead)
- Resource not found errors (404)
- Business logic errors
- Operations with side effects (unless idempotent)

### Idempotency

Ensure operations are idempotent (safe to retry) before adding retry logic:

```python
# ✅ Good - Idempotent
@retry(max_attempts=3)
async def get_user(user_id: str):
    return await db.get(user_id)

# ❌ Bad - Not idempotent without safeguards
@retry(max_attempts=3)
async def create_user(user_data):
    # Could create duplicate users on retry
    return await db.insert(user_data)

# ✅ Better - Made idempotent
@retry(max_attempts=3)
async def create_user(user_data):
    existing = await db.get_by_email(user_data.email)
    if existing:
        return existing
    return await db.insert(user_data)
```

### Monitoring

Log retry attempts for debugging and monitoring:

```python
import logging

logger = logging.getLogger(__name__)

@retry(
    max_attempts=3,
    logger_name=__name__,  # Uses logger for this module
    on_retry=lambda attempt, error: logger.warning(
        f"Retry attempt {attempt}", extra={"error": str(error)}
    )
)
async def monitored_call():
    pass
```

## Troubleshooting

### Issue: Too Many Retries

If you see excessive retry attempts:
1. Check if the service is actually down
2. Reduce `MAX_RETRY_ATTEMPTS` in environment
3. Add circuit breaker to prevent cascade failures

### Issue: Retries Taking Too Long

If retry delays are too long:
1. Reduce `RETRY_MAX_DELAY` in environment
2. Reduce `max_delay` in decorator
3. Consider if all retries are necessary

### Issue: Not Retrying

If retries aren't happening:
1. Check if error type is in `exceptions` parameter
2. Verify retry condition logic
3. Check logs for retry attempts
4. Ensure decorator is properly applied

## Testing

### Frontend
```typescript
// Mock axios to simulate failures
import axios from 'axios';
jest.mock('axios');

test('retries on network error', async () => {
  axios.get
    .mockRejectedValueOnce(new Error('Network Error'))
    .mockRejectedValueOnce(new Error('Network Error'))
    .mockResolvedValueOnce({ data: { success: true } });
    
  const result = await apiClient.get('/test');
  expect(result.data.success).toBe(true);
  expect(axios.get).toHaveBeenCalledTimes(3);
});
```

### Backend
```python
import pytest
from app.utils.retry import retry, RetryError

@pytest.mark.asyncio
async def test_retry_exhaustion():
    call_count = 0
    
    @retry(max_attempts=3, base_delay=0.1)
    async def failing_function():
        nonlocal call_count
        call_count += 1
        raise ConnectionError("Test error")
    
    with pytest.raises(RetryError):
        await failing_function()
    
    assert call_count == 3  # Called 3 times before giving up
```

## Future Enhancements

- [ ] Add retry metrics to Prometheus
- [ ] Implement adaptive retry (learn from success/failure rates)
- [ ] Add per-endpoint retry configuration
- [ ] Implement distributed circuit breaker with Redis
- [ ] Add retry budget (max retry rate limit)
