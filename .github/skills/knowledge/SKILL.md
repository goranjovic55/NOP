---
name: knowledge
description: Load when working with project_knowledge.json, context files, or managing project knowledge
---

# Knowledge Management

Query and maintain project knowledge files for context. Cross-project pattern.

## Critical Rules

- **Read overview first:** Don't load entire file, start with summary
- **Navigate by domain:** Use index/map to find relevant sections
- **Auto-generate preferred:** Use scripts over manual edits
- **Update on changes:** Regenerate when structure changes

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Load entire file | Read overview first |
| Search without index | Use navigation map |
| Manual edits | Auto-generation |
| Stale knowledge | Regenerate on changes |

## Knowledge File Patterns

### Hierarchical Structure
```json
{
  "meta": {
    "generated": "2024-01-07",
    "version": "2.0"
  },
  "navigation": {
    "Backend": { "line": 10, "count": 25 },
    "Frontend": { "line": 50, "count": 30 }
  },
  "domains": {
    "Backend": {
      "tech": ["Python", "FastAPI", "PostgreSQL"],
      "entities": ["User", "Item", "Order"]
    }
  }
}
```

### Reading Pattern
```bash
# 1. Read navigation/overview (first 50 lines)
head -50 project_knowledge.json | jq '.'

# 2. Find domain of interest
jq '.navigation.Backend' project_knowledge.json

# 3. Load only relevant section
sed -n '10,35p' project_knowledge.json | jq '.'
```

### Querying Entities
```bash
# Find by type
jq '.entities[] | select(.type == "Service")' project_knowledge.json

# Find by technology
jq '.entities[] | select(.tech | contains(["PostgreSQL"]))' project_knowledge.json

# List all endpoints
jq '.entities[] | select(.type == "Endpoint") | .path' project_knowledge.json
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
