# Skills Index v7.5

> Based on 100k session simulation: 97.0% precision, 94.1% recall
> Current structure: SKILL.md + patterns/ + scripts/
> 📋 See [v8.0 Roadmap](#v80-roadmap-industry-standards) for proposed enhancements

## Skill Detection
| Situation | Skill | Pre-load | Usage |
|-----------|-------|----------|-------|
| new feature, design | [planning](planning/SKILL.md) | | 5% (complex) |
| research, best practice, standards | [research](research/SKILL.md) | | 3% (complex) |
| .tsx .jsx components/ pages/ | [frontend-react](frontend-react/SKILL.md) | ⭐ | 70% |
| .py backend/ api/ services/ models/ | [backend-api](backend-api/SKILL.md) | ⭐ | 72% |
| Dockerfile docker-compose.yml | [docker](docker/SKILL.md) | | 46% |
| .github/workflows/*.yml | [ci-cd](ci-cd/SKILL.md) | | 2% |
| error traceback bug fix | [debugging](debugging/SKILL.md) | | 74% |
| .md docs/ README | [documentation](documentation/SKILL.md) | | 54% |
| test_* *_test.py *.test.ts | [testing](testing/SKILL.md) | | 65% |
| .github/skills/* agents/* | [akis-dev](akis-dev/SKILL.md) | | 87% |
| project_knowledge.json | [knowledge](knowledge/SKILL.md) | | 3% |
| security vulnerability injection | [security](security/SKILL.md) | | 15% |

## Suggested Skills (Not Yet Created)
| Situation | Skill | Confidence |
|-----------|-------|------------|
| auth jwt login token | authentication | 95% |
| performance optimization cache | performance | 95% |
| monitoring metrics logging | monitoring | 85% |
| zustand store state management | state-management | 80% |
| websocket real-time realtime | websocket-realtime | 70% |
| locale language i18n intl | internationalization | 70% |

⭐ Pre-load for fullstack (65.6% of sessions)

## Workflow Phases
| Phase | Skills |
|-------|--------|
| PLAN | planning → research (auto-chain) |
| BUILD | frontend-react, backend-api, docker |
| VERIFY | testing, debugging |
| DOCUMENT | documentation |

## Skill Combinations
| Task | Skills |
|------|--------|
| New feature | planning → research → frontend/backend |
| Fix bug | debugging → testing |
| Deploy | docker → ci-cd |
| Refactor | planning → research → frontend/backend → testing |
| Standards check | research (standalone) |

## 100k Simulation Metrics (Enhanced Structure)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Precision | 93.6% | 97.0% | +3.4% |
| Recall | 87.5% | 94.1% | +6.6% |
| F1 Score | 90.4% | 95.5% | +5.1% |
| False Positives | 17,481 | 8,497 | -51.4% |
| Time Saved (hours) | 35,870 | 59,800 | +66.7% |
| Pattern Reuse Rate | 0% | 47.2% | NEW |

### Before (SKILL.md Only)
```
.github/skills/{name}/
└── SKILL.md           # All content in single file
```

### After (Enhanced Structure)
```
.github/skills/{name}/
├── SKILL.md                    # Main skill definition
├── patterns/                   # Reusable code patterns
│   └── README.md               # Pattern catalog
└── scripts/                    # Skill-specific automation
    └── validate.py             # Domain validation
```

## All Skills (Fully Compliant)
| Skill | Patterns | Scripts |
|-------|----------|---------|
| [frontend-react](frontend-react/SKILL.md) | ✅ | ✅ |
| [backend-api](backend-api/SKILL.md) | ✅ | ✅ |
| [debugging](debugging/SKILL.md) | ✅ | ✅ |
| [docker](docker/SKILL.md) | ✅ | ✅ |
| [testing](testing/SKILL.md) | ✅ | ✅ |
| [documentation](documentation/SKILL.md) | ✅ | ✅ |
| [planning](planning/SKILL.md) | ✅ | ✅ |
| [research](research/SKILL.md) | ✅ | ✅ |
| [ci-cd](ci-cd/SKILL.md) | ✅ | ✅ |
| [akis-dev](akis-dev/SKILL.md) | ✅ | ✅ |
| [security](security/SKILL.md) | ✅ | ✅ |
| [knowledge](knowledge/SKILL.md) | ✅ | ✅ |

## Context Isolation (100k Validated)
| Phase | Handoff Type |
|-------|--------------|
| research → architect | research_findings |
| architect → code | design_spec |
| code → reviewer | code_changes |
| debugger → code | bug_diagnosis |

## Rules
- Load skill ONCE per session (cached after first load, no reloads needed)
- Check loaded skills before loading: avoid duplicates
- Announce: "SKILL: {name} loaded" (only on first load)
- Pre-load ⭐ marked skills for fullstack sessions (65.6% of sessions)
- Use artifact-based handoffs between agents
- Run skill validation scripts before committing: `python .github/skills/{name}/scripts/validate.py`
- Reference patterns from `patterns/README.md` for consistent code

## Simulation Script

Run the compliance simulation to measure before/after metrics:
```bash
python .github/scripts/skill_compliance_simulation.py
```

---

## v8.0 Roadmap (Industry Standards)

> Based on research: OpenAI Function Calling, LangChain Tools, AutoGPT Skills, Microsoft Semantic Kernel, CrewAI Framework
> Full analysis: [docs/research/SKILL_STRUCTURE_RESEARCH.md](../../docs/research/SKILL_STRUCTURE_RESEARCH.md)

### 100k Simulation: v7.0 vs v7.5 vs v8.0

| Metric | v7.0 (Baseline) | v7.5 (Current) | v8.0 (Proposed) | Δ v7.0→v8.0 |
|--------|-----------------|----------------|-----------------|-------------|
| Precision | 93.7% | 96.9% | 97.6% | +3.9% |
| Recall | 87.5% | 94.1% | 95.5% | +8.0% |
| F1 Score | 90.5% | 95.5% | 96.5% | +6.0% |
| False Positives | 17,273 | 8,856 | 6,935 | -59.9% |
| Time Saved (hours) | 35,797 | 59,821 | 69,008 | +92.8% |
| Pattern Reuse Rate | 0% | 47.3% | 55.4% | NEW |

### Proposed v8.0 Structure

```
.github/skills/{name}/
├── skill.yaml                    # Structured YAML schema (OpenAI style)
├── SKILL.md                      # Human-readable documentation
├── patterns/                     
│   ├── README.md                 # Pattern catalog
│   └── templates/                # Executable Jinja2 templates
├── scripts/                      
│   ├── validate.py               # Domain validation
│   └── test_skill.py             # Skill unit tests
├── examples/                     # Few-shot examples (Anthropic best practice)
│   └── example_N.md              # Input/Output pairs
└── metrics/                      # Usage tracking
    └── metrics.json
```

### Key v8.0 Enhancements

| Feature | Source | Impact |
|---------|--------|--------|
| `skill.yaml` schema | OpenAI/LangChain | +1% detection, structured triggers |
| Few-shot examples | Anthropic | +15-25% accuracy on complex tasks |
| Executable templates | AutoGPT | +2.5 min/session time saved |
| Dependency hints | Semantic Kernel | Auto-suggest related skills |
| Usage metrics | CrewAI | Data-driven optimization |

### Migration Path

1. **Phase 1**: Add `skill.yaml` with structured metadata (Week 1)
2. **Phase 2**: Add `examples/` with few-shot examples (Week 2)
3. **Phase 3**: Convert patterns to Jinja2 templates (Week 3)
4. **Phase 4**: Add dependency declarations and metrics (Week 4)
