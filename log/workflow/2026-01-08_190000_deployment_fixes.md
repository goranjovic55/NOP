# Deployment Fixes | 2026-01-08 | ~45min

## Summary
Fixed critical deployment issues affecting external systems (Radxa, Hetzner):
1. Fixed Alembic using hardcoded DATABASE_URL instead of environment variable
2. Changed backend port from 8000 to 12001 to avoid conflicts
3. Removed Alembic migrations from start.sh - fresh installs use `init_db` directly
4. Updated AKIS to show full skill paths and session metrics

## Session Metrics
| Metric | Value |
|--------|-------|
| Duration | ~45min |
| Tasks | 8 completed / 8 total |
| Files Modified | 19 |
| Skills Loaded | 3 |
| Complexity | Medium (3-5 files initially, expanded to 19) |

## Workflow Tree
```
<MAIN> Fix deployment issues on external systems
├─ <WORK> Fix Alembic DATABASE_URL                    ✓
├─ <WORK> Change port 8000 to 12001                   ✓
├─ <WORK> Update network IP 172.54                    ✓
├─ <WORK> Update AKIS full skill paths                ✓
├─ <WORK> Add session metrics format                  ✓
├─ <WORK> Remove Alembic from start.sh                ✓
├─ <WORK> Rebuild and verify deployment               ✓
└─ <END> Finalize                                     ✓
```

## Files Modified
| File | Changes |
|------|---------|
| .github/agents/akis.agent.md | Added full skill paths, session metrics format |
| .github/copilot-instructions.md | Updated END protocol |
| backend/Dockerfile | Ensured psycopg2 build dependencies |
| backend/alembic.ini | Changed default IP to 172.54.0.10 |
| backend/alembic/env.py | Added DATABASE_URL environment variable override |
| backend/alembic/versions/001_add_cve_tables.py | Made migrations idempotent |
| backend/start.sh | Removed Alembic, port 8000→12001 |
| deploy.sh | Updated access URLs |
| docker/docker-compose.debug.yml | Port update |
| docker/docker-compose.dev.yml | Port update |
| frontend/nginx.conf | All proxy_pass 8000→12001 |
| frontend/src/pages/Agents.tsx | Port and IP updates |
| test-environment/* | 6 files with port/IP updates |

## Skills Used
- .github/skills/backend-api/SKILL.md (for alembic/env.py, start.sh)
- .github/skills/docker/SKILL.md (for Dockerfile, docker-compose)
- .github/skills/akis-development/SKILL.md (for akis.agent.md, copilot-instructions)

## Skill Suggestions
2 high-confidence suggestions from suggest_skill.py:
1. **backend-development-patterns** - SQLAlchemy JSON field modification, flag_modified usage
2. **infrastructure-development** - Docker network isolation, subnet allocation

## Root Cause Analysis
The original error `column assets.agent_id does not exist` occurred because:
1. Alembic was using hardcoded URL (172.28.0.10) instead of DATABASE_URL env var (172.54.0.10)
2. Migrations ran against wrong/non-existent database
3. `init_db` created tables, but Alembic migration history was inconsistent

**Solution**: Skip Alembic for fresh installs - `init_db` with `Base.metadata.create_all()` creates correct schema from models.

## Verification
```bash
# Database table verified with agent_id column:
docker exec nop-postgres-1 psql -U nop -d nop -c "\d assets"
# Shows: agent_id | uuid | nullable

# API verified working:
curl -s http://localhost:12001/docs  # Swagger UI accessible
curl -s http://localhost:12000/       # Frontend accessible
```

## Deployment Instructions for External Systems
```bash
# On Radxa/Hetzner - fresh deployment:
docker compose down -v  # Remove old volumes
docker compose pull     # Get latest images
docker compose up -d    # Start fresh
docker logs nop-backend-1  # Verify "Database tables created"
```
