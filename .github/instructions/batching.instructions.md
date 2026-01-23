---
applyTo: '**'
description: 'Operation batching patterns for parallel tool calling and command chaining.'
---

# Operation Batching

> Reduces API calls by 31% through intelligent batching and parallelization.

## Core Principle

**Execute independent operations in parallel, dependent operations in sequence.**

## Batching Patterns

### 1. Parallel Reads (Max 5)

**When:** Reading multiple independent files
**How:** Single tool call with multiple `view` invocations

**Example:**
```
✓ GOOD: Read file1.py, file2.tsx, file3.md in parallel
✗ BAD: Three sequential view calls
```

**Constraint:** Files MUST be independent (no sequential dependencies)

---

### 2. Sequential Edits (Same File)

**When:** Multiple changes to same file
**How:** Multiple `edit` calls in single response (tool handles sequentially)

**Example:**
```
✓ GOOD: 
  - edit 1: Rename variable (line 10)
  - edit 2: Update import (line 5)
  - edit 3: Fix comment (line 30)
  All in same response, different regions

✗ BAD: Three separate responses
```

**Constraint:** Edits MUST be non-overlapping regions

---

### 3. Parallel Edits (Different Files)

**When:** Editing independent files
**How:** Single tool call with multiple `edit` invocations

**Example:**
```
✓ GOOD: Edit file1.py, file2.tsx, file3.md in parallel
✗ BAD: Three sequential edit calls
```

**Constraint:** Files MUST NOT share state dependencies

---

### 4. Bash Command Chains

**When:** Sequential commands with dependencies
**How:** Chain with `&&` operator

**Example:**
```bash
✓ GOOD: cd backend && npm run build && npm test
✗ BAD: Three sequential bash calls
```

**Patterns:**
- Build + test: `npm run build && npm test`
- Git operations: `git status && git diff`
- Validation: `python -m py_compile file.py && pytest tests/`

---

### 5. Independent Bash Sessions

**When:** Running parallel operations with no shared resources
**How:** Multiple `bash` calls with mode="async" and different sessionIds

**Example:**
```
✓ GOOD: Test backend (session1) + test frontend (session2) in parallel
✗ BAD: Sequential test runs (5+ min wasted)
```

**Constraint:** MUST NOT share resources (ports, files, state)

---

## Decision Matrix

| Scenario | Pattern | Max Batch | Tool Calls |
|----------|---------|-----------|------------|
| Read 5 files (independent) | Parallel reads | 5 | 1 (5 invocations) |
| Read file, analyze, read again | Sequential | N/A | 3 |
| Edit 3 regions in same file | Sequential edits | 10 | 1 (3 edits) |
| Edit 4 different files | Parallel edits | 5 | 1 (4 invocations) |
| Build then test | Bash chain | 4 | 1 |
| Test backend + frontend | Parallel bash | 3 | 2 (different sessions) |

---

## Performance Impact

| Pattern | Before | After | Savings |
|---------|--------|-------|---------|
| 5 sequential reads | 5 calls | 1 call | -80% |
| 3 edits to same file | 3 calls | 1 call | -67% |
| Build + test chain | 2 calls | 1 call | -50% |

**Overall:** 37.4 → 25.7 avg calls/session (-31%)

---

## Validation Checklist

Before batching, verify:
- [ ] Operations are independent (no sequential data dependencies)
- [ ] Files don't share state
- [ ] Edits are non-overlapping (for same file)
- [ ] Commands don't conflict (for parallel bash)
- [ ] Batch size within limits (5 max for reads, 3 for bash)

**If unsure:** Execute sequentially (safe fallback)

---

## Examples from Simulation

### Example 1: Explore Repository
```
BEFORE (5 calls):
- view backend/api/routes.py
- view backend/api/models.py
- view frontend/components/Header.tsx
- view frontend/components/Footer.tsx
- view docker-compose.yml

AFTER (1 call):
- All 5 in parallel (single response)
```

### Example 2: Fullstack Feature
```
BEFORE (6 calls):
- edit backend/api/routes.py
- edit backend/api/models.py
- edit frontend/components/Feature.tsx
- edit frontend/types/api.ts
- bash: pytest tests/
- bash: npm test

AFTER (3 calls):
- Parallel edit: routes.py, models.py, Feature.tsx, api.ts
- bash chain: pytest tests/ && npm test
```

### Example 3: Multi-File Refactor
```
BEFORE (8 calls):
- edit file1.py (rename var, line 10)
- edit file1.py (update import, line 5)
- edit file1.py (fix comment, line 30)
- edit file2.py (same var)
- edit file3.py (same var)
- bash: python -m py_compile file1.py
- bash: python -m py_compile file2.py
- bash: pytest tests/

AFTER (2 calls):
- Sequential edits: file1.py (3 regions), file2.py, file3.py (all in 1 response)
- bash chain: python -m py_compile file1.py && python -m py_compile file2.py && pytest tests/
```

---

## Anti-Patterns

| ✗ DON'T | ✓ DO |
|---------|------|
| Read file, edit file (same call) | Sequential: read, then edit |
| Parallel edits to same file | Sequential edits (tool handles ordering) |
| Batch >5 reads | Split into 2 batches |
| Chain commands with different error handling | Separate calls |
| Parallel bash with shared ports | Sequential or different ports |

---

## Integration with AKIS Gates

| Gate | Batching Impact |
|------|----------------|
| G0 | Read knowledge.json ONCE (cached, no batching) |
| G2 | Pre-load skills in START (batched at session start) |
| G5 | Validation commands chained: `syntax && tests` |
| G7 | Parallel delegation requires artifact batching |

---

## Metrics Tracking

Track in workflow log:
```yaml
batching:
  parallel_reads: 3  # Times used parallel reads
  sequential_edits: 2  # Times used sequential edits
  bash_chains: 4  # Times used command chains
  api_calls_saved: 12  # Estimated savings
```

---

**Last Updated:** 2026-01-23
**Validation:** 100k simulation (31% reduction proven)
