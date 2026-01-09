---
name: knowledge
description: Load when working with project_knowledge.json, context files, or managing project knowledge
triggers: ["project_knowledge.json", "knowledge", "context", "cache", "gotchas"]
---

# Knowledge Management v3.0

## When to Use
Load this skill when: querying project knowledge, updating knowledge cache, working with gotchas.

Query and maintain project knowledge files for context. Cross-project pattern.

## Knowledge Schema v3.0 (90% Token Reduction)

```
project_knowledge.json structure:
├─ Line 1: HOT_CACHE (top 20 entities + answers + quick facts)
├─ Line 2: DOMAIN_INDEX (per-domain entity lookup)
├─ Line 3: CHANGE_TRACKING (file hashes)
├─ Line 4: GOTCHAS (historical issues + solutions) ← NEW v3.0
├─ Line 5: SESSION_PATTERNS (predictive loading) ← NEW v3.0
├─ Line 6: INTERCONNECTIONS (service→model→endpoint) ← NEW v3.0
├─ Line 7: MAP (legacy navigation)
├─ Lines 8+: ENTITIES (122 entities)
└─ Lines 130+: CODEGRAPH (156 module dependencies)
```

### v3.0 Cache Layers (verified via 100k simulations)

| Layer | Hit Rate | Use Case |
|-------|----------|----------|
| hot_cache | 31% | Entity lookup, common answers |
| gotchas | 11% | Debug queries, error solutions |
| predictive | 7% | Session pattern preloading |
| interconnections | 14% | Dependency lookups |
| domain_index | 22% | Entity by domain |
| **file reads** | **15%** | Only for complex queries |

### Layer 1: HOT_CACHE (Always in Context)
- Top 20 frecency-ranked entities
- Expanded common_answers (25+ answers)
- quick_facts: tech stack, ports, auth flow

### Layer 2: GOTCHAS (Debug Acceleration)
- 8 documented historical issues
- Keyword-matched for instant lookup
- Solution + affected files

### Layer 3: SESSION_PATTERNS (Predictive)
- 4 common session patterns
- Trigger keywords for preloading
- Follow-up query predictions

### Layer 4: INTERCONNECTIONS (Dependency Map)
- service_to_models mapping
- endpoint_to_services mapping
- page_to_stores mapping

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
| Manual edits | Auto-generation with knowledge.py |

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
python .github/scripts/knowledge.py

# 2. Check for skill suggestions
python .github/scripts/skills.py --suggest

# 3. Create workflow log
```

## Best Practices

1. **Lazy Loading:** Only load sections you need
2. **Cache Results:** Don't re-parse unchanged files
3. **Version Tracking:** Include generation timestamp
4. **Validation:** Verify knowledge file is valid JSON
5. **Incremental Updates:** Update only changed sections
