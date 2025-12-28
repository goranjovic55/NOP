# Debug

**Usage**: `/debug [type]` | **Types**: backend, frontend, db, docker

## Framework
1. **Reproduce** - What triggers it?
2. **Isolate** - Which layer?
3. **Investigate** - Logs, state
4. **Fix** - Minimal change

## Commands
```bash
# Logs
docker-compose logs -f backend --tail=100

# DB
docker exec -it db psql -U postgres

# API
curl -v localhost:PORT/api/endpoint
```

## Common Fixes
| Error | Fix |
|-------|-----|
| 401 | Check token/auth |
| 422 | Validate input |
| 500 | Check logs |
| Connection | Check docker ps |
