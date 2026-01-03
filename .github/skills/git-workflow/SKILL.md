---
name: git-workflow
description: Git workflow and deployment patterns using conventional commits. Use when making commits, creating branches, or opening pull requests.
---

# Git Workflow Patterns

Git workflow and deployment patterns using conventional commits.

## When to Use
- Making commits
- Creating branches
- Opening pull requests

## Branch Naming
```bash
feature/add-user-auth
bugfix/fix-login-error
hotfix/critical-security-patch
docs/update-readme
```

## Commit Messages
```bash
# Format: type: description
# Types: feat, fix, docs, refactor, test, chore

feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
refactor: extract auth to separate module
test: add unit tests for auth service
chore: upgrade dependencies
```

## Examples

### Feature Branch Workflow
```bash
# Create feature branch
git checkout -b feature/add-notifications

# Make commits
git add .
git commit -m "feat: add notification service"
git commit -m "feat: add notification UI component"
git commit -m "test: add notification tests"

# Push and create PR
git push -u origin feature/add-notifications
```

### Fix Workflow
```bash
git checkout -b bugfix/fix-auth-redirect
git add .
git commit -m "fix: resolve auth redirect loop"
git push -u origin bugfix/fix-auth-redirect
```

### PR Template
```markdown
## Summary
Brief description of changes

## Changes
- Added notification service
- Created notification component
- Added tests

## Testing
- [ ] Unit tests pass
- [ ] Manual testing complete

## Risk Assessment
- Database migrations: No
- Breaking changes: No
- Auth changes: No
```

### Merge Strategies
```bash
# Squash merge for features (clean history)
git merge --squash feature/add-notifications

# Regular merge for releases
git merge release/v1.2.0

# Rebase for small fixes
git rebase main
```
