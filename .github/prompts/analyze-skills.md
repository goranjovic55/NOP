# Analyze Skills Workflow

Analyze skill usage patterns from workflow logs, measure effectiveness, detect emergent skill needs, and validate improvements through 100k session simulations.

## Trigger
Run after significant work sessions or when skill gaps are suspected.

## Process

### Step 1: Parse Workflow Logs → Extract Skill Patterns
```bash
python .github/scripts/analyze_skills.py --parse-logs
```

Extract from `log/workflow/*.md`:
- Which skills were loaded per session
- File types that triggered skill loading
- Skills that SHOULD have been loaded but weren't
- Resolution time per skill type
- Error patterns that indicate skill gaps

### Step 2: Simulate Edge Sessions with Current Skills
```bash
python .github/scripts/analyze_skills.py --simulate --count 100000
```

Measure current skill effectiveness:
- **Coverage**: % of file edits that have matching skill
- **Precision**: % of skill loads that were actually needed
- **Resolution Speed**: Simulated time-to-fix with vs without skill
- **Error Prevention**: % of errors avoided by skill guidance

### Step 3: Detect Emergent Skill Patterns
```bash
python .github/scripts/analyze_skills.py --detect-emergent
```

Find patterns that appear ≥5 times but have no skill:
- Repeated file patterns without skill trigger
- Common error types without debugging guidance
- Task types that require multiple skill lookups
- Cross-domain patterns (e.g., "frontend + docker" combo)

### Step 4: Propose and Measure New Skills
```bash
python .github/scripts/analyze_skills.py --propose
```

For each emergent pattern:
1. Measure 100k sessions WITHOUT proposed skill
2. Generate skill template
3. Measure 100k sessions WITH proposed skill
4. Calculate improvement delta

### Step 5: Update and Remeasure
```bash
python .github/scripts/analyze_skills.py --apply --remeasure
```

Apply skill improvements and validate.

## Full Pipeline
```bash
python .github/scripts/analyze_skills.py --full --count 100000
```

## Metrics

### Effectiveness Metrics
| Metric | Target | Formula |
|--------|--------|---------|
| Skill Coverage | ≥95% | file_edits_with_skill / total_file_edits |
| Skill Precision | ≥90% | needed_skill_loads / total_skill_loads |
| Error Prevention | ≥80% | errors_avoided / potential_errors |
| Resolution Speed | +30% | time_with_skill / time_without_skill |

### Emergent Skill Thresholds
| Pattern Occurrences | Action |
|---------------------|--------|
| 1-4 | Monitor |
| 5-9 | Consider skill |
| 10+ | Create skill |

## Skill Template (for new skills)
```markdown
# {Skill Name}

## Critical Rules
- Rule 1
- Rule 2

## Avoid
- ❌ Bad pattern → ✅ Good pattern

## Patterns

### Pattern Name
\```lang
code example
\```
```

## Output
- Skill effectiveness report
- Emergent pattern list with proposed skills
- Before/after comparison (100k simulations)
- Updated skills (if --apply)

## Success Criteria
- Coverage ≥95%
- Precision ≥90%
- All emergent patterns with ≥10 occurrences addressed
