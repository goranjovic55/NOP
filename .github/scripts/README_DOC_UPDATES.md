# AKIS Documentation Update System

## Overview

The documentation update system ensures documentation stays current by analyzing session changes and suggesting lightweight, targeted updates during the LEARN phase.

## How It Works

### 1. During LEARN Phase

After code changes are complete and before creating the workflow log:

```bash
# Run the documentation analyzer
python .github/scripts/update_docs.py
```

### 2. Script Analysis

The script analyzes:
- Recent commits (last 2 hours)
- Changed files
- Workflow log content
- File categorization (backend, frontend, infrastructure, etc.)

### 3. Suggestion Generation

Generates suggestions for documentation updates based on:

| Change Type | Affected Documentation | Priority |
|-------------|------------------------|----------|
| API endpoints modified | `docs/technical/API_rest_v1.md` | High |
| UI components changed | `docs/design/UI_UX_SPEC.md` | Medium |
| Docker/infra changes | `docs/DEPLOYMENT.md` | High |
| New features added | `docs/features/IMPLEMENTED_FEATURES.md` | Medium |
| Models/services changed | `docs/architecture/ARCH_system_v1.md` | Low |
| User-facing changes | `README.md` | Medium |

### 4. Agent Review & Application

The agent:
1. Reviews suggestions from script output
2. Shows suggestions to user for approval
3. Applies approved updates (keeping them lightweight)
4. Notes updates in workflow log

## Principles

### Keep It Lightweight

- **Update only affected sections** - don't rewrite entire documents
- **Use bullet points** - avoid verbose paragraphs
- **Add dates** - mark when sections were updated
- **No duplication** - check if info already exists
- **Preserve structure** - don't reorganize, just update

### Examples

#### ✅ Good Update
```markdown
## API Endpoints

### Asset Management
**Updated: 2026-01-04**

- `POST /api/assets` - Create new asset (added validation for asset types)
- `GET /api/assets/{id}` - Get asset details
```

#### ❌ Bad Update (Too Verbose)
```markdown
## API Endpoints

### Asset Management

In this section, we're going to discuss the asset management endpoints. 
These endpoints were recently updated to include better validation. The 
validation now checks for asset types and ensures that only valid types 
are accepted. This is important because...

- `POST /api/assets` - This endpoint creates a new asset in the database. 
  It was updated on 2026-01-04 to add validation for asset types. The 
  validation works by...
```

## Integration with AKIS v2

### Workflow Flow

```
VERIFY (tests pass)
  ↓
User approval
  ↓
LEARN Phase:
  1. generate_codemap.py → Update project_knowledge.json
  2. update_docs.py → Suggest doc updates ← NEW STEP
  3. [Agent applies approved updates]
  4. suggest_skill.py → Suggest new skills
  5. [Agent creates/updates skills if approved]
  ↓
COMPLETE Phase:
  1. Create workflow log (includes doc updates)
  2. Commit all changes
```

### Updated copilot-instructions.md

The LEARN phase now includes:
1. Codemap generation
2. **Documentation updates** ← New
3. Skill suggestions

## Script Output Format

```json
{
  "session": {
    "commits": 3,
    "files_changed": 7,
    "workflow_log": "2026-01-04_120000_task.md"
  },
  "plan": {
    "has_updates": true,
    "summary": "3 documentation update(s) suggested",
    "high_priority": [
      {
        "doc": "docs/technical/API_rest_v1.md",
        "reason": "API endpoints modified",
        "type": "update",
        "priority": "high",
        "changes": ["backend/app/api/assets.py"],
        "suggestion": "Review and update API documentation for modified endpoints",
        "sections": ["Endpoints", "Request/Response schemas"],
        "keep_lightweight": true
      }
    ],
    "medium_priority": [...],
    "low_priority": [...]
  }
}
```

## Benefits

1. **Always Current** - Documentation updated incrementally with each session
2. **No Bloat** - Focused updates prevent documentation from becoming overwhelming
3. **Rich Context** - Agents start with up-to-date docs for better grounding
4. **Low Overhead** - Lightweight process doesn't slow down development
5. **Organized** - Documentation remains well-structured and informative

## Template

Use `.github/templates/doc-update-notes.md` to track documentation updates in workflow logs.

## Related Files

- `.github/scripts/update_docs.py` - The analyzer script
- `.github/copilot-instructions.md` - AKIS v2 framework (includes LEARN phase)
- `.github/templates/workflow-log.md` - Includes doc updates section
- `.github/templates/doc-update-notes.md` - Optional detailed tracking
- `.github/skills/documentation.md` - Documentation skill with update guidance

## Future Enhancements

Possible improvements:
- Auto-detect outdated sections (last updated > 90 days)
- Suggest archiving obsolete documentation
- Track documentation coverage metrics
- Integration with code comments/docstrings
