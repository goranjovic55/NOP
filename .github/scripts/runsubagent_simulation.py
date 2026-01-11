#!/usr/bin/env python3
"""
runSubagent Trigger Simulation - 100k Sessions

Analyzes when runSubagent should trigger and compares current triggers
vs optimized triggers for more precise delegation.

Usage:
    python .github/scripts/runsubagent_simulation.py
    python .github/scripts/runsubagent_simulation.py --sessions 50000
    python .github/scripts/runsubagent_simulation.py --output results.json

Results from 100k simulation (2026-01-11):
    Detection Rate: +33.2% improvement with optimized triggers
    Trigger Accuracy: Current 95.0% → Optimized needs balancing
    Agent Usage: debugger +138.2%, code +65.0%
"""

import argparse
import json
import random
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple
from collections import defaultdict
from pathlib import Path
from datetime import datetime

# ============================================================================
# Configuration: Task Types and Their Characteristics
# ============================================================================

TASK_TYPES = {
    'simple_code_edit': {
        'probability': 0.25,
        'files_affected': (1, 2),
        'complexity': 'simple',
        'ideal_delegate': None,
        'keywords': ['fix', 'update', 'change', 'modify'],
    },
    'multi_file_code': {
        'probability': 0.15,
        'files_affected': (3, 6),
        'complexity': 'medium',
        'ideal_delegate': 'code',
        'keywords': ['implement', 'create', 'add feature'],
    },
    'complex_feature': {
        'probability': 0.10,
        'files_affected': (6, 15),
        'complexity': 'complex',
        'ideal_delegate': 'architect',
        'keywords': ['new feature', 'refactor', 'redesign'],
    },
    'debugging': {
        'probability': 0.18,
        'files_affected': (1, 5),
        'complexity': 'varies',
        'ideal_delegate': 'debugger',
        'keywords': ['error', 'bug', 'fix', 'traceback', 'exception'],
    },
    'documentation': {
        'probability': 0.08,
        'files_affected': (1, 4),
        'complexity': 'simple',
        'ideal_delegate': 'documentation',
        'keywords': ['doc', 'readme', 'explain', 'comment'],
    },
    'research': {
        'probability': 0.07,
        'files_affected': (0, 2),
        'complexity': 'varies',
        'ideal_delegate': 'research',
        'keywords': ['research', 'investigate', 'compare', 'evaluate'],
    },
    'review': {
        'probability': 0.07,
        'files_affected': (2, 10),
        'complexity': 'medium',
        'ideal_delegate': 'reviewer',
        'keywords': ['review', 'check', 'audit', 'verify'],
    },
    'infrastructure': {
        'probability': 0.05,
        'files_affected': (2, 6),
        'complexity': 'medium',
        'ideal_delegate': 'devops',
        'keywords': ['docker', 'deploy', 'ci', 'pipeline'],
    },
    'architecture': {
        'probability': 0.05,
        'files_affected': (0, 3),
        'complexity': 'complex',
        'ideal_delegate': 'architect',
        'keywords': ['design', 'architecture', 'blueprint', 'plan'],
    },
}

# Current trigger configuration (from AKIS.agent.md baseline)
CURRENT_TRIGGERS = {
    'debugger': ['error', 'bug', 'traceback', 'exception'],
    'code': ['implement', 'create', 'add', 'code'],
    'research': ['research', 'investigate', 'compare'],
    'architect': ['design', 'blueprint', 'plan', 'architecture'],
    'documentation': ['doc', 'readme', 'explain'],
    'reviewer': ['review', 'check', 'audit'],
    'devops': ['docker', 'deploy', 'ci', 'pipeline'],
}

# Optimized triggers (from 100k simulation analysis)
OPTIMIZED_TRIGGERS = {
    'debugger': [
        'error', 'bug', 'traceback', 'exception', 'fix', 'crash',
        'fail', 'broken', 'issue', 'diagnose', 'debug'
    ],
    'code': [
        'implement', 'create', 'add', 'code', 'build', 'write',
        'develop', 'feature', 'function', 'class', 'method',
        'refactor', 'update', 'modify'
    ],
    'research': [
        'research', 'investigate', 'compare', 'evaluate', 'analyze',
        'explore', 'find', 'look up', 'best practice', 'how to'
    ],
    'architect': [
        'design', 'blueprint', 'plan', 'architecture', 'structure',
        'system', 'component', 'brainstorm', 'strategy', 'approach'
    ],
    'documentation': [
        'doc', 'readme', 'explain', 'comment', 'document', 'describe',
        'guide', 'tutorial', 'help', 'usage'
    ],
    'reviewer': [
        'review', 'check', 'audit', 'verify', 'validate', 'quality',
        'test', 'inspect', 'examine'
    ],
    'devops': [
        'docker', 'deploy', 'ci', 'pipeline', 'infrastructure',
        'container', 'kubernetes', 'workflow', 'build', 'release'
    ],
}


@dataclass
class SessionResult:
    """Result of a single session simulation."""
    task_type: str
    files_affected: int
    complexity: str
    ideal_delegate: str
    trigger_detected: str
    should_delegate: bool
    did_delegate: bool
    correct_trigger: bool
    correct_decision: bool


def select_task_type() -> str:
    """Select a task type based on probabilities."""
    r = random.random()
    cumulative = 0.0
    for task_type, config in TASK_TYPES.items():
        cumulative += config['probability']
        if r <= cumulative:
            return task_type
    return 'simple_code_edit'


def detect_trigger(task_keywords: List[str], triggers: Dict[str, List[str]]) -> Tuple[str, bool]:
    """Detect which agent should be triggered based on keywords."""
    for agent, agent_triggers in triggers.items():
        for trigger in agent_triggers:
            for keyword in task_keywords:
                if trigger.lower() in keyword.lower():
                    return agent, True
    return None, False


def should_delegate_based_on_complexity(files: int, complexity: str) -> bool:
    """Determine if delegation is optimal based on complexity."""
    if complexity == 'complex' or files >= 6:
        return True
    if complexity == 'medium' and files >= 4:
        return random.random() < 0.7
    return False


def simulate_session(triggers: Dict[str, List[str]], optimized: bool = False) -> SessionResult:
    """Simulate a session with given trigger configuration."""
    task_type = select_task_type()
    config = TASK_TYPES[task_type]
    
    files_affected = random.randint(*config['files_affected'])
    complexity = config['complexity']
    if complexity == 'varies':
        complexity = random.choice(['simple', 'medium', 'complex'])
    
    ideal_delegate = config['ideal_delegate']
    trigger_detected, detected = detect_trigger(config['keywords'], triggers)
    
    should_delegate = should_delegate_based_on_complexity(files_affected, complexity)
    if ideal_delegate and (complexity == 'complex' or files_affected >= 4):
        should_delegate = True
    
    did_delegate = detected and should_delegate
    
    # Optimized: try harder to match for delegation
    if optimized and ideal_delegate and should_delegate and not detected:
        for keyword in config['keywords']:
            if any(t in keyword.lower() for triggers_list in triggers.values() for t in triggers_list):
                did_delegate = True
                break
    
    correct_trigger = (trigger_detected == ideal_delegate) if detected else (ideal_delegate is None)
    correct_decision = (did_delegate == should_delegate)
    
    return SessionResult(
        task_type=task_type,
        files_affected=files_affected,
        complexity=complexity,
        ideal_delegate=ideal_delegate,
        trigger_detected=trigger_detected,
        should_delegate=should_delegate,
        did_delegate=did_delegate,
        correct_trigger=correct_trigger,
        correct_decision=correct_decision,
    )


def run_simulation(n: int, triggers: Dict[str, List[str]], optimized: bool = False) -> Dict:
    """Run n sessions with given trigger configuration."""
    results = []
    
    for _ in range(n):
        result = simulate_session(triggers, optimized)
        results.append(result)
    
    total = len(results)
    detected_count = sum(1 for r in results if r.trigger_detected)
    should_delegate_count = sum(1 for r in results if r.should_delegate)
    did_delegate_count = sum(1 for r in results if r.did_delegate)
    correct_trigger_count = sum(1 for r in results if r.correct_trigger)
    correct_decision_count = sum(1 for r in results if r.correct_decision)
    missed_delegations = sum(1 for r in results if r.should_delegate and not r.did_delegate)
    unnecessary_delegations = sum(1 for r in results if not r.should_delegate and r.did_delegate)
    
    agent_usage = defaultdict(int)
    for r in results:
        if r.trigger_detected:
            agent_usage[r.trigger_detected] += 1
    
    return {
        'total_sessions': total,
        'detected_count': detected_count,
        'detection_rate': detected_count / total,
        'should_delegate_count': should_delegate_count,
        'should_delegate_rate': should_delegate_count / total,
        'did_delegate_count': did_delegate_count,
        'did_delegate_rate': did_delegate_count / total,
        'correct_trigger_count': correct_trigger_count,
        'trigger_accuracy': correct_trigger_count / total,
        'correct_decision_count': correct_decision_count,
        'decision_accuracy': correct_decision_count / total,
        'missed_delegations': missed_delegations,
        'missed_rate': missed_delegations / total,
        'unnecessary_delegations': unnecessary_delegations,
        'unnecessary_rate': unnecessary_delegations / total,
        'agent_usage': dict(agent_usage),
    }


def main():
    parser = argparse.ArgumentParser(
        description='runSubagent Trigger Simulation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--sessions', type=int, default=100000,
                       help='Number of sessions to simulate (default: 100000)')
    parser.add_argument('--output', type=str,
                       help='Save results to JSON file')
    
    args = parser.parse_args()
    n = args.sessions
    
    print("=" * 70)
    print("runSubagent TRIGGER SIMULATION")
    print("=" * 70)
    
    print(f"\n🔄 Simulating {n:,} sessions with CURRENT triggers...")
    current_results = run_simulation(n, CURRENT_TRIGGERS, optimized=False)
    
    print(f"🚀 Simulating {n:,} sessions with OPTIMIZED triggers...")
    optimized_results = run_simulation(n, OPTIMIZED_TRIGGERS, optimized=True)
    
    # Display results
    print(f"\n" + "=" * 70)
    print("SIMULATION RESULTS")
    print("=" * 70)
    
    print(f"\n📊 TRIGGER DETECTION ({n:,} sessions)")
    print("-" * 55)
    print(f"{'Metric':<30} {'Current':<12} {'Optimized':<12} {'Change'}")
    print("-" * 55)
    
    metrics = [
        ('Detection Rate', 'detection_rate', True),
        ('Should Delegate Rate', 'should_delegate_rate', True),
        ('Actually Delegated Rate', 'did_delegate_rate', True),
    ]
    
    for label, key, is_rate in metrics:
        curr = current_results[key]
        opt = optimized_results[key]
        change = (opt - curr) / curr * 100 if curr > 0 else 0
        if is_rate:
            print(f"{label:<30} {100*curr:<12.1f}% {100*opt:<12.1f}% {change:+.1f}%")
        else:
            print(f"{label:<30} {curr:<12.1f} {opt:<12.1f} {change:+.1f}%")
    
    print(f"\n📈 ACCURACY METRICS")
    print("-" * 55)
    
    accuracy_metrics = [
        ('Trigger Accuracy', 'trigger_accuracy'),
        ('Decision Accuracy', 'decision_accuracy'),
        ('Missed Delegations', 'missed_rate'),
        ('Unnecessary Delegations', 'unnecessary_rate'),
    ]
    
    for label, key in accuracy_metrics:
        curr = current_results[key]
        opt = optimized_results[key]
        change = (opt - curr) / curr * 100 if curr > 0 else 0
        print(f"{label:<30} {100*curr:<12.1f}% {100*opt:<12.1f}% {change:+.1f}%")
    
    print(f"\n🤖 AGENT USAGE (runSubagent calls)")
    print("-" * 55)
    print(f"{'Agent':<15} {'Current':<12} {'Optimized':<12} {'Change'}")
    print("-" * 55)
    
    all_agents = set(current_results['agent_usage'].keys()) | set(optimized_results['agent_usage'].keys())
    for agent in sorted(all_agents):
        curr = current_results['agent_usage'].get(agent, 0)
        opt = optimized_results['agent_usage'].get(agent, 0)
        change = (opt - curr) / curr * 100 if curr > 0 else (100 if opt > 0 else 0)
        print(f"{agent:<15} {curr:<12,} {opt:<12,} {change:+.1f}%")
    
    curr_total = sum(current_results['agent_usage'].values())
    opt_total = sum(optimized_results['agent_usage'].values())
    change = (opt_total - curr_total) / curr_total * 100 if curr_total > 0 else 0
    print("-" * 55)
    print(f"{'TOTAL':<15} {curr_total:<12,} {opt_total:<12,} {change:+.1f}%")
    
    # Save output
    if args.output:
        output_data = {
            'timestamp': datetime.now().isoformat(),
            'sessions': n,
            'current': current_results,
            'optimized': optimized_results,
            'improvements': {
                'detection_rate': optimized_results['detection_rate'] - current_results['detection_rate'],
                'decision_accuracy': optimized_results['decision_accuracy'] - current_results['decision_accuracy'],
                'missed_reduction': current_results['missed_rate'] - optimized_results['missed_rate'],
            }
        }
        with open(args.output, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\n📄 Results saved to: {args.output}")
    
    return {
        'current': current_results,
        'optimized': optimized_results,
    }


if __name__ == '__main__':
    main()
