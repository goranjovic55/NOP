# Health

**Usage**: `/health [service]` | **Services**: all, backend, db, redis

## Quick Check
```bash
docker-compose ps
curl localhost:PORT/health
docker exec db pg_isready
docker exec redis redis-cli ping
```

## Metrics
| Metric | Warning | Critical |
|--------|---------|----------|
| CPU | >70% | >90% |
| Memory | >80% | >95% |
| Disk | >80% | >95% |

## Recovery
```bash
docker-compose restart [service]
docker-compose down && docker-compose up -d
```
