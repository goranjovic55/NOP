---
name: security
description: Security patterns for authentication, input validation, and secrets management. Use when implementing auth or handling sensitive data.
---

# Security

## When to Use
- Implementing authentication/authorization
- Validating user inputs
- Handling secrets and credentials
- Reviewing code for security vulnerabilities

## Pattern
Defense in depth

## Checklist
- [ ] Passwords hashed (bcrypt/argon2)
- [ ] Tokens expire (JWT with TTL)
- [ ] All inputs validated (type, range, format)
- [ ] No secrets in code (env vars only)
- [ ] Dependencies audited (no CVEs)

## Examples

### Password Hashing
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

### JWT Tokens
```python
from jose import jwt
from datetime import datetime, timedelta

def create_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```

### Input Validation
```python
from pydantic import BaseModel, validator, constr

class UserCreate(BaseModel):
    email: constr(regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    password: constr(min_length=8, max_length=100)
    
    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Must contain uppercase')
        if not any(c.isdigit() for c in v):
            raise ValueError('Must contain digit')
        return v
```
