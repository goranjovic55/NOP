# Context Loading Protocol

**MANDATORY** at session start. No work begins until context is loaded.

---

## Blocking Gate

Before ANY code changes, file creation, or implementation work:

```
✅ MUST: Load knowledge → Load skills → Load relevant docs
❌ MUST NOT: Skip context loading, start coding immediately
```

---

## Step 1: Load Knowledge (REQUIRED)

```bash
# Read domain map (line 1)
head -1 project_knowledge.json

# Query task-relevant entities
grep '"name":"KEYWORD"' project_knowledge.json
```

**Output requirement:** Emit context summary showing loaded entities.

**What to load:**
- Domain map for navigation
- Entities related to task area
- Relations showing dependencies

---

## Step 2: Load Skills (REQUIRED)

```bash
# Check available skills
cat .github/skills/INDEX.md

# Load task-relevant skills
cat .github/skills/{relevant}.md
```

**Skills to consider:**
- `debugging.md` - If fixing errors
- `knowledge.md` - For knowledge updates
- `documentation.md` - For doc changes
- `backend-api.md` - For API work
- `frontend-react.md` - For UI work
- `ui-consistency.md` - For styling

---

## Step 3: Load Relevant Docs (AS NEEDED)

```bash
# Check structure
cat .github/instructions/structure.md

# Load task-relevant docs
cat docs/{category}/{file}.md
```

**When to load:**
- Feature work → `docs/features/`
- API changes → `docs/technical/`
- Architecture → `docs/architecture/`

---

## Anti-Drift Check

At start of EACH response, verify:
- [ ] Am I still working on the original task?
- [ ] Have I loaded relevant context for this step?
- [ ] Is my current action aligned with the plan?

If drift detected → Stop, restate task, realign.

---

## Failure Recovery

**If knowledge file missing:**
```bash
python .github/scripts/generate_codemap.py
```

**If skills INDEX outdated:**
```bash
ls .github/skills/*.md
```

**If unsure what to load:**
1. Read task description
2. Identify keywords (frontend, api, docker, etc.)
3. Query knowledge with those keywords
4. Load matching skills

---

## Verification

Context loading is complete when you can answer:
- What entities are involved in this task?
- What skills apply to this work?
- What is the project structure for affected areas?

---

## Related

- [structure.md](structure.md) - Project structure
- [task-tracking.md](task-tracking.md) - TODO management
- [session-discipline.md](session-discipline.md) - Anti-drift
