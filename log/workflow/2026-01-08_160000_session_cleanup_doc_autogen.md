---
session:
  id: "2026-01-08_session_cleanup_doc_autogen"
  date: "2026-01-08"
  complexity: complex
  domain: backend_only

skills:
  loaded: [backend-api, testing, documentation, akis-development]
  suggested: []

files:
  modified:
    - {path: ".github/scripts/session_cleanup.py", type: py, domain: backend}
    - {path: ".github/scripts/update_docs.py", type: py, domain: backend}
    - {path: ".github/copilot-instructions.md", type: md, domain: docs}
    - {path: ".github/instructions/protocols.instructions.md", type: md, domain: docs}
    - {path: ".github/agents/akis.agent.md", type: md, domain: docs}
  types: {py: 2, md: 4}

agents:
  delegated: []

gates:
  passed: [G1, G2, G3, G4, G5, G6]
  violations: []

root_causes: []

gotchas: []
---

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