# Deploy

**Usage**: `/deploy [env]` | **Envs**: dev, staging, prod

## Checklist
- [ ] Tests pass
- [ ] No lint errors
- [ ] Migrations ready
- [ ] Secrets configured
- [ ] Rollback plan

## Risk Score
| Factor | Points |
|--------|--------|
| DB migration | +3 |
| Auth changes | +3 |
| Breaking API | +3 |
| Has rollback | -2 |
| Tested staging | -2 |

**0-3** 🟢 | **4-6** 🟡 | **7+** 🔴

## Commands
```bash
docker-compose build
docker-compose up -d
curl localhost:PORT/health
```
