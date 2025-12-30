# Domain Skills - DevOps & Workflow Patterns (NOP)

> Project-specific effectiveness patterns from workflow analysis. Updated by agent effectiveness reviews.

## Skill D9: Docker Cache Management

**Trigger**: Frontend/backend changes not visible after rebuild

**Pattern**:
```bash
# When standard rebuild fails (2nd attempt):
docker-compose down -v                     # Stop and remove volumes
docker system prune -af --volumes          # Remove ALL Docker data
docker network create nop_test-network     # Recreate external networks
docker-compose build --no-cache            # Build without cache
docker-compose up -d                       # Start fresh containers
```

**Rules**:
- ✅ Escalate to nuclear cleanup after 2nd failed rebuild
- ✅ Don't waste attempts on cache invalidation strategies
- ✅ Reclaim disk space (typically 3-7GB freed)
- ✅ Recreate external networks before rebuild

**Frequency**: 3 occurrences (21% of sessions)

## Skill D10: Incremental Validation

**Trigger**: Build failures after multiple file edits

**Pattern**:
```
BETTER:
Edit file A → Build → ✓
Edit file B → Build → ✓
Edit file C → Build → ✗ (know it's file C)

AVOID:
Edit A, B, C → Build → ✗ (which file caused it?)
```

**Rules**:
- ✅ Build/test after EACH file change
- ✅ Isolate failures quickly (seconds vs minutes)
- ✅ Apply especially in multi-file refactors
- ✅ Reviewer should validate incrementally

## Skill D11: Import Verification Protocol

**Trigger**: Adding logging, external function calls, or library methods

**Pattern**:
```python
# BEFORE adding any external call, check imports:
# 1. Verify import exists at top of file
import logging
logger = logging.getLogger(__name__)

# 2. THEN add the call
logger.info("Message here")

# DON'T add calls first and fix imports later
```

**Rules**:
- ✅ Check imports BEFORE adding function calls
- ✅ Verify module initialized (e.g., `logger = ...`)
- ✅ No circular dependencies
- ✅ Applies to Python, TypeScript, any language

**Frequency**: 2 occurrences (runtime crashes)

## Skill D12: React Scope Explicit Props

**Trigger**: Creating child components that need parent state

**Pattern**:
```tsx
// WRONG (child can't access parent state):
const Parent = () => {
  const [data, setData] = useState([]);
  return <Child />;  // ✗ data not accessible
}

// CORRECT (pass as prop):
interface ChildProps {
  data: DataType[];  // Define in interface
}

const Parent = () => {
  const [data, setData] = useState([]);
  return <Child data={data} />;  // ✓ Pass explicitly
}

const Child: React.FC<ChildProps> = ({ data }) => {
  // Now data is in scope
}
```

**Rules**:
- ✅ ALWAYS pass parent state as props
- ✅ Define in TypeScript interface
- ✅ Don't assume child can access parent variables
- ✅ Check interfaces before implementation

**Frequency**: 2 occurrences (build failures)

## Skill D13: File Edit Complexity Threshold

**Trigger**: Complex JSX/TSX refactoring with >3 edits in same region

**Pattern**:
```bash
# When complex edits needed (multiple string replacements):
# Option A: Line-based truncation
head -n <safe_line_number> original.tsx > temp.tsx
mv temp.tsx original.tsx

# Option B: Rewrite entire section
# Extract reusable parts, rewrite clean structure

# AVOID: >3 sequential string replacements in same region
```

**Rules**:
- ✅ For >3 edits in same region, use truncation or rewrite
- ✅ Validate JSX structure after each edit
- ✅ Avoid orphaned code after export statements
- ✅ Applies especially to React components

**Frequency**: 2 occurrences (orphaned code, syntax errors)

## Skill D14: Decision Minimalism

**Trigger**: Documenting design decisions or alternatives

**Pattern**:
```
GOOD (concise):
[DECISION: Typography scale?]
  → CHOSEN: Tailwind text-xs (consistent, responsive)
  → REJECTED: Custom px (no scalability)

AVOID (verbose):
[DECISION: Typography scale?]
  → CHOSEN: Tailwind text-xs
  → REJECTED: Custom px
  → REJECTED: Custom rem
  → REJECTED: Material-UI
  → REJECTED: Styled-components
  → REJECTED: Emotion
```

**Rules**:
- ✅ Document main choice + primary alternative only
- ✅ Keep rationale to 1 sentence
- ✅ Focus on critical trade-offs
- ✅ Reduces cognitive overhead

**Applies to**: Architect, _DevTeam decision documentation

## Skill D15: Anti-Drift Protocol

**Trigger**: Starting any task session

**Pattern**:
```
EVERY session MUST start with:
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]

Load: skills.md → project_knowledge.json → global_knowledge.json

Before ANY implementation:
1. Emit [SESSION: ...] at task start
2. Emit [PHASE: CONTEXT | progress=1/7] when loading knowledge
3. Emit [PHASE: PLAN | progress=2/7] when designing solution
4. Emit [DECISION: ?] for every choice made
5. Emit [ATTEMPT #N] for every implementation try
6. Emit [SUBAGENT: Name] for every delegation
7. Track phase transitions

VIOLATION CHECK: If markers missing, STOP and emit them now.
```

**Rules**:
- ✅ Prevents context loss from skipped initialization
- ✅ Ensures knowledge/skills loaded before work
- ✅ Critical for _DevTeam orchestrator
- ✅ Enables proper workflow logging

**Frequency**: 1 critical occurrence (prevented future issues)

---

## Success Metrics

Track these across workflow logs:
- **Build failures per session**: Target <2 (down from 3-4)
- **Attempts per task**: Target <2 (down from 2-3)
- **Docker nuclear cleanups**: Target 0 (detect caching early)
- **Import errors**: Target 0 (check before adding calls)
- **Scope errors**: Target 0 (pass props explicitly)
- **Orphaned code**: Target 0 (use truncation threshold)

---

## Pattern Sources

**Analysis**: 14 workflow sessions (2025-12-28 to 2025-12-30)
- 78 tracked attempts
- 11 failures (14% rate)
- 7 critical patterns identified

**Reference**: See `.github/instructions/agent_effectiveness_patterns.md` for detailed analysis and `.github/instructions/AGENT_EFFECTIVENESS_ANALYSIS.md` for complete methodology.

---

**Updated**: 2025-12-30 by agent effectiveness analysis  
**Version**: 1.0  
**Next Review**: After 10 more workflow sessions
