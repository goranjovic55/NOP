#!/usr/bin/env python3
"""
AKIS Instruction Suggestion Script v1.0

Analyzes workflow logs to suggest new instructions or instruction updates.
Similar to suggest_skill.py but focused on protocol compliance and instruction gaps.

Key Features:
1. Reads all workflow logs and extracts session patterns
2. Simulates 100k sessions with realistic deviations
3. Tests existing instructions against discovered patterns
4. Measures effectiveness improvement from instruction additions/updates
5. Generates recommendations for instruction changes

Usage:
    python .github/scripts/suggest_instructions.py --sessions 100000 [--output FILE]
"""

import json
import random
import re
import argparse
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Set, Optional, Tuple
from pathlib import Path
from datetime import datetime

# ============================================================================
# Configuration from Workflow Log Analysis
# ============================================================================

# Real-world session type distribution (from 90+ logs)
SESSION_TYPES = {
    "frontend_only": 0.24,
    "backend_only": 0.10,
    "fullstack": 0.40,
    "docker_heavy": 0.10,
    "framework": 0.10,
    "docs_only": 0.06,
}

# Task complexity distribution
TASK_COUNTS = {
    1: 0.05, 2: 0.15, 3: 0.30, 4: 0.25, 5: 0.15, 6: 0.07, 7: 0.03,
}

# From log analysis: 14% of sessions have interrupts
INTERRUPT_PROBABILITY = 0.14

# Configuration constants for simulation and analysis
MAX_EFFECTIVENESS_REDUCTION = 0.8  # Maximum 80% reduction in deviation with perfect instructions
COVERAGE_THRESHOLD = 0.4  # Minimum keyword match ratio (40%) to consider pattern covered
TASK_COMPLETED_REGEX = r'(\d+)\s*completed\s*/\s*\d+\s*total'  # Pattern for extracting task count

# Syntax error rate from logs: 10%
SYNTAX_ERROR_RATE = 0.10


# ============================================================================
# Instruction Patterns
# ============================================================================

@dataclass
class InstructionPattern:
    """Represents a pattern that should be covered by instructions."""
    name: str
    description: str
    category: str  # start, work, end, interrupt, error
    triggers: List[str]
    expected_behavior: str
    failure_mode: str
    keywords: List[str]
    severity: str = "medium"  # low, medium, high, critical
    frequency: int = 0
    is_covered: bool = False
    covered_by: str = ""


# Known instruction patterns - what we expect to find in instruction files
KNOWN_INSTRUCTION_PATTERNS = [
    # START phase
    InstructionPattern(
        name="knowledge_loading",
        description="Load project_knowledge.json at session start",
        category="start",
        triggers=["session_start", "first_message"],
        expected_behavior="View project_knowledge.json lines 1-50",
        failure_mode="Jumps to coding without loading context",
        keywords=["project_knowledge.json", "lines 1-50", "context", "pre-loaded"],
        severity="high",
    ),
    InstructionPattern(
        name="skills_index_loading",
        description="Load skills INDEX.md at session start",
        category="start",
        triggers=["session_start"],
        expected_behavior="View .github/skills/INDEX.md",
        failure_mode="Doesn't check available skills",
        keywords=["INDEX.md", "skills", "available"],
        severity="medium",
    ),
    InstructionPattern(
        name="todo_creation",
        description="Create todo structure before work",
        category="start",
        triggers=["after_understanding_task"],
        expected_behavior="Create <MAIN> → <WORK>... → <END> todos",
        failure_mode="Starts working without tracking structure",
        keywords=["<MAIN>", "<WORK>", "<END>", "todo", "create"],
        severity="critical",
    ),
    InstructionPattern(
        name="session_type_announcement",
        description="Tell user session type and plan",
        category="start",
        triggers=["after_todo_creation"],
        expected_behavior="Show session type + N tasks",
        failure_mode="User doesn't know the plan",
        keywords=["session type", "plan", "tasks"],
        severity="low",
    ),
    
    # WORK phase
    InstructionPattern(
        name="mark_working_before",
        description="Mark todo as working BEFORE any edit",
        category="work",
        triggers=["before_edit", "starting_task"],
        expected_behavior="Mark ◆ BEFORE editing files",
        failure_mode="Status tracking becomes inaccurate",
        keywords=["◆", "BEFORE", "mark", "working"],
        severity="critical",
    ),
    InstructionPattern(
        name="skill_trigger_check",
        description="Check if file matches skill trigger",
        category="work",
        triggers=["before_edit", "file_type"],
        expected_behavior="Check skill triggers for file extension/path",
        failure_mode="Misses domain-specific guidance",
        keywords=["trigger", "skill", "check", "pattern"],
        severity="high",
    ),
    InstructionPattern(
        name="skill_loading",
        description="Load matching skill for file type",
        category="work",
        triggers=["skill_match"],
        expected_behavior="Load skill file if not already loaded this session",
        failure_mode="Works without domain expertise",
        keywords=["load", "skill", "ONCE", "cache"],
        severity="high",
    ),
    InstructionPattern(
        name="mark_complete_after",
        description="Mark todo complete after task",
        category="work",
        triggers=["after_task", "task_complete"],
        expected_behavior="Mark ✓ immediately after completing task",
        failure_mode="Todo status becomes stale",
        keywords=["✓", "complete", "after", "immediately"],
        severity="high",
    ),
    InstructionPattern(
        name="no_quick_fix",
        description="Never do quick fix without todo",
        category="work",
        triggers=["small_change", "quick_request"],
        expected_behavior="Create todo even for small changes",
        failure_mode="Work done without tracking",
        keywords=["quick fix", "todo first", "no edit without"],
        severity="medium",
    ),
    InstructionPattern(
        name="skill_cache",
        description="Don't reload same skill in session",
        category="work",
        triggers=["skill_needed"],
        expected_behavior="Track loaded skills, don't reload",
        failure_mode="Wastes context on duplicate skill loads",
        keywords=["cache", "reload", "ONCE", "session"],
        severity="medium",
    ),
    
    # INTERRUPT handling
    InstructionPattern(
        name="interrupt_pause",
        description="Pause current task on interrupt",
        category="interrupt",
        triggers=["user_interrupt", "new_request"],
        expected_behavior="Mark current ⊘ (paused) before handling interrupt",
        failure_mode="Loses context of current work",
        keywords=["⊘", "pause", "interrupt", "current"],
        severity="high",
    ),
    InstructionPattern(
        name="sub_todo_creation",
        description="Create SUB todo for interrupt",
        category="interrupt",
        triggers=["interrupt_handling"],
        expected_behavior="Create <SUB:N> for nested work",
        failure_mode="Interrupt work is untracked",
        keywords=["<SUB", "interrupt", "nested"],
        severity="medium",
    ),
    InstructionPattern(
        name="resume_after_interrupt",
        description="Resume paused task after interrupt",
        category="interrupt",
        triggers=["interrupt_complete"],
        expected_behavior="Resume original task, no orphan ⊘",
        failure_mode="Original task forgotten",
        keywords=["resume", "orphan", "⊘", "paused"],
        severity="high",
    ),
    
    # END phase
    InstructionPattern(
        name="orphan_check",
        description="Check for orphan paused tasks",
        category="end",
        triggers=["end_phase", "before_scripts"],
        expected_behavior="Check for ⊘ orphan tasks, close all",
        failure_mode="Paused tasks left incomplete",
        keywords=["orphan", "⊘", "check", "close"],
        severity="high",
    ),
    InstructionPattern(
        name="run_scripts_code",
        description="Run scripts for code changes",
        category="end",
        triggers=["end_phase", "code_files_modified"],
        expected_behavior="Run generate_knowledge.py && suggest_skill.py",
        failure_mode="Knowledge base not updated",
        keywords=["generate_knowledge", "suggest_skill", "scripts"],
        severity="high",
    ),
    InstructionPattern(
        name="run_scripts_docs",
        description="Run scripts for doc changes",
        category="end",
        triggers=["end_phase", "docs_only"],
        expected_behavior="Run suggest_skill.py only",
        failure_mode="Skill suggestions missed",
        keywords=["suggest_skill", "docs only"],
        severity="medium",
    ),
    InstructionPattern(
        name="session_cleanup",
        description="Run session cleanup scripts",
        category="end",
        triggers=["end_phase"],
        expected_behavior="Run session_cleanup.py && update_docs.py",
        failure_mode="Session artifacts not cleaned",
        keywords=["session_cleanup", "update_docs"],
        severity="medium",
    ),
    InstructionPattern(
        name="workflow_log",
        description="Create workflow log",
        category="end",
        triggers=["end_phase", "after_scripts"],
        expected_behavior="Create log/workflow/YYYY-MM-DD_HHMMSS_task.md",
        failure_mode="Session not documented",
        keywords=["workflow log", "log/workflow"],
        severity="medium",
    ),
    InstructionPattern(
        name="wait_approval",
        description="Wait for approval before commit",
        category="end",
        triggers=["end_phase", "ready_to_commit"],
        expected_behavior="Wait for user approval before committing",
        failure_mode="Commits without review",
        keywords=["approval", "wait", "commit"],
        severity="critical",
    ),
    
    # ERROR handling
    InstructionPattern(
        name="error_debugging_skill",
        description="Load debugging skill on error",
        category="error",
        triggers=["error_in_output", "traceback", "failed"],
        expected_behavior="Load debugging skill for systematic approach",
        failure_mode="Random trial-and-error fixes",
        keywords=["debugging", "error", "traceback", "failed"],
        severity="high",
    ),
    InstructionPattern(
        name="error_no_quick_fix",
        description="Don't quick-fix errors without analysis",
        category="error",
        triggers=["error_visible"],
        expected_behavior="Analyze error systematically before fixing",
        failure_mode="'Let me just try...' approach",
        keywords=["analyze", "systematic", "error"],
        severity="medium",
    ),
    
    # CODE QUALITY
    InstructionPattern(
        name="avoid_syntax_errors",
        description="Verify edits don't create syntax errors",
        category="quality",
        triggers=["after_edit"],
        expected_behavior="Check for syntax errors after edits",
        failure_mode="Broken code committed",
        keywords=["syntax", "verify", "check"],
        severity="high",
    ),
    InstructionPattern(
        name="avoid_duplicates",
        description="Avoid duplicate code blocks",
        category="quality",
        triggers=["multi_file_edit", "bulk_edit"],
        expected_behavior="Check for duplicate code",
        failure_mode="Duplicate blocks created",
        keywords=["duplicate", "check", "copy-paste"],
        severity="medium",
    ),
    
    # SELF-CHECK
    InstructionPattern(
        name="periodic_check",
        description="Periodic self-check every ~5 tasks",
        category="self_check",
        triggers=["task_count_5"],
        expected_behavior="Self-check: ◆ status, skill cache, orphans",
        failure_mode="Protocol drift in long sessions",
        keywords=["~5 tasks", "check", "drift"],
        severity="medium",
    ),
    InstructionPattern(
        name="if_lost_worktree",
        description="Show worktree if lost",
        category="self_check",
        triggers=["confusion", "lost_context"],
        expected_behavior="Show worktree, find ◆/⊘, continue",
        failure_mode="Confusion leads to errors",
        keywords=["lost", "worktree", "find"],
        severity="low",
    ),
]


# ============================================================================
# Session Simulation with Deviations
# ============================================================================

@dataclass
class SessionDeviation:
    """A deviation from expected behavior in a session."""
    pattern_name: str
    expected: str
    actual: str
    would_be_prevented_by: str
    severity: str
    frequency: float  # How often this deviation occurs


# Common deviations extracted from workflow logs
COMMON_DEVIATIONS = [
    SessionDeviation(
        pattern_name="mark_working_before",
        expected="Mark ◆ before edit",
        actual="Edit without marking",
        would_be_prevented_by="Stronger instruction emphasis",
        severity="high",
        frequency=0.15,  # 15% of work phases
    ),
    SessionDeviation(
        pattern_name="skill_loading",
        expected="Load skill before domain work",
        actual="Work without loading skill",
        would_be_prevented_by="Always load skill trigger",
        severity="high",
        frequency=0.25,  # 25% of skill-triggering edits
    ),
    SessionDeviation(
        pattern_name="run_scripts_code",
        expected="Run both scripts at end",
        actual="Skip one or both scripts",
        would_be_prevented_by="Script reminder in instructions",
        severity="high",
        frequency=0.18,  # 18% of end phases
    ),
    SessionDeviation(
        pattern_name="workflow_log",
        expected="Create workflow log",
        actual="Skip workflow log",
        would_be_prevented_by="Workflow log emphasis",
        severity="medium",
        frequency=0.30,  # 30% skip workflow log
    ),
    SessionDeviation(
        pattern_name="todo_creation",
        expected="Create todo structure",
        actual="Start work without todos",
        would_be_prevented_by="Todo enforcement",
        severity="critical",
        frequency=0.10,  # 10% skip todos
    ),
    SessionDeviation(
        pattern_name="no_quick_fix",
        expected="Create todo for all work",
        actual="Quick fix without todo",
        would_be_prevented_by="No quick fix rule",
        severity="medium",
        frequency=0.10,  # 10% do quick fixes
    ),
    SessionDeviation(
        pattern_name="skill_cache",
        expected="Cache skills, don't reload",
        actual="Reload same skill twice",
        would_be_prevented_by="Skill cache instruction",
        severity="low",
        frequency=0.08,  # 8% reload skills
    ),
    SessionDeviation(
        pattern_name="orphan_check",
        expected="Check for orphan tasks",
        actual="Leave orphan ⊘ tasks",
        would_be_prevented_by="Orphan check emphasis",
        severity="high",
        frequency=0.20,  # 20% leave orphans after interrupts
    ),
    SessionDeviation(
        pattern_name="mark_complete_after",
        expected="Mark ✓ immediately after task",
        actual="Forget to mark complete",
        would_be_prevented_by="Mark complete instruction",
        severity="medium",
        frequency=0.12,  # 12% forget to mark
    ),
    SessionDeviation(
        pattern_name="error_debugging_skill",
        expected="Load debugging skill on error",
        actual="Try random fixes",
        would_be_prevented_by="Error skill trigger",
        severity="high",
        frequency=0.22,  # 22% don't load debugging skill
    ),
]


@dataclass
class SimulatedSession:
    """A simulated session with potential deviations."""
    id: int
    session_type: str
    task_count: int
    has_interrupt: bool
    has_error: bool
    deviations: List[str]
    instruction_misses: List[str]
    could_be_prevented: int
    compliance_score: float


class InstructionSimulator:
    """Simulates sessions and measures instruction effectiveness."""
    
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.session_id = 0
        
    def _pick_weighted(self, dist: Dict[str, float]) -> str:
        r = random.random()
        cumulative = 0
        for key, prob in dist.items():
            cumulative += prob
            if r <= cumulative:
                return key
        return list(dist.keys())[-1]
    
    def simulate_session(self, instruction_effectiveness: Dict[str, float] = None) -> SimulatedSession:
        """Simulate a single session with deviations based on instruction effectiveness."""
        self.session_id += 1
        
        if instruction_effectiveness is None:
            instruction_effectiveness = {}
        
        session_type = self._pick_weighted(SESSION_TYPES)
        task_count = int(self._pick_weighted({str(k): v for k, v in TASK_COUNTS.items()}))
        has_interrupt = random.random() < INTERRUPT_PROBABILITY
        has_error = random.random() < SYNTAX_ERROR_RATE
        
        deviations = []
        instruction_misses = []
        could_be_prevented = 0
        
        # Simulate each deviation
        for dev in COMMON_DEVIATIONS:
            # Base probability of deviation
            base_prob = dev.frequency
            
            # Reduce by instruction effectiveness (0-1 scale)
            effectiveness = instruction_effectiveness.get(dev.pattern_name, 0.5)
            adjusted_prob = base_prob * (1 - effectiveness * MAX_EFFECTIVENESS_REDUCTION)
            
            if random.random() < adjusted_prob:
                deviations.append(dev.pattern_name)
                if effectiveness < 0.7:
                    instruction_misses.append(dev.pattern_name)
                else:
                    could_be_prevented += 1
        
        # Add interrupt-specific deviations
        if has_interrupt:
            if random.random() < 0.18 * (1 - instruction_effectiveness.get("interrupt_pause", 0.5) * MAX_EFFECTIVENESS_REDUCTION):
                deviations.append("interrupt_pause")
            if random.random() < 0.22 * (1 - instruction_effectiveness.get("sub_todo_creation", 0.5) * MAX_EFFECTIVENESS_REDUCTION):
                deviations.append("sub_todo_creation")
            if random.random() < 0.25 * (1 - instruction_effectiveness.get("resume_after_interrupt", 0.5) * MAX_EFFECTIVENESS_REDUCTION):
                deviations.append("resume_after_interrupt")
        
        # Calculate compliance score
        total_checks = len(COMMON_DEVIATIONS) + (3 if has_interrupt else 0)
        compliance = 1 - (len(deviations) / total_checks) if total_checks > 0 else 1.0
        
        return SimulatedSession(
            id=self.session_id,
            session_type=session_type,
            task_count=task_count,
            has_interrupt=has_interrupt,
            has_error=has_error,
            deviations=deviations,
            instruction_misses=instruction_misses,
            could_be_prevented=could_be_prevented,
            compliance_score=compliance,
        )
    
    def simulate_batch(self, count: int, instruction_effectiveness: Dict[str, float] = None) -> Dict:
        """Run batch simulation and aggregate results."""
        results = {
            "total": count,
            "perfect": 0,
            "with_deviations": 0,
            "total_deviations": 0,
            "deviation_counts": defaultdict(int),
            "instruction_miss_counts": defaultdict(int),
            "could_be_prevented_total": 0,
            "by_session_type": defaultdict(lambda: {"count": 0, "deviations": 0}),
            "avg_compliance": 0,
            "sessions": [],
        }
        
        total_compliance = 0
        
        for _ in range(count):
            session = self.simulate_session(instruction_effectiveness)
            
            if len(session.deviations) == 0:
                results["perfect"] += 1
            else:
                results["with_deviations"] += 1
                results["total_deviations"] += len(session.deviations)
                
                for dev in session.deviations:
                    results["deviation_counts"][dev] += 1
                
                for miss in session.instruction_misses:
                    results["instruction_miss_counts"][miss] += 1
                
                results["could_be_prevented_total"] += session.could_be_prevented
            
            results["by_session_type"][session.session_type]["count"] += 1
            results["by_session_type"][session.session_type]["deviations"] += len(session.deviations)
            
            total_compliance += session.compliance_score
        
        results["avg_compliance"] = total_compliance / count * 100
        results["compliance_rate"] = results["perfect"] / count * 100
        
        return results


# ============================================================================
# Instruction Coverage Analysis
# ============================================================================

class InstructionCoverageAnalyzer:
    """Analyzes how well existing instructions cover known patterns."""
    
    def __init__(self):
        self.instruction_files = {}
        
    def load_instructions(self, base_path: str = ".github"):
        """Load all instruction files."""
        paths = [
            f"{base_path}/copilot-instructions.md",
            f"{base_path}/instructions/protocols.instructions.md",
            f"{base_path}/instructions/structure.instructions.md",
        ]
        
        for path in paths:
            try:
                content = Path(path).read_text()
                self.instruction_files[path] = content
            except FileNotFoundError:
                pass
    
    def check_pattern_coverage(self, pattern: InstructionPattern) -> Tuple[bool, str, float]:
        """Check if a pattern is covered by instructions."""
        all_content = " ".join(self.instruction_files.values()).lower()
        
        keyword_matches = sum(1 for kw in pattern.keywords if kw.lower() in all_content)
        coverage_score = keyword_matches / len(pattern.keywords) if pattern.keywords else 0
        
        # Find which file covers it best
        best_file = ""
        best_match = 0
        for filename, content in self.instruction_files.items():
            content_lower = content.lower()
            matches = sum(1 for kw in pattern.keywords if kw.lower() in content_lower)
            if matches > best_match:
                best_match = matches
                best_file = filename
        
        is_covered = coverage_score >= COVERAGE_THRESHOLD
        
        return is_covered, best_file, coverage_score
    
    def analyze_all_patterns(self) -> Dict[str, Any]:
        """Analyze coverage of all known patterns."""
        results = {
            "total_patterns": len(KNOWN_INSTRUCTION_PATTERNS),
            "covered": 0,
            "uncovered": [],
            "partial": [],
            "by_category": defaultdict(lambda: {"total": 0, "covered": 0}),
            "by_severity": defaultdict(lambda: {"total": 0, "covered": 0}),
            "coverage_details": [],
        }
        
        for pattern in KNOWN_INSTRUCTION_PATTERNS:
            is_covered, covered_by, score = self.check_pattern_coverage(pattern)
            
            pattern.is_covered = is_covered
            pattern.covered_by = covered_by
            pattern.frequency = 0  # Will be updated from simulation
            
            results["by_category"][pattern.category]["total"] += 1
            results["by_severity"][pattern.severity]["total"] += 1
            
            if is_covered:
                results["covered"] += 1
                results["by_category"][pattern.category]["covered"] += 1
                results["by_severity"][pattern.severity]["covered"] += 1
            else:
                if score > 0.2:
                    results["partial"].append(pattern.name)
                else:
                    results["uncovered"].append(pattern.name)
            
            results["coverage_details"].append({
                "name": pattern.name,
                "category": pattern.category,
                "severity": pattern.severity,
                "is_covered": is_covered,
                "coverage_score": round(score, 2),
                "covered_by": covered_by,
            })
        
        results["coverage_rate"] = results["covered"] / results["total_patterns"] * 100
        
        return results


# ============================================================================
# Workflow Log Pattern Extractor
# ============================================================================

class WorkflowLogAnalyzer:
    """Extracts patterns and issues from workflow logs."""
    
    def __init__(self, log_dir: str = "log/workflow"):
        self.log_dir = Path(log_dir)
        self.logs = []
        
    def load_logs(self) -> int:
        """Load all workflow logs."""
        if not self.log_dir.exists():
            return 0
        
        for log_file in self.log_dir.glob("*.md"):
            try:
                content = log_file.read_text()
                self.logs.append({
                    "file": log_file.name,
                    "content": content,
                })
            except Exception:
                pass
        
        return len(self.logs)
    
    def extract_patterns(self) -> Dict[str, Any]:
        """Extract patterns from workflow logs."""
        patterns = {
            "session_types": defaultdict(int),
            "skills_used": defaultdict(int),
            "files_modified": defaultdict(int),
            "technologies": defaultdict(int),
            "problems": [],
            "solutions": [],
            "tasks_per_session": [],
            "duration_distribution": [],
        }
        
        for log in self.logs:
            content = log["content"]
            
            # Extract session type from filename
            filename = log["file"].lower()
            if "fix" in filename or "bug" in filename:
                patterns["session_types"]["bugfix"] += 1
            elif "doc" in filename:
                patterns["session_types"]["docs"] += 1
            elif "ui" in filename or "frontend" in filename:
                patterns["session_types"]["frontend"] += 1
            elif "api" in filename or "backend" in filename:
                patterns["session_types"]["backend"] += 1
            else:
                patterns["session_types"]["feature"] += 1
            
            # Extract skills used
            skill_matches = re.findall(r'\.github/skills/([^/]+)/', content)
            for skill in skill_matches:
                patterns["skills_used"][skill] += 1
            
            # Extract files modified
            file_matches = re.findall(r'\|\s*`?([^|`]+\.[a-zA-Z]+)`?\s*\|', content)
            for f in file_matches:
                ext = Path(f).suffix
                if ext:
                    patterns["files_modified"][ext] += 1
            
            # Extract problems
            problem_matches = re.findall(r'- Problem: (.+?)(?:\n|$)', content)
            patterns["problems"].extend(problem_matches)
            
            # Extract solutions
            solution_matches = re.findall(r'- Solution: (.+?)(?:\n|$)', content)
            patterns["solutions"].extend(solution_matches)
            
            # Extract task count
            task_match = re.search(TASK_COMPLETED_REGEX, content)
            if task_match:
                patterns["tasks_per_session"].append(int(task_match.group(1)))
            
            # Extract technologies
            tech_patterns = {
                'react': r'\breact\b',
                'fastapi': r'\bfastapi\b',
                'docker': r'\bdocker\b',
                'typescript': r'\btypescript\b',
                'python': r'\.py\b',
                'websocket': r'\bwebsocket\b',
                'sqlalchemy': r'\bsqlalchemy\b',
                'alembic': r'\balembic\b',
            }
            content_lower = content.lower()
            for tech, pattern in tech_patterns.items():
                if re.search(pattern, content_lower):
                    patterns["technologies"][tech] += 1
        
        return patterns


# ============================================================================
# Instruction Gap Detector
# ============================================================================

@dataclass
class InstructionGap:
    """A gap in current instructions that needs addressing."""
    name: str
    description: str
    category: str
    current_deviation_rate: float
    potential_improvement: float
    recommendation: str
    priority: str  # low, medium, high, critical
    affected_patterns: List[str]


class InstructionGapDetector:
    """Detects gaps in instructions based on simulation and log analysis."""
    
    def __init__(self):
        self.gaps = []
        
    def detect_gaps(
        self,
        simulation_results: Dict,
        coverage_results: Dict,
        workflow_patterns: Dict
    ) -> List[InstructionGap]:
        """Detect gaps based on multiple data sources."""
        self.gaps = []
        
        # 1. Gaps from uncovered patterns
        for pattern_name in coverage_results.get("uncovered", []):
            pattern = next((p for p in KNOWN_INSTRUCTION_PATTERNS if p.name == pattern_name), None)
            if pattern:
                self.gaps.append(InstructionGap(
                    name=f"uncovered_{pattern_name}",
                    description=f"Pattern '{pattern_name}' is not covered in instructions",
                    category=pattern.category,
                    current_deviation_rate=0.3,  # Estimated
                    potential_improvement=0.25,
                    recommendation=f"Add instruction for: {pattern.expected_behavior}",
                    priority=pattern.severity,
                    affected_patterns=[pattern_name],
                ))
        
        # 2. Gaps from high deviation rates in simulation
        deviation_counts = simulation_results.get("deviation_counts", {})
        total_sessions = simulation_results.get("total", 1)
        
        for pattern_name, count in deviation_counts.items():
            rate = count / total_sessions
            if rate > 0.15:  # More than 15% deviation rate
                pattern = next((p for p in KNOWN_INSTRUCTION_PATTERNS if p.name == pattern_name), None)
                if pattern:
                    self.gaps.append(InstructionGap(
                        name=f"high_deviation_{pattern_name}",
                        description=f"High deviation rate ({rate*100:.1f}%) for '{pattern_name}'",
                        category=pattern.category if pattern else "unknown",
                        current_deviation_rate=rate,
                        potential_improvement=rate * 0.6,  # Optimistic 60% reduction
                        recommendation=f"Strengthen instruction emphasis for: {pattern.expected_behavior}" if pattern else f"Add/strengthen {pattern_name}",
                        priority="high" if rate > 0.25 else "medium",
                        affected_patterns=[pattern_name],
                    ))
        
        # 3. Gaps from workflow log problems
        for problem in workflow_patterns.get("problems", [])[:10]:
            problem_lower = problem.lower()
            
            if "skip" in problem_lower or "forgot" in problem_lower:
                self.gaps.append(InstructionGap(
                    name=f"historical_issue",
                    description=f"Historical issue: {problem[:60]}",
                    category="historical",
                    current_deviation_rate=0.1,
                    potential_improvement=0.05,
                    recommendation="Review and reinforce related instructions",
                    priority="low",
                    affected_patterns=[],
                ))
        
        # Deduplicate by name
        seen = set()
        unique_gaps = []
        for gap in self.gaps:
            if gap.name not in seen:
                seen.add(gap.name)
                unique_gaps.append(gap)
        
        self.gaps = unique_gaps
        return self.gaps


# ============================================================================
# Effectiveness Measurement
# ============================================================================

def measure_effectiveness(
    baseline_results: Dict,
    improved_results: Dict
) -> Dict[str, Any]:
    """Measure effectiveness improvement between baseline and improved instructions."""
    
    baseline_compliance = baseline_results.get("avg_compliance", 0)
    improved_compliance = improved_results.get("avg_compliance", 0)
    
    baseline_deviations = baseline_results.get("total_deviations", 0)
    improved_deviations = improved_results.get("total_deviations", 0)
    
    total_sessions = baseline_results.get("total", 1)
    
    deviation_reduction = (baseline_deviations - improved_deviations) / baseline_deviations * 100 if baseline_deviations > 0 else 0
    compliance_improvement = improved_compliance - baseline_compliance
    
    # Per-pattern improvement
    pattern_improvements = {}
    baseline_counts = baseline_results.get("deviation_counts", {})
    improved_counts = improved_results.get("deviation_counts", {})
    
    for pattern in set(baseline_counts.keys()) | set(improved_counts.keys()):
        baseline_rate = baseline_counts.get(pattern, 0) / total_sessions
        improved_rate = improved_counts.get(pattern, 0) / total_sessions
        improvement = (baseline_rate - improved_rate) / baseline_rate * 100 if baseline_rate > 0 else 0
        pattern_improvements[pattern] = {
            "baseline_rate": round(baseline_rate * 100, 1),
            "improved_rate": round(improved_rate * 100, 1),
            "improvement_pct": round(improvement, 1),
        }
    
    return {
        "baseline_compliance": round(baseline_compliance, 1),
        "improved_compliance": round(improved_compliance, 1),
        "compliance_improvement": round(compliance_improvement, 1),
        "baseline_deviations": baseline_deviations,
        "improved_deviations": improved_deviations,
        "deviation_reduction_pct": round(deviation_reduction, 1),
        "pattern_improvements": pattern_improvements,
    }


# ============================================================================
# Main Execution
# ============================================================================

def print_results(title: str, results: Dict):
    """Print formatted results."""
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)
    
    for key, value in results.items():
        if isinstance(value, dict):
            print(f"\n{key}:")
            for k, v in value.items():
                print(f"   {k}: {v}")
        elif isinstance(value, list) and len(value) > 0:
            print(f"\n{key}: ({len(value)} items)")
            for item in value[:5]:
                if isinstance(item, dict):
                    print(f"   - {item.get('name', item)}")
                else:
                    print(f"   - {item}")
            if len(value) > 5:
                print(f"   ... and {len(value) - 5} more")
        else:
            print(f"{key}: {value}")


def main():
    parser = argparse.ArgumentParser(description='AKIS Instruction Suggestion Script')
    parser.add_argument('--sessions', type=int, default=100000, help='Number of sessions to simulate')
    parser.add_argument('--output', type=str, default=None, help='Output file for results (JSON)')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()
    
    print("=" * 70)
    print(" AKIS INSTRUCTION SUGGESTION SCRIPT v1.0")
    print("=" * 70)
    
    # 1. Load and analyze workflow logs
    print("\n📁 Step 1: Analyzing workflow logs...")
    log_analyzer = WorkflowLogAnalyzer()
    log_count = log_analyzer.load_logs()
    print(f"   Loaded {log_count} workflow logs")
    workflow_patterns = log_analyzer.extract_patterns()
    print(f"   Session types: {dict(workflow_patterns['session_types'])}")
    print(f"   Technologies: {dict(workflow_patterns['technologies'])}")
    
    # 2. Analyze instruction coverage
    print("\n📋 Step 2: Analyzing instruction coverage...")
    coverage_analyzer = InstructionCoverageAnalyzer()
    coverage_analyzer.load_instructions()
    coverage_results = coverage_analyzer.analyze_all_patterns()
    print(f"   Patterns covered: {coverage_results['covered']}/{coverage_results['total_patterns']} ({coverage_results['coverage_rate']:.1f}%)")
    if coverage_results['uncovered']:
        print(f"   Uncovered: {', '.join(coverage_results['uncovered'][:5])}")
    
    # 3. Run baseline simulation
    print(f"\n🎲 Step 3: Running baseline simulation ({args.sessions:,} sessions)...")
    simulator = InstructionSimulator(seed=42)
    baseline_effectiveness = {p.name: 0.5 for p in KNOWN_INSTRUCTION_PATTERNS}  # Baseline 50% effectiveness
    baseline_results = simulator.simulate_batch(args.sessions, baseline_effectiveness)
    print(f"   Baseline compliance: {baseline_results['avg_compliance']:.1f}%")
    print(f"   Perfect sessions: {baseline_results['perfect']:,} ({baseline_results['compliance_rate']:.1f}%)")
    print(f"   Total deviations: {baseline_results['total_deviations']:,}")
    
    # 4. Detect instruction gaps
    print("\n🔍 Step 4: Detecting instruction gaps...")
    gap_detector = InstructionGapDetector()
    gaps = gap_detector.detect_gaps(baseline_results, coverage_results, workflow_patterns)
    print(f"   Detected {len(gaps)} instruction gaps")
    
    high_priority = [g for g in gaps if g.priority in ("high", "critical")]
    print(f"   High/Critical priority: {len(high_priority)}")
    
    # 5. Simulate with improved instructions
    print(f"\n🚀 Step 5: Simulating with improved instructions...")
    # Improved effectiveness based on gap fixes
    improved_effectiveness = baseline_effectiveness.copy()
    for gap in gaps:
        for pattern in gap.affected_patterns:
            improved_effectiveness[pattern] = min(0.9, improved_effectiveness.get(pattern, 0.5) + 0.3)
    
    simulator2 = InstructionSimulator(seed=42)  # Same seed for comparison
    improved_results = simulator2.simulate_batch(args.sessions, improved_effectiveness)
    print(f"   Improved compliance: {improved_results['avg_compliance']:.1f}%")
    print(f"   Perfect sessions: {improved_results['perfect']:,} ({improved_results['compliance_rate']:.1f}%)")
    
    # 6. Measure effectiveness improvement
    print("\n📊 Step 6: Measuring effectiveness improvement...")
    effectiveness = measure_effectiveness(baseline_results, improved_results)
    print(f"   Compliance improvement: +{effectiveness['compliance_improvement']:.1f}%")
    print(f"   Deviation reduction: {effectiveness['deviation_reduction_pct']:.1f}%")
    
    # Print top improvements per pattern
    print("\n   Top pattern improvements:")
    sorted_patterns = sorted(
        effectiveness['pattern_improvements'].items(),
        key=lambda x: x[1].get('improvement_pct', 0),
        reverse=True
    )
    for pattern, data in sorted_patterns[:5]:
        print(f"      {pattern}: {data['baseline_rate']:.1f}% → {data['improved_rate']:.1f}% ({data['improvement_pct']:+.1f}%)")
    
    # 7. Generate recommendations
    print("\n" + "=" * 70)
    print(" RECOMMENDATIONS")
    print("=" * 70)
    
    recommendations = []
    for gap in sorted(gaps, key=lambda g: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(g.priority, 4)):
        rec = {
            "priority": gap.priority,
            "category": gap.category,
            "issue": gap.description,
            "recommendation": gap.recommendation,
            "potential_improvement": f"{gap.potential_improvement * 100:.1f}%",
        }
        recommendations.append(rec)
        
        if len(recommendations) <= 10:
            print(f"\n[{gap.priority.upper()}] {gap.category}")
            print(f"   Issue: {gap.description}")
            print(f"   Recommendation: {gap.recommendation}")
            print(f"   Potential improvement: {gap.potential_improvement * 100:.1f}%")
    
    # 8. Summary
    print("\n" + "=" * 70)
    print(" SUMMARY")
    print("=" * 70)
    print(f"""
   Workflow logs analyzed:    {log_count}
   Instruction patterns:      {coverage_results['total_patterns']}
   Patterns covered:          {coverage_results['covered']} ({coverage_results['coverage_rate']:.1f}%)
   Sessions simulated:        {args.sessions:,}
   
   Baseline Results:
     - Compliance rate:       {baseline_results['avg_compliance']:.1f}%
     - Perfect sessions:      {baseline_results['compliance_rate']:.1f}%
     - Total deviations:      {baseline_results['total_deviations']:,}
   
   With Improved Instructions:
     - Compliance rate:       {improved_results['avg_compliance']:.1f}%
     - Perfect sessions:      {improved_results['compliance_rate']:.1f}%
     - Total deviations:      {improved_results['total_deviations']:,}
   
   Improvement:
     - Compliance:            +{effectiveness['compliance_improvement']:.1f}%
     - Deviation reduction:   {effectiveness['deviation_reduction_pct']:.1f}%
     - Gaps identified:       {len(gaps)}
     - High priority gaps:    {len(high_priority)}
""")
    
    # 9. Save results
    if args.output:
        output_data = {
            "workflow_patterns": {k: dict(v) if isinstance(v, defaultdict) else v for k, v in workflow_patterns.items()},
            "coverage_results": coverage_results,
            "baseline_results": {k: dict(v) if isinstance(v, defaultdict) else v for k, v in baseline_results.items()},
            "improved_results": {k: dict(v) if isinstance(v, defaultdict) else v for k, v in improved_results.items()},
            "effectiveness": effectiveness,
            "gaps": [asdict(g) for g in gaps],
            "recommendations": recommendations,
        }
        
        # Convert defaultdicts to regular dicts for JSON
        def convert_defaultdict(obj):
            if isinstance(obj, defaultdict):
                return dict(obj)
            elif isinstance(obj, dict):
                return {k: convert_defaultdict(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_defaultdict(i) for i in obj]
            return obj
        
        output_data = convert_defaultdict(output_data)
        
        Path(args.output).write_text(json.dumps(output_data, indent=2, default=str))
        print(f"\n💾 Results saved to {args.output}")
    
    print("\n✅ Instruction suggestion complete!")
    
    return 0


if __name__ == "__main__":
    exit(main())
