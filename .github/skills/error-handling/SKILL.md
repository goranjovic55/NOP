---
name: error-handling
description: Exception handling and JSON error response patterns. Use when implementing API error handling, creating custom exception classes, or standardizing error responses.
---

# Error Handling Patterns

Exception handling and JSON error response patterns.

## When to Use
- Implementing API error handling
- Creating custom exception classes
- Standardizing error responses

## Checklist
- [ ] No unhandled exceptions
- [ ] Consistent format `{"error", "code", "details"}`
- [ ] HTTP codes (400/401/403/404/500)
- [ ] Log with context (user, action, payload)

## Examples

### Custom Exception Classes
```python
class AppError(Exception):
    """Base application error."""
    def __init__(self, message: str, code: str = "ERROR", details: dict = None):
        self.message = message
        self.code = code
        self.details = details or {}

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(
            message=f"{resource} not found",
            code="NOT_FOUND",
            details={"resource": resource, "id": id}
        )

class ValidationError(AppError):
    def __init__(self, message: str, errors: list = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details={"errors": errors or []}
        )
```

### Exception Handler
```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    status_code = {
        "NOT_FOUND": 404,
        "VALIDATION_ERROR": 400,
        "UNAUTHORIZED": 401,
        "FORBIDDEN": 403,
    }.get(exc.code, 500)
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": exc.message,
            "code": exc.code,
            "details": exc.details
        }
    )
```

### Usage in Endpoint
```python
@router.get("/{item_id}")
async def get_item(item_id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(Item, item_id)
    if not item:
        logger.warning(f"Item not found: {item_id}")
        raise NotFoundError("Item", str(item_id))
    return item
```

### Frontend Error Handling
```typescript
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.message, error.code, error.details);
  }
  
  return response.json();
}

// Usage with error boundary
try {
  const data = await apiCall('/api/items');
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
}
```
