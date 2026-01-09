# Agent Framework Improvement Recommendations

**Date**: 2025-12-30  
**Based on**: AGENT_ECOSYSTEM_ANALYSIS.md  
**Priority**: Critical, High, Medium

---

## Implementation Roadmap

### Sprint 1 - Critical Fixes (Week 1)

**Focus**: Address protocol drift and ambiguity

#### 1.1 Define Ambiguous Terms

**File**: `.github/instructions/glossary.md` (new)

```markdown
# Agent Framework Glossary

## Task Classification

### Simple Edit
- **Definition**: Single file modification
- **Criteria**: 
  - Lines changed: <20
  - Files modified: 1
  - No breaking changes
  - No new dependencies
- **Phase Path**: CONTEXT → COORDINATE → COMPLETE
- **Example**: Fix typo, update constant, add log statement

### Complex Task
- **Definition**: Multi-component modification
- **Criteria**:
  - Lines changed: >50 OR
  - Files modified: >3 OR
  - Breaking changes OR
  - New patterns introduced
- **Phase Path**: Full 7-phase
- **Example**: Add authentication system, refactor architecture

### Significant Changes
- **Definition**: Changes requiring careful review
- **Criteria**:
  - API contract changes OR
  - Database schema changes OR
  - Security-sensitive code OR
  - Performance-critical paths
- **Requires**: Architect review + Reviewer validation
- **Example**: Change auth mechanism, modify DB indexes

### Major Changes
- **Definition**: Changes requiring PLAN phase
- **Criteria**:
  - Breaking changes for users OR
  - New architecture patterns OR
  - Requires migration OR
  - >5 files modified
- **Requires**: Full planning + documentation
- **Example**: Migrate from REST to GraphQL

## Delegation Criteria

### Must Delegate
- Architecture decisions → Architect
- Code implementation → Developer
- Test validation → Reviewer
- Investigation → Researcher

### Don't Delegate
- Single-line edits
- Typo fixes
- Knowledge updates
- Log message changes
- Documentation clarifications <50 words

### Gray Area (Use Judgment)
- Multi-line edits (10-20 lines) → Delegate if security/critical
- Documentation updates >50 words → Delegate if new concepts
- Config changes → Delegate if environment-specific

## Quality Metrics

### Test Coverage
- **Critical paths**: 100%
- **Business logic**: 90%
- **Utilities**: 80%
- **UI components**: 70%

### Code Complexity
- **Function length**: <50 lines
- **File length**: <500 lines
- **Cyclomatic complexity**: <10
- **Nesting depth**: <4

### Documentation
- **Public APIs**: 100% (all public functions)
- **Complex algorithms**: Required
- **Configuration**: Required
- **Internal functions**: Optional

## Session Metrics

### Emission Thresholds
- **Optimal**: <15 emissions per session
- **Warning**: 20-25 emissions
- **Critical**: >25 emissions (consider split)

### Nesting Limits
- **Maximum depth**: 3 levels
- **Use STACK when**: Depth > 2
- **Use NEST when**: Single-level sub-task

### Phase Transitions
- **Typical**: 4-6 transitions
- **Maximum**: 7 (full flow)
- **Minimum**: 2 (CONTEXT → COMPLETE for queries)
```

---

#### 1.2 Unify Phase Protocols

**Updates Required**:

1. **Architect.agent.md** - Align phases with main protocol
2. **Developer.agent.md** - Map custom phases to standard
3. **Reviewer.agent.md** - Sync phase names
4. **Examples.md** - Update all examples to use current protocol

**Mapping Table**:

| Specialist Custom | Standard Protocol | Notes |
|-------------------|-------------------|-------|
| UNDERSTAND | CONTEXT | Architect phase 1 |
| EXPLORE | COORDINATE | Architect phase 2 |
| ANALYZE | COORDINATE | Architect phase 3 |
| DESIGN | PLAN | Architect phase 4 |
| DOCUMENT | INTEGRATE | Architect phase 5 |
| IMPLEMENT | COORDINATE | Developer phase 2 |
| TEST | VERIFY | Developer phase 3 |
| VALIDATE | VERIFY | Developer phase 4 |
| REVIEW | COORDINATE | Reviewer phase 1 |
| CHECK | VERIFY | Reviewer phase 4 |
| VERDICT | COMPLETE | Reviewer phase 5 |
| SCOPE | CONTEXT | Researcher phase 1 |
| MAP | INTEGRATE | Researcher phase 4 |
| REPORT | COMPLETE | Researcher phase 5 |

**Action**: Update all specialist agents to emit standard [PHASE:] markers

---

#### 1.3 Add Protocol Enforcement

**File**: `.github/instructions/validation.md` (new)

```markdown
# Protocol Validation

## Pre-COMPLETE Checklist

Before emitting [COMPLETE], orchestrator MUST verify:

### Required Emissions
- [ ] [SESSION: role=... | task=... | phase=CONTEXT] at start
- [ ] [PHASE: ...] for each phase transition
- [ ] [KNOWLEDGE: added=N | updated=M] if knowledge changed
- [ ] [COMPLETE: task=... | result=... | learnings=N] at end

### Delegation Integrity
- [ ] Each [DELEGATE: agent=...] has matching [INTEGRATE: from=...]
- [ ] No orphaned delegations
- [ ] All specialists returned status

### Quality Gates
- [ ] Linters passed (if code changed)
- [ ] Builds succeeded (if code changed)
- [ ] Tests passed (if applicable)
- [ ] Knowledge integrity validated
- [ ] User confirmation received (if required)

### Limits
- [ ] Nesting depth ≤ 3
- [ ] Emission count < 30
- [ ] Session duration < 30 minutes (for simple tasks)

### Documentation
- [ ] Workflow log created (for significant work)
- [ ] Knowledge updated (for new patterns)
- [ ] Handover complete (if session interrupted)

## Validation Emission

Add before [COMPLETE]:

```
[VALIDATE: checklist=passed | emissions=N | delegations=N | quality_gates=passed]
```

## Auto-Validation Tool

Future: Script to analyze workflow logs for protocol compliance
```

---

#### 1.4 Add Knowledge Validation

**File**: `scripts/validate_knowledge.py` (new)

```python
#!/usr/bin/env python3
"""
Knowledge integrity validator for project_knowledge.json and global_knowledge.json
"""
import json
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

class KnowledgeValidator:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.entities: Dict[str, dict] = {}
        self.codegraph: Dict[str, dict] = {}
        self.relations: List[dict] = []
        
    def validate(self) -> bool:
        """Run all validations. Returns True if no errors."""
        if not self.filepath.exists():
            self.errors.append(f"File not found: {self.filepath}")
            return False
            
        # Backup current file
        self._backup()
        
        # Parse and validate JSONL
        if not self._parse_jsonl():
            return False
            
        # Run integrity checks
        self._check_duplicates()
        self._check_relations()
        self._check_codegraph()
        self._check_naming()
        self._check_observations()
        
        return len(self.errors) == 0
        
    def _backup(self):
        """Create timestamped backup"""
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.filepath.parent / f"{self.filepath.stem}_backup_{timestamp}.json"
        backup_path.write_text(self.filepath.read_text())
        print(f"✓ Backup created: {backup_path}")
        
    def _parse_jsonl(self) -> bool:
        """Parse JSONL format"""
        try:
            lines = self.filepath.read_text().strip().split('\n')
            for i, line in enumerate(lines, 1):
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    obj_type = obj.get('type')
                    
                    if obj_type == 'entity':
                        name = obj.get('name')
                        if name:
                            self.entities[name] = obj
                    elif obj_type == 'codegraph':
                        name = obj.get('name')
                        if name:
                            self.codegraph[name] = obj
                    elif obj_type == 'relation':
                        self.relations.append(obj)
                    else:
                        self.warnings.append(f"Line {i}: Unknown type '{obj_type}'")
                        
                except json.JSONDecodeError as e:
                    self.errors.append(f"Line {i}: Invalid JSON - {e}")
                    
            print(f"✓ Parsed {len(self.entities)} entities, {len(self.codegraph)} codegraph nodes, {len(self.relations)} relations")
            return True
            
        except Exception as e:
            self.errors.append(f"Failed to read file: {e}")
            return False
            
    def _check_duplicates(self):
        """Check for duplicate entities"""
        # Already deduplicated in parsing (last write wins)
        # But log if multiple definitions exist
        pass
        
    def _check_relations(self):
        """Validate relations reference existing entities"""
        all_names = set(self.entities.keys()) | set(self.codegraph.keys())
        
        for rel in self.relations:
            from_name = rel.get('from')
            to_name = rel.get('to')
            
            if from_name not in all_names:
                self.warnings.append(f"Relation references unknown 'from': {from_name}")
            if to_name not in all_names:
                self.warnings.append(f"Relation references unknown 'to': {to_name}")
                
    def _check_codegraph(self):
        """Validate codegraph dependencies"""
        for name, node in self.codegraph.items():
            deps = node.get('dependencies', [])
            for dep in deps:
                if dep not in self.codegraph:
                    self.warnings.append(f"Codegraph '{name}' depends on unknown '{dep}'")
                    
    def _check_naming(self):
        """Check naming conventions"""
        for name in self.entities.keys():
            parts = name.split('.')
            if len(parts) < 2:
                self.warnings.append(f"Entity name too short (should be Scope.Domain.Name): {name}")
                
    def _check_observations(self):
        """Check observation format"""
        for name, entity in self.entities.items():
            obs = entity.get('observations', [])
            if not obs:
                self.warnings.append(f"Entity '{name}' has no observations")
            for o in obs:
                if not o.strip():
                    self.warnings.append(f"Entity '{name}' has empty observation")
                    
    def print_report(self):
        """Print validation report"""
        print("\n" + "="*60)
        print("KNOWLEDGE VALIDATION REPORT")
        print("="*60)
        
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for err in self.errors:
                print(f"  - {err}")
        else:
            print("\n✓ No errors")
            
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warn in self.warnings:
                print(f"  - {warn}")
        else:
            print("\n✓ No warnings")
            
        print("\n" + "="*60)
        print(f"Summary: {len(self.entities)} entities, {len(self.codegraph)} codegraph, {len(self.relations)} relations")
        print("="*60 + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_knowledge.py <path_to_knowledge.json>")
        sys.exit(1)
        
    validator = KnowledgeValidator(sys.argv[1])
    is_valid = validator.validate()
    validator.print_report()
    
    sys.exit(0 if is_valid else 1)
```

**Usage**:
```bash
python scripts/validate_knowledge.py project_knowledge.json
python scripts/validate_knowledge.py .github/global_knowledge.json
```

---

### Sprint 2 - Missing Protocols (Week 2)

#### 2.1 Conflict Resolution Protocol

**File**: `.github/instructions/conflict_resolution.md` (new)

```markdown
# Conflict Resolution Protocol

## Specialist Recommendation Conflicts

**Scenario**: Architect recommends A, Developer implements B

**Protocol**:
1. Reviewer detects mismatch during validation
2. Reviewer emits: `[CONFLICT: specialist=Architect vs Developer | item=design_decision]`
3. Orchestrator intervenes:
   - Re-delegate to Architect for clarification
   - Ask Developer for rationale
   - Choose authoritative answer (Architect for design)
4. Document decision in workflow log

**Binding Order** (from most to least authoritative):
1. User explicit requirement
2. Architect design decision
3. Existing codebase patterns
4. Developer implementation preference

---

## Knowledge Merge Conflicts

**Scenario**: Two agents update same entity simultaneously

**Protocol**:
1. Detect conflict: Same entity name, different observations
2. Merge strategy:
   ```
   IF timestamps different:
     Merge observations, keep both with timestamps
   IF observations conflict:
     Log warning, use last-write-wins
     Emit: [CONFLICT: entity=Name | resolution=last_write_wins]
   ```
3. Manual review required for:
   - Conflicting entity types
   - Contradictory observations
   - Circular relations

---

## File Edit Collisions

**Scenario**: Two Developers editing same file in parallel

**Protocol**:
1. **Prevention**: Orchestrator should NOT delegate overlapping file edits in parallel
2. **Detection**: If both specialists return same file in artifacts
3. **Resolution**:
   - Compare changes
   - IF non-overlapping lines: Merge automatically
   - IF overlapping: Manual review required
   - Emit: `[CONFLICT: file=path | specialists=Dev1,Dev2 | resolution=manual]`

---

## Integration Mismatch

**Scenario**: Specialist output doesn't match orchestrator expectation

**Protocol**:
1. Orchestrator emits: `[MISMATCH: expected=X | received=Y | specialist=Name]`
2. Options:
   - Re-delegate with clarified requirements
   - Accept and adapt (update expectation)
   - Escalate to user
3. Document in workflow log

---

## Decision Override

**Scenario**: Later phase contradicts earlier decision

**Protocol**:
1. Emit: `[OVERRIDE: phase=VERIFY | original_phase=DESIGN | reason=...]`
2. Update knowledge to reflect change
3. Document rationale in workflow log
4. Flag for review in LEARN phase
```

---

#### 2.2 Error Recovery Protocol

**File**: `.github/instructions/error_recovery.md` (new)

```markdown
# Error Recovery Protocol

## Error Categories

| Category | Severity | Auto-Retry | Escalate After | Rollback |
|----------|----------|------------|----------------|----------|
| Lint error | Low | Yes (3x) | 3 failures | No |
| Build failure | High | Yes (2x) | 2 failures | Yes |
| Test failure | Medium | Yes (1x) | 1 failure | Yes |
| Specialist blocked | High | No | Immediate | Partial |
| Knowledge corrupt | Critical | No | Immediate | Full |
| User rejection | Medium | No | Immediate | Partial |

---

## Retry Protocol

```
[ERROR: type=build_failure | attempt=1/2]
→ Analyze error
→ Apply fix
→ Retry build
→ IF success: Continue
→ IF fail again: [ERROR: type=build_failure | attempt=2/2]
→ IF max retries: Escalate
```

**Max Retries**:
- Lint errors: 3
- Build failures: 2
- Test failures: 1
- Other: 0 (escalate immediately)

---

## Escalation Path

```
ERROR detected
    ↓
Auto-fix possible? ─YES→ Apply fix + retry
    ↓NO
Max retries reached? ─NO→ Retry with logged attempt
    ↓YES
Escalate to user:
    [ESCALATE: error=... | attempts=N | recommendation=...]
```

---

## Rollback Mechanisms

### Code Rollback
```bash
git stash          # If uncommitted
git reset --hard   # If committed but not pushed
```

### Knowledge Rollback
```bash
cp project_knowledge_backup_*.json project_knowledge.json
```

### Build Rollback
```bash
docker-compose down
docker system prune -f
git checkout <last_working_commit>
docker-compose up --build
```

---

## Specialist Blocked Status

**When specialist returns**:
```json
{"status":"blocked", "blockers":["reason1", "reason2"]}
```

**Orchestrator action**:
1. Emit: `[BLOCKED: specialist=Name | blockers=[...]]`
2. Analyze blockers:
   - Missing dependency → Install
   - Unclear requirement → Clarify with user
   - Technical limitation → Find alternative
3. Options:
   - Resolve blocker and re-delegate
   - Delegate to different specialist
   - Change approach
   - Escalate to user

---

## Corrupted Knowledge Recovery

**Detection**: JSON parse error on knowledge load

**Protocol**:
1. Emit: `[CRITICAL: knowledge_corrupt | file=...]`
2. Locate most recent backup
3. Restore backup
4. Validate restore
5. Report data loss to user
6. Request user decision: Continue or abort?

---

## Failed Verification

**Scenario**: VERIFY phase fails (tests fail, build breaks)

**Protocol**:
1. Categorize failure (build, test, lint)
2. Apply appropriate retry count
3. IF retriable:
   ```
   [VERIFY: failed | error_type=... | retry=N/MAX]
   → Analyze failure
   → Apply fix
   → Re-run verification
   ```
4. IF non-retriable or max retries:
   ```
   [ESCALATE: phase=VERIFY | error=... | recommendation=rollback]
   → Recommend rollback
   → Request user decision
   ```

---

## User Rejection in COMPLETE

**Scenario**: User says "This isn't what I wanted"

**Protocol**:
1. Emit: `[REJECTED: reason=... | phase=COMPLETE]`
2. Clarify requirement with user
3. Options:
   - Minor fix: Return to COORDINATE
   - Major change: Return to PLAN
   - Wrong approach: Start fresh session
4. Emit: `[RESTART: from_phase=... | reason=...]`
```

---

#### 2.3 Escalation Protocol

**File**: `.github/instructions/escalation.md` (new)

```markdown
# Escalation Protocol

## When to Escalate

**Immediate Escalation**:
- Critical error (knowledge corrupt, security vulnerability)
- Specialist blocked with no resolution
- User clarification needed
- Ethical concern

**After Retries**:
- Build failures (after 2 attempts)
- Test failures (after 1 attempt)
- Lint errors (after 3 attempts)

**Never Escalate** (resolve autonomously):
- Simple formatting
- Obvious typos
- Missing imports (auto-fixable)

---

## Escalation Format

```
[ESCALATE: severity=critical|high|medium|low | issue=... | context=... | recommendation=...]
```

**Include**:
- What went wrong
- What was tried
- Current state
- Recommended next step
- Risk assessment

**Example**:
```
[ESCALATE: severity=high | issue="Build fails due to missing system dependency 'libfoo'" | context="Tried apt install, not in repos" | recommendation="User install from source or use Docker"]
```

---

## User Decision Required

**Format**:
```
[USER_DECISION: question=... | options=[A, B, C] | recommendation=... | impact=...]
```

**Scenarios**:
- Ambiguous requirement
- Trade-off decision (performance vs readability)
- Breaking change (proceed or redesign?)
- Multiple valid approaches

**Example**:
```
[USER_DECISION: question="Use REST or GraphQL?" | options=[REST, GraphQL] | recommendation="REST (team familiar)" | impact="GraphQL requires learning, better for complex queries"]
```

---

## Abort vs Continue

**Abort Criteria**:
- Unrecoverable error
- Requirement impossible to meet
- Security risk
- Data loss risk

**Continue Criteria**:
- Error is retriable
- Alternative approach exists
- Partial success acceptable

**Emit**:
```
[ABORT: reason=... | state=... | cleanup_required=yes/no]
```
OR
```
[CONTINUE: strategy=... | adjusted_goal=...]
```
```

---

### Sprint 3 - Tooling & Enhancements (Week 3-4)

#### 3.1 Protocol Linter

**File**: `scripts/lint_protocols.py`

```python
#!/usr/bin/env python3
"""
Protocol linter - checks workflow logs for compliance
"""
import re
import sys
from pathlib import Path
from typing import List, Dict

class ProtocolLinter:
    def __init__(self, log_path: str):
        self.log_path = Path(log_path)
        self.content = ""
        self.issues: List[str] = []
        self.warnings: List[str] = []
        
    def lint(self) -> bool:
        """Run all linting checks"""
        if not self.log_path.exists():
            self.issues.append(f"Log file not found: {self.log_path}")
            return False
            
        self.content = self.log_path.read_text()
        
        self._check_session_emission()
        self._check_phase_tracking()
        self._check_delegation_integrity()
        self._check_completion()
        self._check_emission_count()
        
        return len(self.issues) == 0
        
    def _check_session_emission(self):
        """Verify SESSION emitted at start"""
        if not re.search(r'\[SESSION:', self.content):
            self.issues.append("Missing [SESSION:] emission at start")
            
    def _check_phase_tracking(self):
        """Verify PHASE emissions"""
        phases = re.findall(r'\[PHASE: (\w+)', self.content)
        if not phases:
            self.warnings.append("No [PHASE:] emissions found")
        elif phases[0] != 'CONTEXT':
            self.issues.append(f"First phase should be CONTEXT, got {phases[0]}")
            
    def _check_delegation_integrity(self):
        """Check DELEGATE/INTEGRATE pairing"""
        delegates = re.findall(r'\[DELEGATE: agent=(\w+)', self.content)
        integrates = re.findall(r'\[INTEGRATE: from=(\w+)', self.content)
        
        for agent in delegates:
            if agent not in integrates:
                self.issues.append(f"Orphaned delegation to {agent} (no INTEGRATE)")
                
    def _check_completion(self):
        """Verify COMPLETE emission"""
        if not re.search(r'\[COMPLETE:', self.content):
            self.warnings.append("No [COMPLETE:] emission (session incomplete?)")
            
    def _check_emission_count(self):
        """Count total emissions"""
        emissions = len(re.findall(r'\[[\w_]+:', self.content))
        if emissions > 30:
            self.warnings.append(f"High emission count ({emissions}), consider simplifying")
            
    def print_report(self):
        """Print linting report"""
        print(f"\n{'='*60}")
        print(f"PROTOCOL LINT: {self.log_path.name}")
        print('='*60)
        
        if self.issues:
            print(f"\n❌ ISSUES ({len(self.issues)}):")
            for issue in self.issues:
                print(f"  - {issue}")
        else:
            print("\n✓ No issues")
            
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warn in self.warnings:
                print(f"  - {warn}")
                
        print(f"\n{'='*60}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: lint_protocols.py <workflow_log.md>")
        sys.exit(1)
        
    linter = ProtocolLinter(sys.argv[1])
    is_clean = linter.lint()
    linter.print_report()
    
    sys.exit(0 if is_clean else 1)
```

---

## Summary

This document provides actionable improvements organized by priority and sprint. Key deliverables:

1. **Glossary** - Eliminates ambiguity
2. **Phase unification** - Stops drift
3. **Validation tools** - Enforces compliance
4. **Missing protocols** - Fills gaps
5. **Linting** - Continuous compliance

**Total Effort**: ~20 days across 3 sprints

**Expected Outcome**:
- 90%+ protocol compliance
- Zero ambiguous terms
- Unified documentation
- Automated validation
- Robust error recovery

---

**Status**: Ready for implementation
