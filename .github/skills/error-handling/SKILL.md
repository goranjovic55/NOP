---
name: error-handling
description: Exception handling and JSON error response patterns. Use when implementing API error handling or exception management.
---

# Error Handling

## When to Use
- Implementing API endpoints with error handling
- Creating custom exception classes
- Standardizing error responses
- Debugging exceptions

## Pattern
Custom exceptions + JSON responses

## Checklist
- [ ] No unhandled exceptions
- [ ] Consistent format {"error","code","details"}
- [ ] HTTP codes (400/401/403/404/500)
- [ ] Log with context (user, action, payload)

## Example
```python
# Custom exception
class ValidationError(Exception):
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}

# Exception handler
@app.exception_handler(ValidationError)
async def validation_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.message,
            "code": "VALIDATION_ERROR",
            "details": exc.details
        }
    )

# Usage in endpoint
if not item:
    logger.error(f"Item not found: {item_id}", extra={"user": user.id})
    raise ValidationError("Item not found", {"item_id": item_id})
```
