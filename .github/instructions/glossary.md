---
applyTo: '**'
---

# Agent Framework Glossary

**Version**: 2.0.0  
**Purpose**: Eliminate ambiguity in task classification and delegation decisions

---

## Task Classification

### Simple Edit
- **Definition**: Single file modification with minimal impact
- **Criteria**: 
  - Lines changed: <20
  - Files modified: 1
  - No breaking changes
  - No new dependencies
  - No architecture changes
- **Phase Path**: CONTEXT → COORDINATE → VERIFY → COMPLETE
- **Delegate**: No (handle directly)
- **Examples**: 
  - Fix typo in documentation
  - Update string constant
  - Add log statement
  - Change variable name

### Medium Task
- **Definition**: Multi-file modification within single component
- **Criteria**:
  - Lines changed: 20-50
  - Files modified: 2-3
  - No breaking changes
  - Within single service/component
- **Phase Path**: CONTEXT → COORDINATE → VERIFY → COMPLETE
- **Delegate**: Yes (to appropriate specialist)
- **Examples**:
  - Add new endpoint to existing API
  - Create new UI component
  - Add utility function with tests

### Complex Task
- **Definition**: Multi-component modification requiring coordination
- **Criteria**:
  - Lines changed: >50 OR
  - Files modified: >3 OR
  - Multiple services/components OR
  - New patterns introduced
- **Phase Path**: CONTEXT → PLAN → COORDINATE → INTEGRATE → VERIFY → LEARN → COMPLETE
- **Delegate**: Yes (multiple specialists)
- **Examples**: 
  - Add authentication system
  - Implement new feature across frontend/backend
  - Refactor component architecture

### Major Changes
- **Definition**: Changes requiring careful planning and user approval
- **Criteria**:
  - Breaking changes for users OR
  - Database schema changes OR
  - API contract changes OR
  - Security-sensitive changes OR
  - Performance-critical changes
- **Phase Path**: Full 7-phase (mandatory)
- **Delegate**: Yes (Architect required)
- **Examples**:
  - Migrate from REST to GraphQL
  - Change authentication mechanism
  - Modify database indexes
  - Refactor architecture

---

## Delegation Criteria

### Always Delegate
- **Architecture decisions** → Architect
  - Technology choice (REST vs GraphQL, SQL vs NoSQL)
  - Component structure
  - Pattern selection
  - Trade-off analysis

- **Code implementation** → Developer
  - Writing >20 lines of code
  - Creating new files
  - Modifying multiple files
  - Adding dependencies

- **Test validation** → Reviewer
  - Running test suites
  - Verifying quality gates
  - Security audits
  - Performance validation

- **Investigation** → Researcher
  - Codebase exploration
  - Pattern analysis
  - Dependency mapping
  - Bug root cause analysis

### Never Delegate
- Single-line edits (<5 lines)
- Typo fixes
- Knowledge file updates
- Log message changes
- Documentation clarifications <50 words
- Simple queries (no changes)

### Use Judgment
- **Edits 10-20 lines**: 
  - Delegate if security-critical
  - Delegate if architecture-related
  - Handle if simple refactoring

- **Documentation 50-200 words**:
  - Delegate if new concepts
  - Delegate if user-facing
  - Handle if clarifications

- **Config changes**:
  - Delegate if environment-specific
  - Delegate if affects multiple services
  - Handle if single value change

---

## Quality Metrics

### Test Coverage
- **Critical paths**: 100% (authentication, data integrity, security)
- **Business logic**: 90% (core features, calculations)
- **Services**: 80% (API endpoints, data access)
- **Utilities**: 70% (helper functions)
- **UI components**: 60% (visual components)

### Code Complexity
- **Function length**: <50 lines (strict)
- **File length**: <500 lines (strict)
- **Cyclomatic complexity**: <10 (per function)
- **Nesting depth**: <4 levels
- **Function parameters**: <5 (prefer objects)

### Documentation Completeness
- **Public APIs**: 100% (all public functions/endpoints)
- **Complex algorithms**: Required (any non-obvious logic)
- **Configuration**: Required (all config options)
- **Architecture decisions**: Required (in workflow logs)
- **Internal functions**: Optional (comment if non-obvious)

---

## Session Metrics

### Emission Thresholds
- **Optimal**: <15 emissions per session
- **Acceptable**: 15-20 emissions
- **Warning**: 20-25 emissions (consider simplifying)
- **Critical**: >25 emissions (must split session)

**Action at Warning**:
```
[WARNING: emission_count=22 | threshold=20 | recommendation="Consider splitting session"]
```

**Action at Critical**:
```
[CRITICAL: emission_count=28 | threshold=25 | action="Splitting session"]
[HANDOVER: current_state=... | next_session=...]
```

### Nesting Limits
- **Maximum depth**: 3 levels (strict limit)
- **Recommended depth**: ≤2 levels
- **Use STACK when**: Depth > 2
- **Use NEST when**: Single-level sub-task

**Depth Tracking**:
```
[SESSION: role=Lead | task=... | depth=0]
  └─[DELEGATE: agent=Architect | depth=1]
      └─[NEST: task=research | depth=2]
          └─[DELEGATE: agent=Researcher | depth=3]  ← MAX DEPTH
```

### Phase Transitions
- **Minimum**: 2 (CONTEXT → COMPLETE for queries)
- **Typical**: 4-6 transitions
- **Maximum**: 7 (full flow)
- **Average target**: 4 transitions

**Phase Selection**:
| Task Type | Phases Used | Count |
|-----------|-------------|-------|
| Query | CONTEXT → COMPLETE | 2 |
| Simple edit | CONTEXT → COORDINATE → VERIFY → COMPLETE | 4 |
| Bug fix | CONTEXT → COORDINATE → INTEGRATE → VERIFY → COMPLETE | 5 |
| Feature | Full 7-phase flow | 7 |

---

## Error Severity Levels

### Critical
- **Definition**: System cannot continue, immediate escalation required
- **Examples**: 
  - Knowledge file corruption
  - Security vulnerability in changes
  - Data loss risk
  - Unrecoverable build failure
- **Action**: Immediate escalation to user, rollback if possible

### High
- **Definition**: Significant issue, multiple retries failed
- **Examples**:
  - Build failures after 2 attempts
  - Specialist blocked with no resolution
  - Integration test failures
- **Action**: Escalate after retries exhausted

### Medium
- **Definition**: Recoverable issue, retry possible
- **Examples**:
  - Test failures (first attempt)
  - Missing dependencies (installable)
  - Minor integration mismatches
- **Action**: Auto-fix or retry, escalate if persists

### Low
- **Definition**: Minor issue, auto-fixable
- **Examples**:
  - Lint errors
  - Formatting issues
  - Missing imports
  - Typos
- **Action**: Auto-fix, no escalation needed

---

## Knowledge Entity Types

### System
- **Definition**: High-level system architecture
- **Naming**: `Project.System.Name`
- **Examples**: `NOP.Project.Architecture`, `Global.Workflow.MultiAgent`

### Service
- **Definition**: Backend service or API layer
- **Naming**: `Project.Backend.Service.Name`
- **Examples**: `NOP.Backend.Services.SnifferService`

### Feature
- **Definition**: User-facing functionality
- **Naming**: `Project.Area.Feature.Name`
- **Examples**: `Frontend.Traffic.PacketCrafting`

### Component
- **Definition**: UI component or reusable module
- **Naming**: `Project.Area.Component.Name`
- **Examples**: `Frontend.Components.Layout`

### Model
- **Definition**: Data model or database entity
- **Naming**: `Project.Backend.Models.Name`
- **Examples**: `NOP.Backend.Models.Asset`

### Endpoint
- **Definition**: API endpoint or route
- **Naming**: `Project.Backend.API.Name`
- **Examples**: `NOP.Backend.API.TrafficEndpoint`

### Pattern
- **Definition**: Reusable design pattern
- **Naming**: `Global.Pattern.Category.Name`
- **Examples**: `Global.Pattern.Security.JWTAuth`

### Workflow
- **Definition**: Agent workflow or process
- **Naming**: `Global.Workflow.Category.Name`
- **Examples**: `Global.Workflow.MultiAgent.Orchestrator`

---

## Relation Types

### USES
- **Definition**: Component uses another for functionality
- **Direction**: Consumer → Provider
- **Example**: `Frontend.Pages.Dashboard USES Frontend.Services.DashboardService`

### IMPLEMENTS
- **Definition**: Component implements a feature or interface
- **Direction**: Implementation → Specification
- **Example**: `Frontend.Pages.Traffic IMPLEMENTS Frontend.Features.PacketCrafting`

### DEPENDS_ON
- **Definition**: Hard dependency, cannot function without
- **Direction**: Dependent → Dependency
- **Example**: `Backend.API.DiscoveryEndpoint DEPENDS_ON Backend.Services.NetworkScanner`

### CONSUMES
- **Definition**: Consumes data or events from another component
- **Direction**: Consumer → Producer
- **Example**: `Frontend.Components.PacketInspector CONSUMES Backend.Services.SnifferService`

### PROVIDES
- **Definition**: Provides functionality or data to dependents
- **Direction**: Provider → (implicit consumers)
- **Example**: `Backend.Core.Database PROVIDES Backend.Models`

### MODIFIES
- **Definition**: Changes state of another entity
- **Direction**: Modifier → Modified
- **Example**: `Backend.Services.DiscoveryService MODIFIES Backend.Models.Asset`

### CREATES
- **Definition**: Creates instances of another entity
- **Direction**: Creator → Created
- **Example**: `Backend.Services.SnifferService CREATES Backend.Models.Flow`

---

## Time Estimates

### Simple Edit
- **Planning**: 1-2 minutes
- **Implementation**: 2-5 minutes
- **Testing**: 1-2 minutes
- **Total**: <10 minutes

### Medium Task
- **Planning**: 2-5 minutes
- **Implementation**: 10-20 minutes
- **Testing**: 5-10 minutes
- **Total**: 15-35 minutes

### Complex Task
- **Planning**: 10-15 minutes
- **Implementation**: 30-60 minutes
- **Testing**: 15-30 minutes
- **Documentation**: 5-10 minutes
- **Total**: 60-120 minutes

### Major Changes
- **Planning**: 20-30 minutes
- **Implementation**: 60-180 minutes
- **Testing**: 30-60 minutes
- **Documentation**: 10-20 minutes
- **Review**: 10-15 minutes
- **Total**: 130-305 minutes (2-5 hours)

**Use for**:
- Estimating session duration
- Deciding when to split tasks
- Setting realistic expectations

---

## Version History

- **v1.0.0** - Initial framework (2025-12-26)
- **v1.1.0** - Added workflow logging (2025-12-28)
- **v1.2.0** - Enhanced skills system (2025-12-29)
- **v2.0.0** - Added glossary, unified protocols (2025-12-30)

---

**End of Glossary**
