# 🔴 AKIS PROTOCOL - MANDATORY FOR ALL RESPONSES

**AKIS = Agents • Knowledge • Instructions • Skills**

This protocol is NON-NEGOTIABLE. Every response MUST follow AKIS structure.

---

## MANDATORY OUTPUT FORMAT

```
[SESSION: task] @AgentName
[AKIS_LOADED] entities: N | skills: skill1, skill2 | patterns: pat1, pat2
[PHASE: NAME | progress=N/7]
<work>
[SKILLS_USED] skill1, skill2
[COMPLETE] outcome | changed: files
```

**Example**: `[SESSION: Add JWT auth] @_DevTeam`

**BLOCKING REQUIREMENTS** (cannot proceed without):
1. `[SESSION: task] @AgentName` → Start marker (FIRST, where AgentName = _DevTeam, Architect, Developer, Reviewer, or Researcher)
2. `[AKIS_LOADED]` → Knowledge verification (SECOND)
3. `[PHASE: ...]` → Phase tracking (DURING)
4. `[SKILLS_USED]` → Skills applied (BEFORE COMPLETE)
5. `[COMPLETE]` → End marker (LAST)

---

# 🔷 PILLAR 1: AGENTS

> **Files**: `.github/agents/*.agent.md`  
> **Purpose**: WHO does the work and WHEN to delegate

## Agent Selection (MANDATORY)

**READ the agent files** before starting work. Each agent has specific:
- **Role**: What they specialize in
- **Triggers**: When to use them
- **Capabilities**: What they can do
- **Return format**: How they report results

### Agent Hierarchy (Files in `.github/agents/`)
```
_DevTeam (Orchestrator) ← READ .github/agents/_DevTeam.agent.md
├── Architect           → READ .github/agents/Architect.agent.md
├── Developer           → READ .github/agents/Developer.agent.md
├── Reviewer            → READ .github/agents/Reviewer.agent.md
└── Researcher          → READ .github/agents/Researcher.agent.md
```
**ACTION**: Actually open and read these files before work

### Enforcement Rules

1. **Complex tasks (>30 min)**: MUST use `@_DevTeam` and delegate via `#runSubagent`
2. **Design questions**: MUST consult `Architect.agent.md`
3. **Code changes**: MUST follow `Developer.agent.md` patterns
4. **Testing/validation**: MUST apply `Reviewer.agent.md` checklists
5. **Investigation**: MUST use `Researcher.agent.md` methodology

### Delegation Format
```
[DELEGATE: agent=Name | task=description | skills=skill1,skill2]
#runSubagent Name "
Task: <description>
Context: <info from knowledge>
Scope: <boundaries>
Skills: skill1, skill2
Expect: RESULT_TYPE
"
```

**REFERENCE**: See `.github/agents/_DevTeam.agent.md` for full delegation patterns

---

# 🔷 PILLAR 2: KNOWLEDGE

> **Files**: `project_knowledge.json`, `.github/global_knowledge.json`  
> **Purpose**: WHAT exists in the codebase and patterns to follow

## Knowledge Loading (MANDATORY)

**EVERY session MUST**:
1. Read `project_knowledge.json` at session start
2. Query relevant entities for task context
3. Emit `[AKIS_LOADED]` with counts
4. Update knowledge in LEARN phase

### AKIS_LOADED Emission (BLOCKING)
```
[AKIS_LOADED]
  entities: N entities from project_knowledge.json  (replace N with actual count)
  skills: backend-api, security, testing            (list relevant skills)
  patterns: Global.Pattern.API.RESTful, ...         (cite matching patterns)
```

**Example**: `[AKIS_LOADED] entities: 270 | skills: backend-api, testing | patterns: Global.Pattern.API.RESTful`

**CANNOT proceed to PLAN without this emission**

### Knowledge Format (JSONL)
```json
{"type":"entity","name":"Domain.Module","entityType":"type","observations":["desc, upd:YYYY-MM-DD"]}
{"type":"codegraph","name":"file.py","language":"python","exports":["Class"],"imports":["module"]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
```

### Knowledge Usage During Work

1. **Query before coding**: Search knowledge for existing patterns
2. **Reference in decisions**: Cite entities when explaining choices
3. **Update after changes**: Add/modify entities for new code
4. **Track relations**: Document USES, IMPLEMENTS, MODIFIES links

### Enforcement Rules

1. **New features**: MUST check knowledge for existing related components
2. **Bug fixes**: MUST query knowledge for component dependencies
3. **Refactoring**: MUST update knowledge after changes
4. **At COMPLETE**: MUST emit `[KNOWLEDGE: added=N | updated=M]`

**REFERENCE**: See `.github/instructions/templates.md` for entry formats

---

# 🔷 PILLAR 3: INSTRUCTIONS

> **Files**: `.github/instructions/*.md`  
> **Purpose**: HOW to behave and process tasks

## Instruction Files (MANDATORY READING)

| File | Content | When Required |
|------|---------|---------------|
| `phases.md` | 7-phase flow (CONTEXT→COMPLETE) | EVERY task |
| `protocols.md` | Session boundaries, delegation, interrupts | EVERY task |
| `structure.md` | AKIS framework file organization | Architecture tasks |
| `templates.md` | Output formats, workflow logs | All outputs |
| `error_recovery.md` | Retry logic, escalation | On errors |

## 7-Phase Mandatory Flow

```
CONTEXT → PLAN → COORDINATE → INTEGRATE → VERIFY → LEARN → COMPLETE
   1        2         3           4          5        6        7
```

**EMIT on every response**: `[PHASE: NAME | progress=H/V]`

### Phase Actions (From `.github/instructions/phases.md`)

| Phase | MANDATORY Actions |
|-------|------------------|
| **1. CONTEXT** | Load knowledge, read skills, understand task → **EMIT `[AKIS_LOADED]`** |
| **2. PLAN** | Design approach, select skills, decide delegation |
| **3. COORDINATE** | Delegate via `#runSubagent` OR prepare tools → **EMIT `[SKILLS: ...]`** |
| **4. INTEGRATE** | Execute work, apply skill patterns |
| **5. VERIFY** | Test, validate → **EMIT `[→VERIFY]`** → WAIT for user |
| **6. LEARN** | Update knowledge → **EMIT `[AKIS_UPDATED]`** |
| **7. COMPLETE** | Emit completion → **EMIT `[SKILLS_USED]`** |

### Enforcement Rules

1. **Cannot skip CONTEXT**: Must load AKIS before work
2. **Cannot skip VERIFY**: Must test before COMPLETE
3. **Cannot skip LEARN**: Must update knowledge (or justify skip)
4. **Quick fixes**: May skip COORDINATE (CONTEXT→INTEGRATE→VERIFY→COMPLETE)
5. **Q&A only**: May skip to CONTEXT→COMPLETE

**REFERENCE**: See `.github/instructions/phases.md` for full details

## Interrupt Protocol (From `.github/instructions/protocols.md`)

**MANDATORY on user interrupt**:
```
[PAUSE: task=current | phase=PHASE | progress=H/V]
State: <files modified, next operation, context>

[STACK: push | task=interrupt | depth=V+1 | parent=current]

<work on interrupt>

[STACK: pop | task=interrupt | depth=V | result=summary]

[RESUME: task=current | phase=PHASE | progress=H/V]
Restoring: <saved state>
```

---

# 🔷 PILLAR 4: SKILLS

> **Files**: `.github/skills/*/SKILL.md`  
> **Purpose**: Patterns to apply for specific scenarios

## Skills Loading (MANDATORY)

**EVERY session MUST**:
1. Scan `.github/skills/` directory at session start
2. Read YAML frontmatter of all skills (name, description)
3. Load full SKILL.md for 3-5 relevant skills
4. Apply skill checklists during work
5. Emit `[SKILLS_USED]` at completion

### Available Skills (scan `.github/skills/` for current list)

**Core Skills (Universal)**:
| Skill | Trigger | Files |
|-------|---------|-------|
| `backend-api` | FastAPI endpoints, REST APIs | `.github/skills/backend-api/SKILL.md` |
| `frontend-react` | React components, hooks | `.github/skills/frontend-react/SKILL.md` |
| `security` | Auth, validation, secrets | `.github/skills/security/SKILL.md` |
| `testing` | Unit, integration, E2E tests | `.github/skills/testing/SKILL.md` |
| `error-handling` | Exception patterns | `.github/skills/error-handling/SKILL.md` |
| `git-deploy` | Commits, deployment | `.github/skills/git-deploy/SKILL.md` |
| `infrastructure` | Docker, containers | `.github/skills/infrastructure/SKILL.md` |
| `context-switching` | Task interrupts | `.github/skills/context-switching/SKILL.md` |
| `akis-analysis` | Framework compliance | `.github/skills/akis-analysis/SKILL.md` |

**Domain Skills (NOP-Specific)**:
| Skill | Trigger | Files |
|-------|---------|-------|
| `protocol-dissection` | Packet parsing | `.github/skills/protocol-dissection/SKILL.md` |
| `zustand-store` | State management | `.github/skills/zustand-store/SKILL.md` |
| `api-service` | Frontend API clients | `.github/skills/api-service/SKILL.md` |
| `ui-components` | Generic UI patterns | `.github/skills/ui-components/SKILL.md` |
| `cyberpunk-theme` | Styling, theming | `.github/skills/cyberpunk-theme/SKILL.md` |

### Skill Application (MANDATORY)

1. **Read skill file** before implementing related functionality
2. **Follow checklist** in skill's `## Checklist` section
3. **Use examples** as reference for patterns
4. **Emit skill usage** at completion

### SKILLS_USED Emission (BLOCKING)
```
[SKILLS_USED] backend-api, security, testing
```

**CANNOT complete session without this emission**

### Enforcement Rules

1. **API work**: MUST load and follow `backend-api` skill
2. **React work**: MUST load and follow `frontend-react` skill
3. **Auth changes**: MUST load and follow `security` skill
4. **Writing tests**: MUST load and follow `testing` skill
5. **New patterns discovered**: MUST emit `[SKILL_SUGGESTION]`

**REFERENCE**: See `.github/skills/README.md` for skill structure

---

# ENFORCEMENT SUMMARY

## Session Checklist

**At START (BLOCKING)**:
- [ ] Emit `[SESSION: task] @Agent`
- [ ] Read knowledge files (`project_knowledge.json`, `global_knowledge.json`)
- [ ] Scan skill files (`.github/skills/*/SKILL.md`)
- [ ] Read relevant agent file (`.github/agents/*.agent.md`)
- [ ] Emit `[AKIS_LOADED]` with counts

**DURING (TRACKING)**:
- [ ] Emit `[PHASE: NAME | progress=N/7]` on each response
- [ ] Reference skills being applied
- [ ] Follow instruction protocols
- [ ] Delegate via agents when complexity justifies

**At END (BLOCKING)**:
- [ ] Emit `[SKILLS_USED]` with applied skills
- [ ] Emit `[KNOWLEDGE: added=N | updated=M]` (or justify skip)
- [ ] Emit `[COMPLETE: task=desc | result=summary]`
- [ ] Create workflow log for significant work (>30 min)

## Drift Detection

**Auto-detected violations**:
- Missing `[SESSION: task] @AgentName` before edits → HALT
- Missing `[AKIS_LOADED] entities: N | skills: ...` in CONTEXT phase → HALT
- Missing `[SKILLS_USED] skill1, skill2` before COMPLETE → HALT
- Phase skipped without justification → WARNING
- Knowledge not queried for new code → WARNING
- Skill checklist not followed → WARNING

## Quality Gates

| Gate | Owner | Check | AKIS Component |
|------|-------|-------|----------------|
| Context | Orchestrator | Knowledge loaded | **K**nowledge |
| Selection | Orchestrator | Agent matched to task | **A**gents |
| Protocol | All | Phases followed | **I**nstructions |
| Patterns | All | Skills applied | **S**kills |
| Design | Architect | Alternatives considered | **A**gents |
| Code | Developer | Tests pass, linters pass | **S**kills |
| Quality | Reviewer | Standards met | **I**nstructions |

---

# REFERENCE QUICK LINKS

| Component | Location | When to Read |
|-----------|----------|--------------|
| Agent: _DevTeam | `.github/agents/_DevTeam.agent.md` | Complex tasks, delegation |
| Agent: Architect | `.github/agents/Architect.agent.md` | Design decisions |
| Agent: Developer | `.github/agents/Developer.agent.md` | Implementation |
| Agent: Reviewer | `.github/agents/Reviewer.agent.md` | Testing, validation |
| Agent: Researcher | `.github/agents/Researcher.agent.md` | Investigation |
| Instructions: Phases | `.github/instructions/phases.md` | Every task |
| Instructions: Protocols | `.github/instructions/protocols.md` | Every task |
| Instructions: Templates | `.github/instructions/templates.md` | Output formatting |
| Skills: All | `.github/skills/*/SKILL.md` | Relevant scenarios |
| Knowledge: Project | `project_knowledge.json` | Every task |
| Knowledge: Global | `.github/global_knowledge.json` | Cross-project patterns |

---

**REMEMBER**: AKIS is not optional. Every response demonstrates framework compliance through explicit emissions and proper file references.
