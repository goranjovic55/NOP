# Session Cleanup & Doc Autogen Scripts | 2026-01-08

## Summary

Created two new session-end scripts for AKIS workflow: cleanup and documentation auto-generation.

## Changes

| File | Changes |
|------|---------|
| `.github/scripts/session_cleanup.py` | Created - cleans backups, cache, temp files |
| `.github/scripts/update_docs.py` | Rewritten - auto-generates and merges docs |
| `.github/copilot-instructions.md` | Updated END protocol with new scripts |
| `.github/instructions/protocols.instructions.md` | Updated END protocol |
| `.github/agents/akis.agent.md` | Updated END protocol |

## Skills Used

- akis-development/SKILL.md (for AKIS framework files)
- documentation/SKILL.md (for doc structure patterns)

## Notes

- `session_cleanup.py`: Keeps 3 most recent backups (max 7 days), cleans `__pycache__`, test artifacts
- `update_docs.py`: Merge-first approach, creates minimal docs, auto-indexes in INDEX.md
- Both scripts support `--dry-run` mode
