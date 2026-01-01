# Templates

## Session Emissions

**Start**: `[SESSION: task] @AgentName` + `[AKIS_LOADED] entities: N | skills: ... | patterns: ...`

**During**: `[PHASE: NAME | progress=N/7]`

**End**: `[SKILLS_USED] skill1, skill2` + `[COMPLETE] outcome | changed: files`

---

## Delegation

```
#runSubagent Name "
Task: <description>
Context: <info>
Skills: skill1, skill2
Expect: DESIGN_DECISION|IMPLEMENTATION_RESULT|VALIDATION_REPORT|FINDINGS
"
```

---

## Knowledge Entry (JSONL)

```json
{"type":"entity","name":"Domain.Module","entityType":"type","observations":["desc, upd:YYYY-MM-DD"]}
{"type":"codegraph","name":"file.py","exports":["Class"],"imports":["module"]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
```

---

## Workflow Log (>30min work)

```markdown
# Workflow Log: [Task]
**Session**: YYYY-MM-DD_HHMMSS | **Agent**: Name | **Status**: Completed
## Summary: What was done
## Skills Used: skill1, skill2
## Files Changed: file1, file2
```

**Path**: `log/workflow/YYYY-MM-DD_HHMMSS_task-slug.md`
