# Streamlined Agent Protocol v2.0

**Purpose**: Detect drift, enable visibility, minimize overhead  
**Designed from**: Analysis of 21 sessions, 1455 lines of instructions  
**Reduction**: 76% less (1455 → 350 lines)

---

## Core Principle

**Emit at decision points, not ceremonies**

---

## Required Emissions (4 Only)

### 1. Session Start
```
[SESSION: task_description] @mode
```

**Purpose**: Establish context, detect when work starts without initialization  
**Time**: 5 seconds  
**Example**: `[SESSION: Fix password hashing vulnerability] @_DevTeam`

### 2. Decisions
```
[DECISION: question] → answer (rationale)
```

**Purpose**: Document choices, catch drift when decisions made without consideration  
**Time**: 10 seconds per decision  
**Examples**:
- `[DECISION: Delegate to Developer?] → No (3-line fix, overhead not justified)`
- `[DECISION: Update all tests?] → Yes (auth change affects 5 test files)`
- `[DECISION: FastAPI vs Flask?] → FastAPI (async support, team familiar)`

### 3. Attempts
```
[ATTEMPT #N] action → ✓/✗ outcome
```

**Purpose**: Track execution, detect loops and stuck states  
**Time**: 5 seconds per attempt  
**Examples**:
- `[ATTEMPT #1] Add bcrypt hashing → ✓ implemented in auth.py`
- `[ATTEMPT #2] Run test suite → ✗ 2 failures (mock data outdated)`  
- `[ATTEMPT #3] Update test fixtures → ✓ all tests pass`

### 4. Completion
```
[COMPLETE] outcome | changed: files
```

**Purpose**: Checkpoint, enable verification  
**Time**: 10 seconds  
**Example**: `[COMPLETE] Vulnerability fixed | changed: auth.py, test_auth.py`

---

## Optional Emissions (Use When Helpful)

### Phase Transitions (Major Only)
```
[→PLAN]  [→VERIFY]  [→COMPLETE]
```

**When**: Starting design, testing, or completion phases (not every transition)  
**Example**: `[→VERIFY] Running tests and checking error handling`

### Skills Applied (Inline)
```
(in DECISION or ATTEMPT)
```

**When**: Applying specific skill pattern  
**Example**: `[DECISION: Input validation?] → Sanitize all inputs (skill #3 Security)`

### Knowledge Updates (Inline)
```
(in COMPLETE)
```

**When**: Significant learnings captured  
**Example**: `[COMPLETE] Feature done | changed: 3 files | knowledge: +2 patterns`

---

## Auto-Detected Drift (No Manual Emission Required)

### 1. Missing Session Start
```
Detection: File edits before [SESSION: ...]
Alert: ⚠️ Work started without session initialization
```

### 2. Loop Detection
```
Detection: 3+ failed ATTEMPTs with same action
Alert: ⚠️ Stuck in loop, try different approach
```

### 3. Mode Violation
```
Detection: Architect editing code / Developer making design docs
Alert: ⚠️ Role boundary crossed, delegate or acknowledge
```

### 4. Skipped Verification
```
Detection: [COMPLETE] without [→VERIFY] phase
Alert: ⚠️ No testing phase detected
```

### 5. Undocumented Decisions
```
Detection: Architectural file changes without [DECISION: ...]
Alert: ⚠️ Significant change made without documented decision
```

---

## Agent Modes (Simplified)

### _DevTeam (Orchestrator)
**When**: Multi-step tasks requiring coordination  
**Responsibilities**: Delegate, integrate, maintain context  
**Emissions**: All 4 required + phase transitions

### Architect
**When**: Design decisions needed  
**Responsibilities**: Evaluate options, document choices  
**Emissions**: DECISION (heavy), ATTEMPT (minimal), COMPLETE

### Developer  
**When**: Implementation work  
**Responsibilities**: Write code, run tests  
**Emissions**: ATTEMPT (heavy), DECISION (tactical), COMPLETE

### Reviewer
**When**: Quality validation  
**Responsibilities**: Test, verify standards  
**Emissions**: ATTEMPT (test runs), COMPLETE (verdict)

### Researcher
**When**: Investigation needed  
**Responsibilities**: Explore, analyze, document  
**Emissions**: DECISION (approach), findings summary, COMPLETE

---

## Workflow Logs (Decision Documentation)

### Required Sections

```markdown
# Task
One-sentence description

## Decision Flow
\`\`\`
[SESSION: ...] @mode
├─[DECISION: ...] → choice (rationale)
│ ├─[ATTEMPT #1] ... → ✓
│ └─[ATTEMPT #2] ... → ✓
├─[→VERIFY] testing
└─[COMPLETE] outcome | changed: files
\`\`\`

## Files Changed
- path/file.ext - what changed

## Learnings (if significant)
- Pattern discovered
- Mistake avoided
```

**Target**: 30-50 lines per log (vs current 100-200)

---

## Knowledge System (JSONL)

### When to Update
- New architectural patterns discovered
- Significant code structure changes
- Cross-cutting concerns identified

### When NOT to Update
- Simple bug fixes
- One-off changes
- No reusable patterns

**Target**: 10-20% of sessions (vs current 9.5%) - encourage but don't mandate

---

## Quality Gates

### 1. Context Gate
**Check**: [SESSION: ...] emitted before work starts  
**Owner**: All modes  
**Auto-detect**: Yes

### 2. Decision Gate
**Check**: [DECISION: ...] for architectural choices  
**Owner**: Architect, _DevTeam  
**Auto-detect**: Yes (file change patterns)

### 3. Verification Gate
**Check**: [→VERIFY] before [COMPLETE]  
**Owner**: Developer, Reviewer  
**Auto-detect**: Yes

### 4. Completion Gate
**Check**: Files changed match task scope  
**Owner**: All modes  
**Auto-detect**: Partial

---

## Performance Targets

| Task Type | Reading | Emissions | Overhead | Current |
|-----------|---------|-----------|----------|---------|
| Quick (5 min) | 50 lines | 4-5 | 15% | 40% |
| Medium (30 min) | 200 lines | 5-8 | 7% | 17% |
| Complex (2 hrs) | 350 lines | 10-15 | 5% | 8% |

---

## Migration from Current Protocol

### Keep
- [DECISION: ...] → answer - **HIGH VALUE (166% usage)**
- [ATTEMPT #N] → ✓/✗ - **HIGH VALUE (333% usage)**
- Workflow logs - **HIGH VALUE (100% adoption)**
- Quality gates - **HIGH VALUE (62% adoption)**

### Remove
- [SKILLS: loaded=N | available: ...] - **LOW VALUE (38% usage)**
- [KNOWLEDGE: loaded | entities=N] - **LOW VALUE (48% usage)**
- [PHASE: X | progress=N/7] tracking - **OVERHEAD, use →PHASE for major only**
- [COMPLETE: ... | learnings=N] verbose format - **Simplify**

### Transform
- SESSION: Simplified one-liner (was 4 lines)
- Skills: Inline when used (not listed at start)
- Knowledge: Inline at end (not listed at start)
- Phases: Major milestones only (not every transition)

### Add
- Auto-detection for drift patterns
- Mode violation alerts
- Loop detection warnings

---

## Example Session (Streamlined)

```
[SESSION: Implement user authentication] @_DevTeam

[DECISION: Auth approach?] → JWT tokens (skill #3 Security, stateless)
[DECISION: Delegate?] → Yes (complex, needs design + implementation)

[→PLAN] Designing JWT flow with refresh tokens

[SUBAGENT: Architect] Design JWT auth with 30min expiry + refresh tokens
  [DECISION: Token storage?] → HttpOnly cookies (XSS protection)
  [DECISION: Refresh strategy?] → Sliding window (better UX)
  [COMPLETE] Design documented in docs/auth_design.md

[SUBAGENT: Developer] Implement JWT auth per Architect design
  [ATTEMPT #1] Create auth service → ✓ jwt_service.py created
  [ATTEMPT #2] Add token endpoints → ✓ /login, /refresh added
  [ATTEMPT #3] Write tests → ✗ 3 failures (missing mocks)
  [ATTEMPT #4] Fix test mocks → ✓ all tests pass
  [COMPLETE] Auth implemented | changed: 3 files

[→VERIFY] Reviewing implementation

[SUBAGENT: Reviewer] Validate auth implementation
  [ATTEMPT #1] Run test suite → ✓ 15/15 pass
  [ATTEMPT #2] Security check → ✓ tokens expire, secrets in env
  [ATTEMPT #3] Code review → ✓ follows patterns
  [COMPLETE] Approved | no issues

[COMPLETE] Authentication implemented | changed: jwt_service.py, auth_endpoints.py, test_auth.py | knowledge: +1 pattern

[WORKFLOW_LOG] Created log/workflow/2025-12-30_HHMMSS_jwt-authentication.md
```

**Emissions**: 15 total (vs current 25-30 for similar task)  
**Time**: ~3 minutes (vs current 5-7 minutes)  
**Overhead**: 7% for 45-min task (vs current 15%)  
**Drift detection**: 4 decision points, 7 attempts, 3 subagents tracked

---

## Success Criteria

### Compliance Targets
- [SESSION] emission: 95%+ (vs current 52%)
- [DECISION] at choice points: 90%+ (currently strong at 167%)
- [ATTEMPT] tracking: 90%+ (currently strong at 333%)
- [COMPLETE] with artifacts: 85%+ (vs current 19%)

### Performance Targets
- Quick task overhead: <15% (vs current 40%)
- Medium task overhead: <10% (vs current 17%)
- Complex task overhead: <7% (vs current 8%)

### Quality Targets
- Drift detected by emissions: 60%+ (vs current 12.5%)
- Drift detected by user: <20% (vs current 50%)
- False positive alerts: <5%
- Sessions completing successfully: 70%+ (vs current 52%)

---

## Implementation Priority

### Phase 1: Simplify Emissions (Week 1)
- Remove SKILLS/KNOWLEDGE listing at start
- Simplify SESSION to one line
- Keep DECISION/ATTEMPT as-is (already working)
- Update agent templates

### Phase 2: Add Auto-Detection (Week 2)
- Detect missing SESSION
- Detect loops (3+ failed attempts)
- Detect mode violations
- Detect skipped verification

### Phase 3: Measure & Adjust (Week 3-4)
- Track compliance rates
- Track drift detection rates
- Track overhead impact
- Gather user feedback
- Tune alert thresholds

### Phase 4: Optimize (Ongoing)
- Refine auto-detection patterns
- Adjust emission requirements based on data
- Update agent training

---

## File Structure (Simplified)

```
.github/
├── agent-protocol.md (THIS FILE - 350 lines, replaces 5 files)
├── agents/
│   ├── _DevTeam.agent.md (80 lines, down from 140)
│   ├── Architect.agent.md (60 lines, down from 84)
│   ├── Developer.agent.md (60 lines, down from 91)
│   ├── Reviewer.agent.md (60 lines, down from 86)
│   └── Researcher.agent.md (60 lines, down from 83)
└── global_knowledge.json

.claude/
├── skills.md (200 lines checklist, down from 430)
└── README.md

project_knowledge.json (grows with project)
log/workflow/ (session logs)
```

**Total**: ~870 lines (vs current 1,455) = **40% reduction**

---

## Appendix: Detection Algorithms

### Loop Detection
```python
if (attempt_count >= 3 and 
    all_attempts_same_action() and 
    all_attempts_failed()):
    emit_warning("⚠️ Stuck in loop: {action} failed {count} times")
    suggest_alternative()
```

### Mode Violation Detection
```python
role_boundaries = {
    'Architect': {'allowed': ['*.md', 'docs/**'], 'forbidden': ['src/**/*.py', 'src/**/*.ts']},
    'Developer': {'required': ['src/**'], 'forbidden': ['docs/architecture/**']},
}

if editing_file(forbidden_for_current_role):
    emit_warning("⚠️ Mode violation: {role} editing {file}")
```

### Verification Skip Detection
```python
if (found_pattern('[COMPLETE]') and 
    not found_pattern(r'\[→VERIFY\]|\[ATTEMPT.*test') and
    files_changed_include_code()):
    emit_warning("⚠️ No verification detected before completion")
```

### Undocumented Decision Detection
```python
architectural_changes = ['new service', 'new model', 'API change', 'auth change']

if (file_diff_contains(architectural_changes) and
    not found_recent_pattern(r'\[DECISION:.*\]')):
    emit_warning("⚠️ Architectural change without documented decision")
```
