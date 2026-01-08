---
name: debugging
description: Error, exception, traceback - Systematic troubleshooting
---
# Debugging

## Process
1. READ full error
2. IDENTIFY type (build/runtime/network)
3. LOCATE source (file:line)
4. ISOLATE reproduction
5. FIX targeted
6. VERIFY resolved

## Quick Fixes
| Symptom | Check | Fix |
|---------|-------|-----|
| Module not found | `npm ls`/`pip list` | Install missing |
| 500 error | `docker logs` | Check stack trace |
| Port in use | `lsof -i :PORT` | Kill or change |
| Null reference | Missing data | Add `?.` or guard |

## Commands
```bash
# Backend
docker compose logs backend --tail 100
curl -v http://localhost:8000/endpoint

# Python
python -m py_compile file.py

# Node
npm ls package-name
```
