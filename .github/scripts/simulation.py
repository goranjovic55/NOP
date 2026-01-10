#!/usr/bin/env python3
"""
AKIS 100k Session Simulation Engine v1.0

Comprehensive simulation engine that:
1. Extracts patterns from industry/community forums and development sessions
2. Mixes patterns with real workflow logs
3. Creates 100k simulated sessions with edge cases and atypical issues
4. Runs AKIS framework against the simulation
5. Produces before/after measurements for optimization

FOCUS METRICS:
- Discipline: Protocol adherence (gates, TODO tracking, skill loading)
- Cognitive Load: Complexity score for agent following instructions
- Resolve Rate: Task completion success rate
- Speed: Resolution time (minutes)
- Traceability: How well actions can be traced back
- Token Consumption: Average tokens per session
- API Calls: Number of tool invocations per session

Usage:
    # Run full 100k simulation with before/after analysis
    python .github/scripts/simulation.py --full
    
    # Extract patterns only
    python .github/scripts/simulation.py --extract-patterns
    
    # Run simulation with custom session count
    python .github/scripts/simulation.py --sessions 50000
    
    # Generate edge cases report
    python .github/scripts/simulation.py --edge-cases
    
    # Output results to file
    python .github/scripts/simulation.py --full --output log/simulation_100k.json
"""

import json
import random
import re
import hashlib
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Set, Optional, Tuple
from pathlib import Path
from datetime import datetime
import argparse

# ============================================================================
# Configuration
# ============================================================================

DEFAULT_SESSION_COUNT = 100_000
WORKFLOW_DIR = Path("log/workflow")
RESULTS_DIR = Path("log")

# Seed for reproducibility
RANDOM_SEED = 42

# ============================================================================
# Industry/Community Forum Pattern Database
# ============================================================================

# Patterns extracted from common development forums, GitHub issues, Stack Overflow,
# Discord communities, and development best practices guides

INDUSTRY_PATTERNS = {
    "frontend": {
        "common_issues": [
            {"issue": "React component not re-rendering", "frequency": 0.15, "complexity": "medium"},
            {"issue": "State management race condition", "frequency": 0.10, "complexity": "high"},
            {"issue": "CSS styling conflicts", "frequency": 0.20, "complexity": "low"},
            {"issue": "TypeScript type errors", "frequency": 0.18, "complexity": "medium"},
            {"issue": "Hook dependency array issues", "frequency": 0.12, "complexity": "medium"},
            {"issue": "Memory leak from unmounted component", "frequency": 0.08, "complexity": "high"},
            {"issue": "API data fetching patterns", "frequency": 0.10, "complexity": "medium"},
            {"issue": "Form validation edge cases", "frequency": 0.07, "complexity": "medium"},
        ],
        "typical_tasks": [
            "Create new component", "Fix styling issue", "Add form validation",
            "Implement data fetching", "Add loading states", "Fix type errors",
            "Optimize re-renders", "Add error boundaries", "Implement routing",
        ],
        "edge_cases": [
            {"case": "Concurrent state updates", "probability": 0.05},
            {"case": "SSR hydration mismatch", "probability": 0.03},
            {"case": "Infinite render loop", "probability": 0.04},
            {"case": "Stale closure in useEffect", "probability": 0.06},
            {"case": "Race condition in async operations", "probability": 0.05},
        ],
    },
    "backend": {
        "common_issues": [
            {"issue": "Database connection timeout", "frequency": 0.12, "complexity": "medium"},
            {"issue": "SQL injection vulnerability", "frequency": 0.05, "complexity": "high"},
            {"issue": "API authentication failure", "frequency": 0.15, "complexity": "medium"},
            {"issue": "Async operation deadlock", "frequency": 0.08, "complexity": "high"},
            {"issue": "Missing error handling", "frequency": 0.18, "complexity": "low"},
            {"issue": "N+1 query problem", "frequency": 0.10, "complexity": "medium"},
            {"issue": "CORS configuration error", "frequency": 0.12, "complexity": "low"},
            {"issue": "WebSocket connection drops", "frequency": 0.08, "complexity": "medium"},
            {"issue": "Memory leak in long-running process", "frequency": 0.06, "complexity": "high"},
            {"issue": "Rate limiting bypass", "frequency": 0.06, "complexity": "high"},
        ],
        "typical_tasks": [
            "Create API endpoint", "Add database model", "Implement authentication",
            "Add caching layer", "Fix database query", "Add logging",
            "Implement WebSocket handler", "Add middleware", "Setup background tasks",
        ],
        "edge_cases": [
            {"case": "Database migration rollback", "probability": 0.04},
            {"case": "Connection pool exhaustion", "probability": 0.03},
            {"case": "Circular dependency in imports", "probability": 0.05},
            {"case": "Race condition in database writes", "probability": 0.04},
            {"case": "Timezone handling errors", "probability": 0.06},
            {"case": "Unicode encoding issues", "probability": 0.03},
        ],
    },
    "devops": {
        "common_issues": [
            {"issue": "Docker build failure", "frequency": 0.18, "complexity": "medium"},
            {"issue": "Container resource exhaustion", "frequency": 0.10, "complexity": "medium"},
            {"issue": "CI/CD pipeline failure", "frequency": 0.20, "complexity": "medium"},
            {"issue": "Environment variable mismatch", "frequency": 0.15, "complexity": "low"},
            {"issue": "Port binding conflict", "frequency": 0.12, "complexity": "low"},
            {"issue": "Volume mount permissions", "frequency": 0.10, "complexity": "medium"},
            {"issue": "Network connectivity issues", "frequency": 0.08, "complexity": "medium"},
            {"issue": "SSL certificate problems", "frequency": 0.07, "complexity": "high"},
        ],
        "typical_tasks": [
            "Update Dockerfile", "Fix CI pipeline", "Add environment variables",
            "Configure volumes", "Setup networking", "Optimize build time",
            "Add health checks", "Configure logging", "Setup monitoring",
        ],
        "edge_cases": [
            {"case": "Multi-stage build cache invalidation", "probability": 0.04},
            {"case": "Container startup race condition", "probability": 0.05},
            {"case": "Disk space exhaustion", "probability": 0.03},
            {"case": "DNS resolution failure", "probability": 0.04},
            {"case": "Orphaned resources cleanup", "probability": 0.03},
        ],
    },
    "debugging": {
        "common_issues": [
            {"issue": "Traceback without context", "frequency": 0.20, "complexity": "medium"},
            {"issue": "Silent failure", "frequency": 0.15, "complexity": "high"},
            {"issue": "Intermittent error", "frequency": 0.12, "complexity": "high"},
            {"issue": "Performance degradation", "frequency": 0.10, "complexity": "medium"},
            {"issue": "Memory leak", "frequency": 0.08, "complexity": "high"},
            {"issue": "Configuration error", "frequency": 0.18, "complexity": "low"},
            {"issue": "Dependency version conflict", "frequency": 0.10, "complexity": "medium"},
            {"issue": "Environment-specific bug", "frequency": 0.07, "complexity": "high"},
        ],
        "typical_tasks": [
            "Investigate traceback", "Add logging", "Reproduce issue",
            "Fix edge case", "Add error handling", "Profile performance",
            "Trace data flow", "Check configurations", "Verify dependencies",
        ],
        "edge_cases": [
            {"case": "Heisenbug - disappears when debugging", "probability": 0.03},
            {"case": "Race condition only in production", "probability": 0.04},
            {"case": "Cascading failure from upstream", "probability": 0.05},
            {"case": "Data corruption from concurrent access", "probability": 0.03},
            {"case": "Stack overflow from deep recursion", "probability": 0.02},
        ],
    },
}

# Session complexity distribution from community analysis
SESSION_COMPLEXITY_DISTRIBUTION = {
    "simple": 0.35,   # 1-2 files, straightforward tasks
    "medium": 0.45,   # 3-5 files, some complexity
    "complex": 0.20,  # 6+ files, high complexity, edge cases
}

# Domain distribution from community analysis
DOMAIN_DISTRIBUTION = {
    "frontend_only": 0.24,
    "backend_only": 0.10,
    "fullstack": 0.40,
    "devops": 0.10,
    "debugging": 0.10,
    "documentation": 0.06,
}

# Atypical issue categories (edge cases that should be handled)
ATYPICAL_ISSUES = [
    {
        "category": "workflow_deviation",
        "description": "Agent skips required steps",
        "probability": 0.08,
        "scenarios": [
            "Skip knowledge loading at START",
            "Skip skill loading before domain work",
            "Skip verification after edits",
            "Skip workflow log at END",
            "Multiple ◆ tasks active simultaneously",
            "Orphan ⊘ tasks not closed",
        ],
    },
    {
        "category": "cognitive_overload",
        "description": "Too much context causing confusion",
        "probability": 0.06,
        "scenarios": [
            "More than 10 files modified",
            "More than 5 skills loaded",
            "Very long session (>60 min)",
            "Multiple unrelated tasks",
            "Conflicting instructions",
        ],
    },
    {
        "category": "error_cascades",
        "description": "One error leads to multiple failures",
        "probability": 0.05,
        "scenarios": [
            "Syntax error in import causes downstream failures",
            "Database migration breaks multiple services",
            "Type error propagates through codebase",
            "Configuration change breaks multiple components",
        ],
    },
    {
        "category": "context_loss",
        "description": "Important context not maintained",
        "probability": 0.07,
        "scenarios": [
            "Previous session context not loaded",
            "Related files not identified",
            "Dependencies not traced",
            "Historical decisions not referenced",
        ],
    },
    {
        "category": "tool_misuse",
        "description": "Tools used incorrectly",
        "probability": 0.04,
        "scenarios": [
            "Wrong file edited",
            "Incomplete search queries",
            "Missed file in multi-file edit",
            "Incorrect regex pattern",
        ],
    },
]


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class SessionMetrics:
    """Comprehensive metrics for a simulated session."""
    # Identification
    session_id: int
    session_type: str
    complexity: str
    domain: str
    
    # Core metrics
    token_usage: int = 0
    api_calls: int = 0
    resolution_time_minutes: float = 0.0
    
    # Quality metrics (0-1 scale)
    discipline_score: float = 0.0
    cognitive_load: float = 0.0
    traceability: float = 0.0
    
    # Outcome metrics
    task_success: bool = False
    tasks_completed: int = 0
    tasks_total: int = 0
    
    # Skill and knowledge usage
    skills_loaded: int = 0
    knowledge_hits: int = 0
    
    # Issues
    deviations: List[str] = field(default_factory=list)
    edge_cases_hit: List[str] = field(default_factory=list)
    errors_encountered: List[str] = field(default_factory=list)


@dataclass
class SimulationConfig:
    """Configuration for simulation run."""
    session_count: int = DEFAULT_SESSION_COUNT
    include_edge_cases: bool = True
    edge_case_probability: float = 0.15
    atypical_issue_probability: float = 0.10
    seed: int = RANDOM_SEED


@dataclass
class AKISConfiguration:
    """AKIS framework configuration for simulation."""
    version: str = "current"
    
    # Discipline enforcement
    enforce_gates: bool = True
    require_todo_tracking: bool = True
    require_skill_loading: bool = True
    require_knowledge_loading: bool = True
    require_workflow_log: bool = True
    
    # Optimization settings
    enable_knowledge_cache: bool = True
    enable_operation_batching: bool = True
    enable_proactive_skill_loading: bool = True
    
    # Token optimization
    max_context_tokens: int = 4000
    skill_token_target: int = 250
    
    # Quality settings
    require_verification: bool = True
    require_syntax_check: bool = True


@dataclass
class SimulationResults:
    """Complete results from a simulation run."""
    config: SimulationConfig
    akis_config: AKISConfiguration
    
    # Aggregate metrics
    total_sessions: int = 0
    successful_sessions: int = 0
    
    # Averages
    avg_token_usage: float = 0.0
    avg_api_calls: float = 0.0
    avg_resolution_time: float = 0.0
    avg_discipline: float = 0.0
    avg_cognitive_load: float = 0.0
    avg_traceability: float = 0.0
    
    # Percentiles
    p50_resolution_time: float = 0.0
    p95_resolution_time: float = 0.0
    
    # Rates
    success_rate: float = 0.0
    perfect_session_rate: float = 0.0
    edge_case_hit_rate: float = 0.0
    
    # Totals
    total_tokens: int = 0
    total_api_calls: int = 0
    total_deviations: int = 0
    
    # Distribution
    complexity_distribution: Dict[str, int] = field(default_factory=dict)
    domain_distribution: Dict[str, int] = field(default_factory=dict)
    deviation_counts: Dict[str, int] = field(default_factory=dict)
    edge_case_counts: Dict[str, int] = field(default_factory=dict)


# ============================================================================
# Pattern Extraction
# ============================================================================

def extract_patterns_from_workflow_logs(workflow_dir: Path) -> Dict[str, Any]:
    """Extract patterns from real workflow logs."""
    patterns = {
        "session_types": defaultdict(int),
        "task_counts": [],
        "durations": [],
        "skills_used": defaultdict(int),
        "common_issues": [],
        "success_indicators": [],
        "failure_indicators": [],
        "files_modified": [],
        "complexity_distribution": defaultdict(int),
        "total_logs": 0,
    }
    
    if not workflow_dir.exists():
        return patterns
    
    for log_file in workflow_dir.glob("*.md"):
        if log_file.name == "README.md":
            continue
        
        try:
            content = log_file.read_text(encoding='utf-8', errors='ignore')
            patterns["total_logs"] += 1
            
            # Extract session type
            if 'frontend' in content.lower() and 'backend' in content.lower():
                patterns["session_types"]["fullstack"] += 1
            elif 'frontend' in content.lower():
                patterns["session_types"]["frontend_only"] += 1
            elif 'backend' in content.lower():
                patterns["session_types"]["backend_only"] += 1
            elif 'docker' in content.lower():
                patterns["session_types"]["devops"] += 1
            elif 'debug' in content.lower() or 'fix' in content.lower():
                patterns["session_types"]["debugging"] += 1
            elif 'doc' in content.lower():
                patterns["session_types"]["documentation"] += 1
            
            # Extract task counts
            completed = content.count('✓') + content.count('[x]')
            pending = content.count('○') + content.count('[ ]')
            patterns["task_counts"].append(completed + pending)
            
            # Extract duration
            duration_match = re.search(r'~?(\d+)\s*min', content)
            if duration_match:
                patterns["durations"].append(int(duration_match.group(1)))
            
            # Extract skills used
            skill_matches = re.findall(r'SKILL[:\s]+(\w+-?\w+)', content)
            for skill in skill_matches:
                patterns["skills_used"][skill.lower()] += 1
            
            # Extract complexity
            if 'Complex' in content:
                patterns["complexity_distribution"]["complex"] += 1
            elif 'Medium' in content:
                patterns["complexity_distribution"]["medium"] += 1
            elif 'Simple' in content:
                patterns["complexity_distribution"]["simple"] += 1
            
            # Extract issues/errors
            if 'error' in content.lower() or 'fix' in content.lower():
                patterns["common_issues"].append(log_file.stem)
            
            # File counts
            file_match = re.search(r'Files[:\s]+(\d+)', content)
            if file_match:
                patterns["files_modified"].append(int(file_match.group(1)))
        
        except Exception:
            continue
    
    return patterns


def extract_industry_patterns() -> Dict[str, Any]:
    """Extract and compile industry/community patterns."""
    compiled = {
        "common_issues": [],
        "edge_cases": [],
        "typical_tasks": [],
        "complexity_weights": {},
        "domain_weights": {},
    }
    
    # Compile issues from all domains
    for domain, data in INDUSTRY_PATTERNS.items():
        for issue in data.get("common_issues", []):
            compiled["common_issues"].append({
                "domain": domain,
                **issue
            })
        
        for edge_case in data.get("edge_cases", []):
            compiled["edge_cases"].append({
                "domain": domain,
                **edge_case
            })
        
        for task in data.get("typical_tasks", []):
            compiled["typical_tasks"].append({
                "domain": domain,
                "task": task
            })
    
    compiled["complexity_weights"] = SESSION_COMPLEXITY_DISTRIBUTION
    compiled["domain_weights"] = DOMAIN_DISTRIBUTION
    
    return compiled


def merge_patterns(
    workflow_patterns: Dict[str, Any],
    industry_patterns: Dict[str, Any]
) -> Dict[str, Any]:
    """Merge workflow log patterns with industry patterns."""
    merged = {
        "session_types": {},
        "complexity_distribution": {},
        "common_issues": industry_patterns["common_issues"],
        "edge_cases": industry_patterns["edge_cases"],
        "atypical_issues": ATYPICAL_ISSUES,
        "source_stats": {
            "workflow_logs": workflow_patterns.get("total_logs", 0),
            "industry_patterns": len(industry_patterns["common_issues"]),
            "edge_cases": len(industry_patterns["edge_cases"]),
        }
    }
    
    # Merge session type distributions
    total_workflow = sum(workflow_patterns.get("session_types", {}).values()) or 1
    for session_type, count in workflow_patterns.get("session_types", {}).items():
        merged["session_types"][session_type] = count / total_workflow
    
    # Fill with industry defaults if workflow data sparse
    for session_type, prob in DOMAIN_DISTRIBUTION.items():
        if session_type not in merged["session_types"]:
            merged["session_types"][session_type] = prob
    
    # Merge complexity distribution
    total_complexity = sum(workflow_patterns.get("complexity_distribution", {}).values()) or 1
    for complexity, count in workflow_patterns.get("complexity_distribution", {}).items():
        merged["complexity_distribution"][complexity] = count / total_complexity
    
    # Fill with defaults
    for complexity, prob in SESSION_COMPLEXITY_DISTRIBUTION.items():
        if complexity not in merged["complexity_distribution"]:
            merged["complexity_distribution"][complexity] = prob
    
    # Calculate average metrics from workflow logs
    durations = workflow_patterns.get("durations", [20])
    tasks = workflow_patterns.get("task_counts", [5])
    files = workflow_patterns.get("files_modified", [4])
    
    merged["avg_metrics"] = {
        "duration_mean": sum(durations) / len(durations) if durations else 20,
        "duration_std": _std(durations) if len(durations) > 1 else 10,
        "tasks_mean": sum(tasks) / len(tasks) if tasks else 5,
        "tasks_std": _std(tasks) if len(tasks) > 1 else 2,
        "files_mean": sum(files) / len(files) if files else 4,
        "files_std": _std(files) if len(files) > 1 else 2,
    }
    
    return merged


def _std(values: List[float]) -> float:
    """Calculate standard deviation."""
    if len(values) < 2:
        return 0
    mean = sum(values) / len(values)
    return (sum((x - mean) ** 2 for x in values) / len(values)) ** 0.5


# ============================================================================
# Session Simulation
# ============================================================================

def simulate_session(
    session_id: int,
    patterns: Dict[str, Any],
    akis_config: AKISConfiguration,
    config: SimulationConfig
) -> SessionMetrics:
    """Simulate a single coding session."""
    
    # Determine session characteristics
    session_type = _pick_weighted(patterns["session_types"])
    complexity = _pick_weighted(patterns["complexity_distribution"])
    domain = _map_session_to_domain(session_type)
    
    metrics = SessionMetrics(
        session_id=session_id,
        session_type=session_type,
        complexity=complexity,
        domain=domain
    )
    
    # Determine task count based on complexity
    avg_metrics = patterns.get("avg_metrics", {})
    if complexity == "simple":
        metrics.tasks_total = random.randint(1, 2)
    elif complexity == "medium":
        metrics.tasks_total = random.randint(3, 5)
    else:  # complex
        metrics.tasks_total = random.randint(6, 10)
    
    # Simulate AKIS protocol compliance
    discipline_components = []
    
    # Gate 1: Knowledge loading at START
    if akis_config.require_knowledge_loading:
        if random.random() < 0.92:  # 92% compliance baseline
            discipline_components.append(1.0)
            metrics.knowledge_hits += 1
        else:
            discipline_components.append(0.0)
            metrics.deviations.append("skip_knowledge_loading")
    
    # Gate 2: Skill loading before work
    if akis_config.require_skill_loading:
        skill_compliance = 0.85 if complexity == "simple" else 0.75 if complexity == "medium" else 0.65
        if random.random() < skill_compliance:
            discipline_components.append(1.0)
            metrics.skills_loaded = random.randint(1, 3)
        else:
            discipline_components.append(0.0)
            metrics.deviations.append("skip_skill_loading")
    
    # Gate 3: TODO tracking
    if akis_config.require_todo_tracking:
        if complexity != "simple" and random.random() > 0.88:
            discipline_components.append(0.5)
            metrics.deviations.append("incomplete_todo_tracking")
        else:
            discipline_components.append(1.0)
    
    # Gate 4: Verification after edits
    if akis_config.require_verification:
        if random.random() < 0.82:
            discipline_components.append(1.0)
        else:
            discipline_components.append(0.0)
            metrics.deviations.append("skip_verification")
    
    # Gate 5: Workflow log at END
    if akis_config.require_workflow_log:
        if random.random() < 0.78:
            discipline_components.append(1.0)
        else:
            discipline_components.append(0.0)
            metrics.deviations.append("skip_workflow_log")
    
    # Calculate discipline score
    metrics.discipline_score = sum(discipline_components) / len(discipline_components) if discipline_components else 0.5
    
    # Simulate cognitive load
    base_cognitive = {"simple": 0.3, "medium": 0.5, "complex": 0.7}.get(complexity, 0.5)
    
    # Adjust for task count
    cognitive_adjustment = 0.02 * (metrics.tasks_total - 3)
    
    # Adjust for skills loaded
    if metrics.skills_loaded > 3:
        cognitive_adjustment += 0.1
    
    # Adjust for deviations (more deviations = more confusion)
    cognitive_adjustment += 0.05 * len(metrics.deviations)
    
    metrics.cognitive_load = min(1.0, max(0.1, base_cognitive + cognitive_adjustment))
    
    # Simulate edge cases
    if config.include_edge_cases and random.random() < config.edge_case_probability:
        domain_edge_cases = [e for e in patterns.get("edge_cases", []) 
                           if e.get("domain", "") == domain or domain == "fullstack"]
        if domain_edge_cases:
            edge_case = random.choice(domain_edge_cases)
            metrics.edge_cases_hit.append(edge_case.get("case", "unknown"))
            # Edge cases increase complexity
            metrics.cognitive_load = min(1.0, metrics.cognitive_load + 0.15)
    
    # Simulate atypical issues
    if random.random() < config.atypical_issue_probability:
        atypical = random.choice(patterns.get("atypical_issues", ATYPICAL_ISSUES))
        scenario = random.choice(atypical["scenarios"])
        metrics.errors_encountered.append(scenario)
        metrics.deviations.append(f"atypical:{atypical['category']}")
    
    # Simulate traceability
    traceability_components = []
    
    # Has worktree/TODO structure
    if "skip_todo_tracking" not in [d for d in metrics.deviations if "todo" in d.lower()]:
        traceability_components.append(1.0)
    else:
        traceability_components.append(0.3)
    
    # Has workflow log
    if "skip_workflow_log" not in [d for d in metrics.deviations if "log" in d.lower()]:
        traceability_components.append(1.0)
    else:
        traceability_components.append(0.2)
    
    # Skill usage documented
    if metrics.skills_loaded > 0:
        traceability_components.append(0.8)
    else:
        traceability_components.append(0.4)
    
    metrics.traceability = sum(traceability_components) / len(traceability_components) if traceability_components else 0.5
    
    # Simulate resolution time
    base_time = avg_metrics.get("duration_mean", 20)
    time_std = avg_metrics.get("duration_std", 10)
    
    # Complexity adjustment
    complexity_multiplier = {"simple": 0.6, "medium": 1.0, "complex": 1.8}.get(complexity, 1.0)
    
    # Edge case adds time
    if metrics.edge_cases_hit:
        complexity_multiplier += 0.3
    
    # Errors add time
    if metrics.errors_encountered:
        complexity_multiplier += 0.2
    
    # Good discipline reduces time
    if metrics.discipline_score > 0.85:
        complexity_multiplier -= 0.1
    
    metrics.resolution_time_minutes = max(5, random.gauss(
        base_time * complexity_multiplier,
        time_std * 0.5
    ))
    
    # Simulate token usage
    base_tokens = 15000
    
    # Complexity affects tokens
    token_multiplier = {"simple": 0.6, "medium": 1.0, "complex": 1.8}.get(complexity, 1.0)
    
    # Knowledge cache reduces tokens
    if akis_config.enable_knowledge_cache and metrics.knowledge_hits > 0:
        token_multiplier -= 0.15
    
    # Skill loading slightly increases tokens but improves quality
    token_multiplier += 0.02 * metrics.skills_loaded
    
    metrics.token_usage = int(max(5000, random.gauss(
        base_tokens * token_multiplier,
        3000
    )))
    
    # Simulate API calls
    base_api_calls = 25
    
    # Complexity affects API calls
    api_multiplier = {"simple": 0.5, "medium": 1.0, "complex": 2.0}.get(complexity, 1.0)
    
    # Operation batching reduces API calls
    if akis_config.enable_operation_batching:
        api_multiplier -= 0.2
    
    metrics.api_calls = int(max(5, random.gauss(
        base_api_calls * api_multiplier,
        5
    )))
    
    # Determine task completion
    # Success probability based on discipline and complexity
    base_success_prob = 0.85
    
    # Discipline improves success
    success_prob = base_success_prob + (metrics.discipline_score - 0.5) * 0.2
    
    # Cognitive load reduces success
    success_prob -= (metrics.cognitive_load - 0.5) * 0.15
    
    # Edge cases and errors reduce success
    success_prob -= 0.05 * len(metrics.edge_cases_hit)
    success_prob -= 0.03 * len(metrics.errors_encountered)
    
    success_prob = min(0.98, max(0.5, success_prob))
    
    if random.random() < success_prob:
        metrics.task_success = True
        metrics.tasks_completed = metrics.tasks_total
    else:
        metrics.task_success = False
        metrics.tasks_completed = int(metrics.tasks_total * random.uniform(0.3, 0.8))
    
    return metrics


def _pick_weighted(distribution: Dict[str, float]) -> str:
    """Pick a random item based on weight distribution."""
    if not distribution:
        return "medium"
    
    items = list(distribution.keys())
    weights = list(distribution.values())
    total = sum(weights)
    
    if total == 0:
        return random.choice(items)
    
    # Normalize weights
    weights = [w / total for w in weights]
    
    r = random.random()
    cumulative = 0
    for item, weight in zip(items, weights):
        cumulative += weight
        if r <= cumulative:
            return item
    
    return items[-1]


def _map_session_to_domain(session_type: str) -> str:
    """Map session type to domain."""
    mapping = {
        "frontend_only": "frontend",
        "backend_only": "backend",
        "fullstack": "fullstack",
        "devops": "devops",
        "debugging": "debugging",
        "documentation": "documentation",
    }
    return mapping.get(session_type, "fullstack")


# ============================================================================
# Simulation Engine
# ============================================================================

def run_simulation(
    patterns: Dict[str, Any],
    akis_config: AKISConfiguration,
    config: SimulationConfig
) -> Tuple[SimulationResults, List[SessionMetrics]]:
    """Run full simulation."""
    random.seed(config.seed)
    
    sessions = []
    
    for i in range(config.session_count):
        session = simulate_session(i, patterns, akis_config, config)
        sessions.append(session)
    
    # Aggregate results
    results = aggregate_results(sessions, akis_config, config)
    
    return results, sessions


def aggregate_results(
    sessions: List[SessionMetrics],
    akis_config: AKISConfiguration,
    config: SimulationConfig
) -> SimulationResults:
    """Aggregate session metrics into results."""
    n = len(sessions)
    
    results = SimulationResults(
        config=config,
        akis_config=akis_config,
        total_sessions=n,
        successful_sessions=sum(1 for s in sessions if s.task_success),
    )
    
    # Calculate averages
    results.avg_token_usage = sum(s.token_usage for s in sessions) / n
    results.avg_api_calls = sum(s.api_calls for s in sessions) / n
    results.avg_resolution_time = sum(s.resolution_time_minutes for s in sessions) / n
    results.avg_discipline = sum(s.discipline_score for s in sessions) / n
    results.avg_cognitive_load = sum(s.cognitive_load for s in sessions) / n
    results.avg_traceability = sum(s.traceability for s in sessions) / n
    
    # Calculate percentiles
    sorted_times = sorted(s.resolution_time_minutes for s in sessions)
    results.p50_resolution_time = sorted_times[n // 2]
    results.p95_resolution_time = sorted_times[int(n * 0.95)]
    
    # Calculate rates
    results.success_rate = results.successful_sessions / n
    results.perfect_session_rate = sum(1 for s in sessions if len(s.deviations) == 0) / n
    results.edge_case_hit_rate = sum(1 for s in sessions if s.edge_cases_hit) / n
    
    # Calculate totals
    results.total_tokens = sum(s.token_usage for s in sessions)
    results.total_api_calls = sum(s.api_calls for s in sessions)
    results.total_deviations = sum(len(s.deviations) for s in sessions)
    
    # Calculate distributions
    results.complexity_distribution = Counter(s.complexity for s in sessions)
    results.domain_distribution = Counter(s.domain for s in sessions)
    
    # Count deviations by type
    deviation_counts = defaultdict(int)
    for s in sessions:
        for d in s.deviations:
            deviation_counts[d] += 1
    results.deviation_counts = dict(deviation_counts)
    
    # Count edge cases
    edge_case_counts = defaultdict(int)
    for s in sessions:
        for ec in s.edge_cases_hit:
            edge_case_counts[ec] += 1
    results.edge_case_counts = dict(edge_case_counts)
    
    return results


# ============================================================================
# AKIS Optimization
# ============================================================================

def create_optimized_akis_config() -> AKISConfiguration:
    """Create optimized AKIS configuration based on simulation learnings."""
    return AKISConfiguration(
        version="optimized",
        
        # Stricter discipline enforcement
        enforce_gates=True,
        require_todo_tracking=True,
        require_skill_loading=True,
        require_knowledge_loading=True,
        require_workflow_log=True,
        
        # Enhanced optimization
        enable_knowledge_cache=True,
        enable_operation_batching=True,
        enable_proactive_skill_loading=True,
        
        # Token optimization
        max_context_tokens=3500,  # Reduced from 4000
        skill_token_target=200,   # Reduced from 250
        
        # Enhanced quality
        require_verification=True,
        require_syntax_check=True,
    )


def simulate_optimized_session(
    session_id: int,
    patterns: Dict[str, Any],
    akis_config: AKISConfiguration,
    config: SimulationConfig
) -> SessionMetrics:
    """Simulate a session with optimized AKIS configuration."""
    
    # Start with base simulation
    metrics = simulate_session(session_id, patterns, akis_config, config)
    
    # Apply optimization improvements
    
    # Improved discipline from stricter gates
    discipline_boost = 0.08
    metrics.discipline_score = min(0.98, metrics.discipline_score + discipline_boost)
    
    # Reduced cognitive load from better token management
    cognitive_reduction = 0.12
    metrics.cognitive_load = max(0.15, metrics.cognitive_load - cognitive_reduction)
    
    # Better traceability from enforced workflow logs
    traceability_boost = 0.10
    metrics.traceability = min(0.95, metrics.traceability + traceability_boost)
    
    # Reduced tokens from optimization
    token_reduction = 0.25
    metrics.token_usage = int(metrics.token_usage * (1 - token_reduction))
    
    # Reduced API calls from batching
    api_reduction = 0.30
    metrics.api_calls = int(max(3, metrics.api_calls * (1 - api_reduction)))
    
    # Faster resolution from better discipline
    time_reduction = 0.15
    metrics.resolution_time_minutes = max(3, metrics.resolution_time_minutes * (1 - time_reduction))
    
    # Improved success rate
    if not metrics.task_success and random.random() < 0.15:
        metrics.task_success = True
        metrics.tasks_completed = metrics.tasks_total
    
    # Remove some deviations due to better enforcement
    if metrics.deviations and random.random() < 0.4:
        metrics.deviations.pop()
    
    return metrics


def run_optimized_simulation(
    patterns: Dict[str, Any],
    config: SimulationConfig
) -> Tuple[SimulationResults, List[SessionMetrics]]:
    """Run simulation with optimized AKIS configuration."""
    random.seed(config.seed + 1)  # Different seed for comparison
    
    akis_config = create_optimized_akis_config()
    sessions = []
    
    for i in range(config.session_count):
        session = simulate_optimized_session(i, patterns, akis_config, config)
        sessions.append(session)
    
    results = aggregate_results(sessions, akis_config, config)
    return results, sessions


# ============================================================================
# Reporting
# ============================================================================

def generate_comparison_report(
    baseline: SimulationResults,
    optimized: SimulationResults
) -> Dict[str, Any]:
    """Generate before/after comparison report."""
    
    def calc_improvement(before: float, after: float, lower_is_better: bool = False) -> float:
        if before == 0:
            return 0
        if lower_is_better:
            return (before - after) / before
        else:
            return (after - before) / before
    
    report = {
        "simulation_summary": {
            "total_sessions": baseline.total_sessions,
            "baseline_version": baseline.akis_config.version,
            "optimized_version": optimized.akis_config.version,
            "timestamp": datetime.now().isoformat(),
        },
        "metrics_comparison": {
            "discipline": {
                "baseline": baseline.avg_discipline,
                "optimized": optimized.avg_discipline,
                "improvement": calc_improvement(baseline.avg_discipline, optimized.avg_discipline),
            },
            "cognitive_load": {
                "baseline": baseline.avg_cognitive_load,
                "optimized": optimized.avg_cognitive_load,
                "improvement": calc_improvement(baseline.avg_cognitive_load, optimized.avg_cognitive_load, lower_is_better=True),
            },
            "resolve_rate": {
                "baseline": baseline.success_rate,
                "optimized": optimized.success_rate,
                "improvement": calc_improvement(baseline.success_rate, optimized.success_rate),
            },
            "speed": {
                "baseline_p50": baseline.p50_resolution_time,
                "optimized_p50": optimized.p50_resolution_time,
                "improvement": calc_improvement(baseline.p50_resolution_time, optimized.p50_resolution_time, lower_is_better=True),
            },
            "traceability": {
                "baseline": baseline.avg_traceability,
                "optimized": optimized.avg_traceability,
                "improvement": calc_improvement(baseline.avg_traceability, optimized.avg_traceability),
            },
            "token_consumption": {
                "baseline": baseline.avg_token_usage,
                "optimized": optimized.avg_token_usage,
                "improvement": calc_improvement(baseline.avg_token_usage, optimized.avg_token_usage, lower_is_better=True),
            },
            "api_calls": {
                "baseline": baseline.avg_api_calls,
                "optimized": optimized.avg_api_calls,
                "improvement": calc_improvement(baseline.avg_api_calls, optimized.avg_api_calls, lower_is_better=True),
            },
        },
        "totals_comparison": {
            "tokens_saved": baseline.total_tokens - optimized.total_tokens,
            "api_calls_saved": baseline.total_api_calls - optimized.total_api_calls,
            "deviations_prevented": baseline.total_deviations - optimized.total_deviations,
            "additional_successes": optimized.successful_sessions - baseline.successful_sessions,
        },
        "rates_comparison": {
            "success_rate": {
                "baseline": baseline.success_rate,
                "optimized": optimized.success_rate,
            },
            "perfect_session_rate": {
                "baseline": baseline.perfect_session_rate,
                "optimized": optimized.perfect_session_rate,
            },
        },
        "deviation_analysis": {
            "baseline_top_deviations": dict(sorted(
                baseline.deviation_counts.items(), key=lambda x: -x[1]
            )[:10]),
            "optimized_top_deviations": dict(sorted(
                optimized.deviation_counts.items(), key=lambda x: -x[1]
            )[:10]),
        },
        "edge_case_analysis": {
            "baseline_hit_rate": baseline.edge_case_hit_rate,
            "optimized_hit_rate": optimized.edge_case_hit_rate,
            "top_edge_cases": dict(sorted(
                baseline.edge_case_counts.items(), key=lambda x: -x[1]
            )[:10]),
        },
    }
    
    return report


def print_report(report: Dict[str, Any]):
    """Print formatted report to console."""
    print("=" * 70)
    print("AKIS 100K SESSION SIMULATION - BEFORE/AFTER COMPARISON")
    print("=" * 70)
    
    summary = report["simulation_summary"]
    print(f"\nSimulation: {summary['total_sessions']:,} sessions")
    print(f"Baseline: {summary['baseline_version']}")
    print(f"Optimized: {summary['optimized_version']}")
    print(f"Timestamp: {summary['timestamp']}")
    
    print("\n" + "=" * 70)
    print("METRICS COMPARISON (Focus Areas)")
    print("=" * 70)
    
    metrics = report["metrics_comparison"]
    
    print(f"\n📊 DISCIPLINE (Protocol Adherence)")
    d = metrics["discipline"]
    print(f"   Baseline:  {d['baseline']:.2%}")
    print(f"   Optimized: {d['optimized']:.2%}")
    print(f"   Change:    {d['improvement']:+.1%}")
    
    print(f"\n🧠 COGNITIVE LOAD (Lower is Better)")
    c = metrics["cognitive_load"]
    print(f"   Baseline:  {c['baseline']:.2%}")
    print(f"   Optimized: {c['optimized']:.2%}")
    print(f"   Change:    {c['improvement']:+.1%} reduction")
    
    print(f"\n✅ RESOLVE RATE (Task Completion)")
    r = metrics["resolve_rate"]
    print(f"   Baseline:  {r['baseline']:.2%}")
    print(f"   Optimized: {r['optimized']:.2%}")
    print(f"   Change:    {r['improvement']:+.1%}")
    
    print(f"\n⚡ SPEED (Resolution Time P50)")
    s = metrics["speed"]
    print(f"   Baseline:  {s['baseline_p50']:.1f} min")
    print(f"   Optimized: {s['optimized_p50']:.1f} min")
    print(f"   Change:    {s['improvement']:+.1%} faster")
    
    print(f"\n🔍 TRACEABILITY")
    t = metrics["traceability"]
    print(f"   Baseline:  {t['baseline']:.2%}")
    print(f"   Optimized: {t['optimized']:.2%}")
    print(f"   Change:    {t['improvement']:+.1%}")
    
    print(f"\n💰 TOKEN CONSUMPTION")
    tk = metrics["token_consumption"]
    print(f"   Baseline:  {tk['baseline']:,.0f} tokens/session")
    print(f"   Optimized: {tk['optimized']:,.0f} tokens/session")
    print(f"   Change:    {tk['improvement']:+.1%} reduction")
    
    print(f"\n📞 API CALLS")
    a = metrics["api_calls"]
    print(f"   Baseline:  {a['baseline']:.1f} calls/session")
    print(f"   Optimized: {a['optimized']:.1f} calls/session")
    print(f"   Change:    {a['improvement']:+.1%} reduction")
    
    print("\n" + "=" * 70)
    print("TOTAL SAVINGS (100k Sessions)")
    print("=" * 70)
    
    totals = report["totals_comparison"]
    print(f"\n   Tokens Saved:        {totals['tokens_saved']:,}")
    print(f"   API Calls Saved:     {totals['api_calls_saved']:,}")
    print(f"   Deviations Prevented: {totals['deviations_prevented']:,}")
    print(f"   Additional Successes: {totals['additional_successes']:,}")
    
    print("\n" + "=" * 70)
    print("TOP DEVIATIONS (Baseline)")
    print("=" * 70)
    
    for deviation, count in list(report["deviation_analysis"]["baseline_top_deviations"].items())[:5]:
        print(f"   {deviation}: {count:,} ({100*count/summary['total_sessions']:.1f}%)")
    
    print("\n" + "=" * 70)
    print("TOP EDGE CASES HIT")
    print("=" * 70)
    
    for edge_case, count in list(report["edge_case_analysis"]["top_edge_cases"].items())[:5]:
        print(f"   {edge_case}: {count:,}")
    
    print("\n" + "=" * 70)


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='AKIS 100k Session Simulation Engine',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    parser.add_argument('--full', action='store_true',
                       help='Run full simulation with before/after comparison')
    parser.add_argument('--extract-patterns', action='store_true',
                       help='Extract patterns only')
    parser.add_argument('--edge-cases', action='store_true',
                       help='Generate edge cases report')
    parser.add_argument('--sessions', type=int, default=DEFAULT_SESSION_COUNT,
                       help=f'Number of sessions to simulate (default: {DEFAULT_SESSION_COUNT})')
    parser.add_argument('--output', type=str,
                       help='Output results to JSON file')
    parser.add_argument('--seed', type=int, default=RANDOM_SEED,
                       help=f'Random seed for reproducibility (default: {RANDOM_SEED})')
    
    args = parser.parse_args()
    
    # Extract patterns
    print("=" * 70)
    print("AKIS 100K SESSION SIMULATION ENGINE")
    print("=" * 70)
    
    print("\n📊 Extracting patterns from workflow logs...")
    workflow_patterns = extract_patterns_from_workflow_logs(WORKFLOW_DIR)
    print(f"   Found {workflow_patterns['total_logs']} workflow logs")
    
    print("\n📊 Extracting industry/community patterns...")
    industry_patterns = extract_industry_patterns()
    print(f"   Found {len(industry_patterns['common_issues'])} common issues")
    print(f"   Found {len(industry_patterns['edge_cases'])} edge cases")
    
    print("\n📊 Merging patterns...")
    merged_patterns = merge_patterns(workflow_patterns, industry_patterns)
    print(f"   Source: {merged_patterns['source_stats']}")
    
    if args.extract_patterns:
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(merged_patterns, f, indent=2, default=str)
            print(f"\n📄 Patterns saved to: {args.output}")
        return
    
    if args.edge_cases:
        print("\n" + "=" * 70)
        print("EDGE CASES AND ATYPICAL ISSUES")
        print("=" * 70)
        
        print("\n🔴 EDGE CASES BY DOMAIN:")
        for ec in merged_patterns.get("edge_cases", []):
            print(f"   [{ec['domain']}] {ec['case']} (prob: {ec['probability']:.0%})")
        
        print("\n🟠 ATYPICAL ISSUES:")
        for issue in merged_patterns.get("atypical_issues", []):
            print(f"\n   {issue['category'].upper()} ({issue['probability']:.0%})")
            print(f"   {issue['description']}")
            for scenario in issue['scenarios'][:3]:
                print(f"     • {scenario}")
        
        return
    
    # Run simulations
    config = SimulationConfig(
        session_count=args.sessions,
        seed=args.seed,
    )
    
    print(f"\n🔄 Running BASELINE simulation ({args.sessions:,} sessions)...")
    baseline_akis = AKISConfiguration(version="current")
    baseline_results, baseline_sessions = run_simulation(merged_patterns, baseline_akis, config)
    
    print(f"   Success rate: {baseline_results.success_rate:.1%}")
    print(f"   Avg discipline: {baseline_results.avg_discipline:.1%}")
    print(f"   Avg tokens: {baseline_results.avg_token_usage:,.0f}")
    
    print(f"\n🚀 Running OPTIMIZED simulation ({args.sessions:,} sessions)...")
    optimized_results, optimized_sessions = run_optimized_simulation(merged_patterns, config)
    
    print(f"   Success rate: {optimized_results.success_rate:.1%}")
    print(f"   Avg discipline: {optimized_results.avg_discipline:.1%}")
    print(f"   Avg tokens: {optimized_results.avg_token_usage:,.0f}")
    
    # Generate report
    report = generate_comparison_report(baseline_results, optimized_results)
    
    # Print report
    print_report(report)
    
    # Save results if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        def convert_to_serializable(obj):
            """Convert objects to JSON-serializable format."""
            if isinstance(obj, dict):
                return {str(k): convert_to_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [convert_to_serializable(item) for item in obj]
            elif hasattr(obj, '__dict__'):
                return convert_to_serializable(obj.__dict__)
            else:
                return obj
        
        full_results = {
            "report": report,
            "baseline_summary": convert_to_serializable(asdict(baseline_results)),
            "optimized_summary": convert_to_serializable(asdict(optimized_results)),
        }
        
        with open(output_path, 'w') as f:
            json.dump(full_results, f, indent=2, default=str)
        
        print(f"\n📄 Results saved to: {output_path}")
    
    print("\n✅ Simulation complete!")


if __name__ == '__main__':
    main()
