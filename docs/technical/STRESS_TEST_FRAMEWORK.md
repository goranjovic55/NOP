# AKIS Stress Test & Edge Testing Framework

## Overview

Comprehensive stress testing framework for AKIS scripts (`agents.py`, `knowledge.py`, `skills.py`, `instructions.py`) with 100k session simulations, edge case testing, and precision/recall validation.

## Test Results Summary (100k Sessions)

| Script | Precision | Recall | F1 Score | Status |
|--------|-----------|--------|----------|--------|
| agents.py | 91.1% | 100.0% | 95.3% | ✅ PASS |
| skills.py | 96.2% | 93.4% | 94.7% | ✅ PASS |
| knowledge.py | 93.7% | 90.9% | 92.3% | ✅ PASS |
| instructions.py | 95.4% | 91.8% | 93.6% | ✅ PASS |

## Framework Components

### 1. Stress Test Script (`stress_test.py`)

Comprehensive testing with multiple modes:

```bash
# Run all tests
python .github/scripts/stress_test.py --all

# Edge case testing only
python .github/scripts/stress_test.py --edge

# 100k session simulation
python .github/scripts/stress_test.py --simulate

# Extract workflow patterns
python .github/scripts/stress_test.py --patterns

# Validate suggestion quality
python .github/scripts/stress_test.py --validate

# Industry pattern analysis
python .github/scripts/stress_test.py --industry
```

### 2. Edge Case Testing

20 edge cases tested across all scripts:

| Script | Edge Case | Description | Recovery Method |
|--------|-----------|-------------|-----------------|
| agents.py | empty_session | No files modified in session | Returns empty suggestions |
| agents.py | mega_session | 50+ files modified | Limits to most relevant files |
| agents.py | missing_agents_dir | No .github/agents directory | Creates directory and stubs |
| agents.py | circular_agents | Circular agent dependencies | Breaks cycles with sequential fallback |
| agents.py | all_agents_active | All agent types needed at once | Prioritizes by tier (core > supporting) |
| knowledge.py | empty_knowledge | Empty or missing knowledge file | Creates new structure from codebase |
| knowledge.py | corrupted_jsonl | Invalid JSON lines in file | Skips invalid lines, logs warning |
| knowledge.py | stale_knowledge | Knowledge file older than 7 days | Triggers full regeneration |
| knowledge.py | huge_codebase | 10k+ files to analyze | Uses sampling and incremental updates |
| knowledge.py | binary_files | Binary files in source directories | Detects and skips binary files |
| skills.py | no_matching_skills | Session files don't match patterns | Suggests new skill creation |
| skills.py | multiple_skill_matches | Files match 5+ skill patterns | Ranks by confidence, returns top 3 |
| skills.py | missing_skill_file | Skill directory exists but no SKILL.md | Generates stub SKILL.md |
| skills.py | verbose_skill | SKILL.md exceeds 350 word limit | Flags as quality issue |
| skills.py | chain_skill_missing | Auto-chain target doesn't exist | Skips chain, logs warning |
| instructions.py | no_instructions | No files in .github/instructions/ | Uses copilot-instructions.md fallback |
| instructions.py | conflicting_instructions | Two files contradict each other | Later file takes precedence |
| instructions.py | missing_frontmatter | File lacks applyTo frontmatter | Flags issue, suggests fix |
| instructions.py | full_coverage | All patterns already covered | Reports no changes needed |
| instructions.py | session_interrupt | Session interrupted mid-task | Detects incomplete state, suggests resume |

### 3. Precision/Recall Testing

Each script has a `--precision` mode for validation:

```bash
python .github/scripts/agents.py --precision --sessions 100000
python .github/scripts/skills.py --precision --sessions 100000
python .github/scripts/knowledge.py --precision --sessions 100000
python .github/scripts/instructions.py --precision --sessions 100000
```

### 4. Industry Pattern Analysis

Patterns extracted from industry best practices:

| Category | Patterns |
|----------|----------|
| Code Quality | TDD first (15%), Refactor then add (12%), Pair programming (8%) |
| Debugging | Bisect debug (10%), Log analysis (18%), Reproduce first (25%) |
| Architecture | Design doc first (12%), Spike solution (10%), Incremental delivery (22%) |
| Review | Self review (30%), Checklist review (20%) |

### 5. Session Pattern Analysis

Distribution from 124+ workflow logs:

| Session Type | Percentage |
|--------------|------------|
| Fullstack | 46.8% |
| Frontend Only | 16.9% |
| Backend Only | 19.4% |
| Framework | 14.5% |
| Docker Heavy | 0.8% |
| Docs Only | 1.6% |

## Quality Thresholds

| Metric | Minimum | Target |
|--------|---------|--------|
| Precision | 80% | 90%+ |
| Recall | 75% | 85%+ |
| F1 Score | 77.5% | 87%+ |
| Edge Case Pass Rate | 95% | 100% |

## Output Files

Results are saved to `log/`:

- `stress_test_100k_results.json` - Comprehensive test results
- `agents_precision_100k.json` - Agent precision metrics
- `skills_precision_100k.json` - Skills precision metrics
- `knowledge_precision_100k.json` - Knowledge precision metrics
- `instructions_precision_100k.json` - Instructions precision metrics

## Usage in CI/CD

```yaml
- name: Run AKIS Stress Tests
  run: |
    python .github/scripts/stress_test.py --all --output log/stress_test_results.json
    python .github/scripts/agents.py --precision --sessions 100000
    python .github/scripts/skills.py --precision --sessions 100000
```

## Simulation Metrics

From 100k session simulation:

- **Success Rate**: 86.6%
- **Edge Case Rate**: 15.0%
- **Skill Detection**: 96.0%
- **Knowledge Cache Hits**: 48.1%
- **Instruction Compliance**: 94.7%
- **Agent Effectiveness**: 91.9%
- **Total Tokens**: 1.27B
- **Total API Calls**: 1.88M
- **Avg Resolution Time**: 12.5 min

## Future Improvements

1. Add continuous integration hooks
2. Implement regression testing
3. Add mutation testing for edge cases
4. Expand industry pattern coverage
5. Add A/B testing for suggestion quality
