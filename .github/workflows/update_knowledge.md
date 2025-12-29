# Update Knowledge

**Purpose**: Knowledge graph optimization and synchronization | **Agents**: Researcher→Developer→Reviewer

**⚠️ IMPORTANT**: This workflow operates ONLY on knowledge files (JSONL format):
- `project_knowledge.json` (root) - Project-specific entities, relations, codegraph
- `.github/global_knowledge.json` - Universal patterns (cross-project)

**Legacy Note**: The old "memory" system (global_memory.json, project_memory.json, update_memory.py) has been deprecated and removed. Do NOT create or reference memory files.

## Knowledge File Structure (JSONL)
```
project_knowledge.json (root)
├── {"type":"entity",...}        # Project entities (components, services, features)
├── {"type":"relation",...}      # Entity relationships (IMPLEMENTS, USES, etc.)
└── {"type":"codegraph",...}     # Code structure (dependencies, dependents)

.github/global_knowledge.json
└── {"type":"entity",...}        # Universal patterns (Global.Pattern.*)
    {"type":"relation",...}      # Cross-pattern relations
```

## Workflow Steps

### 1. Extract Learnings from Workflow Logs
```
[DELEGATE: agent=Researcher | task="Extract from workflow logs"]
→ Parse log/workflow/*.md for new entities, patterns, relations
→ Identify project-specific learnings vs. universal patterns
```

### 2. Assess Current Knowledge State
```
[DELEGATE: agent=Researcher | task="Assess knowledge state"]
→ Check for gaps (missing entities, incomplete relations)
→ Identify outdated entries (old upd: dates)
→ Detect bloat (meta entities, duplicates >80% similarity)
```

### 3. Scan Codebase for New Entities
```
[DELEGATE: agent=Researcher | task="Scan codebase"]
→ Detect new components, services, features
→ Generate codegraph nodes (dependencies, dependents)
→ Map relationships between entities
```

### 4. Update Project Knowledge
```
[DELEGATE: agent=Developer | task="Update project_knowledge.json"]
→ Add new entities with proper entityType classification
→ Update existing entities (append observations, update upd: date)
→ Add new relations with appropriate relationType
→ Maintain JSONL format (one entity/relation/codegraph per line)
→ Do NOT modify .github/global_knowledge.json yet
```

**Entity Format**: `{"type":"entity","name":"NOP.Module.Component","entityType":"Type","observations":["desc","upd:YYYY-MM-DD,refs:N"]}`

### 5. Identify Universal Patterns
```
[DELEGATE: agent=Researcher | task="Identify universal patterns"]
→ Review project entities for reusable patterns
→ Look for architectural, design, or technical patterns
→ Determine if pattern is project-specific or universal
→ Universal patterns should apply across multiple projects
```

### 6. Update Global Knowledge
```
[DELEGATE: agent=Developer | task="Update .github/global_knowledge.json"]
→ Extract universal patterns from project knowledge
→ Add as Global.Pattern.* entities
→ Prefix patterns: Global.Pattern.{Category}.{Name}
→ Categories: Architecture, API, Security, Testing, Design, Code, Network, Frontend, UI, etc.
→ Add cross-pattern relations
```

**Pattern Format**: `{"type":"entity","name":"Global.Pattern.Category.PatternName","entityType":"Pattern","observations":["desc","upd:YYYY-MM-DD,refs:N"]}`

### 7. Validate and Optimize
```
[DELEGATE: agent=Reviewer | task="Validate knowledge updates"]
→ Verify JSONL format (no JSON arrays, one object per line)
→ Check size constraints (<100KB total)
→ Validate Entity:Cluster ratio (≥6:1)
→ Ensure no duplicate entities
→ Confirm upd: dates are current
```

## Cleanup and Optimization Targets

| Category | Action | Rationale |
|----------|--------|-----------|
| Meta entities | Remove | Focus on concrete entities, not metadata |
| Duplicates >80% similar | Merge | Reduce redundancy, combine observations |
| Obsolete (90+ days old) | Review & remove | Keep knowledge current |
| Verbose observations | Condense to 60-80 chars | Maintain readability, reduce bloat |
| Missing upd: dates | Add current date | Track freshness |
| Broken relations | Fix or remove | Ensure graph integrity |

## Useful Commands

```bash
# Extract learnings from workflow logs
grep -h "Learnings\|Pattern:\|relation" log/workflow/*.md 2>/dev/null | head -10

# Count entities by type in project knowledge
grep '"type":"entity"' project_knowledge.json | wc -l

# Count relations
grep '"type":"relation"' project_knowledge.json | wc -l

# Count codegraph nodes
grep '"type":"codegraph"' project_knowledge.json | wc -l

# Check file sizes
wc -c project_knowledge.json .github/global_knowledge.json

# Find entities without recent updates (older than 30 days)
grep '"type":"entity"' project_knowledge.json | grep -v "upd:2025"

# Validate JSONL format (each line should be valid JSON)
while IFS= read -r line; do echo "$line" | jq . >/dev/null || echo "Invalid JSON: $line"; done < project_knowledge.json
```

## Quality Targets

- **Size**: <100KB total (project + global combined)
- **Entity:Cluster ratio**: ≥6:1 (prefer granular entities over large clusters)
- **Duplication**: <5% similar entities
- **Freshness**: >80% entities updated within 90 days
- **Format**: 100% valid JSONL (one JSON object per line)
- **Relations integrity**: All relations reference existing entities

## Common Entity Types

**Project Knowledge**:
- System, Service, Feature, Component, Page, Model, Endpoint, Store, Framework, Module, Schema, Utility

**Global Knowledge**:
- Pattern, Workflow, Architecture (use Global.Pattern.* prefix)

## Relation Types

- IMPLEMENTS, USES, CONSUMES, DEPENDS_ON, PROVIDES, CREATES, MODIFIES, READS, WRITES, CALLS, EXTENDS, COMPLEMENTS, ENABLES, FOLLOWS, VALIDATES

## Execution Checklist

When running this workflow, ensure:
- [ ] Extract learnings from all workflow logs in log/workflow/
- [ ] Scan codebase for new entities (components, services, etc.)
- [ ] Update BOTH project_knowledge.json AND .github/global_knowledge.json
- [ ] Add new entities with proper entityType and observations
- [ ] Update existing entities (append observations, update upd: date)
- [ ] Add relations between entities
- [ ] Extract universal patterns to global knowledge
- [ ] Validate JSONL format and size constraints
- [ ] Clean up duplicates and obsolete entries
- [ ] Verify Entity:Cluster ratio
- [ ] Do NOT create or reference any "memory" files (deprecated)
