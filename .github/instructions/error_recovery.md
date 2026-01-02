---
applyTo: '**'
---

# Error Recovery

## Categories

| Type | Examples | Action |
|------|----------|--------|
| Transient | File lock, timeout, rate limit | Retry 3x (1s, 2s, 4s backoff) |
| Permanent | Not found, permission denied | Ask user |
| User | Ambiguous, missing info | Clarify |

## Error Tracking

```
[ERROR_LIST: count=N | errors=[...]]
<fix>
[ERROR_RESOLVED: N/M | remaining=[...]]
```

**BLOCKING**: Cannot [COMPLETE] if remaining > 0

## Rate Limit

`[RATE_LIMIT: service=X | wait=Ns | retry=1/3]` → Wait → Retry → After 3x ask user

**Target**: 85%+ transient auto-recovery
