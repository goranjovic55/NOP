# Debugging

Systematic troubleshooting for build, runtime, and infrastructure errors.

## When to Use
- Build/compile errors
- Runtime exceptions
- Container/Docker issues
- API integration failures
- Type errors

## Avoid
- ❌ Ignoring full error message → ✅ Read complete stack trace
- ❌ Random changes → ✅ Isolate failing component
- ❌ No verification → ✅ Reproduce and verify fix

## Examples

### Build Errors
```bash
# TypeScript module not found
grep -r "import.*X" src/
npm install X
import { X } from './components/X'

# Python import error
pip list | grep package-name
pip install package-name
from .module import X
```

### Runtime Errors
```bash
# Backend 500
docker compose logs backend | tail -50
LOG_LEVEL=DEBUG docker compose up backend
```

```typescript
// Frontend TypeError
const value = data?.property ?? 'default';
if (typeof value === 'string') { /* safe */ }
```

### Docker Issues
```bash
# Container won't start
docker compose logs service-name
docker compose build --no-cache service-name

# Port in use
lsof -i :8000
kill <PID>
```

### Type Errors
```typescript
// TypeScript
interface User { email?: string }
const user = data as User;
if ('property' in object) { /* safe */ }
```

```python
# Python
def process(data: dict[str, Any]) -> list[str]:
    return list(data.keys())
```

### Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error('Failed:', error);
  return defaultValue;
}
```

```python
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"Failed: {e}")
    result = default_value
```

## Related
- knowledge.md
- documentation.md
