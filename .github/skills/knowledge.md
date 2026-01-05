# Knowledge

Maintain `project_knowledge.json` as institutional memory. Line 1 = map.

## When to Use
- Start of task (CONTEXT phase)
- During work (query as needed)
- Before commit (SESSION END)

## Avoid
- ❌ Loading everything upfront → ✅ Index map, query as needed
- ❌ Duplicate entities → ✅ Check existing first
- ❌ Stale observations → ✅ Add upd:YYYY-MM-DD

## Examples

### CONTEXT Phase
```bash
# Read map (line 1)
head -1 project_knowledge.json | python3 -m json.tool

# Query entity
grep '"name":"ModuleName"' project_knowledge.json

# Find dependencies
grep '"from":"ModuleName"' project_knowledge.json
```

### Format (JSONL)
```json
{"type":"map","domains":{"Backend":"Line 5+"},"quickNav":{"api":"..."}}
{"type":"entity","name":"Service","entityType":"service","observations":["desc","upd:2026-01-05"]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
{"type":"codegraph","name":"file.py","nodeType":"module","dependencies":["X"]}
```

### Entity Types
- `service` - Backend service
- `component` - Frontend component
- `module` - Logical module
- `infrastructure` - Docker/networking
- `feature` - User feature
- `tool` - Script/utility

### Relation Types
- `USES` - A calls B
- `IMPLEMENTS` - A implements B
- `DEPENDS_ON` - A requires B
- `EXTENDS` - A extends B
- `CONTAINS` - A contains B

### Add Entity
```json
{"type":"entity","name":"CVEScanner","entityType":"service","observations":["NVD API","upd:2026-01-05"]}
{"type":"relation","from":"VulnService","to":"CVEScanner","relationType":"USES"}
```

### SESSION END
```bash
# Auto-generate codemap
python .github/scripts/generate_codemap.py

# Add manual entities for new features/architecture
```

## Related
- documentation.md
- debugging.md
