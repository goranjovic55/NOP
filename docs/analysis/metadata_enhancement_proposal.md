# manage_todo_list Metadata Enhancement Proposal

> In-depth analysis of metadata support for `manage_todo_list` and delegation tracking

**Date**: 2026-01-15  
**Version**: 1.0  
**Status**: ✅ RECOMMENDED

## Executive Summary

Based on 100k session simulation, **METADATA ENHANCED** approach is recommended:

| Scenario | Token Overhead | Traceability Gain | Cost-Benefit Ratio | Verdict |
|----------|---------------|-------------------|-------------------|---------|
| **Metadata Enhanced** | +149.2% | +350% | **0.43:1** | ✅ **RECOMMENDED** |
| session.json PLAN | +205.2% | +250% | 0.82:1 | ◆ Acceptable |
| Hybrid | +354.4% | +375% | 0.95:1 | ✗ Too expensive |

**Key Benefits**:
- +350% traceability improvement
- 100% delegation chain visibility  
- 100% full lineage tracking
- +1.1% success rate improvement

---

## 1. Proposed Metadata Structure

### 1.1 Core Schema

```typescript
interface TaskMetadata {
  // Identity
  id: string;                    // UUID (e.g., "abc-12345")
  task: string;                  // Task description
  status: '○' | '◆' | '✓' | '⊘' | '⧖';
  
  // Delegation tracking
  assigned_to: string;           // Agent name (e.g., "code", "architect")
  delegation_depth: number;      // 0=root, 1=first delegate, etc.
  parent_task_id?: string;       // Parent task ID for chain
  
  // Execution hints
  parallel_group?: string;       // Group ID for parallel tasks
  dependencies?: string[];       // Task IDs that must complete first
  skill?: string;                // Required skill (e.g., "frontend-react")
  
  // Timing
  created_at: string;            // ISO timestamp
  started_at?: string;           // When started
  completed_at?: string;         // When completed
  
  // Results
  result?: string;               // Completion result/outcome
  artifacts?: string[];          // Generated files
}
```

### 1.2 Enhanced Tool Signature

```python
# Current
manage_todo_list(action="add", task="Implement feature")

# Enhanced
manage_todo_list(
    action: str,          # "add", "start", "complete", "delegate", "list"
    task: str = None,
    task_id: str = None,
    metadata: dict = None,  # NEW: Rich metadata
    result: str = None      # NEW: Completion result
) -> dict
```

### 1.3 Usage Examples

```python
# Create task with metadata
manage_todo_list(
    action="add",
    task="Design API schema",
    metadata={
        "assigned_to": "architect",
        "skill": "backend-api",
        "parallel_group": "design-phase"
    }
)

# Delegate task
manage_todo_list(
    action="delegate",
    task_id="abc-123",
    metadata={
        "assigned_to": "code",
        "delegation_depth": 1,
        "parent_task_id": "root-001"
    }
)

# Complete task with result
manage_todo_list(
    action="complete",
    task_id="abc-123",
    result="Schema defined with 8 endpoints",
    metadata={
        "artifacts": ["docs/api_schema.md", "backend/app/models.py"]
    }
)
```

---

## 2. Delegation Metadata Protocol

### 2.1 Context Passed TO Delegated Agent (runSubagent)

When delegating via `runSubagent`, pass structured context:

```python
# Delegation context structure
delegation_context = {
    "parent_task_id": "abc-123",
    "delegation_depth": 1,
    "parent_agent": "AKIS",
    "task_description": "Implement authentication endpoint",
    "delegation_chain": [
        {"task_id": "root-001", "task": "Build auth system", "agent": "AKIS"},
        {"task_id": "abc-123", "task": "Design API", "agent": "architect"}
    ],
    "dependencies_resolved": ["design-001", "schema-002"],
    "skill_required": "backend-api"
}

# Pass to runSubagent
runSubagent(
    agentName="code",
    prompt=f"Implement: {task}\n\n[CONTEXT] {json.dumps(delegation_context)}",
    description="Implement auth endpoint"
)
```

### 2.2 Results Returned FROM Delegated Agent

Standardized result structure from delegated agents:

```python
# Delegation result structure
delegation_result = {
    "status": "success",  # "success" | "failure" | "partial"
    "result": "Implemented auth endpoint with JWT validation",
    "artifacts": [
        "backend/app/api/v1/endpoints/auth.py",
        "backend/app/tests/test_auth.py"
    ],
    "todo_state": {
        "total": 5,
        "completed": 5,
        "blocked": 0
    },
    "delegation_metadata": {
        "parent_task_id": "abc-123",
        "delegation_depth": 1,
        "tokens_used": 15000,
        "execution_time_sec": 45.2
    }
}
```

### 2.3 Delegation Chain Tracking

Build complete delegation chain for traceability:

```python
def get_delegation_chain(task_id: str) -> list:
    """
    Returns:
    [
        {"task_id": "root-001", "task": "Build feature", "agent": "AKIS", "depth": 0},
        {"task_id": "abc-123", "task": "Design API", "agent": "architect", "depth": 1},
        {"task_id": "def-456", "task": "Define schema", "agent": "code", "depth": 2}
    ]
    """
```

---

## 3. 100k Simulation Results

### 3.1 Token Efficiency

| Scenario | Avg Tokens | Total (100k) | Overhead |
|----------|-----------|--------------|----------|
| **Baseline** | 515 | 51.5M | - |
| **Metadata** | 1,283 | 128.3M | **+149.2%** |
| session.json | 1,572 | 157.2M | +205.2% |
| Hybrid | 2,340 | 234.0M | +354.4% |

### 3.2 Traceability & Visibility

| Scenario | Traceability | Chain Visibility | Full Lineage |
|----------|-------------|-----------------|--------------|
| Baseline | 20.0% | 0.0% | 0.0% |
| **Metadata** | **90.0%** | **100.0%** | **100.0%** |
| session.json | 70.0% | 60.3% | 0.0% |
| Hybrid | 95.0% | 100.0% | 100.0% |

### 3.3 Delegation Metrics

| Scenario | Avg Depth | Success Rate | Memory (B) |
|----------|----------|--------------|------------|
| Baseline | 0.00 | 64.3% | 317 |
| **Metadata** | **0.81** | **65.0%** | **951** |
| session.json | 0.81 | 64.6% | 1,007 |
| Hybrid | 0.81 | 65.5% | 1,867 |

### 3.4 Cost-Benefit Analysis

```
METADATA ENHANCED:
  COSTS:
    - Token overhead:     +149.2%
    - Memory overhead:    +200.0%
    
  BENEFITS:
    - Traceability:       +350% (20% → 90%)
    - Chain visibility:   +100% (0% → 100%)
    - Full lineage:       +100% (0% → 100%)
    - Success rate:       +1.1%
    
  RATIO: 0.43:1 (POSITIVE)
```

---

## 4. Comparison Matrix

| Aspect | Baseline | Metadata | session.json | Hybrid |
|--------|----------|----------|--------------|--------|
| Token Overhead | 0% | +149% | +205% | +354% |
| Traceability | 20% | 90% | 70% | 95% |
| Chain Visibility | 0% | 100% | 60% | 100% |
| Full Lineage | 0% | 100% | 0% | 100% |
| Success Rate | 64.3% | 65.0% | 64.6% | 65.5% |
| Memory | 317B | 951B | 1,007B | 1,867B |
| Cost-Benefit | - | **0.43:1** | 0.82:1 | 0.95:1 |
| File I/O | None | None | Yes | Yes |
| Real-time | No | Yes | No | Yes |
| **VERDICT** | Baseline | **✅ BEST** | ◆ OK | ✗ Expensive |

---

## 5. By Session Complexity

| Session Type | % of Sessions | Metadata Benefit |
|--------------|---------------|------------------|
| Simple (1-3 tasks) | 40% | +250% traceability |
| Medium (4-8 tasks) | 35% | +350% traceability, delegation tracking |
| Complex (9-15 tasks) | 20% | +400% traceability, chain visibility |
| Extreme (16+ tasks) | 5% | +450% traceability, critical for debugging |

**Key Finding**: Metadata enhancement benefits **complex sessions most** where delegation tracking is critical.

---

## 6. Implementation Plan

### Phase 1: Core Metadata (Week 1)
- Add `id`, `assigned_to`, `delegation_depth`, `parent_task_id`
- Update `manage_todo_list` tool signature
- In-memory state management

### Phase 2: Delegation Protocol (Week 2)
- Delegation context structure
- Result capture from delegated agents
- Chain reconstruction

### Phase 3: Advanced Fields (Week 3)
- Add `parallel_group`, `dependencies`, `skill`
- Dependency resolution
- Parallel execution hints

### Phase 4: Workflow Integration (Week 4)
- Automatic capture in workflow log at END
- Recovery from workflow log
- Testing with 100+ sessions

---

## 7. Recommendation

### ✅ RECOMMENDED: Metadata Enhanced

**Confidence**: HIGH (0.43:1 cost-benefit ratio)

**Reasoning**:
1. **Best ROI**: 0.43:1 ratio means benefits exceed costs 2.3x
2. **No file I/O**: In-memory approach avoids session.json overhead
3. **Full visibility**: 100% delegation chain tracking
4. **Backward compatible**: Metadata is optional
5. **Scalable**: +600B per task is negligible

### When to Use session.json Instead:
- Need persistent state across crashes
- External tools need to read plan
- Multi-process coordination required

### When to Use Hybrid:
- Maximum traceability required (audit/compliance)
- Budget allows +354% token overhead
- Both real-time and persistent state needed

---

## Appendix A: Simulation Script

```bash
# Run full 100k simulation
python .github/scripts/simulate_metadata_enhancement.py --full

# Quick 10k test
python .github/scripts/simulate_metadata_enhancement.py --quick

# Save results
python .github/scripts/simulate_metadata_enhancement.py --full --output results.json
```

## Appendix B: References

- `log/metadata_enhancement_simulation_100k.json` - Full simulation results
- `.github/scripts/simulate_metadata_enhancement.py` - Simulation script
- `docs/analysis/session_json_proposal_analysis.md` - Previous session.json analysis
