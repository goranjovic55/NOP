# Agent Effectiveness Patterns

**Purpose**: Codified learnings from 14 workflow sessions to improve agent decision-making and reduce failures.

**Last Updated**: 2025-12-30

**Practical Application**: See `.claude/skills/devops.md` for 7 project-specific skills (D9-D15) derived from these patterns.

**Agent Usage**: Agents load skills during CONTEXT phase. See `.github/agents/_DevTeam.agent.md` → Session Protocol.

---

## 1. Docker/Build Environment Issues

### Pattern: Docker Layer Caching Prevents Code Deployment
**Frequency**: 3 occurrences across sessions  
**Symptoms**: 
- Frontend changes not visible after `docker-compose build`
- Backend code changes not reflected
- Multiple rebuilds fail to update containers

**Root Cause**: Docker's multi-stage build caching reuses old layers even when source code changes

**Solution Protocol**:
```bash
# When standard rebuild fails (ATTEMPT #2+), use nuclear cleanup:
docker-compose down -v                    # Stop and remove volumes
docker system prune -af --volumes         # Remove ALL Docker data
docker network create nop_test-network    # Recreate external networks
docker-compose build --no-cache           # Build without cache
docker-compose up -d                      # Start fresh containers
```

**Prevention**:
- After ATTEMPT #1 rebuild fails, immediately escalate to full cleanup
- Don't waste attempts on incremental cache invalidation strategies
- Document in workflow log when this protocol is used

**Agent Guidance**:
```
[DECISION: Standard rebuild vs nuclear cleanup?]
IF previous_rebuild_failed AND code_changes_not_visible:
  → CHOSEN: Nuclear cleanup (docker system prune -af --volumes)
  → REJECTED: Cache invalidation (unreliable with multi-stage builds)
```

---

## 2. Frontend State/Scope Issues

### Pattern: React State Variables Not In Component Scope
**Frequency**: 2 occurrences  
**Symptoms**: 
- Build fails with "X is not defined" 
- Variable exists in parent but not accessible in child component
- TypeScript errors about missing properties

**Root Cause**: State passed via props but not included in component interface

**Solution Protocol**:
```tsx
// BEFORE (causes error):
const ParentComponent = () => {
  const [data, setData] = useState([]);
  return <ChildComponent />;  // ✗ data not passed
}

// AFTER (correct):
interface ChildProps {
  data: DataType[];  // Add to interface
}

const ParentComponent = () => {
  const [data, setData] = useState([]);
  return <ChildComponent data={data} />;  // ✓ Pass as prop
}

const ChildComponent: React.FC<ChildProps> = ({ data }) => {
  // Now data is in scope
}
```

**Prevention**:
- When child component needs parent state, ALWAYS pass as prop
- Don't assume child can access parent variables
- Check TypeScript interfaces before implementation

**Agent Guidance**:
```
[DECISION: How to access parent data in child?]
→ CHOSEN: Pass as prop with interface definition
→ REJECTED: Global state (adds complexity)
→ REJECTED: Context (overkill for simple props)
```

---

## 3. File Edit Operation Issues

### Pattern: String Replacement Leaves Orphaned Code
**Frequency**: 2 occurrences  
**Symptoms**:
- JSX components have orphaned closing tags
- Syntax errors after `replace_string_in_file` operations
- Code after export statement causes errors

**Root Cause**: String replacements don't account for structural changes in JSX/TSX

**Solution Protocol**:
```bash
# When complex edits needed (ATTEMPT #2+):
# Option A: Use line-based truncation
head -n <safe_line_number> original.tsx > temp.tsx
mv temp.tsx original.tsx

# Option B: Rewrite entire section
# Extract reusable parts, rewrite clean structure

# DON'T use multiple string replacements on same region
```

**Prevention**:
- For large refactors (>100 lines), use truncation or rewrite
- Avoid >3 sequential string replacements in same file
- Validate JSX structure after each edit

**Agent Guidance**:
```
[DECISION: Multiple edits vs file truncation?]
IF edits > 3 AND file_type == "tsx":
  → CHOSEN: Truncate at known good line + rewrite
  → REJECTED: Sequential string replacements (error-prone)
```

---

## 4. Missing Import/Dependency Issues

### Pattern: Logger/Module Used But Not Imported
**Frequency**: 2 occurrences  
**Symptoms**:
- Runtime errors: "logger is not defined"
- Python NameError or TypeScript undefined errors
- Service starts then crashes immediately

**Root Cause**: Adding function calls without checking imports

**Solution Protocol**:
```python
# When adding logging/external calls:
# 1. Check imports at top of file FIRST
import logging
logger = logging.getLogger(__name__)

# 2. THEN add the call
logger.info("Message here")

# Don't add calls first and fix imports later
```

**Prevention**:
- Before adding ANY external function call, verify import exists
- Check module imports before adding method calls
- Scan top of file for required imports in PLAN phase

**Agent Guidance**:
```
[CHECKLIST before adding external calls:]
- [ ] Import statement exists?
- [ ] Module initialized (e.g., logger = ...)?
- [ ] No circular dependency?
```

---

## 5. Session Initialization Protocol

### Pattern: Skipping SESSION/PHASE Markers
**Frequency**: 1 occurrence (but critical)  
**Symptoms**:
- Knowledge not loaded at session start
- Skills not consulted during work
- Workflow log missing decision context

**Root Cause**: Instructions present but not prominent enough

**Solution**: Added ⚠️ CRITICAL block to _DevTeam.agent.md (already fixed)

**Agent Guidance**:
```
EVERY session MUST start with:
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]

Load: skills.md → project_knowledge.json → global_knowledge.json
```

---

## 6. Decision Fatigue Patterns

### Pattern: Too Many Rejected Alternatives Documented
**Observation**: Some decisions document 5+ rejected options  
**Issue**: Cognitive overhead, slows workflow

**Optimization**:
```
[DECISION: question?]
  → CHOSEN: selected_option (1 sentence rationale)
  → REJECTED: main_alternative (1 sentence reason)

# Don't enumerate every possible alternative
# Only document the main choice and primary alternative
```

---

## 7. Quality Gate Timing

### Pattern: Build/Test After Multiple Code Changes
**Risk**: When builds fail, hard to isolate which change caused issue

**Optimization**:
```
BETTER:
Edit file A → Build → ✓
Edit file B → Build → ✓
Edit file C → Build → ✗ (know it's file C)

WORSE:
Edit A, B, C → Build → ✗ (which file?)
```

**Agent Guidance**: Run builds after EACH file edit when possible, not batch at end

---

## Application by Agent

### _DevTeam (Orchestrator)
- Apply patterns #1, #5, #6, #7
- Recognize Docker caching early (#1)
- Ensure SESSION initialization (#5)
- Document only critical decisions (#6)
- Validate incrementally (#7)
- **Skills Reference**: Loads `.claude/skills/devops.md` → D9, D14, D15 during CONTEXT phase

### Developer
- Apply patterns #2, #3, #4, #7
- Check scope before state access (#2)
- Prefer truncation over complex edits (#3)
- Verify imports before adding calls (#4)
- Build after each file change (#7)
- **Skills Reference**: Applies D10 (Incremental Validation), D11 (Import Verification), D12 (React Scope), D13 (File Edit Complexity)

### Researcher
- Apply pattern #6
- Focus findings on actionable insights
- Don't over-document edge cases
- **Skills Reference**: Uses D14 (Decision Minimalism) when documenting findings

### Reviewer
- Apply pattern #7
- Test incrementally, not batch
- Report failures immediately
- **Skills Reference**: Enforces D10 (Incremental Validation) during testing

---

## Success Metrics

Track these across workflow logs:
- **Build failures per session**: Target <2 (down from current 3-4)
- **Attempts per task**: Target <2 (down from current 2-3)
- **Docker nuclear cleanups**: Target 0 (detect caching early)
- **Import errors**: Target 0 (check before adding calls)
- **Scope errors**: Target 0 (pass props explicitly)

---

**Version**: 1.0  
**Source**: Analysis of 14 workflow logs (2025-12-28 to 2025-12-30)  
**Next Review**: After 10 more workflow sessions
