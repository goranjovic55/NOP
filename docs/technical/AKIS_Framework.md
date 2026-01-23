---
title: AKIS Framework Technical Documentation
type: reference
audience: developers, architects
status: production
last_updated: 2026-01-23
version: 7.4
---

# AKIS Framework Technical Documentation

**Version:** 7.4 (Optimized)  
**Framework:** AI-Assisted Development Knowledge & Instruction System  
**Project:** NOP - Network Observatory Platform  
**Last Updated:** January 23, 2026

---

## Table of Contents

1. [Framework Overview](#framework-overview)
2. [Architecture](#architecture)
3. [Optimization Components](#optimization-components)
4. [Configuration](#configuration)
5. [Metrics & Monitoring](#metrics--monitoring)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Framework Overview

### What is AKIS?

AKIS (AI-Assisted Development Knowledge & Instruction System) is a comprehensive framework for orchestrating AI agents in software development. It provides:

- **8-gate quality system** for workflow governance
- **Knowledge graph integration** for context-aware assistance
- **Multi-agent orchestration** with delegation protocols
- **Skill-based specialization** with 17+ domain skills
- **Traceability and compliance** through structured workflows

### AKIS v7.4 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AKIS v7.4 Framework                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   START     │  │    WORK     │  │     END     │     │
│  │  (Gates 0-2)│  │  (Gates 3-7)│  │ (Gates 4-5) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                 │                 │            │
│         ▼                 ▼                 ▼            │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Knowledge Graph v4.0                    │   │
│  │  • 30 hot entities    • 156 file paths          │   │
│  │  • 28 gotchas        • 89.9% cache hit rate     │   │
│  └──────────────────────────────────────────────────┘   │
│         │                 │                 │            │
│         ▼                 ▼                 ▼            │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Skill Pre-loading System                │   │
│  │  • 5 session types   • 17 skills available      │   │
│  │  • Auto-detection    • 87% accuracy             │   │
│  └──────────────────────────────────────────────────┘   │
│         │                 │                 │            │
│         ▼                 ▼                 ▼            │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Operation Optimizer                     │   │
│  │  • Parallel batching • 72% batch rate           │   │
│  │  • Dependency graph  • -31% API calls           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 8-Gate Quality System

| Gate | Name | Purpose | Enforcement | Auto-Pass Rate |
|------|------|---------|-------------|----------------|
| **G0** | Knowledge Load | Load knowledge graph (100 lines) | 🔴 BLOCKING | 92.5% |
| **G1** | Plan Creation | Create task breakdown | ⚠️ Warning | 89.2% |
| **G2** | Skill Pre-load | Load domain skills | 🔴 BLOCKING | 96.8% (auto) |
| **G3** | Implementation | Code changes | ⚠️ Warning | 85.3% |
| **G4** | Testing | Validate changes | 🔴 BLOCKING | 95.2% (auto) |
| **G5** | Review | Final validation | 🔴 BLOCKING | 94.1% (auto) |
| **G6** | Documentation | Update docs | ⚠️ Warning | 88.1% |
| **G7** | Parallelization | Use delegation | ⚠️ Enforced | 44.6% |

**Enforcement Levels:**
- 🔴 **BLOCKING:** Session cannot proceed if violated
- ⚠️ **Warning:** Logged but allows continuation
- ⚠️ **Enforced:** Mandatory for 6+ file tasks

### Knowledge Graph Integration

**Structure:**
```json
{
  "hot_cache": {
    "NOP.Backend.API": {
      "type": "module",
      "refs": 142,
      "path": "backend/app/api/",
      "deps": ["NOP.Backend.Services", "NOP.Models"]
    }
  },
  "domain_index": {
    "backend": [
      "backend/app/api/endpoints/",
      "backend/app/services/",
      ...82 paths
    ],
    "frontend": [
      "frontend/src/components/",
      "frontend/src/pages/",
      ...74 paths
    ]
  },
  "gotchas": {
    "state_not_rerendering": {
      "issue": "State updates not triggering re-renders",
      "solution": "Use spread operator or immer",
      "frequency": 12,
      "avg_resolution": "23.5 min"
    }
  }
}
```

**Cache Hit Rate:** 89.9% (target: 90%)

---

## Architecture

### Session Lifecycle

```
┌────────────────────────────────────────────────────────┐
│ 1. START PHASE                                         │
├────────────────────────────────────────────────────────┤
│ [G0] Load knowledge graph (100 lines, cache in memory)│
│ ↓                                                       │
│ [AUTO] Detect session type (5 patterns)               │
│ ↓                                                       │
│ [G2] Pre-load skills (max 3, based on session type)   │
│ ↓                                                       │
│ [G1] Create TODO list (track all tasks)               │
└────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────┐
│ 2. WORK PHASE                                          │
├────────────────────────────────────────────────────────┤
│ FOR EACH TASK:                                         │
│   ↓                                                     │
│   [G3] Implement changes                               │
│   ↓                                                     │
│   [G4] Run tests (automated validation)                │
│   ↓                                                     │
│   [OPT] Batch operations (parallel reads, seq edits)   │
│   ↓                                                     │
│   [G7] Delegate if 6+ files (parallel execution)      │
└────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────┐
│ 3. END PHASE                                           │
├────────────────────────────────────────────────────────┤
│ [G5] Validate all changes (blocking)                   │
│ ↓                                                       │
│ [G6] Update documentation                              │
│ ↓                                                       │
│ [REQUIRED] Create workflow log                         │
│ ↓                                                       │
│ [AUTO] Run validation scripts                          │
└────────────────────────────────────────────────────────┘
```

### Multi-Agent Orchestration

**Agent Hierarchy:**
```
DevTeam (Orchestrator)
├── Architect     → Design decisions, system architecture
├── Developer     → Implementation, code changes
├── Reviewer      → Testing, validation, QA
└── Researcher    → Investigation, analysis, documentation
```

**Delegation Protocol:**

1. **Artifact Creation** (200-400 tokens vs 1,500 baseline)
   ```yaml
   design_spec:
     summary: "Brief distillation (50-100 words)"
     key_decisions: ["decision1", "decision2"]
     files: ["file1.py", "file2.tsx"]
     constraints: ["constraint1"]
   ```

2. **Handoff**
   - Pass artifact (not full conversation)
   - Include only actionable content
   - Target: 200-400 tokens

3. **Return Results**
   - Use artifact format
   - Track changes
   - Maintain traceability

---

## Optimization Components

### Component 1: Knowledge Caching

**What:** Load `project_knowledge.json` (first 100 lines) ONCE per session, cache in memory.

**How It Works:**
```python
# Pseudo-code
def start_session():
    # Load once at START
    knowledge = load_knowledge_graph(lines=100)
    
    # Cache structure
    cache = {
        "hot_cache": extract_top_entities(knowledge, n=30),
        "domain_index": build_file_index(knowledge),
        "gotchas": extract_gotchas(knowledge)
    }
    
    # Query interface
    def query(entity: str):
        return (
            cache["hot_cache"].get(entity) or
            cache["domain_index"].get(entity) or
            cache["gotchas"].get(entity) or
            fallback_file_read(entity)
        )
```

**Configuration:**
- **Lines to load:** 100 (covers 89.9% of queries)
- **Cache lifetime:** Session duration
- **Invalidation:** Hash validation on load
- **Fallback:** Read file if cache miss (0% impact)

**Impact:**
- Token savings: ~1,200/session
- Cache hit rate: 89.9%
- Speed improvement: 0.8-1.2 seconds

**Gotchas:**
- ⚠️ Don't re-read `project_knowledge.json` during session
- ⚠️ Validate hash on load to detect staleness
- ✓ Fallback to file read if cache invalid

---

### Component 2: Skill Pre-loading

**What:** Auto-detect session type, pre-load appropriate skills at START.

**How It Works:**
```python
# Session type detection
def detect_session_type(context: str) -> str:
    patterns = {
        'fullstack': r'\.(tsx|jsx|ts).*(\.py|backend/)',
        'frontend': r'\.(tsx|jsx|ts)',
        'backend': r'\.py|backend/|api/',
        'docker': r'Dockerfile|docker-compose',
        'akis': r'\.github/(skills|agents|instructions)'
    }
    
    for type, pattern in patterns.items():
        if re.search(pattern, context):
            return type
    
    return 'general'

# Skill pre-loading
def preload_skills(session_type: str):
    skill_map = {
        'fullstack': ['frontend-react', 'backend-api', 'debugging'],
        'frontend': ['frontend-react', 'debugging'],
        'backend': ['backend-api', 'debugging'],
        'docker': ['docker', 'backend-api'],
        'akis': ['akis-dev', 'documentation']
    }
    
    skills = skill_map.get(session_type, [])
    for skill in skills:
        load_skill_once(skill)  # Cache for session
```

**Configuration:**
- **Detection accuracy:** 87-98% (varies by type)
- **Max skills pre-loaded:** 3
- **Skill token cost:** 189-312 tokens each
- **Enforcement:** G2 BLOCKING (no reloads)

**Session Types:**

| Type | Detection Pattern | Pre-loaded Skills | Accuracy |
|------|------------------|-------------------|----------|
| Fullstack | `.tsx/.jsx` + `.py/backend/` | frontend-react, backend-api, debugging | 87% |
| Frontend | `.tsx/.jsx/.ts` only | frontend-react, debugging | 96% |
| Backend | `.py/backend/api/` | backend-api, debugging | 98% |
| Docker | `Dockerfile` | docker, backend-api | 92% |
| AKIS | `.github/skills/agents/` | akis-dev, documentation | 95% |

**Impact:**
- Token savings: ~2,720/session (eliminates reloads)
- Upfront cost: 746-1,200 tokens (still 57% net savings)
- Skip rate reduction: 30,804 → 28,857 violations (-6.3%)

**Gotchas:**
- ⚠️ Block duplicate skill loads (G2 enforcement)
- ⚠️ Wrong skills pre-loaded? Manual override available
- ✓ On-demand loading still available if needed

---

### Component 3: Gate Automation

**What:** Automate non-critical gates (G2, G4, G5) to reduce manual overhead.

**How It Works:**
```python
# Auto-gate validation
def validate_gate(gate: str, context: dict) -> bool:
    validators = {
        'G2': validate_skills_loaded,
        'G4': validate_tests_pass,
        'G5': validate_changes_complete
    }
    
    validator = validators.get(gate)
    if validator and validator(context):
        log(f"Gate {gate} auto-passed")
        return True
    
    # Fallback to manual validation
    return manual_validate(gate, context)
```

**Auto-Pass Rates:**

| Gate | Auto-Pass Rate | Manual Override | Blocking? |
|------|----------------|-----------------|-----------|
| G2 (Skills) | 96.8% | Available | 🔴 Yes |
| G4 (Tests) | 95.2% | Available | 🔴 Yes |
| G5 (Review) | 94.1% | Available | 🔴 Yes |

**Configuration:**
- **Auto-validation:** Enabled for G2, G4, G5
- **Rollback triggers:** Test failures, validation errors
- **Manual override:** Always available

**Impact:**
- Time savings: ~2 minutes/session
- Discipline improvement: +7.5%
- Gate compliance: 95%+ for automated gates

---

### Component 4: Operation Batching

**What:** Group related operations (reads, edits, commands) to reduce API calls.

**How It Works:**

**Pattern 1: Parallel Reads (Max 5)**
```python
# Before (3 API calls):
view("file1.py")
view("file2.tsx")
view("file3.md")

# After (1 API call):
parallel_view([
    "file1.py",
    "file2.tsx",
    "file3.md"
])
```

**Pattern 2: Sequential Edits (Same File)**
```python
# Multiple edits in one tool call
edit("app.py", [
    {"old": "version = 1", "new": "version = 2"},
    {"old": "debug = True", "new": "debug = False"}
])
```

**Pattern 3: Bash Command Chains**
```bash
# Before (3 calls):
bash("cd backend")
bash("npm install")
bash("npm test")

# After (1 call):
bash("cd backend && npm install && npm test")
```

**Decision Matrix:**

| Operation | Files | Dependencies | Action |
|-----------|-------|--------------|--------|
| Read | 2-5 | Independent | ✅ Parallel batch |
| Read | 6+ | Independent | ⚠️ Split into groups of 5 |
| Edit | Multiple | Same file | ✅ Sequential batch |
| Edit | Multiple | Different files | ✅ Parallel (separate tool calls) |
| Bash | Multiple | Sequential | ✅ Chain with `&&` |
| Bash | Multiple | Independent | ✅ Parallel sessions |

**Configuration:**
- **Max parallel reads:** 5 files
- **Max sequential edits:** 10 per file
- **Max bash chains:** 4 commands
- **Dependency analysis:** Automatic

**Impact:**
- API call reduction: ~5 calls/session
- Batching rate: 72% of eligible operations
- Token savings: ~600/session

**See:** `.github/instructions/batching.instructions.md` for complete guide

---

### Component 5: Artifact Delegation

**What:** Pass compressed artifacts (200-400 tokens) instead of full context (1,500 tokens) when delegating.

**How It Works:**

**Artifact Types:**

**1. Design Spec**
```yaml
type: design_spec
summary: "Create user authentication system with JWT tokens"
key_decisions:
  - "Use FastAPI + JWT for auth"
  - "Store tokens in httpOnly cookies"
  - "Implement refresh token rotation"
files:
  - "backend/app/api/endpoints/auth.py"
  - "backend/app/core/security.py"
constraints:
  - "Must be backward compatible"
  - "Use existing User model"
```

**2. Research Findings**
```yaml
type: research_findings
summary: "Analysis of state management options for NOP frontend"
key_insights:
  - "Zustand lighter than Redux (2.9kb vs 15kb)"
  - "Better TypeScript support"
  - "Simpler API for our use case"
recommendations:
  - "Migrate from Redux to Zustand"
  - "Start with auth store"
sources:
  - "docs/architecture/STATE_MANAGEMENT.md"
  - "Industry benchmarks"
```

**3. Code Changes**
```yaml
type: code_changes
files_modified:
  - "frontend/src/store/authStore.ts"
  - "frontend/src/components/LoginForm.tsx"
summary: "Implemented JWT authentication with Zustand state management"
tests_status: "✅ All tests pass (12/12)"
rollback_plan:
  - "Revert commits abc123..def456"
  - "Clear localStorage auth tokens"
```

**Configuration:**
- **Token target:** 200-400 tokens (vs 1,500 baseline)
- **Artifact usage:** 65% of delegations
- **Quality validation:** Auto-check completeness

**Impact:**
- Token savings: ~900 tokens/delegated session
- Delegation success: 93.5%
- Traceability: +2pp

**Gotchas:**
- ⚠️ Must include all actionable content
- ⚠️ No conversation history (artifacts only)
- ✓ Auto-cleanup after session

---

### Component 6: Parallel Execution

**What:** Mandatory delegation for 6+ file tasks (G7 enforcement).

**How It Works:**
```python
def should_delegate(task: dict) -> bool:
    file_count = len(task.get("files", []))
    
    # G7: Mandatory for 6+ files
    if file_count >= 6:
        return True
    
    # Suggest for complex tasks
    if task.get("complexity") == "high":
        return "suggested"
    
    return False

def execute_parallel(tasks: List[dict]):
    # Group parallel-safe tasks
    groups = analyze_dependencies(tasks)
    
    # Execute in parallel
    results = parallel_execute([
        delegate_to_agent(agent, group)
        for agent, group in groups.items()
    ])
    
    # Merge results
    return merge_results(results)
```

**Configuration:**
- **Threshold:** 6+ files = mandatory
- **Parallel rate:** 44.6% of sessions
- **Success rate:** 82.6%
- **Avg agents:** 2.15 per parallel session

**Impact:**
- Parallelization: 19.1% → 44.6% (+133%)
- Time savings: 4,921 hours per 100k sessions
- Value: $246,050 (at $50/hr)

**Gotchas:**
- ⚠️ Detect conflicts before parallel execution
- ⚠️ Fallback to sequential if conflicts detected
- ✓ Auto-merge with conflict resolution

---

## Configuration

### Environment Variables

**Not applicable** - AKIS is instruction-based, no environment config needed.

### Framework Configuration

Located in `.github/copilot-instructions.md`:

**Gate Enforcement:**
```yaml
gates:
  G0: { blocking: true, auto: false }
  G1: { blocking: false, auto: false }
  G2: { blocking: true, auto: true }   # Skill pre-loading
  G3: { blocking: false, auto: false }
  G4: { blocking: true, auto: true }   # Testing
  G5: { blocking: true, auto: true }   # Review
  G6: { blocking: false, auto: false }
  G7: { blocking: false, auto: false } # Enforced for 6+ files
```

**Knowledge Cache:**
```yaml
knowledge_cache:
  enabled: true
  lines_to_load: 100
  cache_lifetime: session
  fallback: file_read
```

**Skill Pre-loading:**
```yaml
skill_preloading:
  enabled: true
  max_skills: 3
  detection_patterns:
    fullstack: '\.(tsx|jsx|ts).*(\.py|backend/)'
    frontend: '\.(tsx|jsx|ts)'
    backend: '\.py|backend/|api/'
    docker: 'Dockerfile|docker-compose'
    akis: '\.github/(skills|agents|instructions)'
```

**Operation Batching:**
```yaml
batching:
  enabled: true
  max_parallel_reads: 5
  max_sequential_edits: 10
  max_bash_chains: 4
```

### Performance Tuning

**Token Budget:**
- **Max context:** 3,500 tokens (reduced from 4,000)
- **Skill target:** 200 tokens (reduced from 250)
- **Delegation target:** 200-400 tokens

**Cache Tuning:**
- **Hot cache size:** 30 entities (top by refs)
- **Domain index:** 156 file paths
- **Gotchas:** 28 issues + solutions
- **TTL:** Session lifetime (no expiry)

**Batching Limits:**
- **Parallel reads:** 5 (optimal for most scenarios)
- **Sequential edits:** 10 (prevents batch complexity)
- **Bash chains:** 4 (readability threshold)

---

## Metrics & Monitoring

### Key Metrics

**Per-Session Metrics:**

| Metric | Baseline | Optimized | Target | How to Measure |
|--------|----------|-----------|--------|----------------|
| Token Usage | 20,175 | 15,123 | <15,000 | Count tokens in context |
| API Calls | 37.4 | 25.7 | <30 | Count tool invocations |
| Resolution Time | 50.8 min | 43.4 min | <45 min | Session start to end |
| Cache Hit Rate | 0% | 89.9% | >90% | Cache hits / total queries |
| Skill Skip Rate | 30.8% | 28.9% | <10% | G2 violations / sessions |
| Batching Rate | - | 72% | >80% | Batched ops / total ops |
| Parallel Rate | 19.1% | 44.6% | >45% | Parallel sessions / total |
| Success Rate | 86.6% | 88.7% | >90% | Successful / total sessions |

### Measuring Each Metric

**1. Token Usage**
```python
# Track in workflow log
def log_tokens(phase: str, tokens: int):
    workflow_log.append({
        "phase": phase,
        "tokens": tokens,
        "cumulative": sum(log["tokens"] for log in workflow_log)
    })

# Example
log_tokens("START", 1200)  # Knowledge + skills
log_tokens("WORK", 8500)   # Implementation
log_tokens("END", 400)     # Validation
# Total: 10,100 tokens
```

**2. API Calls**
```python
# Count tool invocations
api_calls = len([
    call for call in session_history
    if call["type"] in ["view", "edit", "bash", "create"]
])
```

**3. Cache Hit Rate**
```python
cache_hits = 0
total_queries = 0

def query_knowledge(entity: str):
    global cache_hits, total_queries
    total_queries += 1
    
    if entity in cache["hot_cache"]:
        cache_hits += 1
        return cache["hot_cache"][entity]
    # ... other cache levels
    
# At end of session:
hit_rate = (cache_hits / total_queries) * 100
```

**4. Skill Skip Rate**
```python
# Track G2 violations
skill_skips = count_violations("skip_skill_loading")
skip_rate = (skill_skips / total_sessions) * 100
```

**5. Batching Rate**
```python
# Track batched operations
batched_ops = count_batched_operations()
total_ops = count_all_operations()
batching_rate = (batched_ops / total_ops) * 100
```

### Expected Baselines

**Optimized Configuration (AKIS v7.4):**

| Metric | P25 | P50 | P75 | P95 |
|--------|-----|-----|-----|-----|
| Token Usage | 12,000 | 15,123 | 18,500 | 24,000 |
| API Calls | 20 | 25.7 | 32 | 42 |
| Resolution Time | 35 min | 43.4 min | 55 min | 72 min |
| Cache Hit Rate | 85% | 89.9% | 92% | 95% |

### Alerting Thresholds

**Critical (Immediate Action Required):**
- Token usage > 25,000/session (>65% above target)
- API calls > 50/session (>94% above target)
- Cache hit rate < 70% (>22% below target)
- Success rate < 82% (>7% below baseline)

**Warning (Investigate):**
- Token usage > 20,000/session (>32% above target)
- API calls > 40/session (>56% above target)
- Cache hit rate < 80% (>11% below target)
- Skill skip rate > 35% (>21% above current)

**Monitoring Dashboard:**
```python
# Pseudo-code for metrics dashboard
def display_metrics(period: str = "last_7_days"):
    metrics = fetch_metrics(period)
    
    print(f"📊 AKIS Metrics ({period})")
    print(f"Token Usage:    {metrics['tokens_avg']:,.0f} ({metrics['tokens_trend']})")
    print(f"API Calls:      {metrics['api_avg']:.1f} ({metrics['api_trend']})")
    print(f"Cache Hit Rate: {metrics['cache_hit']:.1f}% ({metrics['cache_trend']})")
    print(f"Success Rate:   {metrics['success']:.1f}% ({metrics['success_trend']})")
    
    # Alerts
    if metrics['tokens_avg'] > 20000:
        print("⚠️  WARNING: Token usage above threshold")
    if metrics['cache_hit'] < 80:
        print("⚠️  WARNING: Cache hit rate below threshold")
```

---

## Best Practices

### DO ✅

**Knowledge Management:**
- ✅ Read `project_knowledge.json` (100 lines) ONCE at START
- ✅ Cache hot entities, domain index, gotchas
- ✅ Query cache before reading files
- ✅ Validate hash on load

**Skill Loading:**
- ✅ Auto-detect session type from context
- ✅ Pre-load max 3 skills based on type
- ✅ Cache skills for session lifetime
- ✅ Block duplicate loads (G2 enforcement)

**Operation Batching:**
- ✅ Batch parallel reads (2-5 files)
- ✅ Group sequential edits (same file)
- ✅ Chain bash commands with `&&`
- ✅ Check dependencies before batching

**Delegation:**
- ✅ Use artifacts (200-400 tokens)
- ✅ Include all actionable content
- ✅ Maintain traceability
- ✅ Clean up after session

**Parallel Execution:**
- ✅ Delegate for 6+ file tasks (mandatory)
- ✅ Detect conflicts before parallel execution
- ✅ Use dependency analysis
- ✅ Merge results carefully

### DON'T ⚠️

**Knowledge Management:**
- ⚠️ Don't re-read `project_knowledge.json` during session
- ⚠️ Don't skip hash validation
- ⚠️ Don't cache stale data
- ⚠️ Don't query without checking cache first

**Skill Loading:**
- ⚠️ Don't reload skills mid-session
- ⚠️ Don't skip skill pre-loading
- ⚠️ Don't load more than 3 skills upfront
- ⚠️ Don't ignore session type detection

**Operation Batching:**
- ⚠️ Don't batch operations with dependencies
- ⚠️ Don't exceed max batch sizes (5 reads, 10 edits)
- ⚠️ Don't batch without analyzing dependencies
- ⚠️ Don't ignore batch failures

**Delegation:**
- ⚠️ Don't pass full conversation history
- ⚠️ Don't exceed 400 token artifact size
- ⚠️ Don't delegate without clear artifacts
- ⚠️ Don't lose traceability in handoffs

**Parallel Execution:**
- ⚠️ Don't parallelize conflicting operations
- ⚠️ Don't skip conflict detection
- ⚠️ Don't merge without validation
- ⚠️ Don't ignore parallel failures

---

## Troubleshooting

### Common Issues

#### Issue 1: High Token Usage (>20,000/session)

**Symptoms:**
- Token usage consistently above baseline
- Slow responses
- Context truncation errors

**Diagnosis:**
```python
# Check where tokens are being used
analyze_token_usage(session_log)
# Output:
# - Knowledge loading: 2,500 tokens (should be ~1,200)
# - Skill loading: 1,800 tokens (should be ~800)
# - Delegation: 3,500 tokens (should be ~900)
```

**Solutions:**
1. ✅ Verify knowledge cache is enabled and working
2. ✅ Check skill pre-loading (should load max 3)
3. ✅ Use artifact delegation (200-400 tokens)
4. ✅ Review operation batching patterns

---

#### Issue 2: Low Cache Hit Rate (<80%)

**Symptoms:**
- Frequent file reads for knowledge
- Cache misses logged
- Higher token usage

**Diagnosis:**
```python
# Check cache statistics
cache_stats = get_cache_stats(session)
# Output:
# - Total queries: 45
# - Cache hits: 32 (71%)
# - Hot cache: 15 hits
# - Domain index: 12 hits
# - Gotchas: 5 hits
# - Fallback: 13 misses
```

**Solutions:**
1. ✅ Verify 100 lines loaded at START
2. ✅ Check cache invalidation (shouldn't happen mid-session)
3. ✅ Review query patterns (are they cacheable?)
4. ✅ Expand hot cache if needed (current: 30 entities)

---

#### Issue 3: High Skill Skip Rate (>35%)

**Symptoms:**
- Frequent skill reload violations
- G2 warnings in logs
- Higher token usage

**Diagnosis:**
```python
# Check skill violations
violations = count_violations("skip_skill_loading")
# Output: 42 skips in 100 sessions (42%)
```

**Solutions:**
1. ✅ Ensure session type detection is working
2. ✅ Verify skill pre-loading at START
3. ✅ Check G2 enforcement (should block reloads)
4. ✅ Review manual override usage

---

#### Issue 4: Low Batching Rate (<60%)

**Symptoms:**
- Many sequential operations
- High API call count
- Slow execution

**Diagnosis:**
```python
# Check batching opportunities
analyze_batching(session_log)
# Output:
# - Parallel reads possible: 12 (batched: 5, missed: 7)
# - Sequential edits possible: 8 (batched: 6, missed: 2)
# - Bash chains possible: 4 (batched: 2, missed: 2)
```

**Solutions:**
1. ✅ Review batching patterns documentation
2. ✅ Use dependency analysis before operations
3. ✅ Group related reads/edits/commands
4. ✅ Check max batch limits (5 reads, 10 edits, 4 bash)

---

#### Issue 5: Low Parallel Execution (<40%)

**Symptoms:**
- Most sessions sequential
- Long resolution times
- G7 not triggering

**Diagnosis:**
```python
# Check parallel eligibility
check_parallel_eligibility(sessions)
# Output:
# - 6+ file tasks: 28 (parallelized: 18, missed: 10)
# - Parallel rate: 35.7% (below 44.6% target)
```

**Solutions:**
1. ✅ Verify G7 enforcement for 6+ files
2. ✅ Check conflict detection (too conservative?)
3. ✅ Review dependency analysis
4. ✅ Consider suggesting parallel for 4-5 file tasks

---

### Debug Mode

**Enable verbose logging:**

Add to workflow log:
```yaml
debug:
  enabled: true
  log_level: verbose
  track_metrics:
    - token_usage
    - api_calls
    - cache_stats
    - skill_loads
    - batching_ops
    - parallel_sessions
```

**Output example:**
```
[DEBUG] START Phase
  [G0] Knowledge loaded: 100 lines, 1,200 tokens
  [CACHE] Hot entities: 30, Domain paths: 156, Gotchas: 28
  [AUTO] Session type detected: fullstack (confidence: 92%)
  [G2] Skills pre-loaded: frontend-react (245t), backend-api (312t), debugging (189t)
  [G1] TODO created: 4 tasks

[DEBUG] WORK Phase
  [BATCH] Parallel reads: 3 files → 1 API call
  [CACHE] Knowledge query: NOP.Backend.API → HIT (hot_cache)
  [EDIT] Sequential edits: app.py → 3 changes in 1 call
  [G7] Delegation triggered: 7 files → parallel execution
  [ARTIFACT] Created design_spec: 287 tokens

[DEBUG] END Phase
  [G5] Validation: All tests pass ✅
  [WORKFLOW] Log created: .github/workflows/workflow_123.md
  
[METRICS]
  Token usage: 14,892 (-26% vs baseline)
  API calls: 24 (-36% vs baseline)
  Cache hit rate: 91.2%
  Resolution time: 42.3 min (-17% vs baseline)
```

---

## Additional Resources

### Documentation
- **[AKIS Optimization Results](../AKIS_Optimization_Results.md)** - Executive summary
- **[AKIS Quick Reference](../guides/AKIS_Quick_Reference.md)** - Quick lookup guide
- **[Operation Batching Guide](../../.github/instructions/batching.instructions.md)** - Detailed batching patterns

### Source Files
- **[Main Framework](../../.github/copilot-instructions.md)** - AKIS v7.4 instructions
- **[Protocols](../../.github/instructions/protocols.instructions.md)** - Session protocols
- **[Knowledge Graph](../../project_knowledge.json)** - Project knowledge base

### Analysis Reports
- **[100k Simulation Results](../analysis/optimization_results_100k.md)** - Validation metrics
- **[Baseline Metrics](../analysis/baseline_metrics_100k.md)** - Pre-optimization baseline
- **[Workflow Analysis](../analysis/workflow_analysis_and_research.md)** - Production log analysis
- **[Optimization Blueprint](../../.project/akis_optimization_blueprint.md)** - Architecture design

---

**Document Status:** Production  
**Framework Version:** 7.4 (Optimized)  
**Last Updated:** 2026-01-23  
**Maintained By:** DevTeam

**For Questions:** See [Troubleshooting](#troubleshooting) or create an issue

