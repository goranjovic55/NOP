# Security Patterns

Security-first development patterns including input validation, authentication, and secure coding practices.

## When to Use

- User input handling in API endpoints
- Creating API endpoints with authentication
- File upload/download features
- Credential storage and management
- Any external data processing

## Checklist

- [ ] Input sanitization for all user data
- [ ] Parameterized queries (no SQL injection)
- [ ] JWT token validation on protected routes
- [ ] CORS configuration reviewed
- [ ] Secrets in env vars, not code
- [ ] File path validation (no traversal)
- [ ] Rate limiting on sensitive endpoints

## Examples

### Input Sanitization (FastAPI)
```python
from pydantic import BaseModel, Field, validator
import re

class UserInput(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    
    @validator('username')
    def sanitize_username(cls, v):
        # Only allow alphanumeric and underscore
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must be alphanumeric')
        return v.lower()
    
    @validator('email')
    def validate_email(cls, v):
        # Basic email validation
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Invalid email format')
        return v.lower()
```

### Parameterized Queries (SQLAlchemy)
```python
# ❌ VULNERABLE - SQL Injection
# DANGER: If username = "'; DROP TABLE users; --" the query becomes:
# SELECT * FROM users WHERE username = ''; DROP TABLE users; --'
# This allows attackers to execute arbitrary SQL commands!
async def get_user_bad(username: str, db: AsyncSession):
    result = await db.execute(text(f"SELECT * FROM users WHERE username = '{username}'"))
    return result.fetchone()

# ✅ SAFE - Parameterized
async def get_user_safe(username: str, db: AsyncSession):
    result = await db.execute(
        select(User).where(User.username == username)
    )
    return result.scalar_one_or_none()

# ✅ SAFE - With text binding
async def get_user_text(username: str, db: AsyncSession):
    result = await db.execute(
        text("SELECT * FROM users WHERE username = :username"),
        {"username": username}
    )
    return result.fetchone()
```

### Protected Route with JWT
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Usage
@router.get("/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}"}
```

### File Path Validation
```python
import os
from pathlib import Path

ALLOWED_DIR = Path("/app/uploads")

def safe_file_path(filename: str) -> Path:
    """Validate file path to prevent directory traversal."""
    # Normalize and resolve the path
    safe_name = os.path.basename(filename)  # Strip any path components
    full_path = (ALLOWED_DIR / safe_name).resolve()
    
    # Verify it's within allowed directory
    if not str(full_path).startswith(str(ALLOWED_DIR)):
        raise ValueError("Invalid file path")
    
    return full_path
```

### CORS Configuration
```python
from fastapi.middleware.cors import CORSMiddleware

# ❌ DANGEROUS - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # This combo is especially dangerous
)

# ✅ SAFE - Explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## Anti-Patterns

- ❌ `f"SELECT * FROM users WHERE id = {user_id}"` → ✅ Use ORM or parameterized queries
- ❌ Storing JWT secret in code → ✅ Use environment variables
- ❌ `allow_origins=["*"]` with credentials → ✅ Explicit origin list
- ❌ Trusting client-provided file paths → ✅ Always use basename and validate
- ❌ Returning raw error messages to client → ✅ Log details, return generic message

## Related

- `backend-api` - API endpoint patterns
- `error-handling` - Error handling patterns

---
*Created: 2026-01-03*
*Priority: Critical*
*Estimated Impact: 85%*
