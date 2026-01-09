# Add suggest_instructions.py Script | 2026-01-09 | ~15min

## Summary
Created a new script `suggest_instructions.py` that reads all workflow logs, analyzes patterns, simulates 100k sessions with deviations, and detects gaps in instructions that could improve session effectiveness. The script measures with/without newly found instructions effectiveness and generates recommendations.

## Session Metrics
| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Tasks | 6 completed / 6 total |
| Files Modified | 1 |
| Skills Loaded | 1 |
| Complexity | Medium |

## Workflow Tree
<MAIN> Create suggest_instructions.py for instruction pattern detection
├─ <WORK> Analyze existing patterns and scripts                    ✓
├─ <WORK> Create suggest_instructions.py script                    ✓
├─ <WORK> Test with 100k session simulation                        ✓
├─ <WORK> Address code review feedback                             ✓
├─ <WORK> Pass CodeQL security check                               ✓
└─ <END> Finalize and create workflow log                          ✓

## Files Modified
| File | Changes |
|------|---------|
| .github/scripts/suggest_instructions.py | NEW: ~1100 lines - Instruction pattern detection and optimization script |

## Skills Used
- .github/skills/akis-development/SKILL.md (for AKIS framework development)

## Technical Details

### Script Features
1. **Workflow Log Analysis**: Reads 106 workflow logs, extracts session types, technologies, problems/solutions
2. **Instruction Coverage Analysis**: Tests 25 known instruction patterns against existing instruction files
3. **100k Session Simulation**: Simulates sessions with realistic deviations based on log analysis
4. **Gap Detection**: Identifies uncovered patterns and high-deviation areas
5. **Effectiveness Measurement**: Compares baseline vs improved instruction effectiveness

### Simulation Results (100k sessions)
| Metric | Baseline | Improved | Change |
|--------|----------|----------|--------|
| Compliance Rate | 89.7% | 91.0% | +1.3% |
| Perfect Sessions | 31.9% | 37.3% | +5.4% |
| Total Deviations | 107,909 | 94,544 | -12.4% |

### Top Recommendations
1. **workflow_log** (MEDIUM): 18.0% deviation rate - strengthen emphasis
2. **skill_loading** (MEDIUM): 15.1% deviation rate - strengthen emphasis

### Configuration Constants (from code review)
- `MAX_EFFECTIVENESS_REDUCTION = 0.8` - Maximum 80% reduction in deviation
- `COVERAGE_THRESHOLD = 0.4` - 40% keyword match for coverage
- `TASK_COMPLETED_REGEX` - Pattern for extracting task count from logs

## Verification
```bash
# Run with 100k sessions (default)
python .github/scripts/suggest_instructions.py --sessions 100000 --output results.json

# Quick test with 10k sessions
python .github/scripts/suggest_instructions.py --sessions 10000

# View results
cat results.json | python -m json.tool
```

## Notes
- Script follows same pattern as `simulate_skill_discovery.py` and `test_instructions.py`
- Named `suggest_instructions.py` to match `suggest_skill.py` naming convention
- No security issues detected by CodeQL
- All code review feedback addressed (magic numbers extracted to constants)
