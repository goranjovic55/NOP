# Skills-Based Workflow

**Purpose:** Explain the AKIS v9.0 skills-based approach to workflow automation.

---

## Skills Model (Situation-Based)

AKIS v9.0 uses skills that auto-detect based on context. Skills inject domain-specific knowledge and patterns.

| Property | Value |
|----------|-------|
| Location | `.github/skills/*/SKILL.md` |
| Invocation | `skill("planning")` |
| Available | All Copilot environments |

---

## Available Skills

| Phase | Skill | Triggers |
|-------|-------|----------|
| **PLAN** | planning | "design", "new feature", "research", "brainstorm" |
| **BUILD** | backend-api | *.py, backend/, api/, "FastAPI" |
| **BUILD** | frontend-react | *.tsx, components/, pages/, "React" |
| **BUILD** | docker | Dockerfile, docker-compose, "container" |
| **BUILD** | ci-cd | .github/workflows/, deploy.sh, "pipeline" |
| **VERIFY** | testing | test_*, *_test.py, "tests" |
| **VERIFY** | debugging | "error", "bug", "traceback", "fix" |
| **DOCUMENT** | documentation | *.md, docs/, README |
| **AKIS** | akis-development | .github/skills/*, copilot-instructions* |

---

## How Skills Work

```
User: "I want to add a user authentication feature"
→ Detect: "add" + "feature" → Load planning skill
→ Create blueprint in .project/blueprints/

User: "Now implement the backend"
→ Detect: "backend" → Load backend-api skill
→ Write Python/FastAPI code

User: "There's an error"
→ Detect: "error" → Load debugging skill
→ Fix the issue
```

---

## Why Skills-Based?

| Benefit | Description |
|---------|-------------|
| **Auto-detection** | Skills load based on file patterns and context |
| **Simpler mental model** | Situation → Skill (no agent coordination) |
| **Same domain expertise** | All knowledge from agents is now in skills |
| **Fewer moving parts** | One agent (AKIS) + multiple skills |

---

## 100k Simulation Results

| Metric | Value |
|--------|-------|
| **Skill Detection Accuracy** | 88.5% |
| **Discipline Rate** | 91.5% |
| **Success Rate** | 92.0% |
| **Avg Tokens** | 16,508 |
| **Avg Time** | 12.5 min |

---

## Summary

| Question | Answer |
|----------|--------|
| How do I load context? | Use `skill("skill-name")` |
| Are there agents? | Only AKIS (workflow enforcer) |
| How does AKIS work? | Detects situation → loads appropriate skill |
| Where are skills? | `.github/skills/*/SKILL.md` |

---

## References

- `.github/skills/INDEX.md` - Skill catalog
- `.github/agents/AKIS.agent.md` - Workflow enforcer
- `.github/copilot-instructions.md` - Main instructions
