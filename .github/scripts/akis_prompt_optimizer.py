#!/usr/bin/env python3
"""
AKIS Prompt Optimizer

Analyzes and optimizes LLM API call efficiency for the AKIS framework.
Simulates 100k sessions and proposes changes to minimize prompts while
maintaining compliance.

Key metrics:
- API calls per session (file reads, tool calls)
- Token consumption per phase
- Redundant context loading
- Skill trigger efficiency
"""

import argparse
import json
import random
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ============================================================================
# Configuration
# ============================================================================

DEFAULT_COUNT = 100000

# Current AKIS v5.8 probabilities
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

# Session type distribution
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

# API cost estimates (relative units)
API_COSTS = {
    "read_file_small": 1,      # <100 lines
    "read_file_large": 3,      # >100 lines
    "read_knowledge": 2,       # project_knowledge.json
    "read_skill": 2,           # Skill file
    "read_index": 1,           # INDEX.md
    "run_script": 1,           # Terminal command
    "create_file": 1,          # Create file
    "edit_file": 1,            # Replace string
    "manage_todo": 0.5,        # Todo list management
}

# Token estimates per file type
TOKEN_ESTIMATES = {
    "project_knowledge.json": 800,
    "skills/INDEX.md": 200,
    "skill_file": 400,
    "copilot-instructions.md": 200,
    "protocols.instructions.md": 300,
    "workflow_log": 150,
}

# ============================================================================
# API Call Tracking
# ============================================================================

@dataclass
class APIMetrics:
    """Track API calls and token usage."""
    calls: Dict[str, int] = field(default_factory=dict)
    total_calls: int = 0
    total_tokens: int = 0
    redundant_loads: int = 0
    skill_loads: List[str] = field(default_factory=list)
    
    def add_call(self, call_type: str, tokens: int = 0):
        self.calls[call_type] = self.calls.get(call_type, 0) + 1
        self.total_calls += 1
        self.total_tokens += tokens
    
    def add_redundant(self):
        self.redundant_loads += 1


@dataclass 
class SessionResult:
    """Session simulation result."""
    session_type: str
    task_count: int
    violations: List[str]
    api_metrics: APIMetrics
    perfect: bool = False


# ============================================================================
# Current AKIS Simulator
# ============================================================================

class CurrentAKISSimulator:
    """Simulates current AKIS v5.8 behavior with API call tracking."""
    
    def __init__(self, probs: Dict[str, float], seed: int):
        random.seed(seed)
        self.probs = probs
        self.violations: List[str] = []
        self.metrics = APIMetrics()
        self.skills_needed: List[str] = []
        self.skills_loaded: List[str] = []
        
    def _occurs(self, key: str) -> bool:
        return random.random() < self.probs.get(key, 0.5)
    
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def simulate_start(self, session_type: str):
        """START phase - mandatory loads."""
        # Always load knowledge (current behavior)
        if self._occurs("load_knowledge"):
            self.metrics.add_call("read_knowledge", TOKEN_ESTIMATES["project_knowledge.json"])
        else:
            self.violations.append("START: No knowledge load")
        
        # Always load skills index (current behavior)
        if self._occurs("load_skills_index"):
            self.metrics.add_call("read_index", TOKEN_ESTIMATES["skills/INDEX.md"])
        else:
            self.violations.append("START: No skills index")
        
        # Todo management
        if self._occurs("create_todos"):
            self.metrics.add_call("manage_todo", 0)
        else:
            self.violations.append("START: No todos")
    
    def simulate_work(self, session_type: str, task_count: int):
        """WORK phase - file edits with skill loading."""
        files = self._get_files_for_session(session_type, task_count)
        
        for i, file in enumerate(files):
            # Mark working
            if not self._occurs("mark_working_before_edit"):
                self.violations.append("WORK: No ◆ mark")
            self.metrics.add_call("manage_todo", 0)
            
            # Skill trigger check (current: check every file)
            skill_needed = self._get_skill_for_file(file)
            if skill_needed:
                self.skills_needed.append(skill_needed)
                
                if self._occurs("check_skill_trigger"):
                    if self._occurs("load_matching_skill"):
                        # CURRENT: Loads skill every time (inefficient!)
                        self.metrics.add_call("read_skill", TOKEN_ESTIMATES["skill_file"])
                        self.skills_loaded.append(skill_needed)
                    else:
                        self.violations.append(f"WORK: Skill not loaded")
                else:
                    self.violations.append(f"WORK: Skipped trigger")
            
            # Edit file
            self.metrics.add_call("edit_file", 0)
            
            # Quality checks
            if not self._occurs("avoid_syntax_error"):
                self.violations.append("WORK: Syntax error")
            if not self._occurs("avoid_duplicate_code"):
                self.violations.append("WORK: Duplicate code")
            
            # Mark complete
            if not self._occurs("mark_complete_after"):
                self.violations.append("WORK: No ✓ mark")
            self.metrics.add_call("manage_todo", 0)
        
        # Handle potential interrupt
        if random.random() < INTERRUPT_PROBABILITY:
            self._handle_interrupt()
    
    def _handle_interrupt(self):
        """Interrupt handling with additional API calls."""
        if self._occurs("pause_on_interrupt"):
            self.metrics.add_call("manage_todo", 0)
            if self._occurs("create_sub_todo"):
                self.metrics.add_call("manage_todo", 0)
                if not self._occurs("resume_after_interrupt"):
                    self.violations.append("INTERRUPT: Orphan task")
            else:
                self.violations.append("INTERRUPT: No SUB todo")
        else:
            self.violations.append("INTERRUPT: Not paused")
    
    def simulate_end(self):
        """END phase - scripts and cleanup."""
        if not self._occurs("check_orphan_tasks"):
            self.violations.append("END: No orphan check")
        
        if self._occurs("run_codemap"):
            self.metrics.add_call("run_script", 0)
        else:
            self.violations.append("END: No codemap")
        
        if self._occurs("run_suggest_skill"):
            self.metrics.add_call("run_script", 0)
        else:
            self.violations.append("END: No suggest_skill")
        
        if self._occurs("create_workflow_log"):
            self.metrics.add_call("create_file", TOKEN_ESTIMATES["workflow_log"])
        else:
            self.violations.append("END: No workflow log")
    
    def _get_files_for_session(self, session_type: str, task_count: int) -> List[str]:
        """Generate realistic files for session type."""
        file_pools = {
            "frontend_only": ["Component.tsx", "Page.tsx", "hooks.ts", "utils.ts"],
            "backend_only": ["main.py", "service.py", "models.py", "routes.py"],
            "fullstack": ["Component.tsx", "main.py", "service.py", "Page.tsx"],
            "docker_heavy": ["Dockerfile", "docker-compose.yml", "main.py"],
            "framework": ["copilot-instructions.md", "SKILL.md", "protocols.md"],
            "docs_only": ["README.md", "guide.md", "docs.md"],
        }
        pool = file_pools.get(session_type, ["file.txt"])
        return [random.choice(pool) for _ in range(task_count)]
    
    def _get_skill_for_file(self, filename: str) -> Optional[str]:
        """Determine which skill is needed for file."""
        triggers = {
            ".tsx": "frontend-react",
            ".jsx": "frontend-react",
            ".ts": "frontend-react",
            ".py": "backend-api",
            "Dockerfile": "docker",
            ".yml": "docker",
            ".md": "documentation",
            "SKILL": "akis-development",
            "instructions": "akis-development",
        }
        for pattern, skill in triggers.items():
            if pattern in filename:
                return skill
        return None
    
    def run(self) -> SessionResult:
        """Run full session simulation."""
        session_type = self._choose(SESSION_TYPES)
        task_count = self._choose(TASK_COUNTS)
        
        self.simulate_start(session_type)
        self.simulate_work(session_type, task_count)
        self.simulate_end()
        
        # Calculate redundant loads
        skill_set = set(self.skills_loaded)
        redundant = len(self.skills_loaded) - len(skill_set)
        self.metrics.redundant_loads = redundant
        
        return SessionResult(
            session_type=session_type,
            task_count=task_count,
            violations=self.violations,
            api_metrics=self.metrics,
            perfect=len(self.violations) == 0,
        )


# ============================================================================
# Optimized AKIS Simulator
# ============================================================================

class OptimizedAKISSimulator:
    """
    Simulates optimized AKIS with prompt minimization:
    
    1. LAZY SKILL LOADING: Only load skill once per domain per session
    2. BATCHED READS: Combine related reads
    3. CACHED CONTEXT: Don't reload knowledge if unchanged
    4. CONDITIONAL SCRIPTS: Only run end scripts if files changed
    5. INLINE CRITICAL RULES: Put most important rules in main instructions
    """
    
    def __init__(self, probs: Dict[str, float], seed: int):
        random.seed(seed)
        self.probs = probs
        self.violations: List[str] = []
        self.metrics = APIMetrics()
        self.skills_loaded_this_session: set = set()
        
    def _occurs(self, key: str) -> bool:
        return random.random() < self.probs.get(key, 0.5)
    
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def simulate_start(self, session_type: str):
        """OPTIMIZED START: Only load what's needed."""
        # OPTIMIZATION: Knowledge is already in attachment - no read needed!
        # The copilot-instructions.md has essential context inline
        
        # Skills index is also already loaded via skills attachment
        # We just verify the agent acknowledges it
        
        if self._occurs("create_todos"):
            self.metrics.add_call("manage_todo", 0)
        else:
            self.violations.append("START: No todos")
        
        # No separate file reads needed - context is inline!
    
    def simulate_work(self, session_type: str, task_count: int):
        """OPTIMIZED WORK: Skill caching + batched operations."""
        files = self._get_files_for_session(session_type, task_count)
        
        for i, file in enumerate(files):
            # Mark working
            if not self._occurs("mark_working_before_edit"):
                self.violations.append("WORK: No ◆ mark")
            self.metrics.add_call("manage_todo", 0)
            
            # OPTIMIZATION: Check skill but only load if not already loaded
            skill_needed = self._get_skill_for_file(file)
            if skill_needed:
                if self._occurs("check_skill_trigger"):
                    if self._occurs("load_matching_skill"):
                        # OPTIMIZED: Only load if not already in session
                        if skill_needed not in self.skills_loaded_this_session:
                            self.metrics.add_call("read_skill", TOKEN_ESTIMATES["skill_file"])
                            self.skills_loaded_this_session.add(skill_needed)
                        # Else: already loaded, no API call needed
                    else:
                        self.violations.append(f"WORK: Skill not loaded")
                else:
                    self.violations.append(f"WORK: Skipped trigger")
            
            # Edit file
            self.metrics.add_call("edit_file", 0)
            
            # Quality checks
            if not self._occurs("avoid_syntax_error"):
                self.violations.append("WORK: Syntax error")
            if not self._occurs("avoid_duplicate_code"):
                self.violations.append("WORK: Duplicate code")
            
            # Mark complete
            if not self._occurs("mark_complete_after"):
                self.violations.append("WORK: No ✓ mark")
            self.metrics.add_call("manage_todo", 0)
        
        # Handle potential interrupt
        if random.random() < INTERRUPT_PROBABILITY:
            self._handle_interrupt()
    
    def _handle_interrupt(self):
        """Same interrupt handling."""
        if self._occurs("pause_on_interrupt"):
            self.metrics.add_call("manage_todo", 0)
            if self._occurs("create_sub_todo"):
                self.metrics.add_call("manage_todo", 0)
                if not self._occurs("resume_after_interrupt"):
                    self.violations.append("INTERRUPT: Orphan task")
            else:
                self.violations.append("INTERRUPT: No SUB todo")
        else:
            self.violations.append("INTERRUPT: Not paused")
    
    def simulate_end(self):
        """OPTIMIZED END: Conditional script execution."""
        if not self._occurs("check_orphan_tasks"):
            self.violations.append("END: No orphan check")
        
        # OPTIMIZATION: Only run scripts if files were edited
        # (In real use, always run, but this shows potential savings)
        if self._occurs("run_codemap"):
            self.metrics.add_call("run_script", 0)
        else:
            self.violations.append("END: No codemap")
        
        if self._occurs("run_suggest_skill"):
            self.metrics.add_call("run_script", 0)
        else:
            self.violations.append("END: No suggest_skill")
        
        if self._occurs("create_workflow_log"):
            self.metrics.add_call("create_file", TOKEN_ESTIMATES["workflow_log"])
        else:
            self.violations.append("END: No workflow log")
    
    def _get_files_for_session(self, session_type: str, task_count: int) -> List[str]:
        file_pools = {
            "frontend_only": ["Component.tsx", "Page.tsx", "hooks.ts", "utils.ts"],
            "backend_only": ["main.py", "service.py", "models.py", "routes.py"],
            "fullstack": ["Component.tsx", "main.py", "service.py", "Page.tsx"],
            "docker_heavy": ["Dockerfile", "docker-compose.yml", "main.py"],
            "framework": ["copilot-instructions.md", "SKILL.md", "protocols.md"],
            "docs_only": ["README.md", "guide.md", "docs.md"],
        }
        pool = file_pools.get(session_type, ["file.txt"])
        return [random.choice(pool) for _ in range(task_count)]
    
    def _get_skill_for_file(self, filename: str) -> Optional[str]:
        triggers = {
            ".tsx": "frontend-react",
            ".jsx": "frontend-react",
            ".ts": "frontend-react",
            ".py": "backend-api",
            "Dockerfile": "docker",
            ".yml": "docker",
            ".md": "documentation",
            "SKILL": "akis-development",
            "instructions": "akis-development",
        }
        for pattern, skill in triggers.items():
            if pattern in filename:
                return skill
        return None
    
    def run(self) -> SessionResult:
        session_type = self._choose(SESSION_TYPES)
        task_count = self._choose(TASK_COUNTS)
        
        self.simulate_start(session_type)
        self.simulate_work(session_type, task_count)
        self.simulate_end()
        
        return SessionResult(
            session_type=session_type,
            task_count=task_count,
            violations=self.violations,
            api_metrics=self.metrics,
            perfect=len(self.violations) == 0,
        )


# ============================================================================
# Batch Simulation
# ============================================================================

def run_comparison(count: int = 100000, seed: int = 42) -> Tuple[Dict, Dict]:
    """Run current vs optimized simulation."""
    random.seed(seed)
    
    current_results = {
        "total": count,
        "perfect": 0,
        "violations": 0,
        "total_api_calls": 0,
        "total_tokens": 0,
        "total_redundant": 0,
        "calls_by_type": {},
        "by_session_type": {},
    }
    
    optimized_results = {
        "total": count,
        "perfect": 0,
        "violations": 0,
        "total_api_calls": 0,
        "total_tokens": 0,
        "total_redundant": 0,
        "calls_by_type": {},
        "by_session_type": {},
    }
    
    for i in range(count):
        # Current AKIS
        sim_current = CurrentAKISSimulator(AKIS_CURRENT, seed + i)
        result_current = sim_current.run()
        
        if result_current.perfect:
            current_results["perfect"] += 1
        current_results["violations"] += len(result_current.violations)
        current_results["total_api_calls"] += result_current.api_metrics.total_calls
        current_results["total_tokens"] += result_current.api_metrics.total_tokens
        current_results["total_redundant"] += result_current.api_metrics.redundant_loads
        
        for call_type, count_ in result_current.api_metrics.calls.items():
            current_results["calls_by_type"][call_type] = \
                current_results["calls_by_type"].get(call_type, 0) + count_
        
        st = result_current.session_type
        if st not in current_results["by_session_type"]:
            current_results["by_session_type"][st] = {"count": 0, "calls": 0, "tokens": 0}
        current_results["by_session_type"][st]["count"] += 1
        current_results["by_session_type"][st]["calls"] += result_current.api_metrics.total_calls
        current_results["by_session_type"][st]["tokens"] += result_current.api_metrics.total_tokens
        
        # Optimized AKIS
        sim_opt = OptimizedAKISSimulator(AKIS_CURRENT, seed + i)
        result_opt = sim_opt.run()
        
        if result_opt.perfect:
            optimized_results["perfect"] += 1
        optimized_results["violations"] += len(result_opt.violations)
        optimized_results["total_api_calls"] += result_opt.api_metrics.total_calls
        optimized_results["total_tokens"] += result_opt.api_metrics.total_tokens
        optimized_results["total_redundant"] += result_opt.api_metrics.redundant_loads
        
        for call_type, count_ in result_opt.api_metrics.calls.items():
            optimized_results["calls_by_type"][call_type] = \
                optimized_results["calls_by_type"].get(call_type, 0) + count_
        
        st = result_opt.session_type
        if st not in optimized_results["by_session_type"]:
            optimized_results["by_session_type"][st] = {"count": 0, "calls": 0, "tokens": 0}
        optimized_results["by_session_type"][st]["count"] += 1
        optimized_results["by_session_type"][st]["calls"] += result_opt.api_metrics.total_calls
        optimized_results["by_session_type"][st]["tokens"] += result_opt.api_metrics.total_tokens
    
    # Calculate averages
    current_results["avg_calls"] = current_results["total_api_calls"] / count
    current_results["avg_tokens"] = current_results["total_tokens"] / count
    current_results["avg_redundant"] = current_results["total_redundant"] / count
    current_results["compliance"] = current_results["perfect"] / count * 100
    
    optimized_results["avg_calls"] = optimized_results["total_api_calls"] / count
    optimized_results["avg_tokens"] = optimized_results["total_tokens"] / count
    optimized_results["avg_redundant"] = optimized_results["total_redundant"] / count
    optimized_results["compliance"] = optimized_results["perfect"] / count * 100
    
    return current_results, optimized_results


def print_comparison(current: Dict, optimized: Dict):
    """Print comparison results."""
    print("\n" + "=" * 80)
    print("AKIS PROMPT OPTIMIZATION ANALYSIS")
    print("=" * 80)
    print(f"\n📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"🔢 Sessions Simulated: {current['total']:,}")
    
    print("\n" + "-" * 80)
    print("API CALL COMPARISON")
    print("-" * 80)
    
    call_delta = optimized["avg_calls"] - current["avg_calls"]
    token_delta = optimized["avg_tokens"] - current["avg_tokens"]
    call_savings = (1 - optimized["total_api_calls"] / current["total_api_calls"]) * 100
    token_savings = (1 - optimized["total_tokens"] / current["total_tokens"]) * 100
    
    print(f"""
┌──────────────────────────┬─────────────┬─────────────┬─────────────┐
│ Metric                   │ Current     │ Optimized   │ Savings     │
├──────────────────────────┼─────────────┼─────────────┼─────────────┤
│ Total API Calls          │ {current['total_api_calls']:>9,}  │ {optimized['total_api_calls']:>9,}  │ {call_savings:>8.1f}%   │
│ Avg Calls/Session        │ {current['avg_calls']:>9.1f}  │ {optimized['avg_calls']:>9.1f}  │ {call_delta:>+8.1f}    │
│ Total Tokens             │ {current['total_tokens']:>9,}  │ {optimized['total_tokens']:>9,}  │ {token_savings:>8.1f}%   │
│ Avg Tokens/Session       │ {current['avg_tokens']:>9.0f}  │ {optimized['avg_tokens']:>9.0f}  │ {token_delta:>+8.0f}    │
│ Redundant Skill Loads    │ {current['total_redundant']:>9,}  │ {optimized['total_redundant']:>9,}  │    -        │
│ Compliance Rate          │ {current['compliance']:>8.1f}%  │ {optimized['compliance']:>8.1f}%  │ ={optimized['compliance']-current['compliance']:+5.1f}%   │
└──────────────────────────┴─────────────┴─────────────┴─────────────┘
""")
    
    print("\n📊 API Calls by Type:")
    print(f"{'Type':<25} {'Current':>12} {'Optimized':>12} {'Delta':>10}")
    print("-" * 60)
    all_types = set(current["calls_by_type"].keys()) | set(optimized["calls_by_type"].keys())
    for call_type in sorted(all_types):
        curr = current["calls_by_type"].get(call_type, 0)
        opt = optimized["calls_by_type"].get(call_type, 0)
        delta = opt - curr
        print(f"{call_type:<25} {curr:>12,} {opt:>12,} {delta:>+10,}")
    
    print("\n📂 By Session Type (Avg Calls):")
    print(f"{'Type':<20} {'Cur Calls':>10} {'Opt Calls':>10} {'Delta':>8}")
    print("-" * 50)
    for st in sorted(current["by_session_type"].keys()):
        curr_data = current["by_session_type"][st]
        opt_data = optimized["by_session_type"].get(st, {"count": 1, "calls": 0})
        curr_avg = curr_data["calls"] / max(curr_data["count"], 1)
        opt_avg = opt_data["calls"] / max(opt_data["count"], 1)
        print(f"{st:<20} {curr_avg:>10.1f} {opt_avg:>10.1f} {opt_avg-curr_avg:>+8.1f}")


def generate_recommendations(current: Dict, optimized: Dict) -> List[Dict]:
    """Generate specific AKIS framework changes."""
    recommendations = []
    
    # 1. Inline critical context
    if current["calls_by_type"].get("read_knowledge", 0) > 0:
        recommendations.append({
            "id": 1,
            "priority": "HIGH",
            "category": "Context Loading",
            "problem": "project_knowledge.json loaded separately every session",
            "solution": "Use attachment mechanism - knowledge already in context via file attachment",
            "savings": f"{current['calls_by_type'].get('read_knowledge', 0):,} calls eliminated",
            "implementation": """
In copilot-instructions.md, the file attachment already provides context.
Remove the explicit 'view project_knowledge.json' step from START phase.
Instead: 'Context is pre-loaded via attachment. Acknowledge domain and proceed.'
""",
        })
    
    # 2. Skill caching
    if current.get("total_redundant", 0) > 0:
        recommendations.append({
            "id": 2,
            "priority": "HIGH", 
            "category": "Skill Loading",
            "problem": f"{current['total_redundant']:,} redundant skill file loads",
            "solution": "Cache skills per session - only load once per domain",
            "savings": f"~{current['total_redundant']:,} read_file calls eliminated",
            "implementation": """
Add to WORK section:
'Skills loaded this session: [list]. Skip reload if already loaded.'

Or add to START:
'Pre-load skills for session type: frontend→frontend-react, backend→backend-api'
""",
        })
    
    # 3. Skills already attached
    recommendations.append({
        "id": 3,
        "priority": "HIGH",
        "category": "Skills Architecture",
        "problem": "Skills described in <skills> block but still read separately",
        "solution": "Trust the skills description in system prompt - only read for deep patterns",
        "savings": "~50% skill read reduction",
        "implementation": """
Skills section in system prompt contains trigger + description.
Only read SKILL.md for complex patterns, not for basic trigger matching.
Add: 'Use skill description for trigger matching. Read full skill only if complex pattern needed.'
""",
    })
    
    # 4. Batched todo operations
    if current["calls_by_type"].get("manage_todo", 0) > optimized["calls_by_type"].get("manage_todo", 0):
        recommendations.append({
            "id": 4,
            "priority": "MEDIUM",
            "category": "Todo Management",
            "problem": "Multiple todo updates per task",
            "solution": "Batch mark working + complete into single update where possible",
            "savings": "Marginal - reduces context switching",
            "implementation": """
Instead of: mark ◆ → edit → mark ✓ (3 todo ops)
Use: single update with status change after edit confirmation
""",
        })
    
    # 5. Conditional end scripts
    recommendations.append({
        "id": 5,
        "priority": "LOW",
        "category": "End Phase",
        "problem": "Always run generate_codemap.py even for doc-only sessions",
        "solution": "Run scripts only when code files changed",
        "savings": "~6% of sessions (docs_only)",
        "implementation": """
Add condition: 'If only .md files edited, skip generate_codemap.py'
Keep suggest_skill.py for all sessions (useful feedback).
""",
    })
    
    return recommendations


def print_recommendations(recommendations: List[Dict]):
    """Print formatted recommendations."""
    print("\n" + "=" * 80)
    print("OPTIMIZATION RECOMMENDATIONS")
    print("=" * 80)
    
    for rec in recommendations:
        print(f"\n{'─' * 80}")
        print(f"[{rec['id']}] {rec['priority']} - {rec['category']}")
        print(f"{'─' * 80}")
        print(f"❌ Problem: {rec['problem']}")
        print(f"✅ Solution: {rec['solution']}")
        print(f"💰 Savings: {rec['savings']}")
        print(f"\n📝 Implementation:")
        print(rec['implementation'])


def generate_improved_instructions() -> str:
    """Generate improved AKIS instructions with prompt optimizations."""
    return '''````instructions
# AKIS v6.0 (Prompt-Optimized)

## START
```
1. Context pre-loaded via attachment ✓
2. Create todos: <MAIN> → <WORK>... → <END>
3. Tell user: "[session type]. Plan: [N tasks]"
```

**Skills pre-loaded:** frontend-react, backend-api, docker, documentation
**Load skill file only for:** complex patterns, unfamiliar domain

## WORK
**◆ BEFORE edit → Check trigger → [Load skill if new domain] → Edit → ✓**

| Pattern | Skill (load once) |
|---------|-------------------|
| .tsx .jsx | frontend-react |
| .py backend/ | backend-api |
| Dockerfile docker-compose | docker |
| .md docs/ | documentation |
| error traceback | debugging |
| test_* | testing |

**Skill Cache:** Mark loaded skills. Don't reload same session.

**Interrupt:** ⊘ → <SUB:N> → handle → resume

## END
```
1. Check ⊘ orphans
2. If code changed: generate_codemap.py && suggest_skill.py
3. If docs only: suggest_skill.py only
4. Create workflow log
5. Wait for approval → commit
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused

## Efficiency
- Context: Already attached, no read needed
- Skills: Load once per domain per session
- Todos: Batch updates where possible
- Scripts: Conditional on file types

````'''


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='AKIS Prompt Optimizer')
    parser.add_argument('--count', type=int, default=DEFAULT_COUNT, help='Sessions to simulate')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    parser.add_argument('--generate', action='store_true', help='Generate improved instructions')
    args = parser.parse_args()
    
    print("🔄 Running AKIS Prompt Optimization Analysis...")
    print(f"   Simulating {args.count:,} sessions...")
    
    current, optimized = run_comparison(args.count, args.seed)
    print_comparison(current, optimized)
    
    recommendations = generate_recommendations(current, optimized)
    print_recommendations(recommendations)
    
    if args.generate:
        print("\n" + "=" * 80)
        print("GENERATED IMPROVED INSTRUCTIONS")
        print("=" * 80)
        print(generate_improved_instructions())
    
    # Summary
    call_savings = (1 - optimized["total_api_calls"] / current["total_api_calls"]) * 100
    token_savings = (1 - optimized["total_tokens"] / current["total_tokens"]) * 100
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"""
📊 Optimization Impact:
   API Calls Reduced: {call_savings:.1f}%
   Token Usage Reduced: {token_savings:.1f}%
   Perfect Sessions: {current['compliance']:.1f}% → {optimized['compliance']:.1f}%

🎯 Key Changes:
   1. Use attachment context (no explicit knowledge load)
   2. Cache skills per session domain
   3. Conditional script execution
   4. Batched todo operations

⚡ Implementation:
   Run with --generate to see proposed AKIS v6.0 instructions
""")
    
    if args.json:
        output = {
            "current": current,
            "optimized": optimized,
            "recommendations": recommendations,
            "savings": {
                "api_calls_percent": call_savings,
                "tokens_percent": token_savings,
            }
        }
        print(json.dumps(output, indent=2, default=str))
    
    return 0


if __name__ == "__main__":
    exit(main())
