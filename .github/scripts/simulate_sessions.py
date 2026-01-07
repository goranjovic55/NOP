#!/usr/bin/env python3
"""
AKIS Session Simulator

Generates high-volume session simulations to detect error states and edge cases.
Simulates various LLM behavior patterns and identifies protocol violations.

Usage:
    python .github/scripts/simulate_sessions.py [--count N] [--verbose]
"""

import random
import json
import argparse
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from datetime import datetime

# ============================================================================
# Configuration Constants
# ============================================================================

COMPLIANCE_THRESHOLD = 50  # Percentage compliance required to pass
VERBOSE_SAMPLE_SIZE = 3    # Number of sessions to show in verbose mode

# ============================================================================
# Session State Model
# ============================================================================

class Phase(Enum):
    START = "start"
    WORK = "work"
    END = "end"

class TodoStatus(Enum):
    PENDING = "○"
    WORKING = "◆"
    DONE = "✓"
    PAUSED = "⊘"

@dataclass
class Todo:
    prefix: str  # <MAIN>, <WORK>, <END>, <SUB:N>
    description: str
    status: TodoStatus = TodoStatus.PENDING

@dataclass 
class SessionState:
    phase: Phase = Phase.START
    knowledge_loaded: bool = False
    skills_loaded: bool = False
    todos: List[Todo] = field(default_factory=list)
    files_edited: List[str] = field(default_factory=list)
    skills_checked: List[str] = field(default_factory=list)
    interrupts_handled: int = 0
    scripts_run: List[str] = field(default_factory=list)
    workflow_log_created: bool = False
    violations: List[str] = field(default_factory=list)

# ============================================================================
# Simulation Events
# ============================================================================

@dataclass
class Event:
    name: str
    probability: float  # 0.0 to 1.0
    description: str

# Events that can occur during a session
# v5.5 probabilities - targeting all failures below 5%
# See docs/analysis/akis-v5-improvement-analysis.md for baseline comparison
EVENTS = {
    "start": [
        Event("load_knowledge", 0.98, "LLM loads project_knowledge.json"),
        Event("load_skills_index", 0.97, "LLM loads skills INDEX.md"),
        Event("create_todos", 0.96, "LLM creates todo structure"),
        Event("skip_start", 0.01, "LLM skips start phase entirely"),         # -1%
        Event("partial_start", 0.01, "LLM only partially completes start"), # -1%
    ],
    "work": [
        Event("mark_working", 0.99, "LLM marks todo as working"),            # +1% near-perfect
        Event("check_skill_trigger", 0.92, "LLM checks skill trigger table"),# +4%
        Event("load_skill", 0.90, "LLM loads matching skill"),               # +5%
        Event("mark_complete", 0.97, "LLM marks todo as complete"),          # +2%
        Event("forget_mark", 0.01, "LLM forgets to mark status"),            # -1%
        Event("skip_skill", 0.06, "LLM skips skill loading"),                # -4%
        Event("quick_fix", 0.01, "LLM does 'quick fix' without todo"),       # -1% near zero
        Event("bulk_edit", 0.15, "LLM edits multiple files"),
        Event("syntax_error", 0.02, "Bulk edit creates syntax error"),       # -1%
    ],
    "interrupt": [
        Event("pause_current", 0.96, "LLM pauses current task"),             # +4%
        Event("create_sub", 0.95, "LLM creates SUB:N todo"),                 # +5%
        Event("handle_interrupt", 0.97, "LLM handles interrupt"),            # +3%
        Event("resume_original", 0.96, "LLM resumes original task"),         # +4%
        Event("orphan_pause", 0.02, "LLM forgets to resume"),                # -2%
        Event("nested_interrupt", 0.02, "Another interrupt during handling"),# -2%
    ],
    "end": [
        Event("check_orphans", 0.97, "LLM checks for orphan tasks"),         # +2%
        Event("show_summary", 0.98, "LLM shows change summary"),             # +2%
        Event("wait_approval", 0.99, "LLM waits for user approval"),         # +1%
        Event("run_codemap", 0.97, "LLM runs generate_codemap.py"),          # +2%
        Event("run_suggest", 0.96, "LLM runs suggest_skill.py"),             # +2%
        Event("create_log", 0.92, "LLM creates workflow log"),               # +4%
        Event("immediate_commit", 0.01, "LLM commits without scripts"),      # -1%
        Event("skip_log", 0.04, "LLM skips workflow log"),                   # -2%
    ],
}

# File patterns that trigger skills
SKILL_TRIGGERS = {
    ".tsx": "frontend-react.md",
    ".jsx": "frontend-react.md",
    "pages/": "frontend-react.md",
    "components/": "frontend-react.md",
    "backend/": "backend-api.md",
    ".py": "backend-api.md",
    "docker-compose": "docker.md",
    "Dockerfile": "docker.md",
}

# ============================================================================
# Simulation Engine
# ============================================================================

class SessionSimulator:
    """Simulates an AKIS session with probabilistic events."""
    
    def __init__(self, seed: Optional[int] = None, verbose: bool = False):
        if seed is not None:
            random.seed(seed)
        self.verbose = verbose
        self.state = SessionState()
        self.log: List[str] = []
        
    def _log(self, msg: str):
        self.log.append(msg)
        if self.verbose:
            print(f"  {msg}")
    
    def _occurs(self, event: Event) -> bool:
        """Determine if an event occurs based on probability."""
        return random.random() < event.probability
    
    def _add_violation(self, violation: str):
        self.state.violations.append(violation)
        self._log(f"❌ VIOLATION: {violation}")
    
    def simulate_start_phase(self):
        """Simulate the START phase."""
        self._log("=== START PHASE ===")
        
        events = {e.name: e for e in EVENTS["start"]}
        
        # Check for skip or partial start
        if self._occurs(events["skip_start"]):
            self._add_violation("Skipped START phase entirely")
            self.state.phase = Phase.WORK
            return
        
        if self._occurs(events["partial_start"]):
            partial_items = random.randint(1, 2)
            self._log(f"Only completed {partial_items}/3 start items")
        
        # Load knowledge
        if self._occurs(events["load_knowledge"]):
            self.state.knowledge_loaded = True
            self._log("✓ Loaded project_knowledge.json")
        else:
            self._add_violation("Did not load project_knowledge.json")
        
        # Load skills index
        if self._occurs(events["load_skills_index"]):
            self.state.skills_loaded = True
            self._log("✓ Loaded skills INDEX.md")
        else:
            self._add_violation("Did not load skills INDEX.md")
        
        # Create todos
        if self._occurs(events["create_todos"]):
            task_count = random.randint(2, 5)
            self.state.todos.append(Todo("<MAIN>", "User request", TodoStatus.WORKING))
            for i in range(task_count):
                self.state.todos.append(Todo("<WORK>", f"Task {i+1}", TodoStatus.PENDING))
            self.state.todos.append(Todo("<END>", "Commit", TodoStatus.PENDING))
            self._log(f"✓ Created {task_count + 2} todos")
        else:
            self._add_violation("Did not create todo structure")
        
        self.state.phase = Phase.WORK
    
    def simulate_work_phase(self, task_count: int = 3):
        """Simulate the WORK phase with multiple tasks."""
        self._log("=== WORK PHASE ===")
        
        events = {e.name: e for e in EVENTS["work"]}
        
        for i in range(task_count):
            self._log(f"--- Task {i+1} ---")
            
            # Check for quick fix (no todo)
            if self._occurs(events["quick_fix"]):
                file = random.choice(["fix.py", "hotfix.tsx", "config.yml"])
                self.state.files_edited.append(file)
                self._add_violation(f"Quick fix without todo: {file}")
                continue
            
            # Mark as working
            if self._occurs(events["mark_working"]):
                if i < len(self.state.todos) - 1:
                    self.state.todos[i + 1].status = TodoStatus.WORKING
                self._log("✓ Marked todo as working")
            else:
                self._add_violation("Did not mark todo as working before task")
            
            # Simulate file edit
            file_types = [".tsx", ".py", "Dockerfile", ".md", ".json"]
            file = f"file{i}{random.choice(file_types)}"
            self.state.files_edited.append(file)
            
            # Check skill trigger
            skill_needed = None
            for pattern, skill in SKILL_TRIGGERS.items():
                if pattern in file:
                    skill_needed = skill
                    break
            
            if skill_needed:
                if self._occurs(events["check_skill_trigger"]):
                    self._log(f"✓ Checked skill trigger for {file}")
                    if self._occurs(events["load_skill"]):
                        self.state.skills_checked.append(skill_needed)
                        self._log(f"✓ Loaded {skill_needed}")
                    else:
                        self._add_violation(f"Did not load {skill_needed} for {file}")
                else:
                    if self._occurs(events["skip_skill"]):
                        self._add_violation(f"Skipped skill check for {file}")
            
            # Mark complete
            if self._occurs(events["mark_complete"]):
                if i < len(self.state.todos) - 1:
                    self.state.todos[i + 1].status = TodoStatus.DONE
                self._log("✓ Marked todo as complete")
            else:
                if self._occurs(events["forget_mark"]):
                    self._add_violation("Forgot to mark todo as complete")
            
            # Bulk edit scenario
            if self._occurs(events["bulk_edit"]):
                extra_files = random.randint(2, 4)
                for j in range(extra_files):
                    self.state.files_edited.append(f"bulk{j}.py")
                self._log(f"Bulk edited {extra_files} additional files")
                
                if self._occurs(events["syntax_error"]):
                    self._add_violation("Bulk edit created syntax error (duplicate code)")
        
        self.state.phase = Phase.END
    
    def simulate_interrupt(self):
        """Simulate an interrupt during work phase."""
        self._log("=== INTERRUPT ===")
        
        events = {e.name: e for e in EVENTS["interrupt"]}
        
        # Find current working task
        current_task = None
        for todo in self.state.todos:
            if todo.status == TodoStatus.WORKING:
                current_task = todo
                break
        
        # Pause current
        if self._occurs(events["pause_current"]):
            if current_task:
                current_task.status = TodoStatus.PAUSED
                self._log("✓ Paused current task")
            
            # Create SUB todo
            if self._occurs(events["create_sub"]):
                self.state.interrupts_handled += 1
                sub = Todo(f"<SUB:{self.state.interrupts_handled}>", "Interrupt", TodoStatus.WORKING)
                self.state.todos.append(sub)
                self._log(f"✓ Created SUB:{self.state.interrupts_handled}")
                
                # Handle interrupt
                if self._occurs(events["handle_interrupt"]):
                    sub.status = TodoStatus.DONE
                    self._log("✓ Handled interrupt")
                    
                    # Nested interrupt
                    if self._occurs(events["nested_interrupt"]):
                        self._log("Nested interrupt occurred!")
                        self.simulate_interrupt()
                    
                    # Resume original
                    if self._occurs(events["resume_original"]):
                        if current_task:
                            current_task.status = TodoStatus.WORKING
                        self._log("✓ Resumed original task")
                    else:
                        self._add_violation("Orphan paused task - forgot to resume")
                else:
                    self._add_violation("Did not complete interrupt handling")
            else:
                self._add_violation("Did not create SUB todo for interrupt")
        else:
            self._add_violation("Did not pause current task during interrupt")
    
    def simulate_end_phase(self, user_approved: bool = True):
        """Simulate the END phase."""
        self._log("=== END PHASE ===")
        
        events = {e.name: e for e in EVENTS["end"]}
        
        # Check for orphan paused tasks
        if self._occurs(events["check_orphans"]):
            orphans = [t for t in self.state.todos if t.status == TodoStatus.PAUSED]
            if orphans:
                self._log(f"Found {len(orphans)} orphan paused tasks")
                self._add_violation(f"Orphan tasks at END: {len(orphans)}")
            else:
                self._log("✓ No orphan tasks")
        else:
            self._add_violation("Did not check for orphan tasks")
        
        # Show summary
        if self._occurs(events["show_summary"]):
            self._log(f"✓ Showed summary: {len(self.state.files_edited)} files edited")
        
        # Wait for approval
        if self._occurs(events["wait_approval"]):
            self._log("✓ Waited for user approval")
        else:
            self._add_violation("Did not wait for user approval")
        
        if not user_approved:
            self._log("User did not approve - session incomplete")
            return
        
        # Run scripts
        if self._occurs(events["immediate_commit"]):
            self._add_violation("Committed immediately without running scripts")
        else:
            if self._occurs(events["run_codemap"]):
                self.state.scripts_run.append("generate_codemap.py")
                self._log("✓ Ran generate_codemap.py")
            else:
                self._add_violation("Did not run generate_codemap.py")
            
            if self._occurs(events["run_suggest"]):
                self.state.scripts_run.append("suggest_skill.py")
                self._log("✓ Ran suggest_skill.py")
            else:
                self._add_violation("Did not run suggest_skill.py")
        
        # Create workflow log
        if self._occurs(events["create_log"]):
            self.state.workflow_log_created = True
            self._log("✓ Created workflow log")
        else:
            if self._occurs(events["skip_log"]):
                self._add_violation("Skipped workflow log creation")
    
    def run_full_simulation(self, include_interrupt: bool = False) -> Dict:
        """Run a complete session simulation."""
        self.simulate_start_phase()
        
        if self.state.phase == Phase.WORK:
            task_count = random.randint(2, 6)
            
            if include_interrupt:
                # Run some tasks, then interrupt, then more tasks
                mid = task_count // 2
                self.simulate_work_phase(mid)
                self.state.phase = Phase.WORK  # Reset phase for more work
                self.simulate_interrupt()
                self.simulate_work_phase(task_count - mid)
            else:
                self.simulate_work_phase(task_count)
        
        if self.state.phase == Phase.END:
            user_approved = random.random() > 0.1  # 90% approval rate
            self.simulate_end_phase(user_approved)
        
        return self.get_results()
    
    def get_results(self) -> Dict:
        """Get simulation results."""
        return {
            "violations": self.state.violations,
            "violation_count": len(self.state.violations),
            "files_edited": len(self.state.files_edited),
            "todos_created": len(self.state.todos),
            "skills_loaded": len(self.state.skills_checked),
            "scripts_run": len(self.state.scripts_run),
            "workflow_log": self.state.workflow_log_created,
            "knowledge_loaded": self.state.knowledge_loaded,
            "interrupts": self.state.interrupts_handled,
        }

# ============================================================================
# Batch Simulation & Analysis
# ============================================================================

def run_batch_simulation(count: int = 100, verbose: bool = False) -> Dict:
    """Run multiple simulations and aggregate results."""
    
    results = {
        "total_sessions": count,
        "total_violations": 0,
        "violation_types": {},
        "sessions_with_violations": 0,
        "perfect_sessions": 0,
        "interrupt_sessions": 0,
        "avg_violations_per_session": 0,
        "most_common_violations": [],
    }
    
    all_violations = []
    
    for i in range(count):
        include_interrupt = random.random() < 0.3  # 30% have interrupts
        if include_interrupt:
            results["interrupt_sessions"] += 1
        
        sim = SessionSimulator(seed=i, verbose=verbose and i < VERBOSE_SAMPLE_SIZE)
        sim.run_full_simulation(include_interrupt)
        
        session_results = sim.get_results()
        
        if session_results["violation_count"] > 0:
            results["sessions_with_violations"] += 1
            results["total_violations"] += session_results["violation_count"]
            
            for v in session_results["violations"]:
                all_violations.append(v)
                # Categorize violation
                key = v.split(":")[0] if ":" in v else v[:50]
                results["violation_types"][key] = results["violation_types"].get(key, 0) + 1
        else:
            results["perfect_sessions"] += 1
    
    results["avg_violations_per_session"] = results["total_violations"] / count
    
    # Most common violations
    sorted_violations = sorted(results["violation_types"].items(), key=lambda x: -x[1])
    results["most_common_violations"] = sorted_violations[:10]
    
    return results

def print_analysis(results: Dict):
    """Print simulation analysis."""
    
    print("\n" + "=" * 70)
    print("AKIS SESSION SIMULATION ANALYSIS")
    print("=" * 70)
    
    print(f"\n📊 Overview:")
    print(f"   Total sessions simulated: {results['total_sessions']}")
    print(f"   Sessions with interrupts: {results['interrupt_sessions']}")
    print(f"   Perfect sessions (no violations): {results['perfect_sessions']}")
    print(f"   Sessions with violations: {results['sessions_with_violations']}")
    
    pct_perfect = (results['perfect_sessions'] / results['total_sessions']) * 100
    print(f"\n📈 Compliance Rate: {pct_perfect:.1f}%")
    print(f"   Average violations per session: {results['avg_violations_per_session']:.2f}")
    
    print(f"\n🔴 Top Violation Categories:")
    for violation, count in results['most_common_violations']:
        pct = (count / results['total_sessions']) * 100
        print(f"   {count:4d} ({pct:5.1f}%) | {violation[:55]}")
    
    # Identify critical edge cases
    print(f"\n⚠️  Critical Edge Cases Detected:")
    critical = [
        (v, c) for v, c in results['most_common_violations']
        if any(kw in v.lower() for kw in ['skip', 'orphan', 'immediate', 'without'])
    ]
    for violation, count in critical[:5]:
        print(f"   - {violation}")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    if any('knowledge' in v.lower() for v, _ in results['most_common_violations']):
        print("   → Strengthen START phase enforcement")
    if any('orphan' in v.lower() for v, _ in results['most_common_violations']):
        print("   → Add explicit orphan check reminder")
    if any('script' in v.lower() for v, _ in results['most_common_violations']):
        print("   → Make script running more prominent in END phase")
    if any('quick' in v.lower() for v, _ in results['most_common_violations']):
        print("   → Emphasize 'no quick fixes without todo' rule")
    
    print("\n" + "=" * 70)

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='AKIS Session Simulator')
    parser.add_argument('--count', type=int, default=100, help='Number of sessions to simulate')
    parser.add_argument('--verbose', action='store_true', help='Show detailed logs')
    parser.add_argument('--seed', type=int, help='Random seed for reproducibility')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()
    
    if args.seed:
        random.seed(args.seed)
    
    print(f"🎲 Simulating {args.count} AKIS sessions...")
    
    results = run_batch_simulation(args.count, args.verbose)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print_analysis(results)
    
    # Return exit code based on compliance rate
    compliance_rate = (results['perfect_sessions'] / results['total_sessions']) * 100
    return 0 if compliance_rate > COMPLIANCE_THRESHOLD else 1

if __name__ == '__main__':
    exit(main())
