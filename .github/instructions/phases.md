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
| **1. CONTEXT** | Read project_knowledge.json + read_file 3-5 relevant `.github/skills/*/SKILL.md` files, understand task<br>**→ BLOCKING EMIT**: `[AKIS_LOADED]` with entity count, skill names, patterns<br>**→ GATE**: Cannot proceed to PLAN until emitted |
| **2. PLAN** | Design approach, consider alternatives, decide delegation, identify skills to use |
| **3. COORDINATE** | #runSubagent OR prepare tools<br>**→ EMIT**: `[SKILLS: skill-name, skill-name]` or `[METHOD: approach]` |
| **4. INTEGRATE** | Execute work, apply changes, follow skill patterns |
| **5. VERIFY** | Test, emit [→VERIFY], WAIT for user<br>**→ BLOCKING GATE**: Must wait for user confirmation before LEARN |
| **6. LEARN** | Update project_knowledge.json, extract patterns, suggest new skills<br>**→ REQUIRED**: Must emit `[AKIS_UPDATED]` or justify skip<br>**→ PERIODIC**: Run AKIS edge case analysis (monthly or when compliance <75%) |
| **7. COMPLETE** | Emit structured completion<br>**→ BLOCKING EMIT**: `[SKILLS_USED] skill-name, skill-name` or `[METHOD: approach]`<br>**→ REQUIRED**: Create workflow log for ALL sessions |

## Skip Phases (only if justified)

| Task | Phases |
|------|--------|
| Quick fix | CONTEXT → INTEGRATE → VERIFY → COMPLETE |
| Q&A | CONTEXT → COMPLETE |
| Feature | All 7 phases |

## AKIS Edge Case Analysis (Periodic)

**When**: Monthly OR compliance <75% OR user requests

**Steps**:
1. Load `log/workflow/*.md` (20-30 recent)
2. Run `scripts/check_all_workflows.sh`
3. Identify failure patterns (missing emissions, violations)
4. Simulate edge cases from real logs
5. Calculate metrics (frequency, severity, impact)
6. Propose terse adjustments to framework files
7. Measure projected improvement
8. Implement critical fixes (Week 1 style)

**Triggers**: "analyze akis", "edge case analysis", "framework improvements"

**Output**: Analysis doc + implementation guide + applied fixes
