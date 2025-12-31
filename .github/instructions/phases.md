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
| **1. CONTEXT** | Read project_knowledge.json + read_file 3-5 relevant `.github/skills/*/SKILL.md` files, understand task<br>**→ EMIT**: `[AKIS_LOADED]` with entity count, skill names, patterns |
| **2. PLAN** | Design approach, consider alternatives, decide delegation, identify skills to use |
| **3. COORDINATE** | #runSubagent OR prepare tools<br>**→ EMIT**: `[SKILLS: skill-name, skill-name]` or `[METHOD: approach]` |
| **4. INTEGRATE** | Execute work, apply changes, follow skill patterns |
| **5. VERIFY** | Test, emit [→VERIFY], WAIT for user |
| **6. LEARN** | Update project_knowledge.json, extract patterns, suggest new skills |
| **7. COMPLETE** | Emit structured completion<br>**→ EMIT**: `[SKILLS_USED] skill-name, skill-name` or `[METHOD: approach]`, create workflow log for ALL sessions |

## Skip Phases (only if justified)

| Task | Phases |
|------|--------|
| Quick fix | CONTEXT → INTEGRATE → VERIFY → COMPLETE |
| Q&A | CONTEXT → COMPLETE |
| Feature | All 7 phases |
