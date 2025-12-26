# Update Knowledge Workflow

**Purpose**: Knowledge graph optimization (codegraph + entities + relations) | **Orchestrator**: DevTeam | **Specialists**: Researcher→Developer→Reviewer | **Target**: Unified, condensed knowledge graph <100KB

## Knowledge Graph Structure

```
project_knowledge.json (root)
├── entities: Project-specific knowledge
├── relations: Connections between entities
└── codegraph: Code structure mapping (modules, classes, inheritance)

global_knowledge.json (.github/)
└── Universal patterns for cross-project reuse
```

## Agent Delegation

| Cycle | Phase | Agent | Focus |
|-------|-------|-------|-------|
| 1 | 1-4 | Researcher | Project knowledge analysis |
| 1 | 5-8 | Developer | Project knowledge implementation |
| 2 | 9-12 | Researcher | Global knowledge analysis |
| 2 | 13-16 | Developer | Global knowledge implementation |
| POST | - | Reviewer | Validation, verification |

## Execution Pattern

```
[DELEGATE: agent=Researcher | task="Assess knowledge graph state"]
→ Returns: Coverage gaps, outdated entries, bloat candidates
[DELEGATE: agent=Researcher | task="Scan codebase for entities"]
→ Returns: Entity list, relations, codegraph updates
[DELEGATE: agent=Developer | task="Update project knowledge"]
→ Returns: Optimized entities, codegraph updated
[DELEGATE: agent=Researcher | task="Identify universal patterns"]
→ Returns: Global candidates, abstraction opportunities
[DELEGATE: agent=Developer | task="Distill to global knowledge"]
→ Returns: Universal patterns added
[DELEGATE: agent=Reviewer | task="Validate knowledge compliance"]
→ Returns: Size check, hierarchy validation
```

## Phase Operations

| Phase | Agent | Operations |
|-------|-------|------------|
| 1 | Researcher | load_existing\|analyze_coverage\|detect_outdated |
| 2 | Researcher | scan_codebase\|extract_entities\|build_codegraph |
| 3 | Researcher | validate_hierarchy\|detect_disconnected\|find_duplicates |
| 4 | Researcher | identify_universal\|detect_project_duplicates |
| 5 | Developer | remove_obsolete\|merge_duplicates\|condense_verbose |
| 6 | Developer | connect_entities\|enforce_hierarchy\|update_codegraph |
| 7 | Developer | abstract_to_universal\|remove_project_duplicates |
| 8 | Developer | optimize_size\|validate_integrity |
| POST | Reviewer | validate_size\|verify_connections\|confirm_compliance |

## Knowledge Hierarchy

**4-Layer**: Type → Domain → Cluster → Entity

**Entity Format**:
```json
{"type":"entity","name":"Project.Domain.Cluster.Name","entityType":"Type","observations":["description","upd:YYYY-MM-DD,refs:N"]}
```

**Relation Format**:
```json
{"type":"relation","from":"Entity.A","to":"Entity.B","relationType":"USES|IMPLEMENTS|BELONGS_TO"}
```

## Cleanup Targets

| Category | Action |
|----------|--------|
| Meta entities | Remove |
| Duplicates (>80% similar) | Merge |
| Obsolete (no refs 90+ days) | Remove |
| Verbose (>500 chars) | Condense to 60-80 chars |

## Size Targets

| Metric | Target |
|--------|--------|
| Total size | <100KB |
| Entity:Cluster ratio | ≥6:1 |

## Quality Gates

| Gate | Agent | Check |
|------|-------|-------|
| Analysis | Researcher | Gaps identified, patterns found |
| Optimization | Developer | Condensed, connected |
| Validation | Reviewer | <100KB, hierarchy valid |

## Handoff Format

```json
{
  "status": "complete",
  "metrics": { "entities_before": 100, "entities_after": 75, "size_kb": 85 },
  "artifacts": ["project_knowledge.json", "global_knowledge.json"],
  "learnings": ["hierarchy patterns", "condensation techniques"]
}
```
