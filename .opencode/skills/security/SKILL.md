---
name: security
description: Security patterns, OWASP checks, and vulnerability prevention. Load when reviewing security, handling auth, or checking for vulnerabilities.
---

# Security

## OWASP Top 10 Checklist

| Vulnerability | Check |
|--------------|-------|
| Injection | Parameterized queries, input sanitization |
| Broken Auth | JWT validation, session management |
| Sensitive Data | Encryption, secure transmission |
| XXE | Disable external entities in XML parsers |
| Broken Access | Role-based access control |
| Misconfig | Security headers, default credentials |
| XSS | Output encoding, CSP headers |
| Insecure Deserialization | Validate serialized data |
| Vulnerable Components | Dependency scanning |
| Insufficient Logging | Audit logging, monitoring |

## Auth Patterns

```python
# Pattern 1: JWT validation
from datetime import datetime
import jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if datetime.utcnow() > datetime.fromtimestamp(payload["exp"]):
            raise HTTPException(401, "Token expired")
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# Pattern 2: Password hashing
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

## Input Validation

```python
# Pattern 3: Input sanitization
from pydantic import BaseModel, validator
import re

class UserInput(BaseModel):
    email: str
    
    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', v):
            raise ValueError('Invalid email format')
        return v.lower()

# Pattern 4: SQL injection prevention
# NEVER do this:
# query = f"SELECT * FROM users WHERE id = {user_id}"

# ALWAYS do this:
result = await db.execute(
    select(User).where(User.id == user_id)
)
```

## Security Headers

```python
# FastAPI security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

## Gotchas

| Category | Pattern | Solution |
|----------|---------|----------|
| Secrets | Hardcoded in code | Use environment variables |
| Auth | Token in URL | Use headers or cookies |
| CORS | Wildcard origin | Specify allowed origins |
| Logging | Sensitive data logged | Redact PII from logs |
| Deps | Outdated packages | Regular dependency updates |

## Commands

| Task | Command |
|------|---------|
| Check deps | `pip-audit` or `npm audit` |
| Scan secrets | `trufflehog` or `gitleaks` |
| SAST | `bandit` (Python) or `eslint-plugin-security` |
