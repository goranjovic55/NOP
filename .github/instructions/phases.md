---
applyTo: '**'
---

# Phases

## 7-Phase Mandatory Flow

```
CONTEXT → PLAN → COORDINATE → INTEGRATE → VERIFY → LEARN → COMPLETE
   1        2         3           4          5        6        7
```

**Emit on every response**: `[PHASE: NAME | progress=H/V]`

**H** = Horizontal phase (1-7), **V** = Vertical depth (0=main, 1-3=nested)

## Phase Checklist

| Phase | MANDATORY Actions |
|-------|------------------|
| **1. CONTEXT** | Load project_knowledge.json, load .claude/skills.md, understand task |
| **2. PLAN** | Design approach, consider alternatives, decide delegation |
| **3. COORDINATE** | #runSubagent OR prepare tools |
| **4. INTEGRATE** | Execute work, apply changes |
| **5. VERIFY** | Test, emit [→VERIFY], WAIT for user |
| **6. LEARN** | Update project_knowledge.json, extract patterns |
| **7. COMPLETE** | Emit structured completion, create workflow log |

## Skip Phases (only if justified)

| Task | Phases |
|------|--------|
| Quick fix | CONTEXT → INTEGRATE → VERIFY → COMPLETE |
| Q&A | CONTEXT → COMPLETE |
| Feature | All 7 phases |
