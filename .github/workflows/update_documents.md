# Update Documents

**Purpose**: Documentation optimization and organization | **Agents**: Researcher→Developer→Reviewer

**Scope**: This workflow operates ONLY on documentation files:
- `docs/` directory - All documentation markdown files
- `docs/INDEX.md` - Documentation navigation index
- `README.md` - Main project readme (documentation section only)

**Not Included**: Skills files (handled by `update_skills`), Knowledge files (handled by `update_knowledge`), Code comments (maintained inline)

**Target**: Maintain 10-15 core documentation files organized in 6 categories

## Flow
```
[DELEGATE: agent=Researcher | task="Review workflow logs"]
→ Extract technical notes, next steps from log/workflow/*.md

[DELEGATE: agent=Researcher | task="Plan consolidation"]
→ Target 10-15 core docs

[DELEGATE: agent=Researcher | task="Analyze compliance"]
→ Gaps, condensation ops

[DELEGATE: agent=Developer | task="Apply fixes"]
→ Condensed docs, integrate insights

[DELEGATE: agent=Researcher | task="Detect duplicates"]
→ Merge opportunities

[DELEGATE: agent=Developer | task="Consolidate"]
→ Core docs, archived obsolete

[DELEGATE: agent=Developer | task="Create index"]
→ Navigation

[DELEGATE: agent=Reviewer | task="Validate"]
→ Compliance report
```

## Naming
| Type | Pattern | Location |
|------|---------|----------|
| ARCH | `ARCH_[sys]_v[N].md` | /docs/architecture/ |
| API | `API_[svc]_v[N].md` | /docs/technical/ |

## Commands
```bash
# Extract from logs: technical notes, next steps
grep -h "Technical Notes\|Next Steps" log/workflow/*.md 2>/dev/null | head -5
```

## Targets
- Core docs: 10-15
- Archive rate: 70%+
- Duplication: <5%
