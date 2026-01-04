# Session-Driven Documentation Update - Visual Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                        AGENT SESSION                              │
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │  CONTEXT    │ → │ IMPLEMENT   │ → │   VERIFY    │            │
│  │  Load docs  │   │ Make changes│   │ Test & lint │            │
│  │  & skills   │   │             │   │             │            │
│  └─────────────┘   └─────────────┘   └─────────────┘            │
│                                             │                     │
│                                             ↓                     │
│                                    ┌──────────────┐               │
│                                    │ User Approves│               │
│                                    └──────────────┘               │
│                                             │                     │
└─────────────────────────────────────────────┼─────────────────────┘
                                              │
                                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                        LEARN PHASE                                │
│                                                                   │
│  Step 1: Update Knowledge Graph                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ python .github/scripts/generate_codemap.py                │   │
│  │ → Scan source files                                       │   │
│  │ → Build dependency graph                                  │   │
│  │ → Update project_knowledge.json                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  Step 2: Update Documentation 🆕                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ python .github/scripts/update_docs.py                     │   │
│  │                                                           │   │
│  │ Analyze:                                                  │   │
│  │  • Recent commits (last 2 hours)                         │   │
│  │  • Changed files (backend/frontend/infra/tests)          │   │
│  │  • Workflow log content                                  │   │
│  │                                                           │   │
│  │ Identify Affected Docs:                                  │   │
│  │  API changes      → docs/technical/API_rest_v1.md       │   │
│  │  UI changes       → docs/design/UI_UX_SPEC.md           │   │
│  │  Infra changes    → docs/DEPLOYMENT.md                  │   │
│  │  New features     → docs/features/IMPLEMENTED_...md     │   │
│  │  Arch changes     → docs/architecture/ARCH_...md        │   │
│  │  User changes     → README.md                            │   │
│  │                                                           │   │
│  │ Generate Suggestions:                                    │   │
│  │  {                                                       │   │
│  │    "high_priority": [                                   │   │
│  │      {                                                   │   │
│  │        "doc": "docs/technical/API_rest_v1.md",         │   │
│  │        "reason": "API endpoints modified",             │   │
│  │        "suggestion": "Update endpoint docs",           │   │
│  │        "keep_lightweight": true                        │   │
│  │      }                                                   │   │
│  │    ],                                                    │   │
│  │    "medium_priority": [...],                            │   │
│  │    "low_priority": [...]                                │   │
│  │  }                                                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  Step 3: Agent Reviews & Applies                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ • Show suggestions to user                                │   │
│  │ • Get approval for updates                                │   │
│  │ • Apply approved changes:                                 │   │
│  │   ✓ Update only affected sections                        │   │
│  │   ✓ Use bullet points (not paragraphs)                   │   │
│  │   ✓ Add update date                                      │   │
│  │   ✓ Keep changes minimal (~5-20 lines)                   │   │
│  │   ✓ Preserve structure                                   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  Step 4: Suggest Skills                                          │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ python .github/scripts/suggest_skill.py                   │   │
│  │ → Analyze session patterns                                │   │
│  │ → Suggest new skills                                      │   │
│  │ → Create/update .github/skills/*.md                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                      COMPLETE PHASE                               │
│                                                                   │
│  Step 1: Create Workflow Log                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ log/workflow/YYYY-MM-DD_HHMMSS_task.md                    │   │
│  │                                                           │   │
│  │ ## Documentation Updates                                 │   │
│  │ ### Documents Updated                                    │   │
│  │ - docs/technical/API_rest_v1.md - Added filter endpoint │   │
│  │                                                           │   │
│  │ ### Documents Reviewed                                   │   │
│  │ - README.md - No changes needed                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  Step 2: Commit All Changes                                      │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ git add .                                                 │   │
│  │ git commit -m "feat: description"                         │   │
│  │ git push                                                  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                       RESULT                                      │
│                                                                   │
│  ✅ Code changes committed                                        │
│  ✅ Knowledge graph updated                                       │
│  ✅ Documentation current (lightweight updates)                   │
│  ✅ Skills updated/created                                        │
│  ✅ Workflow logged                                               │
│                                                                   │
│  Next agent session will have:                                   │
│  • Current, accurate documentation                                │
│  • Updated knowledge graph                                        │
│  • Relevant skills loaded                                         │
│  • Rich context for better decisions                              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘


KEY BENEFITS OF STEP 2 (Documentation Updates):

┌────────────────────────────────────────────────────────────┐
│                    BEFORE                                  │
│                                                            │
│  • Documentation manually updated                          │
│  • Often forgotten or delayed                              │
│  • Updates become large (many stale sections)              │
│  • Documentation drifts from code                          │
│  • Agents work with outdated context                       │
│  • Users find incorrect information                        │
└────────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────┐
│                    AFTER                                   │
│                                                            │
│  • Documentation auto-updated each session                 │
│  • Always triggered (part of LEARN phase)                  │
│  • Updates are small and focused (~5-20 lines)             │
│  • Documentation stays synchronized with code              │
│  • Agents always have current context                      │
│  • Users find accurate, up-to-date information             │
└────────────────────────────────────────────────────────────┘


TIME OVERHEAD:

  Script execution:     1-2 seconds
  Review suggestions:   30-60 seconds
  Apply updates:        1-2 minutes
  ────────────────────────────────
  Total addition:       ~2 minutes per session

  ROI: Saves hours of manual documentation work over time
       + Better agent decisions from accurate context
```

## Example: Lightweight Update

**Scenario**: Added `/api/assets/filter` endpoint

**Before** (docs/technical/API_rest_v1.md):
```markdown
## Asset Management

### List Assets
`GET /api/assets` - Returns all assets
```

**After** (5 lines added):
```markdown
## Asset Management
**Updated: 2026-01-04**

### List Assets
`GET /api/assets` - Returns all assets

### Filter Assets
`GET /api/assets/filter` - Filter assets by type/status
- Query params: asset_type, status, limit
```

**NOT like this** (verbose, bloated):
```markdown
## Asset Management

We have recently implemented a comprehensive filtering system
for asset management. This new feature allows users to filter
assets based on multiple criteria including type and status.
The implementation was necessary because... [continues for
10 paragraphs explaining implementation details, architectural
decisions, and every possible use case]

### Filter Assets Endpoint

The filter assets endpoint is a new addition to our API that
provides advanced filtering capabilities. When you send a
request to this endpoint, the backend will process your query
parameters and return a filtered list of assets. The filtering
algorithm works by... [continues with unnecessary detail]
```

✅ **Result**: Clean, organized, informative documentation that grows incrementally without bloat.
