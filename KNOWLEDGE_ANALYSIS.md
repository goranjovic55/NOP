# Knowledge System Analysis

**Date**: 2026-01-05
**Current Format**: JSONL (JSON Lines)
**Size**: 439 lines, ~440 entities

---

## Current Format Analysis

### Strengths ✅

1. **Line 1 Navigation Map** - Excellent quick reference
   - Domain grouping with line numbers
   - QuickNav for common tasks (Scans, Traffic, Access, Assets, Settings)
   - Updated timestamp tracking

2. **JSONL Format** - Efficient for large datasets
   - Line-based = easy to grep/search
   - No need to load entire file into memory
   - Append-friendly for updates

3. **Entity-Centric** - Clear structure
   - Consistent entity naming (NOP.Backend.X, Frontend.X)
   - Type classification (Service, Feature, Model, Component)
   - Observations array captures multiple facts

### Issues ❌

1. **Observations Are Unstructured**
   - Mix of descriptions, technical details, update dates
   - No clear schema: "JWT authentication" + "upd:2025-12-27" in same array
   - Hard to query programmatically ("show me all features updated after Dec 28")

2. **Manual Maintenance Heavy**
   - Auto-generated script creates generic entries: "Defined in backend/..."
   - Requires manual editing to add meaningful observations
   - No way to preserve manual edits during regeneration

3. **No Relational Querying**
   - Relations exist but unused (0 relations in current file)
   - Can't answer: "What services does CVELookupService depend on?"
   - CodeGraph entries present but disconnected from entities

4. **Context Window Bloat**
   - 439 lines = too large to load all at once
   - Navigation map helps but agents still grep for specifics
   - Many auto-generated entities have minimal value ("Component.XYZ - Defined in...")

5. **Observation Quality Varies**
   - High quality: "NVD API v2.0 integration, 7-day cache, rate limiting"
   - Low quality: "Asset management and tracking"
   - No standardized format for observations

---

## Usage Patterns (From Sessions)

**How agents currently use it:**
1. Read Line 1 map for domain overview
2. Grep for specific entity names
3. Read observations to understand feature
4. Rarely query relations/codegraph

**Pain points:**
- Too verbose for quick lookups
- Not structured enough for complex queries
- Auto-generation overwrites manual improvements

---

## Proposed Improvements

### Option 1: Structured Observations (Minimal Change)

**Format:**
```json
{
  "type": "entity",
  "name": "Backend.Services.CVELookupService",
  "entityType": "service",
  "purpose": "NVD API integration for CVE lookups",
  "tech": ["Python", "NVD API v2.0", "PostgreSQL"],
  "features": ["Rate limiting (5/30s)", "7-day cache", "CPE mapping"],
  "gotchas": ["Requires CAP_NET_RAW in Docker", "Product name mapping critical"],
  "related": ["Backend.Services.VersionDetectionService", "Backend.Services.ExploitMatchService"],
  "updated": "2026-01-01"
}
```

**Pros:**
- Queryable fields (show all services using PostgreSQL)
- Structured gotchas for troubleshooting
- Related entities explicit

**Cons:**
- Breaking change to existing format
- More complex generation logic

---

### Option 2: Hybrid System (Current + Structured)

**Keep JSONL but add metadata:**
```json
{
  "type": "entity",
  "name": "Backend.Services.CVELookupService",
  "entityType": "service",
  "observations": [
    "NVD API v2.0 integration for real CVE lookups",
    "Rate limiting: 5 req/30s without API key",
    "7-day PostgreSQL cache reduces API calls by 80%"
  ],
  "meta": {
    "tech": ["NVD API", "PostgreSQL"],
    "related": ["VersionDetectionService", "ExploitMatchService"],
    "updated": "2026-01-01",
    "importance": "high"
  }
}
```

**Pros:**
- Backward compatible (observations still readable)
- Queryable metadata for filtering
- Can preserve manual observations

**Cons:**
- Duplicate data (observations + meta)

---

### Option 3: Smart Generation with Manual Overrides

**Two-file system:**
- `project_knowledge.json` - Auto-generated base
- `project_knowledge.overrides.json` - Manual enhancements

**Generation logic:**
1. Auto-scan codebase → generate base entities
2. Load overrides file
3. Merge: Keep manual observations, update auto-detected tech/deps
4. Write combined output

**Pros:**
- Never lose manual edits
- Auto-generation stays useful
- Clear separation of concerns

**Cons:**
- Two files to manage
- Merge logic complexity

---

### Option 4: Context-Optimized Format (Recommended)

**Problem:** 439 lines too large for agent context

**Solution:** Hierarchical summarization
```json
Line 1: High-level map (unchanged)
Lines 2-50: Domain summaries (Backend, Frontend, Infrastructure)
Lines 51+: Detailed entities (loaded on-demand)
```

**Domain summary example:**
```json
{
  "type": "domain",
  "name": "Backend.Services",
  "summary": "8 services: CVE lookup, version detection, sniffer, asset mgmt",
  "tech": ["FastAPI", "PostgreSQL", "Redis", "Scapy", "NMAP"],
  "entities": ["CVELookupService", "VersionDetectionService", ...],
  "line_range": [51, 120]
}
```

**Agent workflow:**
1. Read Line 1 map
2. Read domain summaries (50 lines total)
3. Only load detailed entities when needed

**Pros:**
- Fits agent context window
- Fast overview, deep dive on demand
- Preserves all existing detail

**Cons:**
- Requires smarter generation script
- Two-phase reading (summary → details)

---

## Recommendations

**Immediate (This Session):**
1. Add domain summaries to Line 1 map
2. Clean up low-value auto-generated entities
3. Standardize observation format: "What it does, key tech, gotchas, updated"

**Short-term (Next 3 Sessions):**
1. Implement Option 4 (Hierarchical)
2. Add manual override system (Option 3)
3. Enhance generation script to detect relationships from imports

**Long-term:**
1. Add query interface: `python .github/scripts/query_knowledge.py --tech PostgreSQL`
2. Auto-extract gotchas from workflow logs
3. Link to skill system for problem→solution mapping

---

## Generation Script Issues

**Current problems in `scripts/generate_knowledge.py`:**

1. **Generic Observations**
   - `"Defined in backend/..."` - useless for understanding
   - Should extract docstrings, class inheritance, key methods

2. **No Relationship Extraction**
   - Tracks imports but doesn't create relations
   - Should link services to models they use

3. **No Deduplication**
   - Checks if entity exists but doesn't merge observations
   - Manual edits lost on regeneration

4. **No Quality Scoring**
   - All entities equal weight
   - Should prioritize core services over utility classes

**Fixes needed:**
```python
# 1. Extract docstrings for observations
def extract_observations(class_node):
    obs = []
    if ast.get_docstring(class_node):
        obs.append(ast.get_docstring(class_node))
    # Detect key methods
    for method in [n for n in class_node.body if isinstance(n, ast.FunctionDef)]:
        if method.name in ['__init__', 'create', 'update', 'delete']:
            obs.append(f"Method: {method.name}")
    return obs

# 2. Create relations from imports
def link_dependencies(module_name, imports):
    for imp in imports:
        if imp.startswith('app.'):  # Internal import
            add_relation(module_name, imp, "depends_on")

# 3. Merge with existing knowledge
def merge_entity(new_entity):
    existing = find_entity(new_entity['name'])
    if existing:
        # Keep manual observations, update auto ones
        manual_obs = [o for o in existing['observations'] if not o.startswith('auto-generated')]
        new_entity['observations'] = manual_obs + new_entity['observations']
    return new_entity
```

---

## Action Items

- [ ] Review this analysis
- [ ] Choose format option (1-4)
- [ ] Update generate_knowledge.py script
- [ ] Regenerate knowledge with improvements
- [ ] Update AKIS instructions for knowledge querying
- [ ] Add query helper script if needed

