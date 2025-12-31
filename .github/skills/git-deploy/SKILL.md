---
name: git-deploy
description: Git workflow and deployment patterns using conventional commits. Use when committing code or deploying.
---

# Git & Deploy

## When to Use
- Making commits
- Creating branches
- Opening pull requests
- Assessing deployment risk

## Pattern
Conventional commits + deployment risk assessment

## Checklist
- [ ] Branch: feature/bugfix/hotfix-[desc]
- [ ] Commit: feat|fix|docs|refactor|test|chore: message
- [ ] PR: title matches commit convention
- [ ] Deployment risk assessed (migrations +3, auth +3, breaking +3)

## Branch Naming
```bash
# Features
git checkout -b feature/add-packet-filtering

# Bugfixes
git checkout -b bugfix/fix-websocket-disconnect

# Hotfixes
git checkout -b hotfix/critical-auth-bypass
```

## Commit Messages
```bash
# Feature
git commit -m "feat: add broadcast packet filtering"

# Bugfix
git commit -m "fix: resolve WebSocket reconnection issue"

# Documentation
git commit -m "docs: update API documentation for scans endpoint"

# Refactor
git commit -m "refactor: extract scan service to separate module"

# Tests
git commit -m "test: add unit tests for packet parser"

# Chores
git commit -m "chore: upgrade FastAPI to 0.109.0"
```

## Deployment Risk Assessment
```yaml
# Low Risk (0-2 points)
- Documentation changes: 0
- Frontend styling: 1
- New optional features: 1

# Medium Risk (3-5 points)
- Database migrations: 3
- Authentication changes: 3
- API contract changes: 2

# High Risk (6+ points)
- Breaking API changes: 3
- Auth system rewrite: 5
- Database schema redesign: 4
```

## Example PR
```markdown
## feat: Add broadcast packet filtering

### Changes
- Added broadcast filter toggle to Traffic page
- Implemented backend filtering in packet capture service
- Added tests for broadcast detection

### Risk Assessment
- **Score**: 2/10 (Low)
- **Database**: No migrations
- **API**: No breaking changes
- **Auth**: No changes
- **Reason**: New optional feature, backward compatible
```
