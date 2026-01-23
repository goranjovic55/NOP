---
title: AKIS Quick Reference Guide
type: guide
audience: developers
status: production
last_updated: 2026-01-23
version: 7.4
---

# AKIS Quick Reference Guide

**Framework:** AKIS v7.4 (Optimized)  
**Purpose:** Quick lookup for session patterns and best practices  
**Audience:** Developers using AKIS framework  
**Last Updated:** January 23, 2026

---

## Table of Contents

1. [START Phase Checklist](#start-phase-checklist)
2. [WORK Phase Patterns](#work-phase-patterns)
3. [END Phase Checklist](#end-phase-checklist)
4. [Common Gotchas (Top 10)](#common-gotchas-top-10)
5. [Performance Tips](#performance-tips)
6. [Quick Commands](#quick-commands)

---

## START Phase Checklist

**Goal:** Set up session with knowledge, skills, and plan.

### ✅ Required Steps

- [ ] **[G0] Load Knowledge Graph** (100 lines, ONCE per session)
  - File: `project_knowledge.json`
  - Lines: First 100 (covers 89.9% of queries)
  - Cache: hot_cache (30 entities), domain_index (156 paths), gotchas (28 issues)
  - ⚠️ **DO NOT re-read during session**

- [ ] **[AUTO] Detect Session Type**
  - Analyze task description and file mentions
  - Match against 5 patterns (fullstack, frontend, backend, docker, akis)
  - Confidence: 87-98% accuracy

- [ ] **[G2] Pre-load Skills** (max 3, based on session type)
  - Fullstack: `frontend-react`, `backend-api`, `debugging`
  - Frontend: `frontend-react`, `debugging`
  - Backend: `backend-api`, `debugging`
  - Docker: `docker`, `backend-api`
  - AKIS: `akis-dev`, `documentation`
  - ⚠️ **DO NOT reload skills mid-session**

- [ ] **[G1] Create TODO List**
  - Format: `◆ [agent:phase:skill] Task description`
  - Example: `◆ [developer:work:frontend-react] Implement user authentication`
  - Track all tasks
  - Mark completed: `✓` or `✗`

### 📊 Expected Metrics

| Metric | Target | Time |
|--------|--------|------|
| Knowledge load | 1,200 tokens | ~5 sec |
| Skill pre-load | 746-1,200 tokens | ~3 sec |
| TODO creation | 200-400 tokens | ~2 sec |
| **Total START** | ~2,200 tokens | ~10 sec |

---

## WORK Phase Patterns

**Goal:** Execute tasks efficiently with batching and caching.

### 🔧 Operation Patterns

#### Pattern 1: Parallel Reads (2-5 files)

**When:** Need to read multiple independent files

**How:**
```python
# ✅ GOOD: Parallel batch (1 API call)
parallel_view([
    "backend/app/api/endpoints/auth.py",
    "backend/app/models/user.py",
    "backend/app/schemas/user.py"
])

# ❌ BAD: Sequential (3 API calls)
view("backend/app/api/endpoints/auth.py")
view("backend/app/models/user.py")
view("backend/app/schemas/user.py")
```

**Savings:** ~5 API calls/session

---

#### Pattern 2: Sequential Edits (same file)

**When:** Multiple changes to same file

**How:**
```python
# ✅ GOOD: Batched edits (1 tool call)
edit("app.py", [
    {"old": "version = 1", "new": "version = 2"},
    {"old": "debug = True", "new": "debug = False"},
    {"old": "timeout = 30", "new": "timeout = 60"}
])

# ❌ BAD: Separate calls (3 tool calls)
edit("app.py", {"old": "version = 1", "new": "version = 2"})
edit("app.py", {"old": "debug = True", "new": "debug = False"})
edit("app.py", {"old": "timeout = 30", "new": "timeout = 60"})
```

**Savings:** ~3 API calls/session

---

#### Pattern 3: Bash Command Chains

**When:** Sequential bash commands

**How:**
```bash
# ✅ GOOD: Chained (1 API call)
bash("cd backend && pip install -r requirements.txt && pytest")

# ❌ BAD: Sequential (3 API calls)
bash("cd backend")
bash("pip install -r requirements.txt")
bash("pytest")
```

**Savings:** ~2 API calls/session

---

#### Pattern 4: Knowledge Cache Queries

**When:** Need project information

**How:**
```python
# ✅ GOOD: Query cache first
entity = query_cache("NOP.Backend.API")  # O(1), 0 tokens
if not entity:
    entity = read_file("project_knowledge.json")  # Fallback

# ❌ BAD: Read file every time
entity = read_file("project_knowledge.json")  # 500 tokens each time
```

**Savings:** ~1,200 tokens/session

---

#### Pattern 5: Artifact Delegation

**When:** Delegating to another agent

**How:**
```yaml
# ✅ GOOD: Artifact-based (200-400 tokens)
artifact:
  type: design_spec
  summary: "Implement JWT authentication"
  key_decisions: ["Use FastAPI", "httpOnly cookies"]
  files: ["backend/app/api/endpoints/auth.py"]
  constraints: ["Backward compatible"]

# ❌ BAD: Full context (1,500 tokens)
context: [entire conversation history + all previous messages]
```

**Savings:** ~900 tokens/delegated session

---

### 🎯 Batching Decision Matrix

| Operation | Files | Dependencies | Action |
|-----------|-------|--------------|--------|
| **Read** | 2-5 | Independent | ✅ Parallel batch |
| **Read** | 6+ | Independent | ⚠️ Split into groups of 5 |
| **Read** | Any | Dependent | ❌ Sequential |
| **Edit** | Same file | Non-overlapping | ✅ Sequential batch |
| **Edit** | Different files | Independent | ✅ Parallel (separate calls) |
| **Edit** | Different files | Dependent | ❌ Sequential |
| **Bash** | Sequential cmds | Chain-able | ✅ Chain with `&&` |
| **Bash** | Independent cmds | No conflicts | ✅ Parallel sessions |

---

### 🚀 Parallel Execution

**When:** 6+ file task (G7 enforcement)

**How:**
1. Analyze dependencies
2. Group parallel-safe tasks
3. Delegate to agents
4. Use artifacts (200-400 tokens)
5. Merge results

**Example:**
```yaml
Task: Implement user authentication (8 files)

Parallel Strategy:
  Agent 1 (Backend):
    - backend/app/api/endpoints/auth.py
    - backend/app/core/security.py
    - backend/app/models/user.py
  
  Agent 2 (Frontend):
    - frontend/src/components/LoginForm.tsx
    - frontend/src/store/authStore.ts
  
  Agent 3 (Testing):
    - backend/tests/test_auth.py
    - frontend/src/components/__tests__/LoginForm.test.tsx

Artifact:
  type: design_spec
  summary: "JWT auth with Zustand state"
  files: [list of 8 files]
  decisions: ["FastAPI + JWT", "httpOnly cookies", "Zustand for state"]
```

**Savings:** ~10.7 min/session, 4,921 hours per 100k sessions

---

## END Phase Checklist

**Goal:** Validate changes, create workflow log, ensure completeness.

### ✅ Required Steps

- [ ] **[G4] Run Tests** (automated validation)
  - Backend: `pytest backend/tests/`
  - Frontend: `npm test`
  - Auto-pass: 95.2%
  - ⚠️ BLOCKING if tests fail

- [ ] **[G5] Final Validation** (blocking gate)
  - All TODO items completed (✓ or ✗)
  - No syntax errors
  - No merge conflicts
  - Tests pass
  - ⚠️ **Session MUST NOT proceed if violated**

- [ ] **[G6] Update Documentation**
  - Update README if needed
  - Update technical docs
  - Add inline comments
  - Create/update guides

- [ ] **[REQUIRED] Create Workflow Log**
  - File: `.github/workflows/workflow_<timestamp>.md`
  - Include: TODO, changes, metrics, decisions
  - ⚠️ **Mandatory for traceability**

- [ ] **[AUTO] Run Validation Scripts**
  - `python scripts/validate_changes.py`
  - Check for common issues
  - Generate metrics report

### 📊 Expected Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Tests pass | 100% | Auto-validated |
| TODO completion | 100% | Manual check |
| Workflow log | Present | Required |
| Validation | Pass | Auto-check |

---

## Common Gotchas (Top 10)

Based on analysis of 157 production workflow logs.

### 1. State Updates Not Triggering Re-renders 🔴

**Frequency:** 12 occurrences (7.6%)  
**Avg Resolution:** 23.5 min  
**Complexity:** Medium

**Problem:**
```tsx
// ❌ Direct mutation doesn't trigger re-render
state.user.name = "New Name";
setState(state);
```

**Solution:**
```tsx
// ✅ Use spread operator or immer
setState({
  ...state,
  user: { ...state.user, name: "New Name" }
});
```

---

### 2. Infinite Render Loops from useEffect 🔴

**Frequency:** 11 occurrences (7.0%)  
**Avg Resolution:** 31.2 min  
**Complexity:** High

**Problem:**
```tsx
// ❌ Missing dependency array
useEffect(() => {
  fetchData();
  setState(data);
});
```

**Solution:**
```tsx
// ✅ Add dependency array
useEffect(() => {
  fetchData();
  setState(data);
}, []); // Empty = run once, [deps] = run on deps change
```

---

### 3. Docker Restart ≠ Rebuild Confusion 🟡

**Frequency:** 8 occurrences (5.1%)  
**Avg Resolution:** 14.8 min  
**Complexity:** Low

**Problem:**
```bash
# ❌ Restart doesn't pick up code changes
docker compose restart backend
```

**Solution:**
```bash
# ✅ Rebuild to include code changes
docker compose up -d --build backend
```

---

### 4. SQLAlchemy JSONB Not Detecting Changes 🔴

**Frequency:** 6 occurrences (3.8%)  
**Avg Resolution:** 42.7 min  
**Complexity:** High

**Problem:**
```python
# ❌ Direct mutation not tracked
user.metadata['key'] = 'value'
db.commit()  # Won't save
```

**Solution:**
```python
# ✅ Use flag_modified or reassign
from sqlalchemy.orm.attributes import flag_modified
user.metadata['key'] = 'value'
flag_modified(user, 'metadata')
db.commit()
```

---

### 5. WebSocket Connection Drops on Auth 🟡

**Frequency:** 5 occurrences (3.2%)  
**Avg Resolution:** 28.3 min  
**Complexity:** Medium

**Problem:**
```python
# ❌ JWT validation fails silently
websocket.accept()  # No auth check
```

**Solution:**
```python
# ✅ Validate token before accept
token = await websocket.receive_text()
if not validate_token(token):
    await websocket.close(code=1008)
else:
    await websocket.accept()
```

---

### 6. CORS Configuration Errors 🟡

**Frequency:** 5 occurrences (3.2%)  
**Avg Resolution:** 19.4 min  
**Complexity:** Low

**Problem:**
```python
# ❌ Missing credentials or origins
app.add_middleware(CORSMiddleware)
```

**Solution:**
```python
# ✅ Explicit configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:12000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

---

### 7. TypeScript Type Inference Failures 🟡

**Frequency:** 4 occurrences (2.5%)  
**Avg Resolution:** 26.1 min  
**Complexity:** Medium

**Problem:**
```tsx
// ❌ Implicit any
const data = await fetch("/api/users");
```

**Solution:**
```tsx
// ✅ Explicit types
interface User { id: number; name: string; }
const data: User[] = await fetch("/api/users").then(r => r.json());
```

---

### 8. 307 Redirect on POST (Missing Trailing /) 🟢

**Frequency:** 4 occurrences (2.5%)  
**Avg Resolution:** 8.2 min  
**Complexity:** Low

**Problem:**
```python
# ❌ POST to /api/users redirects to /api/users/
@app.post("/api/users")
```

**Solution:**
```python
# ✅ Add trailing slash
@app.post("/api/users/")
# Or configure redirect_slashes=False
```

---

### 9. Zustand State Not Persisting 🟡

**Frequency:** 3 occurrences (1.9%)  
**Avg Resolution:** 21.7 min  
**Complexity:** Medium

**Problem:**
```tsx
// ❌ Missing persist middleware
const useStore = create((set) => ({ ... }));
```

**Solution:**
```tsx
// ✅ Use persist middleware
import { persist } from 'zustand/middleware';
const useStore = create(
  persist((set) => ({ ... }), { name: 'app-store' })
);
```

---

### 10. FastAPI Dependency Injection Order 🟢

**Frequency:** 3 occurrences (1.9%)  
**Avg Resolution:** 15.3 min  
**Complexity:** Low

**Problem:**
```python
# ❌ Path param after dependency
@app.get("/users/")
async def get_user(db: Session = Depends(get_db), user_id: int):
    pass
```

**Solution:**
```python
# ✅ Path params first, then dependencies
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    pass
```

---

## Performance Tips

### Token Optimization

**Target:** <15,000 tokens/session

✅ **DO:**
- Cache knowledge graph (read 100 lines ONCE)
- Pre-load skills (max 3 based on session type)
- Use artifact delegation (200-400 tokens)
- Batch operations (5 reads, 10 edits, 4 bash chains)

❌ **DON'T:**
- Re-read `project_knowledge.json` mid-session
- Reload skills unnecessarily
- Pass full conversation history in delegations
- Execute operations sequentially without batching

**Expected Savings:** -25% tokens (20,175 → 15,123)

---

### API Call Optimization

**Target:** <30 calls/session

✅ **DO:**
- Batch parallel reads (2-5 files → 1 call)
- Chain bash commands with `&&`
- Group sequential edits (same file)
- Use parallel execution for 6+ files

❌ **DON'T:**
- Read files one by one
- Execute bash commands separately
- Edit files individually
- Skip batching opportunities

**Expected Savings:** -31% API calls (37.4 → 25.7)

---

### Speed Optimization

**Target:** <45 min/session (P50)

✅ **DO:**
- Use G7 delegation for 6+ file tasks
- Batch operations (saves ~3-5 min)
- Query cache before reading files
- Automate gates (G2, G4, G5)

❌ **DON'T:**
- Execute everything sequentially
- Skip parallel execution opportunities
- Read files without checking cache
- Manually validate automated gates

**Expected Savings:** -14.7% resolution time (50.8 → 43.4 min)

---

### Cache Optimization

**Target:** >90% cache hit rate

✅ **WHEN TO CACHE:**
- Hot entities (top 30 by refs): `NOP.Backend.API`, `NOP.Frontend.Components`
- Domain paths (156 total): `backend/app/api/`, `frontend/src/`
- Gotchas (28 issues): State re-renders, useEffect loops, Docker rebuilds

✅ **WHEN TO READ FILE:**
- Cache miss (not in hot_cache, domain_index, or gotchas)
- Need full entity details (cache has summary only)
- Knowledge graph version changed (hash mismatch)

**Expected Hit Rate:** 89.9% (current), >90% (target)

---

### Batching Guidelines

**WHEN TO BATCH:**

| Scenario | Batch? | Max Size | Constraint |
|----------|--------|----------|------------|
| Read 2-5 independent files | ✅ Yes | 5 | No dependencies |
| Read 6+ files | ⚠️ Split | 5 per batch | Group by domain |
| Edit same file (non-overlapping) | ✅ Yes | 10 | Different regions |
| Edit different files (independent) | ✅ Yes | Unlimited | No conflicts |
| Bash commands (sequential) | ✅ Chain | 4 | Chain-able |
| Bash commands (independent) | ✅ Parallel | Unlimited | No shared state |

**WHEN NOT TO BATCH:**

❌ Operations with dependencies (A depends on B)  
❌ Overlapping edits (same file region)  
❌ Conflicting operations (file locks)  
❌ Long-running commands (timeout risk)

---

### Parallelization Guidelines

**WHEN TO PARALLELIZE:**

✅ **Mandatory (G7):** 6+ file tasks  
✅ **Recommended:** 4-5 file tasks with clear separation  
✅ **Suggested:** Backend + Frontend changes (different domains)

**HOW TO PARALLELIZE:**

1. **Analyze dependencies**
   - Backend ← Models ← Database (sequential)
   - Frontend ← Components ← State (sequential)
   - Backend ⊥ Frontend (parallel)

2. **Group tasks by domain**
   - Agent 1: Backend (3 files)
   - Agent 2: Frontend (4 files)
   - Agent 3: Testing (2 files)

3. **Create artifacts**
   - Type: `design_spec` or `code_changes`
   - Size: 200-400 tokens
   - Content: Summary, decisions, files, constraints

4. **Merge results**
   - Check for conflicts
   - Validate integration
   - Run tests

**Expected Rate:** 44.6% of sessions (up from 19.1%)

---

## Quick Commands

### Session Start
```bash
# Load knowledge (100 lines)
cat project_knowledge.json | head -n 100

# Detect session type
echo "Task: [description]" | detect_session_type

# Pre-load skills
load_skills --type fullstack --max 3
```

### During Session
```bash
# Query cache
query_cache "NOP.Backend.API"

# Batch parallel reads
parallel_view ["file1.py", "file2.tsx", "file3.md"]

# Batch sequential edits
edit "app.py" [{"old": "...", "new": "..."}, ...]

# Chain bash commands
bash "cd backend && npm install && npm test"
```

### Session End
```bash
# Run tests
pytest backend/tests/ && npm test

# Validate changes
python scripts/validate_changes.py

# Create workflow log
create_workflow_log --session <id>

# Check metrics
display_metrics --session <id>
```

---

## Metrics Dashboard

```
📊 AKIS Session Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Token Usage:        15,123 tokens  ✅ (-25% vs baseline)
API Calls:          25.7 calls     ✅ (-31% vs baseline)
Resolution Time:    43.4 min       ✅ (-15% vs baseline)
Cache Hit Rate:     89.9%          ⚠️  (target: 90%)
Skill Skip Rate:    28.9%          ⚠️  (target: <10%)
Batching Rate:      72%            ✅ (target: >70%)
Parallel Rate:      44.6%          ✅ (target: >45%)
Success Rate:       88.7%          ✅ (target: >85%)

Phase Breakdown:
  START:   2,200 tokens   (10 sec)
  WORK:    11,523 tokens  (38 min)
  END:     1,400 tokens   (5 min)

Gate Status:
  G0 ✅  G1 ✅  G2 ✅  G3 ✅
  G4 ✅  G5 ✅  G6 ✅  G7 ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✅ All metrics on target
```

---

## Additional Resources

### Documentation
- **[AKIS Optimization Results](../AKIS_Optimization_Results.md)** - Executive summary
- **[AKIS Framework Documentation](../technical/AKIS_Framework.md)** - Technical details
- **[Operation Batching Guide](../../.github/instructions/batching.instructions.md)** - Batching patterns

### Source Files
- **[Main Framework](../../.github/copilot-instructions.md)** - AKIS v7.4 instructions
- **[Knowledge Graph](../../project_knowledge.json)** - Project knowledge base

### Analysis Reports
- **[100k Simulation Results](../analysis/optimization_results_100k.md)** - Validation metrics
- **[Workflow Analysis](../analysis/workflow_analysis_and_research.md)** - Production logs

---

**Document Status:** Production  
**Framework Version:** 7.4 (Optimized)  
**Last Updated:** 2026-01-23  
**For Questions:** See [Troubleshooting](../technical/AKIS_Framework.md#troubleshooting)

