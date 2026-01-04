# Documentation Update System - Example Workflow

This document demonstrates how the session-driven documentation update system works in practice.

## Example Session: Adding a New Asset Filtering API

### Scenario
A developer adds a new API endpoint for filtering assets by type and status.

### Changes Made
1. **Backend**: `backend/app/api/endpoints/assets.py`
   - Added `GET /api/assets/filter` endpoint
   - Added query parameters: `asset_type`, `status`, `limit`
   - Returns filtered asset list

2. **Frontend**: `frontend/src/services/assetService.ts`
   - Added `filterAssets()` function
   - Integrated with new backend endpoint

3. **Tests**: `backend/tests/api/test_assets.py`
   - Added tests for filter endpoint
   - Tested various filter combinations

### LEARN Phase Workflow

#### Step 1: Generate Codemap
```bash
python .github/scripts/generate_codemap.py
```

Output: Updates `project_knowledge.json` with new code relationships

#### Step 2: Run Documentation Update Script
```bash
python .github/scripts/update_docs.py
```

Output (JSON):
```json
{
  "session": {
    "commits": 1,
    "files_changed": 3,
    "workflow_log": "2026-01-04_140000_asset-filtering-api.md"
  },
  "plan": {
    "has_updates": true,
    "summary": "2 documentation update(s) suggested",
    "high_priority": [
      {
        "doc": "docs/technical/API_rest_v1.md",
        "reason": "API endpoints modified",
        "type": "update",
        "priority": "high",
        "changes": ["backend/app/api/endpoints/assets.py"],
        "suggestion": "Review and update API documentation for modified endpoints",
        "sections": ["Endpoints", "Request/Response schemas"],
        "keep_lightweight": true
      }
    ],
    "medium_priority": [
      {
        "doc": "README.md",
        "reason": "User-facing changes made but README not updated",
        "type": "review",
        "priority": "medium",
        "changes": [],
        "suggestion": "Check if README needs updates for user-facing changes",
        "sections": ["Features", "Usage"],
        "keep_lightweight": true
      }
    ],
    "low_priority": []
  }
}
```

#### Step 3: Agent Reviews & Applies Updates

**High Priority: API Documentation**

File: `docs/technical/API_rest_v1.md`

*Lightweight Update (what to add):*
```markdown
### Asset Filtering
**Updated: 2026-01-04**

**Endpoint**: `GET /api/assets/filter`

**Query Parameters**:
- `asset_type` (optional) - Filter by type (server, workstation, network_device)
- `status` (optional) - Filter by status (active, inactive)  
- `limit` (optional) - Max results (default: 100)

**Response**: Array of asset objects matching filters

**Example**:
```bash
curl "http://localhost:8000/api/assets/filter?asset_type=server&status=active"
```
```

**Medium Priority: README Review**

File: `README.md`

*Decision: No update needed* - Feature is backend API, not user-facing UI feature

#### Step 4: Suggest Skills
```bash
python .github/scripts/suggest_skill.py
```

(Continues with skill suggestion workflow...)

#### Step 5: Create Workflow Log

File: `log/workflow/2026-01-04_140000_asset-filtering-api.md`

Includes documentation updates section:
```markdown
## Documentation Updates

### Documents Updated
- `docs/technical/API_rest_v1.md` - Added asset filtering endpoint documentation

### Documents Reviewed
- `README.md` - Reviewed, no updates needed (backend API only)
```

### Result

**Documentation is now current** with minimal overhead:
- ✅ API docs updated with new endpoint (5 lines added)
- ✅ No bloat or verbose explanations
- ✅ Update date tracked
- ✅ Structure preserved
- ✅ Next agent session starts with current documentation

## Comparison: Before vs After

### Before (Manual Approach)
```
Session completes
  ↓
Documentation outdated
  ↓
Agent starts next session
  ↓
Loads stale docs
  ↓
Works with incorrect context
  ↓
User notices docs are wrong
  ↓
Manual doc update task created
  ↓
Large update needed (many stale sections)
```

**Result**: Documentation bloat, context drift, extra work

### After (Session-Driven Approach)
```
Session completes
  ↓
LEARN phase runs update_docs.py
  ↓
Lightweight updates applied
  ↓
COMPLETE phase logs changes
  ↓
Agent starts next session
  ↓
Loads current, accurate docs
  ↓
Works with correct context
```

**Result**: Always-current docs, no bloat, better agent context

## Key Benefits Demonstrated

1. **Automatic Detection**: Script identifies which docs need updates
2. **Prioritization**: High/medium/low priority helps agent focus
3. **Minimal Changes**: Only affected sections updated
4. **Rich Context**: Next session has accurate documentation
5. **Low Overhead**: ~2 minutes added to LEARN phase
6. **Organized**: Docs stay clean and well-structured

## Integration Points

- **AKIS v2 LEARN Phase**: Step 2 (between codemap and skills)
- **Workflow Logs**: Track what docs were updated
- **Knowledge System**: Documentation becomes part of agent context
- **Skills**: Documentation skill guides the update process

## Best Practices Shown

- Keep updates minimal (5 lines vs 50 lines)
- Use bullet points, not paragraphs
- Add update dates for tracking
- Review but don't update if not needed
- Preserve existing structure
- Focus on changed sections only

---

**This example shows how the documentation update system keeps docs current without bloat, enabling better agent context and reducing manual documentation work.**
