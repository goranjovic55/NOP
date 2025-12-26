# Init Project Workflow

**Purpose**: Greenfield project creation with ecosystem compliance | **Orchestrator**: DevTeam | **Specialists**: Architect→Developer→Reviewer | **Target**: Production-ready compliant project in 45-90min

## Agent Delegation

| Phase | Agent | Focus |
|-------|-------|-------|
| PRE | DevTeam | Requirements gathering, scope |
| 1-2 | Architect | System design, blueprints |
| 3-4 | Developer | Structure, configs, boilerplate |
| 5-6 | Architect | Technical specs, implementation plan |
| 7-8 | Developer | Skeleton code, test infrastructure |
| POST | Reviewer | Validation, compliance check |

## Execution Pattern

```
[DELEGATE: agent=Architect | task="Design system architecture"]
→ Returns: ARCH blueprint, component design
[DELEGATE: agent=Developer | task="Create project structure"]
→ Returns: Directory layout, configs, knowledge files
[DELEGATE: agent=Architect | task="Technical specifications"]
→ Returns: TECH blueprint, API design
[DELEGATE: agent=Developer | task="Implement skeleton"]
→ Returns: Boilerplate, entry points
[DELEGATE: agent=Reviewer | task="Validate compliance"]
→ Returns: Compliance report, handoff status
```

## Phase Operations

| Phase | Agent | Operations |
|-------|-------|------------|
| PRE | DevTeam | gather_requirements\|define_scope\|establish_goals |
| 1 | Architect | design_context\|define_components\|map_flow |
| 2 | Developer | create_dirs\|setup_workflows\|init_knowledge |
| 3 | Architect | design_models\|define_apis\|specify_interfaces |
| 4 | Developer | generate_readme\|create_docs\|apply_standards |
| 5 | Architect | plan_features\|design_modules\|create_roadmap |
| 6 | Developer | create_entry_points\|generate_boilerplate |
| 7 | Architect | design_test_strategy\|plan_coverage |
| 8 | Developer | install_framework\|create_tests\|validate |
| POST | Reviewer | validate_compliance\|verify_quality\|test_workflows |

## Standard Structure

```
project/
├── src/ (or lib/,app/,pkg/)
├── tests/ (unit/,integration/,fixtures/)
├── docs/ (architecture/,technical/)
├── .github/ (workflows/,instructions/,chatmodes/)
├── project_knowledge.json (entities + codegraph)
└── [lang-specific configs]
```

## Knowledge Strategy

**Project Knowledge**: 10-20 entities + codegraph from blueprints
**Global Knowledge**: Universal patterns (copy from .github/)

## Quality Gates

| Gate | Agent | Check |
|------|-------|-------|
| Design | Architect | Alternatives considered, patterns applied |
| Structure | Developer | Conventions followed, configs valid |
| Quality | Reviewer | All tests pass, compliance met |

## Handoff Format

```json
{
  "status": "complete",
  "artifacts": ["project structure", "blueprints", "knowledge files"],
  "learnings": ["patterns applied", "decisions made"]
}
```
