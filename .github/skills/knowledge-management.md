# Knowledge Management

## Overview

Maintain `project_knowledge.json` as institutional memory. Load at start, update before commit.

---

## Start of Task

**Always load first:**
```bash
cat project_knowledge.json
```

**Query for:**
- Existing entities (avoid duplicates)
- Related components
- Dependencies/dependents
- Recent updates

---

## Format (JSONL)

**Entity:**
```json
{"type":"entity","name":"Module.Component","entityType":"service","observations":["desc","upd:YYYY-MM-DD"]}
```

**Relation:**
```json
{"type":"relation","from":"A","to":"B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
```

**Codegraph:**
```json
{"type":"codegraph","name":"file.ext","nodeType":"module","dependencies":["X"],"dependents":["Y"]}
```

---

## Entity Types

- `service` - Backend service, API
- `component` - Frontend component
- `module` - Logical module
- `infrastructure` - Docker, networking
- `feature` - User-facing feature
- `tool` - Script, utility

---

## Relation Types

- `USES` - A calls/imports B
- `IMPLEMENTS` - A implements interface B
- `DEPENDS_ON` - A requires B to function
- `EXTENDS` - A extends B
- `CONTAINS` - A contains B

---

## During Work

**Add entities manually:**
- New services, components, features
- Architecture decisions
- Integration points

**Example:**
```json
{"type":"entity","name":"CVEScanner","entityType":"service","observations":["NVD API integration","upd:2026-01-03"]}
{"type":"relation","from":"VulnScanService","to":"CVEScanner","relationType":"USES"}
```

---

## Before Commit

**1. Generate codemap:**
```bash
python .github/scripts/generate_codemap.py
```

**2. Add manual entities:**
- New features
- Architectural changes
- Integration points

**3. Update observations:**
```json
{"type":"entity","name":"ExistingService","entityType":"service","observations":["original desc","enhanced X","upd:2026-01-03"]}
```

---

## Query Patterns

**Find entity:**
```bash
grep '"name":"ModuleName"' project_knowledge.json
```

**Find dependencies:**
```bash
grep '"from":"ModuleName"' project_knowledge.json
```

**Find dependents:**
```bash
grep '"to":"ModuleName"' project_knowledge.json
```

**Recent updates:**
```bash
grep 'upd:2026-01' project_knowledge.json
```

---

## Best Practices

- Load knowledge at task start (CONTEXT phase)
- Check for existing entities before creating
- Add observations with dates (upd:YYYY-MM-DD)
- Update before commit (LEARN phase)
- Keep descriptions concise
- Use consistent naming (PascalCase for entities)

---

## Common Mistakes

❌ Creating duplicate entities  
✅ Query first, then create

❌ Forgetting to update after changes  
✅ Always update in LEARN phase

❌ Vague observations  
✅ Specific, dated observations

❌ Missing relations  
✅ Document integration points
