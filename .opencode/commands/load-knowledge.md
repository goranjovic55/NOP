---
description: Load project knowledge for architecture and file lookups
---

Load the project knowledge graph for instant access to:
- File paths and locations
- Known gotchas and solutions  
- Entity relationships

Execute this command:
```bash
head -100 project_knowledge.json
```

Then keep this knowledge in context for the session. Query order:
1. hot_cache → top 30 entities with paths
2. gotchas → 43 known issues with solutions
3. domain_index → all backend/frontend file paths
4. layer relations → entity connections

Use this knowledge BEFORE searching the codebase.
