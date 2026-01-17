---
name: monitoring
description: Load when adding logging, metrics, alerts, or observability. Provides patterns for system health tracking.
---

# Monitoring

> Observability through logs, metrics, and traces

## When This Applies
- Adding logging to services
- Setting up metrics collection
- Implementing health checks
- Error tracking and alerting
- Performance monitoring

## Observability Pillars

| Pillar | Purpose | Tools |
|--------|---------|-------|
| Logs | Event records | Python logging, console.log |
| Metrics | Quantitative data | Prometheus, StatsD |
| Traces | Request flow | OpenTelemetry, Jaeger |

## Logging Patterns

| Level | When to Use |
|-------|-------------|
| DEBUG | Development details, variable values |
| INFO | Normal operations, state changes |
| WARNING | Unexpected but handled situations |
| ERROR | Errors that need attention |
| CRITICAL | System failure imminent |

## Backend (Python)

```python
import logging
from logging import Logger

logger = logging.getLogger(__name__)

# Structured logging
logger.info(
    "User action",
    extra={
        "user_id": user.id,
        "action": "login",
        "ip": request.client.host,
        "timestamp": datetime.utcnow().isoformat()
    }
)

# Error logging with context
try:
    process_payment(order_id)
except Exception as e:
    logger.error(
        f"Payment failed for order {order_id}",
        exc_info=True,
        extra={"order_id": order_id, "amount": amount}
    )
    raise

# Health check endpoint
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": await check_db(),
        "redis": await check_redis(),
        "timestamp": datetime.utcnow().isoformat()
    }
```

## Frontend (TypeScript)

```typescript
// Error boundary logging
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }
}

// API error tracking
const apiCall = async (endpoint: string) => {
  try {
    return await fetch(endpoint);
  } catch (error) {
    trackError('api_error', {
      endpoint,
      error: error.message,
      timestamp: Date.now()
    });
    throw error;
  }
};
```

## Metrics to Collect

| Metric | Type | Example |
|--------|------|---------|
| Request count | Counter | `http_requests_total{endpoint="/api/users"}` |
| Response time | Histogram | `http_request_duration_seconds` |
| Error rate | Counter | `http_errors_total{status="500"}` |
| Active users | Gauge | `active_users_count` |
| Queue depth | Gauge | `task_queue_depth` |

## Gotchas

| Issue | Solution |
|-------|----------|
| Logging sensitive data | Sanitize logs, mask PII |
| Too verbose logs | Use appropriate levels, sampling |
| Missing context | Add user_id, request_id to logs |
| No alerting | Set up alerts for ERROR+ levels |
| Logs not persisted | Configure log rotation, shipping |

## Health Check Checklist
- [ ] Database connectivity
- [ ] Redis/cache connectivity
- [ ] External API availability
- [ ] Disk space available
- [ ] Memory usage within limits

## Alert Examples
- Error rate >1% for 5 minutes
- API p95 latency >2s
- Database connection pool exhausted
- Memory usage >85%
- Disk space <10%

## Tools
- Backend: Python `logging`, `structlog`
- Frontend: Sentry, LogRocket
- Infrastructure: Prometheus, Grafana
- Distributed tracing: OpenTelemetry
