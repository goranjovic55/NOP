# Analyze AKIS Framework

Use this prompt to analyze and improve the AKIS framework based on real workflow data.

## Purpose

Automatically analyze workflow logs, extract patterns, simulate sessions, identify violations, and suggest improvements to the AKIS instruction files.

## When to Use

- After accumulating 20+ new workflow logs
- When compliance seems to be drifting
- Before major AKIS version updates
- Monthly framework health check

## Workflow

### Step 1: Parse Workflow Logs

```bash
python .github/scripts/analyze_akis.py --parse-logs
```

Extracts from `log/workflow/*.md`:
- Problem patterns (errors, bugs, fixes)
- Task type distribution (frontend, backend, docker, etc.)
- Violation patterns (skipped init, forgot marks, etc.)
- Session complexity indicators

### Step 2: Run Baseline Simulation

```bash
python .github/scripts/analyze_akis.py --simulate --count 100000
```

Runs 100k session simulations with current AKIS probabilities:
- Measures perfect session rate
- Identifies top violations
- Calculates avg violations per session
- Groups by session type

### Step 3: Suggest Improvements

```bash
python .github/scripts/analyze_akis.py --suggest
```

Analyzes violations and proposes:
- Instruction wording changes
- Probability adjustments
- New edge case handling
- Visual emphasis improvements

### Step 4: Apply & Re-measure

```bash
python .github/scripts/analyze_akis.py --apply --remeasure
```

Applies improvements and runs comparison:
- Shows before/after metrics
- Validates improvement percentage
- Generates change report

## Full Analysis (All Steps)

```bash
python .github/scripts/analyze_akis.py --full
```

Runs complete analysis pipeline and outputs recommendations.

## Expected Outputs

1. **Console Report**: Summary of findings and improvements
2. **JSON Data**: `docs/analysis/akis-simulation-YYYY-MM-DD.json`
3. **Instruction Updates**: Changes to `.github/copilot-instructions.md` and `.github/instructions/protocols.instructions.md`

## Key Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Perfect session rate | >15% | 11.9% |
| Avg violations/session | <2.0 | 2.23 |
| ◆ marking compliance | >95% | 95% |
| Workflow log creation | >90% | 90% |
| Script execution | >92% | 92% |

## Improvement Principles

1. **Shorter is better** - Agent memory retention improves with concise instructions
2. **Visual emphasis** - ⚠️ blocks catch attention better than prose
3. **Examples > rules** - Show ✗ bad / ✓ good examples
4. **Single source** - Avoid duplicate instructions across files
5. **Checklist format** - Numbered steps are followed better than paragraphs

## Related Files

- `.github/scripts/analyze_akis.py` - Main analysis script
- `.github/scripts/simulate_sessions_v2.py` - Enhanced simulation
- `.github/copilot-instructions.md` - Main instructions
- `.github/instructions/protocols.instructions.md` - Detailed protocols
- `.github/instructions/structure.instructions.md` - File organization rules
- `log/workflow/` - Workflow logs to analyze
