---
description: Review code for security and quality issues
---

Review the code: $ARGUMENTS

## Security Checklist
- [ ] OWASP Top 10 vulnerabilities checked
- [ ] No hardcoded secrets or API keys
- [ ] Input validation present
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Auth tokens handled securely

## Quality Checklist
- [ ] Functions under 50 lines
- [ ] Clear, descriptive naming
- [ ] Proper error handling
- [ ] Type hints present
- [ ] Tests exist or needed
- [ ] No code duplication

## Output Format
For each issue found, provide:
1. **Location**: `file:line`
2. **Issue**: What's wrong
3. **Severity**: Critical / Warning / Suggestion
4. **Fix**: How to fix it

Use @reviewer for comprehensive audits.
