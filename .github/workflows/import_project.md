# Import Project Workflow

**Purpose**: External project onboarding into ecosystem | **Orchestrator**: DevTeam | **Specialists**: Researcher→Developer→Reviewer | **Target**: Ecosystem-compliant project in ≤30min

## Agent Delegation

| Phase | Agent | Focus |
|-------|-------|-------|
| PRE | DevTeam | Inventory, detection |
| 1,3,5,7,9 | Researcher | Analysis, investigation |
| 2,4,6,8,10 | Developer | Implementation, integration |
| POST | Reviewer | Validation, compliance |

## Execution Pattern

```
[DELEGATE: agent=Researcher | task="Analyze tech stack and structure"]
→ Returns: Tech report, architecture analysis
[DELEGATE: agent=Developer | task="Create standard directory structure"]
→ Returns: Dirs created, configs setup
[DELEGATE: agent=Researcher | task="Scan codebase for patterns"]
→ Returns: Code inventory, patterns detected
[DELEGATE: agent=Developer | task="Generate knowledge graph"]
→ Returns: project_knowledge.json with entities + codegraph
[DELEGATE: agent=Reviewer | task="Validate compliance"]
→ Returns: Compliance report, readiness status
```

## Phase Operations

| Phase | Agent | Operations |
|-------|-------|------------|
| PRE | DevTeam | scan_repo\|detect_lang\|parse_deps\|analyze_structure |
| 1 | Researcher | parse_deps\|detect_versions\|map_arch\|detect_patterns |
| 2 | Developer | create_dirs\|copy_workflows\|setup_configs |
| 3 | Researcher | scan_modules\|extract_imports\|detect_patterns |
| 4 | Developer | extract_entities\|build_codegraph\|create_relations |
| 5 | Researcher | identify_domain_concepts\|detect_arch_patterns |
| 6 | Developer | create_project_knowledge\|transfer_global |
| 7 | Researcher | assess_existing_docs\|identify_gaps\|plan_docs |
| 8 | Developer | generate_readme\|create_arch_doc\|create_api_doc |
| 9 | Researcher | detect_test_framework\|assess_coverage\|plan_suite |
| 10 | Developer | create_test_structure\|create_examples |
| POST | Reviewer | validate_all\|confirm_readiness\|generate_report |

## Standard Structure

```
project/
├── src/ (preserve existing+organize)
├── tests/ (unit,integration,fixtures)
├── docs/ (architecture,technical)
├── .github/ (workflows/,chatmodes/)
├── project_knowledge.json (entities + codegraph)
└── [lang-specific configs]
```

## Knowledge Strategy

**Project Knowledge**: EMPTY entities (build during work) + codegraph from scan
**Global Knowledge**: Transfer from .github/ or create minimal (10-15 patterns)

## Quality Gates

| Gate | Agent | Check |
|------|-------|-------|
| Analysis | Researcher | Complete inventory, patterns identified |
| Structure | Developer | Dirs created, knowledge initialized |
| Quality | Reviewer | All components compliant |

## Handoff Format

```json
{
  "status": "complete",
  "artifacts": ["structure", "project_knowledge.json", "docs"],
  "learnings": ["tech stack", "patterns discovered"]
}
```
