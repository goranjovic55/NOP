#!/usr/bin/env python3
"""
AKIS Framework Analyzer

Analyzes workflow logs, simulates sessions, and suggests improvements.
Based on real-world patterns from 90+ workflow logs.

Usage:
    python .github/scripts/analyze_akis.py --full           # Complete analysis
    python .github/scripts/analyze_akis.py --parse-logs     # Parse workflow logs
    python .github/scripts/analyze_akis.py --simulate       # Run simulation
    python .github/scripts/analyze_akis.py --suggest        # Suggest improvements
    python .github/scripts/analyze_akis.py --apply          # Apply and remeasure
"""

import argparse
import json
import random
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ============================================================================
# Configuration
# ============================================================================

LOG_DIR = Path("log/workflow")
ANALYSIS_DIR = Path("docs/analysis")
INSTRUCTIONS_FILE = Path(".github/copilot-instructions.md")
PROTOCOLS_FILE = Path(".github/instructions/protocols.md")

DEFAULT_SIMULATION_COUNT = 100000
COMPLIANCE_TARGET = 15.0  # Target perfect session rate
VIOLATION_TARGET = 2.0    # Target avg violations per session

# Session type distribution (from workflow log analysis)
SESSION_TYPES = {
    "frontend_only": 0.24,
    "backend_only": 0.10,
    "fullstack": 0.40,
    "docker_heavy": 0.10,
    "framework": 0.10,
    "docs_only": 0.06,
}

TASK_COUNTS = {1: 0.05, 2: 0.15, 3: 0.30, 4: 0.25, 5: 0.15, 6: 0.07, 7: 0.03}
INTERRUPT_PROBABILITY = 0.14

SKILL_TRIGGERS = {
    ".tsx": "frontend-react.md",
    ".jsx": "frontend-react.md",
    ".py": "backend-api.md",
    "Dockerfile": "docker.md",
}

# ============================================================================
# Current AKIS Probabilities (v5.5)
# ============================================================================

AKIS_CURRENT = {
    "load_knowledge": 0.95,
    "load_skills_index": 0.94,
    "create_todos": 0.94,
    "show_context_to_user": 0.97,
    "mark_working_before_edit": 0.95,
    "check_skill_trigger": 0.90,
    "load_matching_skill": 0.85,
    "mark_complete_after": 0.95,
    "avoid_quick_fix": 0.97,
    "pause_on_interrupt": 0.90,
    "create_sub_todo": 0.88,
    "resume_after_interrupt": 0.85,
    "check_orphan_tasks": 0.93,
    "run_codemap": 0.92,
    "run_suggest_skill": 0.92,
    "create_workflow_log": 0.90,
    "wait_for_approval": 0.97,
    "avoid_syntax_error": 0.93,
    "avoid_duplicate_code": 0.94,
}

# ============================================================================
# Workflow Log Parser
# ============================================================================

@dataclass
class LogAnalysis:
    total_logs: int = 0
    task_types: Dict[str, int] = field(default_factory=dict)
    file_types: Dict[str, int] = field(default_factory=dict)
    problem_categories: Dict[str, int] = field(default_factory=dict)
    violations: Dict[str, int] = field(default_factory=dict)
    problems: List[str] = field(default_factory=list)
    avg_files_per_session: float = 0.0


def parse_workflow_logs() -> LogAnalysis:
    """Parse all workflow logs and extract patterns."""
    analysis = LogAnalysis()
    
    logs = list(LOG_DIR.glob("*.md"))
    logs = [l for l in logs if l.name != "README.md"]
    analysis.total_logs = len(logs)
    
    if analysis.total_logs == 0:
        print("⚠️  No workflow logs found in log/workflow/")
        return analysis
    
    total_files = 0
    
    for log_path in logs:
        try:
            content = log_path.read_text()
        except Exception:
            continue
        
        # Extract problems
        problems = re.findall(r'(?:Problem|Issue|Bug|Failed)[:\s]+(.+?)(?:\n|$)', content, re.I)
        analysis.problems.extend(problems)
        
        # Categorize problems
        for p in problems:
            p_lower = p.lower()
            if 'docker' in p_lower or 'cache' in p_lower:
                analysis.problem_categories["docker/caching"] = analysis.problem_categories.get("docker/caching", 0) + 1
            elif 'ui' in p_lower or 'frontend' in p_lower or 'jsx' in p_lower:
                analysis.problem_categories["frontend/jsx"] = analysis.problem_categories.get("frontend/jsx", 0) + 1
            elif 'protocol' in p_lower or 'phase' in p_lower or 'skip' in p_lower:
                analysis.problem_categories["protocol_violation"] = analysis.problem_categories.get("protocol_violation", 0) + 1
            elif 'import' in p_lower or 'syntax' in p_lower or 'error' in p_lower:
                analysis.problem_categories["code_error"] = analysis.problem_categories.get("code_error", 0) + 1
            else:
                analysis.problem_categories["other"] = analysis.problem_categories.get("other", 0) + 1
        
        # Extract file types
        file_matches = re.findall(r'`([^`]+\.(tsx|py|md|yml|json|ts|jsx))`', content)
        for _, ext in file_matches:
            analysis.file_types[f".{ext}"] = analysis.file_types.get(f".{ext}", 0) + 1
            total_files += 1
        
        # Task type classification
        if re.search(r'UI|frontend|page|component', content, re.I):
            analysis.task_types["frontend"] = analysis.task_types.get("frontend", 0) + 1
        if re.search(r'backend|api|endpoint|database', content, re.I):
            analysis.task_types["backend"] = analysis.task_types.get("backend", 0) + 1
        if re.search(r'docker|container|compose', content, re.I):
            analysis.task_types["docker"] = analysis.task_types.get("docker", 0) + 1
        if re.search(r'fix|bug|error|issue', content, re.I):
            analysis.task_types["bugfix"] = analysis.task_types.get("bugfix", 0) + 1
        if re.search(r'AKIS|framework|protocol|skill', content, re.I):
            analysis.task_types["framework"] = analysis.task_types.get("framework", 0) + 1
        
        # Extract violations
        violation_patterns = [
            (r'didn\'t.*initialize', "skipped_initialization"),
            (r'forgot.*mark', "forgot_mark_status"),
            (r'skip.*skill', "skipped_skill_loading"),
            (r'without.*todo', "work_without_todo"),
            (r'immediate.*commit', "immediate_commit"),
            (r'orphan.*task', "orphan_task"),
            (r'missing.*import', "code_error"),
            (r'duplicate.*code', "duplicate_code"),
            (r'syntax.*error', "syntax_error"),
            (r'cache.*issue', "docker_cache"),
            (r'interrupt', "interrupt_handling"),
        ]
        for pattern, label in violation_patterns:
            if re.search(pattern, content, re.I):
                analysis.violations[label] = analysis.violations.get(label, 0) + 1
    
    analysis.avg_files_per_session = total_files / max(analysis.total_logs, 1)
    
    return analysis


def print_log_analysis(analysis: LogAnalysis):
    """Print workflow log analysis."""
    print("\n" + "=" * 70)
    print("WORKFLOW LOG ANALYSIS")
    print("=" * 70)
    
    print(f"\n📁 Analyzed {analysis.total_logs} workflow logs")
    print(f"📏 Avg files per session: {analysis.avg_files_per_session:.1f}")
    
    print(f"\n📊 Task Type Distribution:")
    for task, count in sorted(analysis.task_types.items(), key=lambda x: -x[1]):
        pct = count / analysis.total_logs * 100
        print(f"   {task:15} {count:3} ({pct:.0f}%)")
    
    print(f"\n📂 File Types:")
    for ext, count in sorted(analysis.file_types.items(), key=lambda x: -x[1])[:8]:
        print(f"   {ext:8} {count:3}x")
    
    print(f"\n🔴 Problem Categories:")
    for cat, count in sorted(analysis.problem_categories.items(), key=lambda x: -x[1]):
        print(f"   {cat:20} {count:3}")
    
    print(f"\n⚠️  Violation Patterns:")
    for v, count in sorted(analysis.violations.items(), key=lambda x: -x[1]):
        print(f"   {v:25} {count:3}")


# ============================================================================
# Session Simulator
# ============================================================================

class Phase(Enum):
    START = "start"
    WORK = "work"
    END = "end"


@dataclass
class State:
    session_type: str = "fullstack"
    todos: List[Dict] = field(default_factory=list)
    files_edited: List[str] = field(default_factory=list)
    skills_loaded: List[str] = field(default_factory=list)
    interrupts: int = 0
    paused_tasks: int = 0
    violations: List[str] = field(default_factory=list)


class Simulator:
    def __init__(self, probs: Dict[str, float], seed: int):
        random.seed(seed)
        self.probs = probs
        self.state = State()
    
    def _occurs(self, key: str) -> bool:
        return random.random() < self.probs.get(key, 0.5)
    
    def _violation(self, msg: str):
        self.state.violations.append(msg)
    
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def _get_file(self) -> str:
        files = {
            "frontend_only": ["Component.tsx", "Page.tsx"],
            "backend_only": ["main.py", "service.py"],
            "fullstack": ["Component.tsx", "main.py"],
            "docker_heavy": ["Dockerfile", "docker-compose.yml"],
            "framework": ["copilot-instructions.md"],
            "docs_only": ["README.md"],
        }
        return random.choice(files.get(self.state.session_type, ["file.txt"]))
    
    def simulate_start(self):
        if not self._occurs("load_knowledge"):
            self._violation("START: Did not load project_knowledge.json")
        if not self._occurs("load_skills_index"):
            self._violation("START: Did not load skills/INDEX.md")
        if not self._occurs("create_todos"):
            self._violation("START: Did not create todo structure")
        else:
            task_count = self._choose(TASK_COUNTS)
            self.state.todos = [{"status": "pending"} for _ in range(task_count)]
        if not self._occurs("show_context_to_user"):
            self._violation("START: Did not show context to user")
    
    def simulate_work(self):
        for i, todo in enumerate(self.state.todos):
            if self.state.interrupts == 0 and random.random() < INTERRUPT_PROBABILITY:
                self._handle_interrupt()
            
            if not self._occurs("avoid_quick_fix"):
                self._violation("WORK: Did 'quick fix' without todo")
                continue
            
            if not self._occurs("mark_working_before_edit"):
                self._violation("WORK: Started edit without marking ◆")
            
            file = self._get_file()
            self.state.files_edited.append(file)
            
            for pattern, skill in SKILL_TRIGGERS.items():
                if pattern in file:
                    if self._occurs("check_skill_trigger"):
                        if not self._occurs("load_matching_skill"):
                            self._violation(f"WORK: Did not load {skill}")
                    else:
                        self._violation(f"WORK: Skipped skill trigger for {file}")
                    break
            
            if not self._occurs("avoid_syntax_error"):
                self._violation("WORK: Syntax error in edit")
            if not self._occurs("avoid_duplicate_code"):
                self._violation("WORK: Duplicate code block")
            if not self._occurs("mark_complete_after"):
                self._violation("WORK: Did not mark ✓ after task")
    
    def _handle_interrupt(self):
        self.state.interrupts += 1
        if self._occurs("pause_on_interrupt"):
            self.state.paused_tasks += 1
            if self._occurs("create_sub_todo"):
                if self._occurs("resume_after_interrupt"):
                    self.state.paused_tasks -= 1
                else:
                    self._violation("INTERRUPT: Orphan ⊘ task")
            else:
                self._violation("INTERRUPT: No SUB todo")
        else:
            self._violation("INTERRUPT: Did not pause task")
    
    def simulate_end(self):
        if not self._occurs("check_orphan_tasks"):
            self._violation("END: Did not check for orphan tasks")
        elif self.state.paused_tasks > 0:
            self._violation(f"END: {self.state.paused_tasks} orphan tasks")
        
        if not self._occurs("wait_for_approval"):
            self._violation("END: Committed without approval")
        if not self._occurs("run_codemap"):
            self._violation("END: Did not run generate_codemap.py")
        if not self._occurs("run_suggest_skill"):
            self._violation("END: Did not run suggest_skill.py")
        if not self._occurs("create_workflow_log"):
            self._violation("END: Did not create workflow log")
    
    def run(self) -> Dict:
        self.state.session_type = self._choose(SESSION_TYPES)
        self.simulate_start()
        self.simulate_work()
        self.simulate_end()
        return {
            "violations": self.state.violations,
            "count": len(self.state.violations),
        }


def run_simulation(probs: Dict[str, float], count: int = 100000, seed: int = 42) -> Dict:
    """Run batch simulation."""
    random.seed(seed)
    
    results = {
        "total": count,
        "perfect": 0,
        "violations": 0,
        "types": {},
        "compliance": 0.0,
        "avg_violations": 0.0,
    }
    
    for i in range(count):
        sim = Simulator(probs, seed + i)
        r = sim.run()
        
        if r["count"] == 0:
            results["perfect"] += 1
        else:
            results["violations"] += r["count"]
            for v in r["violations"]:
                key = v.split(":")[0] + ":" + v.split(":")[1][:35] if ":" in v else v[:40]
                results["types"][key] = results["types"].get(key, 0) + 1
    
    results["compliance"] = results["perfect"] / count * 100
    results["avg_violations"] = results["violations"] / count
    
    return results


def print_simulation_results(results: Dict, label: str = ""):
    """Print simulation results."""
    print("\n" + "=" * 70)
    print(f"SIMULATION RESULTS {label}")
    print("=" * 70)
    
    print(f"\n📊 Overview ({results['total']:,} sessions):")
    print(f"   Perfect sessions: {results['perfect']:,} ({results['compliance']:.1f}%)")
    print(f"   Avg violations: {results['avg_violations']:.2f}")
    
    status = "✅" if results['compliance'] >= COMPLIANCE_TARGET else "❌"
    print(f"\n{status} Target: {COMPLIANCE_TARGET}% | Current: {results['compliance']:.1f}%")
    
    print(f"\n🔴 Top Violations:")
    sorted_violations = sorted(results["types"].items(), key=lambda x: -x[1])
    for v, count in sorted_violations[:12]:
        pct = count / results["total"] * 100
        print(f"   {count:6,} ({pct:5.1f}%) | {v}")


# ============================================================================
# Improvement Suggestions
# ============================================================================

def suggest_improvements(results: Dict) -> Dict[str, float]:
    """Analyze violations and suggest probability improvements."""
    suggestions = {}
    
    # Analyze top violations and suggest targeted improvements
    for violation, count in results["types"].items():
        rate = count / results["total"]
        
        if "marking ◆" in violation and rate > 0.05:
            suggestions["mark_working_before_edit"] = min(0.98, AKIS_CURRENT.get("mark_working_before_edit", 0.95) + 0.02)
        
        if "quick fix" in violation and rate > 0.03:
            suggestions["avoid_quick_fix"] = min(0.99, AKIS_CURRENT.get("avoid_quick_fix", 0.97) + 0.01)
        
        if "workflow log" in violation and rate > 0.10:
            suggestions["create_workflow_log"] = min(0.95, AKIS_CURRENT.get("create_workflow_log", 0.90) + 0.03)
        
        if "orphan" in violation and rate > 0.05:
            suggestions["check_orphan_tasks"] = min(0.96, AKIS_CURRENT.get("check_orphan_tasks", 0.93) + 0.02)
        
        if "skill trigger" in violation and rate > 0.10:
            suggestions["check_skill_trigger"] = min(0.95, AKIS_CURRENT.get("check_skill_trigger", 0.90) + 0.03)
        
        if "codemap" in violation and rate > 0.05:
            suggestions["run_codemap"] = min(0.96, AKIS_CURRENT.get("run_codemap", 0.92) + 0.02)
        
        if "suggest_skill" in violation and rate > 0.05:
            suggestions["run_suggest_skill"] = min(0.96, AKIS_CURRENT.get("run_suggest_skill", 0.92) + 0.02)
    
    return suggestions


def print_suggestions(suggestions: Dict[str, float]):
    """Print improvement suggestions."""
    print("\n" + "=" * 70)
    print("SUGGESTED IMPROVEMENTS")
    print("=" * 70)
    
    if not suggestions:
        print("\n✅ No improvements needed - targets met!")
        return
    
    print("\n📈 Probability Adjustments:")
    for key, new_val in suggestions.items():
        old_val = AKIS_CURRENT.get(key, 0)
        delta = new_val - old_val
        print(f"   {key:30} {old_val:.2f} → {new_val:.2f} ({delta:+.2f})")
    
    print("\n📝 Instruction Changes Recommended:")
    if "mark_working_before_edit" in suggestions:
        print("   → Add more visual emphasis to ◆ marking requirement")
    if "create_workflow_log" in suggestions:
        print("   → Make workflow log first item in END checklist")
    if "check_skill_trigger" in suggestions:
        print("   → Add skill trigger reminder to WORK section header")


# ============================================================================
# Apply & Remeasure
# ============================================================================

def apply_and_remeasure(suggestions: Dict[str, float], count: int = 100000) -> Tuple[Dict, Dict]:
    """Apply suggestions and run comparison simulation."""
    # Create improved probability set
    improved = AKIS_CURRENT.copy()
    improved.update(suggestions)
    
    print("\n🔄 Running before/after comparison...")
    
    before = run_simulation(AKIS_CURRENT, count)
    after = run_simulation(improved, count)
    
    return before, after


def print_comparison(before: Dict, after: Dict):
    """Print before/after comparison."""
    print("\n" + "=" * 70)
    print("BEFORE/AFTER COMPARISON")
    print("=" * 70)
    
    compliance_delta = after["compliance"] - before["compliance"]
    violation_delta = after["avg_violations"] - before["avg_violations"]
    perfect_delta = after["perfect"] - before["perfect"]
    
    print(f"""
┌─────────────────────────┬──────────┬──────────┬──────────┐
│ Metric                  │ Before   │ After    │ Change   │
├─────────────────────────┼──────────┼──────────┼──────────┤
│ Perfect Sessions        │ {before['perfect']:>6,}   │ {after['perfect']:>6,}   │ {perfect_delta:>+6,}   │
│ Compliance Rate         │ {before['compliance']:>6.1f}%  │ {after['compliance']:>6.1f}%  │ {compliance_delta:>+5.1f}%  │
│ Avg Violations          │ {before['avg_violations']:>6.2f}   │ {after['avg_violations']:>6.2f}   │ {violation_delta:>+5.2f}   │
└─────────────────────────┴──────────┴──────────┴──────────┘
""")
    
    if after["compliance"] >= COMPLIANCE_TARGET:
        print(f"✅ TARGET MET: {after['compliance']:.1f}% >= {COMPLIANCE_TARGET}%")
    else:
        print(f"❌ TARGET NOT MET: {after['compliance']:.1f}% < {COMPLIANCE_TARGET}%")
        print(f"   Need {COMPLIANCE_TARGET - after['compliance']:.1f}% more improvement")


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='AKIS Framework Analyzer')
    parser.add_argument('--parse-logs', action='store_true', help='Parse workflow logs')
    parser.add_argument('--simulate', action='store_true', help='Run simulation')
    parser.add_argument('--suggest', action='store_true', help='Suggest improvements')
    parser.add_argument('--apply', action='store_true', help='Apply and remeasure')
    parser.add_argument('--full', action='store_true', help='Full analysis')
    parser.add_argument('--count', type=int, default=DEFAULT_SIMULATION_COUNT, help='Simulation count')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    args = parser.parse_args()
    
    if args.full:
        args.parse_logs = True
        args.simulate = True
        args.suggest = True
        args.apply = True
    
    if not any([args.parse_logs, args.simulate, args.suggest, args.apply]):
        args.full = True
        args.parse_logs = True
        args.simulate = True
        args.suggest = True
        args.apply = True
    
    print("=" * 70)
    print("AKIS FRAMEWORK ANALYZER")
    print("=" * 70)
    print(f"\n📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"🔢 Simulation Count: {args.count:,}")
    
    results = {}
    
    # Step 1: Parse logs
    if args.parse_logs:
        log_analysis = parse_workflow_logs()
        print_log_analysis(log_analysis)
        results["log_analysis"] = {
            "total_logs": log_analysis.total_logs,
            "task_types": log_analysis.task_types,
            "violations": log_analysis.violations,
        }
    
    # Step 2: Simulate
    if args.simulate:
        print(f"\n🎲 Running {args.count:,} session simulations...")
        sim_results = run_simulation(AKIS_CURRENT, args.count)
        print_simulation_results(sim_results, "(Current AKIS)")
        results["simulation"] = sim_results
    
    # Step 3: Suggest
    if args.suggest and args.simulate:
        suggestions = suggest_improvements(sim_results)
        print_suggestions(suggestions)
        results["suggestions"] = suggestions
    
    # Step 4: Apply & Remeasure
    if args.apply and args.suggest:
        before, after = apply_and_remeasure(suggestions, args.count)
        print_comparison(before, after)
        results["comparison"] = {
            "before": before,
            "after": after,
        }
    
    # Output JSON if requested
    if args.json:
        ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
        output_file = ANALYSIS_DIR / f"akis-simulation-{datetime.now().strftime('%Y-%m-%d')}.json"
        with open(output_file, 'w') as f:
            # Convert to JSON-serializable format
            json_results = {}
            for k, v in results.items():
                if isinstance(v, dict):
                    json_results[k] = {str(kk): vv for kk, vv in v.items()}
                else:
                    json_results[k] = v
            json.dump(json_results, f, indent=2, default=str)
        print(f"\n📄 Results saved to: {output_file}")
    
    print("\n" + "=" * 70)
    print("ANALYSIS COMPLETE")
    print("=" * 70)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
