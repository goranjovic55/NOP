```markdown
---
applyTo: '**'
---

# Templates

## Session Emissions

**Start**: `[SESSION: task] @AgentName` + `[AKIS] entities=N | skills=X,Y | patterns=Z`

**End**: `[COMPLETE] outcome | changed: files`

---

## Delegation

`#runSubagent Name "Task: ... | Context: ... | Skills: ... | Expect: RESULT_TYPE"`

---

## Agent Returns

| Agent | Format |
|-------|--------|
| Architect | `[DESIGN_DECISION]` Problem, Solution, Alternatives, Trade-offs |
| Developer | `[IMPLEMENTATION_RESULT]` Files, Tests, Patterns |
| Reviewer | `[VALIDATION_REPORT]` Verdict, Tests, Issues |
| Researcher | `[FINDINGS]` Question, Discoveries, Recommendations |

---

## Knowledge (JSONL)

```json
{"type":"entity","name":"Module","entityType":"type","observations":["desc, upd:YYYY-MM-DD"]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
{"type":"codegraph","name":"file.py","dependencies":["X"],"dependents":["Y"]}
```

---

## Workflow Log

Path: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`

Content: Session, Agent, Status, Summary, Skills Used, Files Changed
