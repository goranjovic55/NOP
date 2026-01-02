---
applyTo: '**'
---

# Error Recovery

## Error Categories

**1. Transient (Auto-retry)**
- File lock busy → retry 3x (1s, 2s, 4s backoff)
- Network timeout → retry 2x
- Rate limit → wait and retry

**2. Permanent (Escalate)**
- File not found → ask user
- Permission denied → ask user  
- Syntax error → fix and retry

**3. User (Request help)**
- Ambiguous requirement → clarify
- Missing info → request
- Decision needed → ask

## Retry Protocol

```
[ERROR: type=transient | category=file_lock | attempt=1/3]
"File locked. Retrying in 1s..."
<retry>

If all fail:
[ERROR: type=permanent | attempts_exhausted=3]
"Cannot access after 3 attempts.
Suggest: <solution>"
```

## Error Logging

All errors → workflow log:
- Type, category, attempts
- Resolution (auto/escalate)
- Duration

**Target**: 85%+ transient auto-recovery
