#!/usr/bin/env python3
"""
Single-Agent vs Multi-Agent (runSubagent) Simulation - 100k Sessions

Compares performance metrics to help decide if multi-agent orchestration
is worth the cognitive load overhead.

Usage:
    python .github/scripts/single_vs_multi_agent.py
    python .github/scripts/single_vs_multi_agent.py --sessions 50000
    python .github/scripts/single_vs_multi_agent.py --output results.json

Results from 100k simulation (2026-01-11):
    Single-Agent Success Rate: 82.1%
    Multi-Agent Success Rate: 89.9% (+9.5%)
    Token Savings: 47.1%
    Time Savings: 36.0%
    Verdict: STRONGLY RECOMMENDED
"""

import argparse
import json
import random
from dataclasses import dataclass
from typing import List, Dict, Tuple
from collections import defaultdict
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================

# Task type distribution (based on actual workflow patterns)
TASK_TYPES = {
    'simple_code_edit': {'probability': 0.25, 'files': (1, 2), 'complexity': 'simple'},
    'multi_file_code': {'probability': 0.15, 'files': (3, 6), 'complexity': 'medium'},
    'complex_feature': {'probability': 0.10, 'files': (6, 15), 'complexity': 'complex'},
    'debugging': {'probability': 0.18, 'files': (1, 5), 'complexity': 'varies'},
    'documentation': {'probability': 0.08, 'files': (1, 4), 'complexity': 'simple'},
    'research': {'probability': 0.07, 'files': (0, 2), 'complexity': 'varies'},
    'review': {'probability': 0.07, 'files': (2, 10), 'complexity': 'medium'},
    'infrastructure': {'probability': 0.05, 'files': (2, 6), 'complexity': 'medium'},
    'architecture': {'probability': 0.05, 'files': (0, 3), 'complexity': 'complex'},
}


def select_task():
    """Select a random task type based on probabilities."""
    r = random.random()
    cumulative = 0.0
    for task_type, config in TASK_TYPES.items():
        cumulative += config['probability']
        if r <= cumulative:
            files = random.randint(*config['files'])
            complexity = config['complexity']
            if complexity == 'varies':
                complexity = random.choice(['simple', 'medium', 'complex'])
            return task_type, files, complexity
    return 'simple_code_edit', 1, 'simple'


def simulate_single_agent_session(task_type: str, files: int, complexity: str) -> Dict:
    """Simulate a session with single agent (no runSubagent)."""
    
    base_api_calls = random.randint(25, 50)
    base_tokens = random.randint(15000, 35000)
    base_time = random.uniform(10, 30)
    
    complexity_multiplier = {'simple': 1.0, 'medium': 1.4, 'complex': 2.0}[complexity]
    file_multiplier = 1.0 + (files * 0.08)
    
    api_calls = int(base_api_calls * complexity_multiplier * file_multiplier)
    tokens = int(base_tokens * complexity_multiplier * file_multiplier)
    time_minutes = base_time * complexity_multiplier * file_multiplier * 0.8
    
    base_success = {'simple': 0.92, 'medium': 0.85, 'complex': 0.75}[complexity]
    success_penalty = min(0.15, files * 0.01)
    success = random.random() < (base_success - success_penalty)
    
    cognitive_load = 0.4 + (0.1 * {'simple': 0, 'medium': 1, 'complex': 2}[complexity])
    cognitive_load += files * 0.02
    
    context_efficiency = 0.60 - (files * 0.02) - ({'simple': 0, 'medium': 0.05, 'complex': 0.12}[complexity])
    
    return {
        'api_calls': api_calls,
        'tokens': tokens,
        'time_minutes': time_minutes,
        'success': success,
        'cognitive_load': cognitive_load,
        'context_efficiency': max(0.2, context_efficiency),
        'handoffs': 0,
        'agents_used': 1,
    }


def simulate_multi_agent_session(task_type: str, files: int, complexity: str) -> Dict:
    """Simulate a session with multi-agent (runSubagent)."""
    
    base_api_calls = random.randint(20, 40)
    base_tokens = random.randint(12000, 28000)
    base_time = random.uniform(8, 22)
    
    if complexity == 'simple' and files < 3:
        agents_used = 1
        handoffs = 0
    elif complexity == 'medium' or (files >= 3 and files <= 5):
        agents_used = random.choice([1, 2])
        handoffs = agents_used - 1
    else:
        agents_used = random.randint(2, 4)
        handoffs = agents_used - 1
    
    if agents_used > 1:
        time_reduction = 0.15 + (0.05 * agents_used)
        handoff_overhead = handoffs * 0.5
        token_reduction = 0.10 + (0.08 * agents_used)
        api_overhead = handoffs * 2
    else:
        time_reduction = 0.0
        handoff_overhead = 0.0
        token_reduction = 0.0
        api_overhead = 0
    
    complexity_multiplier = {'simple': 1.0, 'medium': 1.2, 'complex': 1.5}[complexity]
    file_multiplier = 1.0 + (files * 0.05)
    
    api_calls = int((base_api_calls * complexity_multiplier * file_multiplier) + api_overhead)
    tokens = int(base_tokens * complexity_multiplier * file_multiplier * (1 - token_reduction))
    time_minutes = (base_time * complexity_multiplier * file_multiplier * (1 - time_reduction)) + handoff_overhead
    
    base_success = {'simple': 0.94, 'medium': 0.92, 'complex': 0.88}[complexity]
    success_penalty = min(0.08, files * 0.005)
    success = random.random() < (base_success - success_penalty)
    
    if agents_used > 1:
        cognitive_load = 0.55 + (0.05 * handoffs)
    else:
        cognitive_load = 0.40
    
    if agents_used > 1:
        context_efficiency = 0.80 - (files * 0.01)
    else:
        context_efficiency = 0.65 - (files * 0.015)
    
    return {
        'api_calls': api_calls,
        'tokens': tokens,
        'time_minutes': time_minutes,
        'success': success,
        'cognitive_load': cognitive_load,
        'context_efficiency': max(0.3, context_efficiency),
        'handoffs': handoffs,
        'agents_used': agents_used,
    }


def run_simulation(n: int):
    """Run n sessions comparing single vs multi-agent."""
    
    single_results = {
        'api_calls': [], 'tokens': [], 'time': [], 
        'cognitive_load': [], 'context_efficiency': [],
        'successes': 0, 'by_complexity': defaultdict(lambda: {'count': 0, 'successes': 0})
    }
    
    multi_results = {
        'api_calls': [], 'tokens': [], 'time': [],
        'cognitive_load': [], 'context_efficiency': [],
        'successes': 0, 'handoffs': [], 'agents_used': [],
        'by_complexity': defaultdict(lambda: {'count': 0, 'successes': 0})
    }
    
    for _ in range(n):
        task_type, files, complexity = select_task()
        
        single = simulate_single_agent_session(task_type, files, complexity)
        single_results['api_calls'].append(single['api_calls'])
        single_results['tokens'].append(single['tokens'])
        single_results['time'].append(single['time_minutes'])
        single_results['cognitive_load'].append(single['cognitive_load'])
        single_results['context_efficiency'].append(single['context_efficiency'])
        single_results['by_complexity'][complexity]['count'] += 1
        if single['success']:
            single_results['successes'] += 1
            single_results['by_complexity'][complexity]['successes'] += 1
        
        multi = simulate_multi_agent_session(task_type, files, complexity)
        multi_results['api_calls'].append(multi['api_calls'])
        multi_results['tokens'].append(multi['tokens'])
        multi_results['time'].append(multi['time_minutes'])
        multi_results['cognitive_load'].append(multi['cognitive_load'])
        multi_results['context_efficiency'].append(multi['context_efficiency'])
        multi_results['handoffs'].append(multi['handoffs'])
        multi_results['agents_used'].append(multi['agents_used'])
        multi_results['by_complexity'][complexity]['count'] += 1
        if multi['success']:
            multi_results['successes'] += 1
            multi_results['by_complexity'][complexity]['successes'] += 1
    
    return single_results, multi_results


def main():
    parser = argparse.ArgumentParser(description='Single vs Multi-Agent Simulation')
    parser.add_argument('--sessions', type=int, default=100000)
    parser.add_argument('--output', type=str)
    args = parser.parse_args()
    
    n = args.sessions
    
    print("=" * 75)
    print("SINGLE-AGENT vs MULTI-AGENT (runSubagent) SIMULATION")
    print("=" * 75)
    print(f"\nSimulating {n:,} sessions...\n")
    
    single, multi = run_simulation(n)
    
    def avg(lst): return sum(lst) / len(lst)
    def total(lst): return sum(lst)
    
    # Display results
    print("=" * 75)
    print("OVERALL METRICS COMPARISON")
    print("=" * 75)
    
    print(f"\n{'Metric':<30} {'Single Agent':<18} {'Multi-Agent':<18} {'Difference'}")
    print("-" * 75)
    
    metrics = {
        'api_calls': ('Avg API Calls', False),
        'tokens': ('Avg Tokens', False),
        'time': ('Avg Resolution Time (min)', False),
        'cognitive_load': ('Avg Cognitive Load', False),
        'context_efficiency': ('Context Efficiency', True),
    }
    
    results_summary = {}
    
    single_api = avg(single['api_calls'])
    multi_api = avg(multi['api_calls'])
    diff_api = (multi_api - single_api) / single_api * 100
    print(f"{'Avg API Calls':<30} {single_api:<18.1f} {multi_api:<18.1f} {diff_api:+.1f}%")
    
    single_tokens = avg(single['tokens'])
    multi_tokens = avg(multi['tokens'])
    diff_tokens = (multi_tokens - single_tokens) / single_tokens * 100
    print(f"{'Avg Tokens':<30} {single_tokens:<18,.0f} {multi_tokens:<18,.0f} {diff_tokens:+.1f}%")
    
    single_time = avg(single['time'])
    multi_time = avg(multi['time'])
    diff_time = (multi_time - single_time) / single_time * 100
    print(f"{'Avg Resolution Time (min)':<30} {single_time:<18.1f} {multi_time:<18.1f} {diff_time:+.1f}%")
    
    single_success = single['successes'] / n
    multi_success = multi['successes'] / n
    diff_success = (multi_success - single_success) / single_success * 100
    print(f"{'Success Rate':<30} {100*single_success:<18.1f}% {100*multi_success:<18.1f}% {diff_success:+.1f}%")
    
    single_cog = avg(single['cognitive_load'])
    multi_cog = avg(multi['cognitive_load'])
    diff_cog = (multi_cog - single_cog) / single_cog * 100
    print(f"{'Avg Cognitive Load':<30} {single_cog:<18.2f} {multi_cog:<18.2f} {diff_cog:+.1f}%")
    
    single_ctx = avg(single['context_efficiency'])
    multi_ctx = avg(multi['context_efficiency'])
    diff_ctx = (multi_ctx - single_ctx) / single_ctx * 100
    print(f"{'Context Efficiency':<30} {100*single_ctx:<18.1f}% {100*multi_ctx:<18.1f}% {diff_ctx:+.1f}%")
    
    # Calculate net benefit
    net_benefit = (
        (multi_success - single_success) * 100 +
        ((single_tokens - multi_tokens) / single_tokens) * 50 +
        ((single_time - multi_time) / single_time) * 30 +
        ((multi_ctx - single_ctx) / single_ctx) * 20 -
        ((multi_cog - single_cog) / single_cog) * 15
    )
    
    print(f"\n📈 NET BENEFIT SCORE: {net_benefit:.1f}")
    
    if net_benefit > 10:
        verdict = "STRONGLY RECOMMENDED"
    elif net_benefit > 0:
        verdict = "RECOMMENDED"
    elif net_benefit > -5:
        verdict = "SITUATIONAL"
    else:
        verdict = "NOT RECOMMENDED"
    
    print(f"🎯 VERDICT: {verdict}")
    
    # Save output
    if args.output:
        output_data = {
            'timestamp': datetime.now().isoformat(),
            'sessions': n,
            'single_agent': {
                'avg_api_calls': single_api,
                'avg_tokens': single_tokens,
                'avg_time': single_time,
                'success_rate': single_success,
                'cognitive_load': single_cog,
                'context_efficiency': single_ctx,
            },
            'multi_agent': {
                'avg_api_calls': multi_api,
                'avg_tokens': multi_tokens,
                'avg_time': multi_time,
                'success_rate': multi_success,
                'cognitive_load': multi_cog,
                'context_efficiency': multi_ctx,
                'avg_handoffs': avg(multi['handoffs']),
                'avg_agents': avg(multi['agents_used']),
            },
            'verdict': verdict,
            'net_benefit_score': net_benefit,
        }
        with open(args.output, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\n📄 Results saved to: {args.output}")


if __name__ == '__main__':
    main()
