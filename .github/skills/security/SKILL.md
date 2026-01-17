---
name: security
description: Load when addressing vulnerabilities, injection risks, or security audits. Provides patterns for secure coding.
---

# Security

> Protect against common vulnerabilities

## When This Applies
- Security audit findings
- Injection vulnerabilities
- XSS, CSRF, SQL injection
- Insecure dependencies
- Authentication/authorization issues

## OWASP Top 10 Checklist

| Risk | Check |
|------|-------|
| A01 Broken Access Control | Verify user permissions on all endpoints |
| A02 Cryptographic Failures | Use strong encryption, HTTPS |
| A03 Injection | Parameterized queries, input validation |
| A04 Insecure Design | Threat modeling, security requirements |
| A05 Security Misconfiguration | Secure defaults, minimal permissions |
| A06 Vulnerable Components | Dependency scanning, updates |
| A07 Authentication Failures | MFA, secure session management |
| A08 Data Integrity Failures | Digital signatures, CI/CD security |
| A09 Logging Failures | Adequate logging, alerting |
| A10 SSRF | Validate/sanitize URLs, allowlists |

## Common Vulnerabilities

| Vulnerability | Prevention |
|---------------|------------|
| SQL Injection | Use ORM, parameterized queries |
| XSS | Sanitize output, CSP headers |
| CSRF | CSRF tokens, SameSite cookies |
| Path Traversal | Validate file paths, use allowlists |
| Command Injection | Avoid shell=True, validate input |

## Backend Security (FastAPI/Python)

```python
# SQL Injection prevention - use ORM
# ❌ Bad
query = f"SELECT * FROM users WHERE id = {user_id}"

# ✅ Good
user = db.query(User).filter(User.id == user_id).first()

# Command injection prevention
# ❌ Bad
subprocess.run(f"ping {host}", shell=True)

# ✅ Good
subprocess.run(["ping", "-c", "1", host], shell=False)

# Path traversal prevention
from pathlib import Path

def safe_file_access(filename: str, base_dir: str):
    base = Path(base_dir).resolve()
    target = (base / filename).resolve()
    if not str(target).startswith(str(base)):
        raise ValueError("Path traversal detected")
    return target

# Input validation
from pydantic import BaseModel, validator

class UserInput(BaseModel):
    username: str
    
    @validator('username')
    def validate_username(cls, v):
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v
```

## Frontend Security (React/TypeScript)

```typescript
// XSS prevention - use dangerouslySetInnerHTML carefully
// ❌ Bad
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ Good - sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />

// CSRF protection
const csrfToken = document.querySelector('meta[name="csrf-token"]')
  ?.getAttribute('content');

fetch('/api/action', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken
  }
});
```

## Security Headers

```python
# FastAPI middleware
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Not "*"
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Additional security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

## Gotchas

| Issue | Solution |
|-------|----------|
| Secrets in code | Use environment variables, secrets manager |
| Weak passwords | Enforce complexity, use bcrypt/argon2 |
| No rate limiting | Add rate limiting to all endpoints |
| Verbose errors | Generic errors to users, detailed in logs |
| Missing HTTPS | Enforce HTTPS in production |

## Security Testing
- [ ] Static analysis (bandit, semgrep)
- [ ] Dependency scanning (Safety, Snyk)
- [ ] Penetration testing
- [ ] Code review for security
- [ ] Input fuzzing

## Incident Response
1. Detect - monitoring, alerts
2. Contain - isolate affected systems
3. Eradicate - remove vulnerability
4. Recover - restore services
5. Learn - post-mortem, improve

## Tools
- Static: bandit, eslint-plugin-security
- Dynamic: OWASP ZAP, Burp Suite
- Dependencies: Safety, npm audit
- Secrets: git-secrets, TruffleHog
