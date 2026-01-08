---
name: knowledge
description: project_knowledge.json - Context management
---
# Knowledge

## ⚠️ Critical
- Read overview first (1-50 lines)
- Navigate by domain, don't load all
- Auto-generate preferred

## Reading
```bash
head -50 project_knowledge.json | jq '.navigation'
jq '.entities[] | select(.type == "Service")' project_knowledge.json
```

## Session
**Start:** Load overview + skills/INDEX.md
**End:** Regenerate if structure changed
