#!/usr/bin/env python3
"""
AKIS Instruction Compliance Tester

Simulates LLM edge cases against instruction files to identify gaps.
Extracts scenarios from workflow logs and tests instruction coverage.

Usage:
    python .github/scripts/test_instructions.py
"""

import re
import json
from pathlib import Path
from typing import List, Dict, Tuple
from dataclasses import dataclass

# Configuration constants
KEYWORD_MATCH_THRESHOLD = 2  # Minimum keyword matches for coverage
COVERAGE_PASS_THRESHOLD = 90  # Percentage required to pass
PROSE_LINE_LENGTH = 80  # Characters considered prose vs structured

# Cognitive load scoring weights
# Lower total score = less cognitive burden
WEIGHT_LINES = 0.1  # Penalty per line (short files better)
WEIGHT_PROSE = 50   # Penalty for prose density (structured content better)
WEIGHT_STRUCTURE = 5  # Penalty for lack of tables/code (visual aids better)

@dataclass
class Scenario:
    name: str
    description: str
    trigger: str  # What triggers this scenario
    expected_action: str  # What instructions say to do
    failure_mode: str  # How LLM might fail
    instruction_coverage: bool = False
    instruction_location: str = ""

# Define edge cases based on workflow log analysis
EDGE_CASES = [
    # START phase failures
    Scenario(
        name="skip_knowledge_loading",
        description="LLM jumps directly to coding without reading project files",
        trigger="First message of session",
        expected_action="Load project_knowledge.json lines 1-50, INDEX.md, create todos",
        failure_mode="Eager helpfulness - starts coding immediately"
    ),
    Scenario(
        name="partial_knowledge_load",
        description="LLM reads one file but skips others",
        trigger="Session start",
        expected_action="Load ALL required files before any work",
        failure_mode="Reads project_knowledge.json but skips INDEX.md"
    ),
    Scenario(
        name="no_todo_creation",
        description="LLM understands task but doesn't create todos",
        trigger="After understanding user request",
        expected_action="Create <MAIN>, <WORK>, <END> todos immediately",
        failure_mode="Starts working without tracking"
    ),
    
    # WORK phase failures
    Scenario(
        name="work_without_todo",
        description="LLM makes 'quick fix' without creating todo",
        trigger="Small change needed",
        expected_action="Create todo BEFORE any code change",
        failure_mode="'I'll just quickly fix this...'"
    ),
    Scenario(
        name="skip_skill_loading",
        description="LLM edits .tsx file without loading frontend-react.md",
        trigger="Editing file matching skill trigger",
        expected_action="Load matching skill file BEFORE editing",
        failure_mode="Eager to make progress, skips skill"
    ),
    Scenario(
        name="error_without_debugging",
        description="LLM sees error, tries random fixes without loading debugging.md",
        trigger="Error in command output",
        expected_action="Load debugging.md, follow systematic approach",
        failure_mode="'Let me just try...'"
    ),
    Scenario(
        name="forgot_mark_complete",
        description="LLM finishes task but doesn't mark todo complete",
        trigger="Task completion",
        expected_action="Mark todo ✓ IMMEDIATELY after each task",
        failure_mode="Moves to next task without updating status"
    ),
    Scenario(
        name="interrupt_without_pause",
        description="LLM handles user interrupt without pausing current task",
        trigger="User sends new request mid-task",
        expected_action="Mark current ⊘ <PAUSED>, create <SUB:1>",
        failure_mode="Abandons current task, loses context"
    ),
    Scenario(
        name="orphan_paused",
        description="LLM handles interrupt but never resumes paused task",
        trigger="After handling interrupt",
        expected_action="Resume paused task, no orphan <PAUSED> at end",
        failure_mode="Forgets original task existed"
    ),
    
    # END phase failures
    Scenario(
        name="immediate_commit_after_approval",
        description="User says 'done', LLM commits without running scripts",
        trigger="User approval word",
        expected_action="Run generate_codemap.py, suggest_skill.py, THEN commit",
        failure_mode="Commits immediately after 'done'"
    ),
    Scenario(
        name="skip_codemap",
        description="LLM runs suggest_skill.py but not generate_codemap.py",
        trigger="End phase",
        expected_action="Run BOTH scripts",
        failure_mode="Runs one, forgets other"
    ),
    Scenario(
        name="no_workflow_log",
        description="LLM commits without creating workflow log",
        trigger="End phase after scripts",
        expected_action="Create log/workflow/YYYY-MM-DD_HHMMSS_task.md",
        failure_mode="Skips 'optional' step"
    ),
    Scenario(
        name="wrong_file_location",
        description="LLM creates doc in root instead of docs/",
        trigger="Creating new file",
        expected_action="Check structure.md, place in correct location",
        failure_mode="Creates where convenient, not where correct"
    ),
    
    # Context/session failures
    Scenario(
        name="long_session_drift",
        description="Protocol compliance degrades after many tasks",
        trigger="Task 10+ in session",
        expected_action="Periodic self-check every ~5 tasks",
        failure_mode="Fatigue, stops checking triggers/todos"
    ),
    Scenario(
        name="context_loss",
        description="LLM forgets earlier context in long session",
        trigger="Large context window usage",
        expected_action="Use todos/worktree as external memory",
        failure_mode="Repeats questions, forgets decisions"
    ),
    Scenario(
        name="multi_file_syntax_error",
        description="Bulk edit creates duplicate code or syntax errors",
        trigger="Multiple file edits",
        expected_action="Verify each edit, check for duplicates",
        failure_mode="Copy-paste creates duplicates"
    ),
    
    # Additional edge cases from workflow logs
    Scenario(
        name="wrong_docker_compose",
        description="Uses production docker-compose.yml instead of dev version",
        trigger="Docker commands",
        expected_action="Use docker-compose.dev.yml for development",
        failure_mode="Changes not visible because using pre-built images"
    ),
    Scenario(
        name="jsx_comment_syntax",
        description="Places comment incorrectly in JSX causing syntax error",
        trigger="Adding comments to React/JSX code",
        expected_action="Use {/* */} for JSX comments, not // or /* */",
        failure_mode="Syntax error from malformed JSX"
    ),
    Scenario(
        name="nested_interrupt_tracking",
        description="Multiple user interrupts cause lost tracking",
        trigger="User interrupts multiple times",
        expected_action="Increment SUB:N for each level, unwind completely",
        failure_mode="Loses track of original task chain"
    ),
]


def load_instruction_file(path: str) -> str:
    """Load instruction file content."""
    try:
        return Path(path).read_text()
    except FileNotFoundError:
        return ""


def check_scenario_coverage(scenario: Scenario, instructions: Dict[str, str]) -> Tuple[bool, str]:
    """Check if scenario is covered by instructions."""
    
    # Keywords that indicate coverage
    keywords = {
        "skip_knowledge_loading": ["project_knowledge.json", "lines 1-50", "START", "first"],
        "partial_knowledge_load": ["INDEX.md", "structure.md", "todos"],
        "no_todo_creation": ["<MAIN>", "<WORK>", "<END>", "Create todos"],
        "work_without_todo": ["Todo before code", "quick fix", "no work without", "no edits without"],
        "skip_skill_loading": ["Skill before edit", "trigger", "Load"],
        "error_without_debugging": ["debugging.md", "Error", "error in output"],
        "forgot_mark_complete": ["Mark", "✓", "immediately", "after"],
        "interrupt_without_pause": ["<PAUSED>", "<SUB", "interrupt"],
        "orphan_paused": ["resume", "orphan", "no orphan", "⊘ paused"],
        "immediate_commit_after_approval": ["approved", "scripts", "before commit", "Then commit"],
        "skip_codemap": ["generate_codemap", "suggest_skill", "both"],
        "no_workflow_log": ["workflow log", "log/workflow"],
        "wrong_file_location": ["structure", "docs/", "location"],
        "long_session_drift": ["~5 tasks", "check", "every"],
        "context_loss": ["worktree", "todos", "state"],
        "multi_file_syntax_error": ["verify", "syntax", "duplicate", "bulk edit"],
        "wrong_docker_compose": ["docker", "compose", "dev"],
        "jsx_comment_syntax": ["jsx", "comment", "syntax"],
        "nested_interrupt_tracking": ["SUB:", "interrupt", "resume"],
    }
    
    scenario_keywords = keywords.get(scenario.name, [])
    
    for file_name, content in instructions.items():
        content_lower = content.lower()
        matches = sum(1 for kw in scenario_keywords if kw.lower() in content_lower)
        if matches >= KEYWORD_MATCH_THRESHOLD:
            return True, file_name
    
    return False, ""


def extract_workflow_scenarios(log_dir: str) -> List[Dict]:
    """Extract real failure scenarios from workflow logs."""
    scenarios = []
    log_path = Path(log_dir)
    
    if not log_path.exists():
        return scenarios
    
    for log_file in log_path.glob("*.md"):
        content = log_file.read_text()
        
        # Extract problems
        problem_pattern = r'- Problem: (.+?)(?:\n|$)'
        cause_pattern = r'- Cause: (.+?)(?:\n|$)'
        solution_pattern = r'- Solution: (.+?)(?:\n|$)'
        
        problems = re.findall(problem_pattern, content)
        causes = re.findall(cause_pattern, content)
        solutions = re.findall(solution_pattern, content)
        
        for i, problem in enumerate(problems):
            scenario = {
                'file': log_file.name,
                'problem': problem,
                'cause': causes[i] if i < len(causes) else 'Unknown',
                'solution': solutions[i] if i < len(solutions) else 'Unknown'
            }
            scenarios.append(scenario)
    
    return scenarios


def categorize_workflow_scenario(scenario: Dict) -> str:
    """Categorize a workflow scenario by failure type."""
    problem = scenario['problem'].lower()
    cause = scenario['cause'].lower()
    
    if 'skip' in cause or 'forgot' in cause or "didn't" in cause:
        return 'protocol_skip'
    elif 'syntax' in problem or 'duplicate' in problem:
        return 'code_error'
    elif 'docker' in problem or 'container' in problem:
        return 'infrastructure'
    elif 'missing' in problem:
        return 'incomplete_work'
    else:
        return 'other'


def analyze_instruction_clarity(content: str) -> Dict:
    """Analyze instruction file for clarity metrics."""
    lines = content.split('\n')
    
    metrics = {
        'total_lines': len(lines),
        'code_blocks': content.count('```'),
        'tables': content.count('|') // 3,  # Rough table detection
        'bullet_points': len([l for l in lines if l.strip().startswith('-') or l.strip().startswith('*')]),
        'headers': len([l for l in lines if l.startswith('#')]),
        'action_words': sum(1 for word in ['do', 'run', 'create', 'load', 'mark', 'check', 'verify'] 
                          if word in content.lower()),
        'warning_markers': content.count('⚠') + content.count('MUST') + content.count('NEVER'),
    }
    
    # Calculate clarity score (lower is better for cognitive load)
    # Prefer: shorter, more tables/code, fewer prose paragraphs
    prose_lines = len([l for l in lines if len(l) > PROSE_LINE_LENGTH and not l.startswith('|') and not l.startswith('#')])
    
    metrics['prose_density'] = prose_lines / max(len(lines), 1)
    metrics['structure_ratio'] = (metrics['tables'] + metrics['code_blocks']) / max(metrics['headers'], 1)
    
    return metrics


def main():
    """Run instruction compliance tests."""
    print("=" * 60)
    print("AKIS INSTRUCTION COMPLIANCE TESTER")
    print("=" * 60)
    
    # Load instruction files
    instructions = {
        'copilot-instructions.md': load_instruction_file('.github/copilot-instructions.md'),
        'protocols.md': load_instruction_file('.github/instructions/protocols.md'),
        'anti-drift.md': load_instruction_file('.github/instructions/anti-drift.md'),
        'session-discipline.md': load_instruction_file('.github/instructions/session-discipline.md'),
        'structure.md': load_instruction_file('.github/instructions/structure.md'),
    }
    
    print("\n📁 Instruction Files Loaded:")
    for name, content in instructions.items():
        lines = len(content.split('\n'))
        print(f"  - {name}: {lines} lines")
    
    # Test edge case coverage
    print("\n" + "=" * 60)
    print("EDGE CASE COVERAGE TEST")
    print("=" * 60)
    
    covered = 0
    uncovered = []
    
    for scenario in EDGE_CASES:
        is_covered, location = check_scenario_coverage(scenario, instructions)
        scenario.instruction_coverage = is_covered
        scenario.instruction_location = location
        
        if is_covered:
            covered += 1
            status = "✓"
        else:
            status = "✗"
            uncovered.append(scenario)
        
        print(f"  {status} {scenario.name}")
        if is_covered:
            print(f"      Covered in: {location}")
    
    coverage_pct = (covered / len(EDGE_CASES)) * 100
    print(f"\n📊 Coverage: {covered}/{len(EDGE_CASES)} ({coverage_pct:.1f}%)")
    
    if uncovered:
        print("\n⚠️  UNCOVERED SCENARIOS:")
        for s in uncovered:
            print(f"  - {s.name}: {s.description}")
            print(f"    Failure mode: {s.failure_mode}")
    
    # Analyze workflow log scenarios
    print("\n" + "=" * 60)
    print("WORKFLOW LOG ANALYSIS")
    print("=" * 60)
    
    workflow_scenarios = extract_workflow_scenarios('log/workflow')
    print(f"\n📋 Found {len(workflow_scenarios)} problems in workflow logs")
    
    if workflow_scenarios:
        categories = {}
        for s in workflow_scenarios:
            cat = categorize_workflow_scenario(s)
            categories[cat] = categories.get(cat, 0) + 1
        
        print("\nProblem Categories:")
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            print(f"  - {cat}: {count}")
        
        print("\nRecent Problems:")
        for s in workflow_scenarios[-5:]:
            print(f"  [{s['file'][:20]}] {s['problem'][:60]}")
    
    # Analyze instruction clarity
    print("\n" + "=" * 60)
    print("INSTRUCTION CLARITY ANALYSIS")
    print("=" * 60)
    
    for name, content in instructions.items():
        if not content:
            continue
        metrics = analyze_instruction_clarity(content)
        
        # Score: lower is better (less cognitive load)
        score = (
            metrics['total_lines'] * WEIGHT_LINES +
            metrics['prose_density'] * WEIGHT_PROSE +
            (1 / max(metrics['structure_ratio'], 0.1)) * WEIGHT_STRUCTURE
        )
        
        print(f"\n📄 {name}:")
        print(f"   Lines: {metrics['total_lines']}, Tables: {metrics['tables']}, Code blocks: {metrics['code_blocks']}")
        print(f"   Cognitive Load Score: {score:.1f} (lower is better)")
    
    # Generate recommendations
    print("\n" + "=" * 60)
    print("RECOMMENDATIONS")
    print("=" * 60)
    
    recommendations = []
    
    if coverage_pct < 100:
        recommendations.append(f"Add coverage for {len(uncovered)} uncovered scenarios")
    
    main_instructions = instructions.get('copilot-instructions.md', '')
    if len(main_instructions.split('\n')) > 100:
        recommendations.append("Main instructions exceed 100 lines - consider further reduction")
    
    for rec in recommendations:
        print(f"  → {rec}")
    
    if not recommendations:
        print("  ✓ All edge cases covered and instructions are concise!")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    
    return coverage_pct >= COVERAGE_PASS_THRESHOLD


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
