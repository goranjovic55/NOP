---
name: authentication
description: Load when editing auth, JWT, login, token, or session files. Provides authentication patterns for secure user identity management.
---

# Authentication

> Secure identity verification and access control

## When This Applies
- Editing auth endpoints, login/logout handlers
- JWT token generation/validation
- Session management
- OAuth/SSO integration
- Password handling, credential storage

## Common Patterns

| Task | Pattern |
|------|---------|
| JWT generation | Use secure signing, short expiry, refresh tokens |
| Password storage | bcrypt/argon2, never plaintext |
| Token validation | Verify signature, expiry, claims |
| Session handling | Secure cookies, HTTPOnly, SameSite |
| OAuth flow | State parameter, PKCE for mobile |

## Security Checklist
- [ ] Passwords hashed with bcrypt/argon2 (cost ≥12)
- [ ] JWT signed with strong secret (≥256 bits)
- [ ] Token expiry enforced (access: 15m, refresh: 7d)
- [ ] HTTPOnly + Secure cookies for tokens
- [ ] Rate limiting on login endpoints
- [ ] HTTPS enforced in production
- [ ] Credentials not logged

## Gotchas

| Issue | Solution |
|-------|----------|
| Token in localStorage | Use HTTPOnly cookies instead |
| Weak JWT secret | Use crypto.randomBytes(32).toString('hex') |
| No token rotation | Implement refresh token flow |
| Missing CSRF protection | Use SameSite=Strict cookies + token |
| Timing attacks | Use constant-time comparison for secrets |

## Backend (FastAPI/Python)

```python
# JWT generation
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

## Frontend (React/TypeScript)

```typescript
// Token storage (cookies)
const setAuthToken = (token: string) => {
  // Set via API response setting HTTPOnly cookie
  // OR use js-cookie with Secure flag
  Cookies.set('auth_token', token, { 
    secure: true, 
    sameSite: 'strict',
    expires: 7 
  });
};

// Auto-refresh pattern
useEffect(() => {
  const interval = setInterval(async () => {
    await refreshToken();
  }, 14 * 60 * 1000); // Refresh every 14 min
  return () => clearInterval(interval);
}, []);
```

## Files to Check
| Location | Purpose |
|----------|---------|
| `backend/app/core/security.py` | JWT/password utilities |
| `backend/app/api/v1/endpoints/auth.py` | Auth endpoints |
| `backend/app/models/user.py` | User model with hashed password |
| `frontend/src/store/authStore.ts` | Auth state management |
| `frontend/src/services/authService.ts` | Auth API calls |

## Testing
- Test invalid credentials rejected
- Test token expiry enforced
- Test refresh token rotation
- Test rate limiting
- Test password complexity requirements

## Compliance
- OWASP Authentication Cheat Sheet
- NIST SP 800-63B (password guidelines)
- OAuth 2.0 RFC 6749
