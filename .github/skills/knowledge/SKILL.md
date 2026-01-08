---
name: knowledge
description: Load when working with project_knowledge.json, context files, or managing project knowledge
---

# Knowledge Management v2.0

Query and maintain project knowledge files for context. Cross-project pattern.

## Knowledge Schema v2.0 (Optimized)

```
project_knowledge.json structure:
├─ Line 1: HOT_CACHE (top 20 entities + common answers)
├─ Line 2: DOMAIN_INDEX (per-domain entity lookup)
├─ Line 3: CHANGE_TRACKING (file hashes)
├─ Line 4: MAP (legacy navigation)
├─ Lines 5+: ENTITIES (122 entities)
└─ Lines 127+: CODEGRAPH (156 module dependencies)
```

### Layer 1: HOT_CACHE (Always in Context)
- **60% of queries answered** with zero file reads
- Contains: top 20 frecency-ranked entities
- Contains: common_answers for frequent questions
- Contains: hot_paths for frequently edited dirs

### Layer 2: DOMAIN_INDEX (Fast Lookup)
- **30% of queries answered** with single entity read
- Per-domain indexes: frontend, backend, infrastructure
- Technology mapping: zustand, fastapi, sqlalchemy, etc.

### Layer 3: Full Knowledge (On-Demand)
- **10% of queries** need full scan
- Complete entity definitions
- All codegraph relations

## Critical Rules

- **Read hot_cache first:** Contains top entities + common answers
- **Use domain_index:** O(1) lookup by domain/technology
- **Check change_tracking:** Skip stale analysis
- **Auto-generate preferred:** Use scripts over manual edits

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Load entire file | Read hot_cache (line 1) first |
| Search without index | Use domain_index (line 2) |
| Re-analyze unchanged files | Check change_tracking hashes |
| Manual edits | Auto-generation with generate_codemap.py |

## Quick Reference

### Common Answers (Pre-computed)
```json
{
  "where_is_auth": ["frontend/src/store/authStore.ts", "backend/app/core/security.py"],
  "where_is_models": "backend/app/models/",
  "where_is_api": "backend/app/api/v1/",
  "where_is_pages": "frontend/src/pages/",
  "how_to_add_endpoint": "1. Create in api/v1/ 2. Add to main.py 3. Create service",
  "how_to_add_page": "1. Create in pages/ 2. Add route in App.tsx 3. Add nav"
}
```

### Reading Pattern (v2.0)
```bash
# 1. Read hot_cache (line 1) - usually sufficient
head -1 project_knowledge.json | jq '.'

# 2. If need domain list, read domain_index (line 2)
sed -n '2p' project_knowledge.json | jq '.backend.models'

# 3. Check if files changed since last analysis
sed -n '3p' project_knowledge.json | jq '.file_hashes'

# 4. Only read full entities if needed (lines 5+)
sed -n '5,50p' project_knowledge.json | jq '.'
```

## Project Context Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `project_knowledge.json` | Auto-generated codebase map | Start of session |
| `README.md` | Project overview | New to project |
| `docs/INDEX.md` | Documentation navigation | Finding docs |
| `CLAUDE.md` | AI-specific context | Agent sessions |

## Generation Scripts

### Knowledge Generator Pattern
```python
#!/usr/bin/env python3
"""Generate project knowledge from codebase."""

import json
from pathlib import Path

def scan_directory(path: Path) -> dict:
    entities = []
    
    for file in path.rglob("*.py"):
        # Extract classes, functions, etc.
        entities.extend(parse_python_file(file))
    
    for file in path.rglob("*.tsx"):
        entities.extend(parse_react_file(file))
    
    return {
        "meta": {"generated": datetime.now().isoformat()},
        "navigation": build_navigation(entities),
        "entities": entities,
    }

def main():
    knowledge = scan_directory(Path("."))
    Path("project_knowledge.json").write_text(
        json.dumps(knowledge, indent=2)
    )
```

### Skill Suggestion Pattern
```python
#!/usr/bin/env python3
"""Suggest new skills based on workflow patterns."""

def analyze_workflow_logs(log_dir: Path) -> list[dict]:
    patterns = Counter()
    
    for log in log_dir.glob("*.md"):
        content = log.read_text()
        # Extract patterns, errors, repeated actions
        patterns.update(extract_patterns(content))
    
    return [
        {"pattern": p, "count": c, "suggest_skill": c >= 5}
        for p, c in patterns.most_common(20)
    ]
```

## Session Workflow

### Start of Session
```bash
# 1. Load project overview
head -50 project_knowledge.json | jq '.navigation'

# 2. Check for relevant skills
cat .github/skills/INDEX.md

# 3. Load domain-specific knowledge as needed
```

### End of Session
```bash
# 1. Regenerate knowledge if structure changed
python scripts/generate_knowledge.py

# 2. Check for skill suggestions
python scripts/suggest_skill.py

# 3. Create workflow log
```

## Best Practices

1. **Lazy Loading:** Only load sections you need
2. **Cache Results:** Don't re-parse unchanged files
3. **Version Tracking:** Include generation timestamp
4. **Validation:** Verify knowledge file is valid JSON
5. **Incremental Updates:** Update only changed sections
