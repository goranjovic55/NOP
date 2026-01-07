# Knowledge

Query and update `project_knowledge.json` for project context. **Hierarchical v2.0:** Always read lines 1-50 first.

## When to Use
- CONTEXT phase (load overview)
- Finding features/services
- Understanding architecture
- SESSION END (auto-regenerate)

## Format

**Lines 1-50: Overview (Read First)**
- Line 1: Navigation map → domain line pointers
- Lines 2-N: Domain summaries (tech stack, entity counts)

**Lines 51+: Details (On-Demand)**
- Detailed entities grouped by domain

## Avoid
- ❌ Load entire file → ✅ Read lines 1-50 first
- ❌ Search without map → ✅ Use domain pointers
- ❌ Manual edits → ✅ Auto-generated (session_end.py)

## Examples

### CONTEXT Phase
```bash
# Read overview (lines 1-50)
head -50 project_knowledge.json | jq -r '.'

# Parse navigation map
head -1 project_knowledge.json | jq -r '.domains'
```

### Load Domain Details
```bash
# Get Backend line range
head -1 project_knowledge.json | jq -r '.domains.Backend'
# → {"summary_line": 5, "details_lines": "15-45", "count": 30}

# Load Backend details only
sed -n '15,45p' project_knowledge.json | jq -r '.'
```

### Search Entities
```bash
# Find all services
cat project_knowledge.json | jq -r 'select(.entityType=="Service")'

# Find tech usage
cat project_knowledge.json | jq -r 'select(.tech[]? | contains("PostgreSQL"))'
```

## Related
- documentation.md
