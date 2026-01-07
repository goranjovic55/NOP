# Documentation

Keep docs clear, current, close to code. Use `.github/templates/`.

## Avoid
- ❌ Stale docs → ✅ Update with code
- ❌ No examples → ✅ Include samples
- ❌ Verbose → ✅ Keep concise
- ❌ Random placement → ✅ Follow structure.md

## Structure
```
docs/
├── INDEX.md
├── guides/          # User guides
├── features/        # Feature docs
├── technical/       # API references
├── architecture/    # Design, ADRs
├── development/     # Contributing
└── archive/         # Historical
```

## Placement
| Type | Location |
|------|----------|
| User guides | `docs/guides/` |
| Feature docs | `docs/features/` |
| API reference | `docs/technical/` |
| Design decisions | `docs/architecture/` |
| Workflow logs | `log/workflow/` |

## Templates
| Template | Use |
|----------|-----|
| `workflow-log.md` | Session work log |
| `feature-doc.md` | Feature documentation |
| `guide-doc.md` | How-to guides |
| `skill.md` | New skills |

## Inline Docs
```python
def normalize_version(version: str) -> str:
    """Normalize version for CVE matching. Handles: 1.2.3, v1.2.3"""
    ...
```

## Checklist
- [ ] Workflow log for >15min tasks
- [ ] README updated for user-facing changes
- [ ] API docs current if endpoints changed
- [ ] Examples provided

## Related
- `knowledge.md` - Project knowledge
