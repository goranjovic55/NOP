#!/usr/bin/env python3
"""
session.json Proposal Simulation v1.0

100k session simulation comparing AKIS workflow WITH and WITHOUT session.json
central state tracking.

Measures:
- Cognitive Load: Complexity of managing state
- Token Usage: Parse/update overhead
- API Calls: File I/O operations
- Resolution Speed: Time to complete tasks
- Traceability: Ability to recover/audit
- Failure Modes: Staleness, sync conflicts, parse errors

Usage:
    python simulate_session_json.py --full           # Full 100k simulation
    python simulate_session_json.py --quick          # Quick 10k sample
    python simulate_session_json.py --output FILE   # Save to JSON

Author: AKIS Framework Analysis
Date: 2026-01-15
"""

import json
import random
import argparse
from collections import defaultdict, Counter
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Tuple
from pathlib import Path
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================

RANDOM_SEED = 42

# Session complexity distribution (from AKIS workflow logs)
COMPLEXITY_DISTRIBUTION = {
    "simple": 0.35,   # 1-2 tasks
    "medium": 0.45,   # 3-5 tasks  
    "complex": 0.20,  # 6+ tasks (delegation threshold)
}

# Domain distribution
DOMAIN_DISTRIBUTION = {
    "frontend_only": 0.24,
    "backend_only": 0.10,
    "fullstack": 0.40,
    "devops": 0.10,
    "debugging": 0.10,
    "documentation": 0.06,
}

# Task counts by complexity
TASK_COUNTS = {
    "simple": (1, 2),
    "medium": (3, 5),
    "complex": (6, 10),
}

# session.json overhead parameters
SESSION_JSON_OVERHEAD = {
    # File operations
    "writes_per_task_status_change": 1,
    "avg_status_changes_per_task": 3,  # pending → working → done
    "file_read_on_resume": 2,
    
    # Token costs
    "tokens_per_json_read": 200,
    "tokens_per_json_write": 250,
    "tokens_per_parse_validation": 50,
    
    # Latency
    "latency_ms_per_io": 200,
    
    # Failure probabilities
    "staleness_probability": 0.08,        # 8% crash before update
    "sync_conflict_probability": 0.03,    # 3% parallel write race
    "parse_error_probability": 0.02,      # 2% corruption
    "forgotten_update_probability": 0.12, # 12% agent forgets to update
}

# Baseline AKIS v7.4 metrics
BASELINE_METRICS = {
    "file_writes_per_session": 2,  # session-tracker + workflow log
    "tokens_per_session": 3200,    # From knowledge.py simulation
    "api_calls_per_session": 25.3,
    "resolution_time_simple": 10.0,
    "resolution_time_medium": 18.0,
    "resolution_time_complex": 35.0,
    "cognitive_load_simple": 0.30,
    "cognitive_load_medium": 0.45,
    "cognitive_load_complex": 0.65,
    "traceability_score": 0.87,
    "success_rate_simple": 0.95,
    "success_rate_medium": 0.88,
    "success_rate_complex": 0.75,
}


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class SessionResult:
    """Result from a single simulated session."""
    session_id: int
    complexity: str
    domain: str
    task_count: int
    
    # Core metrics
    file_writes: int = 0
    token_usage: int = 0
    api_calls: int = 0
    resolution_time_minutes: float = 0.0
    
    # Quality metrics
    cognitive_load: float = 0.0
    traceability: float = 0.0
    
    # Outcome
    success: bool = True
    
    # Failure modes
    staleness_incident: bool = False
    sync_conflict: bool = False
    parse_error: bool = False
    forgotten_update: bool = False
    
    # Delegation
    delegation_used: bool = False
    parallel_agents: int = 0


@dataclass  
class SimulationResults:
    """Aggregated results from simulation."""
    name: str
    total_sessions: int
    
    # Averages
    avg_file_writes: float = 0.0
    avg_tokens: float = 0.0
    avg_api_calls: float = 0.0
    avg_resolution_time: float = 0.0
    avg_cognitive_load: float = 0.0
    avg_traceability: float = 0.0
    
    # Totals
    total_tokens: int = 0
    total_file_writes: int = 0
    total_api_calls: int = 0
    
    # Rates
    success_rate: float = 0.0
    staleness_rate: float = 0.0
    sync_conflict_rate: float = 0.0
    parse_error_rate: float = 0.0
    
    # P50/P95
    p50_resolution_time: float = 0.0
    p95_resolution_time: float = 0.0
    
    # By complexity
    metrics_by_complexity: Dict[str, Dict[str, float]] = field(default_factory=dict)


# ============================================================================
# Simulation Functions
# ============================================================================

def pick_weighted(distribution: Dict[str, float]) -> str:
    """Pick a value from weighted distribution."""
    items = list(distribution.keys())
    weights = list(distribution.values())
    return random.choices(items, weights=weights)[0]


def simulate_session_without_session_json(session_id: int) -> SessionResult:
    """Simulate a session WITHOUT session.json (baseline AKIS v7.4)."""
    
    complexity = pick_weighted(COMPLEXITY_DISTRIBUTION)
    domain = pick_weighted(DOMAIN_DISTRIBUTION)
    
    task_min, task_max = TASK_COUNTS[complexity]
    task_count = random.randint(task_min, task_max)
    
    result = SessionResult(
        session_id=session_id,
        complexity=complexity,
        domain=domain,
        task_count=task_count,
    )
    
    # File writes: session-tracker + workflow log = 2
    result.file_writes = BASELINE_METRICS["file_writes_per_session"]
    
    # Tokens: baseline usage
    base_tokens = BASELINE_METRICS["tokens_per_session"]
    complexity_multiplier = {"simple": 0.7, "medium": 1.0, "complex": 1.5}[complexity]
    result.token_usage = int(base_tokens * complexity_multiplier * random.uniform(0.9, 1.1))
    
    # API calls
    base_api = BASELINE_METRICS["api_calls_per_session"]
    result.api_calls = int(base_api * complexity_multiplier * random.uniform(0.85, 1.15))
    
    # Resolution time
    base_time = BASELINE_METRICS[f"resolution_time_{complexity}"]
    result.resolution_time_minutes = base_time * random.uniform(0.8, 1.2)
    
    # Cognitive load
    result.cognitive_load = BASELINE_METRICS[f"cognitive_load_{complexity}"]
    result.cognitive_load += random.uniform(-0.05, 0.05)
    result.cognitive_load = max(0.1, min(1.0, result.cognitive_load))
    
    # Traceability
    result.traceability = BASELINE_METRICS["traceability_score"]
    result.traceability += random.uniform(-0.03, 0.03)
    
    # Success rate
    success_prob = BASELINE_METRICS[f"success_rate_{complexity}"]
    result.success = random.random() < success_prob
    
    # No failure modes in baseline (no external state file)
    result.staleness_incident = False
    result.sync_conflict = False
    result.parse_error = False
    
    # Delegation for complex sessions
    if complexity == "complex" and random.random() < 0.70:
        result.delegation_used = True
        result.parallel_agents = random.randint(1, 3)
    
    return result


def simulate_session_with_session_json(session_id: int) -> SessionResult:
    """Simulate a session WITH session.json tracking."""
    
    complexity = pick_weighted(COMPLEXITY_DISTRIBUTION)
    domain = pick_weighted(DOMAIN_DISTRIBUTION)
    
    task_min, task_max = TASK_COUNTS[complexity]
    task_count = random.randint(task_min, task_max)
    
    result = SessionResult(
        session_id=session_id,
        complexity=complexity,
        domain=domain,
        task_count=task_count,
    )
    
    overhead = SESSION_JSON_OVERHEAD
    
    # File writes: baseline + session.json updates
    status_changes = task_count * overhead["avg_status_changes_per_task"]
    session_json_writes = int(status_changes * overhead["writes_per_task_status_change"])
    result.file_writes = BASELINE_METRICS["file_writes_per_session"] + session_json_writes
    
    # Tokens: baseline + parse/update overhead
    base_tokens = BASELINE_METRICS["tokens_per_session"]
    complexity_multiplier = {"simple": 0.7, "medium": 1.0, "complex": 1.5}[complexity]
    
    # Add session.json token overhead
    json_reads = overhead["file_read_on_resume"] + 1  # Initial + resumes
    json_writes = session_json_writes
    token_overhead = (
        json_reads * overhead["tokens_per_json_read"] +
        json_writes * overhead["tokens_per_json_write"] +
        (json_reads + json_writes) * overhead["tokens_per_parse_validation"]
    )
    
    result.token_usage = int(
        base_tokens * complexity_multiplier * random.uniform(0.9, 1.1) + token_overhead
    )
    
    # API calls: add file I/O operations
    base_api = BASELINE_METRICS["api_calls_per_session"]
    api_overhead = json_reads + json_writes
    result.api_calls = int(
        base_api * complexity_multiplier * random.uniform(0.85, 1.15) + api_overhead
    )
    
    # Resolution time: add I/O latency
    base_time = BASELINE_METRICS[f"resolution_time_{complexity}"]
    io_latency_minutes = (
        (json_reads + json_writes) * overhead["latency_ms_per_io"] / 1000 / 60
    )
    result.resolution_time_minutes = base_time * random.uniform(0.8, 1.2) + io_latency_minutes
    
    # Cognitive load: increased due to tracking another state file
    base_cognitive = BASELINE_METRICS[f"cognitive_load_{complexity}"]
    cognitive_overhead = 0.07  # +7% cognitive load from managing session.json
    result.cognitive_load = base_cognitive + cognitive_overhead
    result.cognitive_load += random.uniform(-0.05, 0.05)
    result.cognitive_load = max(0.1, min(1.0, result.cognitive_load))
    
    # Traceability: slightly improved
    result.traceability = BASELINE_METRICS["traceability_score"] + 0.05
    result.traceability += random.uniform(-0.02, 0.02)
    result.traceability = min(1.0, result.traceability)
    
    # Failure modes
    result.staleness_incident = random.random() < overhead["staleness_probability"]
    result.forgotten_update = random.random() < overhead["forgotten_update_probability"]
    result.parse_error = random.random() < overhead["parse_error_probability"]
    
    # Delegation for complex sessions
    if complexity == "complex" and random.random() < 0.70:
        result.delegation_used = True
        result.parallel_agents = random.randint(1, 3)
        
        # Sync conflicts more likely with parallel agents
        if result.parallel_agents >= 2:
            conflict_prob = overhead["sync_conflict_probability"] * result.parallel_agents
            result.sync_conflict = random.random() < conflict_prob
    
    # Success rate: reduced by failure modes
    base_success = BASELINE_METRICS[f"success_rate_{complexity}"]
    failure_penalty = 0
    if result.staleness_incident:
        failure_penalty += 0.15
    if result.sync_conflict:
        failure_penalty += 0.20
    if result.parse_error:
        failure_penalty += 0.25
    if result.forgotten_update:
        failure_penalty += 0.05
    
    success_prob = max(0.3, base_success - failure_penalty)
    result.success = random.random() < success_prob
    
    return result


def aggregate_results(sessions: List[SessionResult], name: str) -> SimulationResults:
    """Aggregate individual session results."""
    n = len(sessions)
    
    results = SimulationResults(
        name=name,
        total_sessions=n,
    )
    
    # Calculate averages
    results.avg_file_writes = sum(s.file_writes for s in sessions) / n
    results.avg_tokens = sum(s.token_usage for s in sessions) / n
    results.avg_api_calls = sum(s.api_calls for s in sessions) / n
    results.avg_resolution_time = sum(s.resolution_time_minutes for s in sessions) / n
    results.avg_cognitive_load = sum(s.cognitive_load for s in sessions) / n
    results.avg_traceability = sum(s.traceability for s in sessions) / n
    
    # Calculate totals
    results.total_tokens = sum(s.token_usage for s in sessions)
    results.total_file_writes = sum(s.file_writes for s in sessions)
    results.total_api_calls = sum(s.api_calls for s in sessions)
    
    # Calculate rates
    results.success_rate = sum(1 for s in sessions if s.success) / n
    results.staleness_rate = sum(1 for s in sessions if s.staleness_incident) / n
    results.sync_conflict_rate = sum(1 for s in sessions if s.sync_conflict) / n
    results.parse_error_rate = sum(1 for s in sessions if s.parse_error) / n
    
    # Calculate percentiles
    times = sorted(s.resolution_time_minutes for s in sessions)
    results.p50_resolution_time = times[int(n * 0.50)]
    results.p95_resolution_time = times[int(n * 0.95)]
    
    # Metrics by complexity
    for complexity in ["simple", "medium", "complex"]:
        complexity_sessions = [s for s in sessions if s.complexity == complexity]
        if complexity_sessions:
            cn = len(complexity_sessions)
            results.metrics_by_complexity[complexity] = {
                "count": cn,
                "pct": cn / n,
                "avg_tokens": sum(s.token_usage for s in complexity_sessions) / cn,
                "avg_time": sum(s.resolution_time_minutes for s in complexity_sessions) / cn,
                "avg_cognitive": sum(s.cognitive_load for s in complexity_sessions) / cn,
                "success_rate": sum(1 for s in complexity_sessions if s.success) / cn,
                "staleness_rate": sum(1 for s in complexity_sessions if s.staleness_incident) / cn,
            }
    
    return results


def run_simulation(n_sessions: int = 100000, seed: int = RANDOM_SEED) -> Dict[str, Any]:
    """Run full 100k simulation comparison."""
    
    print(f"\n{'='*70}")
    print(f"SESSION.JSON PROPOSAL - 100K SIMULATION")
    print(f"{'='*70}")
    print(f"\nSimulating {n_sessions:,} sessions...")
    
    # Run baseline simulation (WITHOUT session.json)
    print(f"\n🔄 Running BASELINE (without session.json)...")
    random.seed(seed)
    baseline_sessions = [
        simulate_session_without_session_json(i) 
        for i in range(n_sessions)
    ]
    baseline_results = aggregate_results(baseline_sessions, "WITHOUT session.json")
    print(f"   ✓ Complete")
    
    # Run proposed simulation (WITH session.json)
    print(f"\n🔄 Running PROPOSED (with session.json)...")
    random.seed(seed)  # Same seed for fair comparison
    proposed_sessions = [
        simulate_session_with_session_json(i)
        for i in range(n_sessions)
    ]
    proposed_results = aggregate_results(proposed_sessions, "WITH session.json")
    print(f"   ✓ Complete")
    
    # Calculate deltas
    deltas = {
        "file_writes": (proposed_results.avg_file_writes - baseline_results.avg_file_writes) / baseline_results.avg_file_writes,
        "tokens": (proposed_results.avg_tokens - baseline_results.avg_tokens) / baseline_results.avg_tokens,
        "api_calls": (proposed_results.avg_api_calls - baseline_results.avg_api_calls) / baseline_results.avg_api_calls,
        "resolution_time": (proposed_results.avg_resolution_time - baseline_results.avg_resolution_time) / baseline_results.avg_resolution_time,
        "cognitive_load": (proposed_results.avg_cognitive_load - baseline_results.avg_cognitive_load) / baseline_results.avg_cognitive_load,
        "traceability": (proposed_results.avg_traceability - baseline_results.avg_traceability) / baseline_results.avg_traceability,
        "success_rate": (proposed_results.success_rate - baseline_results.success_rate) / baseline_results.success_rate,
    }
    
    # Calculate cost-benefit ratio
    costs = abs(deltas["file_writes"]) + abs(deltas["tokens"]) + abs(deltas["cognitive_load"]) + abs(1 - baseline_results.success_rate/proposed_results.success_rate)
    benefits = max(0, deltas["traceability"])
    cost_benefit_ratio = costs / max(0.01, benefits)
    
    # Print report
    print(f"\n{'='*70}")
    print(f"SIMULATION RESULTS")
    print(f"{'='*70}")
    
    print(f"\n📊 CORE METRICS COMPARISON")
    print(f"{'─'*50}")
    print(f"{'Metric':<25} {'Baseline':>12} {'Proposed':>12} {'Delta':>10}")
    print(f"{'─'*50}")
    
    print(f"{'File Writes/Session':<25} {baseline_results.avg_file_writes:>12.1f} {proposed_results.avg_file_writes:>12.1f} {deltas['file_writes']:>+10.0%}")
    print(f"{'Tokens/Session':<25} {baseline_results.avg_tokens:>12,.0f} {proposed_results.avg_tokens:>12,.0f} {deltas['tokens']:>+10.1%}")
    print(f"{'API Calls/Session':<25} {baseline_results.avg_api_calls:>12.1f} {proposed_results.avg_api_calls:>12.1f} {deltas['api_calls']:>+10.1%}")
    print(f"{'Resolution Time (P50)':<25} {baseline_results.p50_resolution_time:>12.1f} {proposed_results.p50_resolution_time:>12.1f} {deltas['resolution_time']:>+10.1%}")
    print(f"{'Cognitive Load':<25} {baseline_results.avg_cognitive_load:>12.1%} {proposed_results.avg_cognitive_load:>12.1%} {deltas['cognitive_load']:>+10.1%}")
    print(f"{'Traceability':<25} {baseline_results.avg_traceability:>12.1%} {proposed_results.avg_traceability:>12.1%} {deltas['traceability']:>+10.1%}")
    print(f"{'Success Rate':<25} {baseline_results.success_rate:>12.1%} {proposed_results.success_rate:>12.1%} {deltas['success_rate']:>+10.1%}")
    
    print(f"\n📊 FAILURE MODES (session.json only)")
    print(f"{'─'*50}")
    print(f"{'Staleness Incidents':<25} {0:>12} {int(proposed_results.staleness_rate * n_sessions):>12,} ({proposed_results.staleness_rate:.1%})")
    print(f"{'Sync Conflicts':<25} {0:>12} {int(proposed_results.sync_conflict_rate * n_sessions):>12,} ({proposed_results.sync_conflict_rate:.1%})")
    print(f"{'Parse Errors':<25} {0:>12} {int(proposed_results.parse_error_rate * n_sessions):>12,} ({proposed_results.parse_error_rate:.1%})")
    
    print(f"\n📊 TOTALS OVER {n_sessions:,} SESSIONS")
    print(f"{'─'*50}")
    print(f"{'Total Tokens':<25} {baseline_results.total_tokens:>12,} {proposed_results.total_tokens:>12,}")
    print(f"{'Token Difference':<25} {'':>12} {proposed_results.total_tokens - baseline_results.total_tokens:>+12,}")
    print(f"{'Total File Writes':<25} {baseline_results.total_file_writes:>12,} {proposed_results.total_file_writes:>12,}")
    print(f"{'Total API Calls':<25} {baseline_results.total_api_calls:>12,} {proposed_results.total_api_calls:>12,}")
    
    print(f"\n📊 BY COMPLEXITY")
    print(f"{'─'*70}")
    print(f"{'Complexity':<12} {'Sessions':>10} {'Base Tokens':>14} {'Prop Tokens':>14} {'Base Success':>14} {'Prop Success':>14}")
    print(f"{'─'*70}")
    
    for complexity in ["simple", "medium", "complex"]:
        base_metrics = baseline_results.metrics_by_complexity.get(complexity, {})
        prop_metrics = proposed_results.metrics_by_complexity.get(complexity, {})
        if base_metrics:
            print(f"{complexity:<12} {int(base_metrics['count']):>10,} {base_metrics['avg_tokens']:>14,.0f} {prop_metrics['avg_tokens']:>14,.0f} {base_metrics['success_rate']:>14.1%} {prop_metrics['success_rate']:>14.1%}")
    
    print(f"\n{'='*70}")
    print(f"COST-BENEFIT ANALYSIS")
    print(f"{'='*70}")
    
    print(f"\n📉 COSTS (Higher is Worse)")
    print(f"   File I/O increase:     {deltas['file_writes']:>+.0%}")
    print(f"   Token overhead:        {deltas['tokens']:>+.1%}")
    print(f"   Cognitive load:        {deltas['cognitive_load']:>+.1%}")
    print(f"   Success rate drop:     {deltas['success_rate']:>+.1%}")
    print(f"   New failure modes:     {proposed_results.staleness_rate + proposed_results.sync_conflict_rate + proposed_results.parse_error_rate:>+.1%}")
    
    print(f"\n📈 BENEFITS (Higher is Better)")
    print(f"   Traceability gain:     {deltas['traceability']:>+.1%}")
    
    print(f"\n⚖️ COST-BENEFIT RATIO: {cost_benefit_ratio:.1f}:1 {'(NEGATIVE)' if cost_benefit_ratio > 1.5 else '(MARGINAL)' if cost_benefit_ratio > 1 else '(POSITIVE)'}")
    
    # Verdict
    print(f"\n{'='*70}")
    print(f"VERDICT")
    print(f"{'='*70}")
    
    if cost_benefit_ratio > 3:
        verdict = "🔴 DO NOT IMPLEMENT"
        confidence = "HIGH"
        reason = "Costs significantly outweigh benefits"
    elif cost_benefit_ratio > 1.5:
        verdict = "🟡 NOT RECOMMENDED"
        confidence = "MEDIUM"
        reason = "Marginal benefits do not justify overhead"
    else:
        verdict = "🟢 CONSIDER IMPLEMENTING"
        confidence = "LOW"
        reason = "Benefits may justify costs in specific scenarios"
    
    print(f"\n   {verdict}")
    print(f"   Confidence: {confidence}")
    print(f"   Reason: {reason}")
    
    # Return full data
    return {
        "simulation_info": {
            "n_sessions": n_sessions,
            "timestamp": datetime.now().isoformat(),
            "seed": seed,
        },
        "baseline": asdict(baseline_results),
        "proposed": asdict(proposed_results),
        "deltas": deltas,
        "cost_benefit_ratio": cost_benefit_ratio,
        "verdict": {
            "recommendation": verdict,
            "confidence": confidence,
            "reason": reason,
        },
    }


def main():
    parser = argparse.ArgumentParser(
        description='session.json Proposal Simulation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    parser.add_argument('--full', action='store_true',
                       help='Run full 100k simulation')
    parser.add_argument('--quick', action='store_true',
                       help='Run quick 10k simulation')
    parser.add_argument('--sessions', type=int, default=100000,
                       help='Number of sessions to simulate')
    parser.add_argument('--output', type=str,
                       help='Output results to JSON file')
    parser.add_argument('--seed', type=int, default=RANDOM_SEED,
                       help='Random seed for reproducibility')
    
    args = parser.parse_args()
    
    # Determine session count
    if args.quick:
        n_sessions = 10000
    elif args.full:
        n_sessions = 100000
    else:
        n_sessions = args.sessions
    
    # Run simulation
    results = run_simulation(n_sessions, args.seed)
    
    # Save if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n📄 Results saved to: {output_path}")
    
    print(f"\n✅ Simulation complete!")
    
    return results


if __name__ == '__main__':
    main()
