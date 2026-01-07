#!/usr/bin/env python3
"""
AKIS Enhanced Session Simulator v2

Based on real workflow log analysis from 90 sessions:
- 88% frontend work
- 87% bugfix sessions  
- 86% framework changes
- 64% backend + fullstack
- 14% interrupt handling
- 10% syntax errors
- 50% Docker work

Simulates 10k sessions with realistic edge cases.
"""

import random
import json
import argparse
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

# ============================================================================
# Configuration from Workflow Log Analysis
# ============================================================================

# Real-world session type distribution (from 90 logs)
SESSION_TYPES = {
    "frontend_only": 0.24,      # 88% frontend, but some are mixed
    "backend_only": 0.10,       # Pure backend
    "fullstack": 0.40,          # 64% mixed
    "docker_heavy": 0.10,       # 50% involve docker
    "framework": 0.10,          # 86% but usually mixed
    "docs_only": 0.06,          # Pure documentation
}

# Task complexity distribution
TASK_COUNTS = {
    1: 0.05,   # Simple single task
    2: 0.15,   # Small session
    3: 0.30,   # Typical session
    4: 0.25,   # Medium complexity
    5: 0.15,   # Complex session
    6: 0.07,   # Large refactor
    7: 0.03,   # Epic session
}

# From log analysis: 14% of sessions have interrupts
INTERRUPT_PROBABILITY = 0.14

# Syntax error rate from logs: 10%
SYNTAX_ERROR_RATE = 0.10

# ============================================================================
# Session State
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
class SessionState:
    session_type: str = "fullstack"
    phase: Phase = Phase.START
    knowledge_loaded: bool = False
    skills_index_loaded: bool = False
    todos_created: bool = False
    todos: List[Dict] = field(default_factory=list)
    files_edited: List[str] = field(default_factory=list)
    skills_loaded: List[str] = field(default_factory=list)
    interrupts: int = 0
    paused_tasks: int = 0
    scripts_run: List[str] = field(default_factory=list)
    workflow_log_created: bool = False
    violations: List[str] = field(default_factory=list)

# ============================================================================
# AKIS v5 Compliance Probabilities (Current)
# ============================================================================

# These represent how likely the agent is to follow each rule
# Based on current instruction effectiveness
AKIS_V5_PROBS = {
    # START phase
    "load_knowledge": 0.92,           # View project_knowledge.json
    "load_skills_index": 0.88,        # View skills/INDEX.md
    "create_todos": 0.90,             # Create todo structure
    "show_context_to_user": 0.95,     # Show brief context + todos
    
    # WORK phase
    "mark_working_before_edit": 0.85, # Mark ◆ BEFORE editing
    "check_skill_trigger": 0.80,      # Check if file matches trigger
    "load_matching_skill": 0.75,      # Actually load the skill
    "mark_complete_after": 0.88,      # Mark ✓ after task
    "avoid_quick_fix": 0.90,          # Don't do "quick fix" without todo
    
    # Interrupt handling
    "pause_on_interrupt": 0.82,       # Mark ⊘ when interrupted
    "create_sub_todo": 0.78,          # Create <SUB:N>
    "resume_after_interrupt": 0.75,   # Resume original task
    
    # END phase
    "check_orphan_tasks": 0.80,       # Check for orphan ⊘
    "run_codemap": 0.85,              # Run generate_codemap.py
    "run_suggest_skill": 0.82,        # Run suggest_skill.py
    "create_workflow_log": 0.70,      # Create log file
    "wait_for_approval": 0.95,        # Don't commit before approval
    
    # Code quality
    "avoid_syntax_error": 0.90,       # No syntax errors in edits
    "avoid_duplicate_code": 0.92,     # No duplicate code blocks
}

# Skill trigger patterns
SKILL_TRIGGERS = {
    ".tsx": "frontend-react.md",
    ".jsx": "frontend-react.md",
    ".py": "backend-api.md",
    "Dockerfile": "docker.md",
    "docker-compose": "docker.md",
}

# ============================================================================
# Simulation Engine
# ============================================================================

class EnhancedSessionSimulator:
    def __init__(self, probs: Dict[str, float], seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)
        self.probs = probs
        self.state = SessionState()
        
    def _occurs(self, key: str) -> bool:
        return random.random() < self.probs.get(key, 0.5)
    
    def _violation(self, msg: str):
        self.state.violations.append(msg)
    
    def _choose_session_type(self) -> str:
        r = random.random()
        cumulative = 0
        for session_type, prob in SESSION_TYPES.items():
            cumulative += prob
            if r < cumulative:
                return session_type
        return "fullstack"
    
    def _choose_task_count(self) -> int:
        r = random.random()
        cumulative = 0
        for count, prob in TASK_COUNTS.items():
            cumulative += prob
            if r < cumulative:
                return count
        return 3
    
    def _get_file_for_session(self) -> str:
        """Generate realistic file based on session type."""
        session_type = self.state.session_type
        
        if session_type == "frontend_only":
            files = ["Component.tsx", "Page.tsx", "hooks.ts", "utils.ts"]
        elif session_type == "backend_only":
            files = ["main.py", "service.py", "models.py", "api.py"]
        elif session_type == "fullstack":
            files = ["Component.tsx", "main.py", "api.py", "Page.tsx"]
        elif session_type == "docker_heavy":
            files = ["Dockerfile", "docker-compose.yml", "main.py", ".env"]
        elif session_type == "framework":
            files = ["copilot-instructions.md", "protocols.md", "skills.md"]
        else:  # docs_only
            files = ["README.md", "GUIDE.md", "docs.md"]
        
        return random.choice(files)
    
    def simulate_start_phase(self):
        """Simulate START phase compliance."""
        # Load knowledge
        if self._occurs("load_knowledge"):
            self.state.knowledge_loaded = True
        else:
            self._violation("START: Did not load project_knowledge.json")
        
        # Load skills index
        if self._occurs("load_skills_index"):
            self.state.skills_index_loaded = True
        else:
            self._violation("START: Did not load skills/INDEX.md")
        
        # Create todos
        if self._occurs("create_todos"):
            self.state.todos_created = True
            task_count = self._choose_task_count()
            self.state.todos = [
                {"id": 0, "type": "MAIN", "status": "working"},
                *[{"id": i+1, "type": "WORK", "status": "pending"} for i in range(task_count)],
                {"id": task_count+1, "type": "END", "status": "pending"},
            ]
        else:
            self._violation("START: Did not create todo structure")
        
        # Show context
        if not self._occurs("show_context_to_user"):
            self._violation("START: Did not show context + todos to user")
        
        self.state.phase = Phase.WORK
    
    def simulate_work_phase(self):
        """Simulate WORK phase with realistic file edits."""
        work_todos = [t for t in self.state.todos if t["type"] == "WORK"]
        
        for i, todo in enumerate(work_todos):
            # Handle potential interrupt (14% chance per session, once)
            if self.state.interrupts == 0 and random.random() < INTERRUPT_PROBABILITY:
                self._handle_interrupt(todo)
            
            # Check for "quick fix" violation
            if not self._occurs("avoid_quick_fix"):
                self._violation("WORK: Did 'quick fix' without todo")
                continue
            
            # Mark as working BEFORE edit
            if self._occurs("mark_working_before_edit"):
                todo["status"] = "working"
            else:
                self._violation("WORK: Started edit without marking ◆ first")
            
            # Get file to edit
            file = self._get_file_for_session()
            self.state.files_edited.append(file)
            
            # Check skill trigger
            skill_needed = None
            for pattern, skill in SKILL_TRIGGERS.items():
                if pattern in file:
                    skill_needed = skill
                    break
            
            if skill_needed:
                if self._occurs("check_skill_trigger"):
                    if self._occurs("load_matching_skill"):
                        self.state.skills_loaded.append(skill_needed)
                    else:
                        self._violation(f"WORK: Did not load {skill_needed} for {file}")
                else:
                    self._violation(f"WORK: Did not check skill trigger for {file}")
            
            # Simulate potential code errors (10% from logs)
            if not self._occurs("avoid_syntax_error"):
                self._violation("WORK: Syntax error in edit")
            
            if not self._occurs("avoid_duplicate_code"):
                self._violation("WORK: Duplicate code block created")
            
            # Mark complete
            if self._occurs("mark_complete_after"):
                todo["status"] = "done"
            else:
                self._violation("WORK: Did not mark ✓ immediately after task")
        
        self.state.phase = Phase.END
    
    def _handle_interrupt(self, current_todo: Dict):
        """Simulate interrupt handling."""
        self.state.interrupts += 1
        
        # Pause current task
        if self._occurs("pause_on_interrupt"):
            current_todo["status"] = "paused"
            self.state.paused_tasks += 1
            
            # Create SUB todo
            if self._occurs("create_sub_todo"):
                self.state.todos.append({
                    "id": len(self.state.todos),
                    "type": f"SUB:{self.state.interrupts}",
                    "status": "working"
                })
                
                # Handle interrupt task
                # ... (simplified)
                
                # Resume original
                if self._occurs("resume_after_interrupt"):
                    current_todo["status"] = "working"
                    self.state.paused_tasks -= 1
                else:
                    self._violation("INTERRUPT: Left orphan ⊘ task")
            else:
                self._violation("INTERRUPT: Did not create <SUB:N> todo")
        else:
            self._violation("INTERRUPT: Did not pause current task")
    
    def simulate_end_phase(self):
        """Simulate END phase compliance."""
        # Check for orphan tasks
        if self._occurs("check_orphan_tasks"):
            if self.state.paused_tasks > 0:
                self._violation(f"END: {self.state.paused_tasks} orphan ⊘ tasks remaining")
        else:
            self._violation("END: Did not check for orphan tasks")
        
        # Wait for approval
        if not self._occurs("wait_for_approval"):
            self._violation("END: Committed without waiting for approval")
        
        # Run scripts
        if self._occurs("run_codemap"):
            self.state.scripts_run.append("generate_codemap.py")
        else:
            self._violation("END: Did not run generate_codemap.py")
        
        if self._occurs("run_suggest_skill"):
            self.state.scripts_run.append("suggest_skill.py")
        else:
            self._violation("END: Did not run suggest_skill.py")
        
        # Create workflow log
        if self._occurs("create_workflow_log"):
            self.state.workflow_log_created = True
        else:
            self._violation("END: Did not create workflow log")
    
    def run(self) -> Dict:
        """Run full session simulation."""
        self.state.session_type = self._choose_session_type()
        
        self.simulate_start_phase()
        self.simulate_work_phase()
        self.simulate_end_phase()
        
        return {
            "session_type": self.state.session_type,
            "violations": self.state.violations,
            "violation_count": len(self.state.violations),
            "files_edited": len(self.state.files_edited),
            "skills_loaded": len(self.state.skills_loaded),
            "scripts_run": len(self.state.scripts_run),
            "workflow_log": self.state.workflow_log_created,
            "interrupts": self.state.interrupts,
        }

# ============================================================================
# Batch Simulation
# ============================================================================

def run_batch(probs: Dict[str, float], count: int = 10000) -> Dict:
    """Run batch simulation and aggregate results."""
    results = {
        "total": count,
        "perfect": 0,
        "with_violations": 0,
        "total_violations": 0,
        "violation_types": {},
        "by_session_type": {},
        "avg_violations": 0,
    }
    
    for i in range(count):
        sim = EnhancedSessionSimulator(probs, seed=i)
        session = sim.run()
        
        if session["violation_count"] == 0:
            results["perfect"] += 1
        else:
            results["with_violations"] += 1
            results["total_violations"] += session["violation_count"]
            
            for v in session["violations"]:
                # Categorize violation
                category = v.split(":")[0]
                key = v.split(":")[1].strip()[:40] if ":" in v else v[:40]
                full_key = f"{category}: {key}"
                results["violation_types"][full_key] = results["violation_types"].get(full_key, 0) + 1
        
        # Track by session type
        st = session["session_type"]
        if st not in results["by_session_type"]:
            results["by_session_type"][st] = {"count": 0, "violations": 0}
        results["by_session_type"][st]["count"] += 1
        results["by_session_type"][st]["violations"] += session["violation_count"]
    
    results["avg_violations"] = results["total_violations"] / count
    results["compliance_rate"] = results["perfect"] / count * 100
    
    return results

def print_results(results: Dict, label: str = ""):
    """Print simulation results."""
    print(f"\n{'=' * 70}")
    print(f"AKIS SIMULATION RESULTS {label}")
    print(f"{'=' * 70}")
    
    print(f"\n📊 Overview ({results['total']:,} sessions):")
    print(f"   Perfect sessions: {results['perfect']:,} ({results['compliance_rate']:.1f}%)")
    print(f"   With violations: {results['with_violations']:,}")
    print(f"   Avg violations/session: {results['avg_violations']:.2f}")
    
    print(f"\n📂 By Session Type:")
    for st, data in sorted(results["by_session_type"].items(), key=lambda x: -x[1]["count"]):
        avg = data["violations"] / data["count"] if data["count"] > 0 else 0
        print(f"   {st:15} {data['count']:5,} sessions | {avg:.2f} avg violations")
    
    print(f"\n🔴 Top Violations:")
    sorted_violations = sorted(results["violation_types"].items(), key=lambda x: -x[1])
    for v, count in sorted_violations[:15]:
        pct = count / results["total"] * 100
        print(f"   {count:5,} ({pct:5.1f}%) | {v}")
    
    return results

# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='AKIS Enhanced Session Simulator')
    parser.add_argument('--count', type=int, default=10000, help='Sessions to simulate')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    args = parser.parse_args()
    
    random.seed(args.seed)
    
    print(f"🎲 Running {args.count:,} session simulation with AKIS v5 probabilities...")
    
    # Baseline run
    baseline = run_batch(AKIS_V5_PROBS, args.count)
    
    if args.json:
        print(json.dumps(baseline, indent=2))
    else:
        print_results(baseline, "(BASELINE - AKIS v5)")
    
    return 0 if baseline["compliance_rate"] >= 50 else 1

if __name__ == "__main__":
    exit(main())
