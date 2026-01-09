#!/usr/bin/env python3
"""
AKIS Doc Update Simulation Framework

Simulates 10k+ development sessions with edge cases to:
1. Identify what doc updates are needed for each file change pattern
2. Test doc update strategies
3. Validate update quality

Usage:
    python simulate_doc_updates.py --phase analyze    # Phase 1: Analyze patterns
    python simulate_doc_updates.py --phase test       # Phase 2: Test updates
    python simulate_doc_updates.py --phase compare    # Phase 3: Compare results
"""

import json
import random
import re
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple
from collections import defaultdict
import hashlib

# ============================================================================
# SESSION GENERATION
# ============================================================================

@dataclass
class FileChange:
    """Represents a file change in a session"""
    path: str
    change_type: str  # 'add', 'modify', 'delete'
    content_type: str  # 'endpoint', 'component', 'service', 'model', 'config', 'test', 'doc'
    details: Dict = field(default_factory=dict)

@dataclass
class SimulatedSession:
    """A simulated development session"""
    session_id: str
    session_type: str  # 'feature', 'bugfix', 'refactor', 'docs', 'config'
    files_changed: List[FileChange]
    expected_doc_updates: List[Dict]  # What docs SHOULD be updated
    complexity: str  # 'simple', 'medium', 'complex'

# File patterns for realistic simulation
FILE_PATTERNS = {
    'backend_endpoint': [
        'backend/app/api/v1/endpoints/{name}.py',
        'backend/app/api/v1/endpoints/{name}_v2.py',
    ],
    'backend_service': [
        'backend/app/services/{Name}Service.py',
        'backend/app/services/{name}_service.py',
    ],
    'backend_model': [
        'backend/app/models/{name}.py',
        'backend/app/db/models/{name}.py',
    ],
    'frontend_page': [
        'frontend/src/pages/{Name}.tsx',
        'frontend/src/pages/{Name}Page.tsx',
    ],
    'frontend_component': [
        'frontend/src/components/{Name}.tsx',
        'frontend/src/components/{Name}/{Name}.tsx',
    ],
    'frontend_service': [
        'frontend/src/services/{name}Service.ts',
        'frontend/src/services/{name}.ts',
    ],
    'docker': [
        'docker/docker-compose.{env}.yml',
        'docker/{name}/Dockerfile',
        'Dockerfile',
        'docker-compose.yml',
    ],
    'config': [
        '.github/workflows/{name}.yml',
        'backend/alembic/versions/{hash}_{name}.py',
        'frontend/tsconfig.json',
        'backend/requirements.txt',
    ],
    'test': [
        'backend/tests/test_{name}.py',
        'frontend/src/__tests__/{Name}.test.tsx',
        'scripts/test_{name}.py',
    ],
    'doc': [
        'docs/{category}/{name}.md',
        'docs/README.md',
        'README.md',
    ],
}

# Feature domains for realistic naming
DOMAINS = [
    'traffic', 'asset', 'scan', 'user', 'auth', 'dashboard', 'topology',
    'agent', 'evidence', 'exploit', 'connection', 'network', 'host',
    'protocol', 'session', 'websocket', 'notification', 'settings'
]

# Endpoint operations
ENDPOINT_OPS = ['get', 'list', 'create', 'update', 'delete', 'search', 'export', 'import', 'sync']

# Doc categories
DOC_CATEGORIES = {
    'docs/technical/API_rest_v1.md': ['backend_endpoint'],
    'docs/design/UI_UX_SPEC.md': ['frontend_page', 'frontend_component'],
    'docs/architecture/SYSTEM_ARCHITECTURE.md': ['backend_service', 'docker'],
    'docs/development/DEVELOPMENT_GUIDE.md': ['config', 'docker'],
    'docs/features/': ['backend_endpoint', 'frontend_page', 'backend_service'],
}


def generate_endpoint_details(domain: str) -> Dict:
    """Generate realistic FastAPI endpoint details"""
    op = random.choice(ENDPOINT_OPS)
    method = {
        'get': 'GET', 'list': 'GET', 'create': 'POST', 
        'update': 'PUT', 'delete': 'DELETE', 'search': 'POST',
        'export': 'GET', 'import': 'POST', 'sync': 'POST'
    }.get(op, 'POST')
    
    path = f"/api/v1/{domain}"
    if op in ['get', 'update', 'delete']:
        path += "/{id}"
    elif op == 'search':
        path += "/search"
    elif op in ['export', 'import', 'sync']:
        path += f"/{op}"
    
    return {
        'method': method,
        'path': path,
        'operation': op,
        'domain': domain,
        'has_auth': random.random() > 0.1,
        'has_pagination': op == 'list',
        'request_body': op in ['create', 'update', 'search', 'import'],
        'response_model': f"{domain.title()}{'List' if op == 'list' else 'Response'}",
        'description': f"{op.title()} {domain} {'item' if op != 'list' else 'items'}",
    }


def generate_component_details(domain: str, is_page: bool) -> Dict:
    """Generate realistic React component details"""
    return {
        'name': f"{domain.title()}{'Page' if is_page else 'Component'}",
        'is_page': is_page,
        'has_state': random.random() > 0.3,
        'uses_api': random.random() > 0.2,
        'has_form': random.random() > 0.5,
        'has_table': is_page and random.random() > 0.4,
        'domain': domain,
    }


def generate_service_details(domain: str, is_frontend: bool) -> Dict:
    """Generate service details"""
    return {
        'name': f"{domain.title()}Service",
        'domain': domain,
        'is_frontend': is_frontend,
        'methods': random.sample(ENDPOINT_OPS, k=random.randint(2, 5)),
        'has_websocket': random.random() > 0.8,
        'has_cache': random.random() > 0.7,
    }


def generate_session(session_id: int) -> SimulatedSession:
    """Generate a realistic development session"""
    
    # Session type distribution
    session_types = [
        ('feature', 0.4),
        ('bugfix', 0.25),
        ('refactor', 0.15),
        ('docs', 0.1),
        ('config', 0.1),
    ]
    session_type = random.choices(
        [t[0] for t in session_types],
        weights=[t[1] for t in session_types]
    )[0]
    
    # Complexity distribution
    complexities = [('simple', 0.4), ('medium', 0.4), ('complex', 0.2)]
    complexity = random.choices(
        [c[0] for c in complexities],
        weights=[c[1] for c in complexities]
    )[0]
    
    # Number of files based on complexity
    file_counts = {'simple': (1, 3), 'medium': (3, 6), 'complex': (6, 12)}
    min_files, max_files = file_counts[complexity]
    num_files = random.randint(min_files, max_files)
    
    domain = random.choice(DOMAINS)
    files_changed = []
    expected_doc_updates = []
    
    if session_type == 'feature':
        # Feature sessions often touch multiple layers
        patterns_to_use = []
        
        if random.random() > 0.3:  # 70% have backend
            patterns_to_use.append('backend_endpoint')
            if random.random() > 0.5:
                patterns_to_use.append('backend_service')
        
        if random.random() > 0.4:  # 60% have frontend
            patterns_to_use.append('frontend_page')
            if random.random() > 0.6:
                patterns_to_use.append('frontend_component')
                patterns_to_use.append('frontend_service')
        
        if random.random() > 0.8:  # 20% have docker changes
            patterns_to_use.append('docker')
        
        if not patterns_to_use:
            patterns_to_use = ['backend_endpoint']
        
        for pattern_type in patterns_to_use:
            pattern = random.choice(FILE_PATTERNS[pattern_type])
            path = pattern.format(
                name=domain,
                Name=domain.title(),
                env=random.choice(['dev', 'test', 'prod']),
                hash=hashlib.md5(str(random.random()).encode()).hexdigest()[:12]
            )
            
            if pattern_type == 'backend_endpoint':
                details = generate_endpoint_details(domain)
                content_type = 'endpoint'
                # API doc should be updated
                expected_doc_updates.append({
                    'doc': 'docs/technical/API_rest_v1.md',
                    'update_type': 'add_endpoint',
                    'details': details,
                })
            elif pattern_type in ['frontend_page', 'frontend_component']:
                details = generate_component_details(domain, pattern_type == 'frontend_page')
                content_type = 'component'
                if pattern_type == 'frontend_page':
                    expected_doc_updates.append({
                        'doc': 'docs/design/UI_UX_SPEC.md',
                        'update_type': 'add_page',
                        'details': details,
                    })
            elif pattern_type in ['backend_service', 'frontend_service']:
                details = generate_service_details(domain, 'frontend' in pattern_type)
                content_type = 'service'
            elif pattern_type == 'docker':
                details = {'type': 'docker', 'domain': domain}
                content_type = 'config'
            else:
                details = {'domain': domain}
                content_type = 'config'
            
            files_changed.append(FileChange(
                path=path,
                change_type=random.choice(['add', 'modify']),
                content_type=content_type,
                details=details
            ))
    
    elif session_type == 'bugfix':
        # Bugfixes usually touch 1-2 files
        pattern_type = random.choice(['backend_endpoint', 'backend_service', 'frontend_page', 'frontend_component'])
        pattern = random.choice(FILE_PATTERNS[pattern_type])
        path = pattern.format(name=domain, Name=domain.title(), env='dev', hash='abc123')
        
        files_changed.append(FileChange(
            path=path,
            change_type='modify',
            content_type='endpoint' if 'endpoint' in pattern_type else 'component',
            details={'domain': domain, 'is_bugfix': True}
        ))
        # Bugfixes don't usually need doc updates unless behavior changes
        if random.random() > 0.8:  # 20% need doc update
            expected_doc_updates.append({
                'doc': 'docs/technical/API_rest_v1.md' if 'backend' in pattern_type else 'docs/design/UI_UX_SPEC.md',
                'update_type': 'modify_behavior',
                'details': {'domain': domain},
            })
    
    elif session_type == 'refactor':
        # Refactors touch many files but rarely need doc updates
        for _ in range(num_files):
            pattern_type = random.choice(list(FILE_PATTERNS.keys()))
            if pattern_type == 'doc':
                continue
            pattern = random.choice(FILE_PATTERNS[pattern_type])
            path = pattern.format(name=domain, Name=domain.title(), env='dev', hash='abc123')
            files_changed.append(FileChange(
                path=path,
                change_type='modify',
                content_type='refactor',
                details={'domain': domain}
            ))
    
    elif session_type == 'docs':
        # Doc-only sessions
        pattern = random.choice(FILE_PATTERNS['doc'])
        path = pattern.format(category=random.choice(['technical', 'design', 'features']), name=domain)
        files_changed.append(FileChange(
            path=path,
            change_type=random.choice(['add', 'modify']),
            content_type='doc',
            details={'domain': domain}
        ))
    
    elif session_type == 'config':
        pattern_type = random.choice(['docker', 'config'])
        pattern = random.choice(FILE_PATTERNS[pattern_type])
        path = pattern.format(name=domain, Name=domain.title(), env='dev', hash='abc123')
        files_changed.append(FileChange(
            path=path,
            change_type='modify',
            content_type='config',
            details={'domain': domain}
        ))
        if random.random() > 0.7:
            expected_doc_updates.append({
                'doc': 'docs/development/DEVELOPMENT_GUIDE.md',
                'update_type': 'update_config',
                'details': {'domain': domain},
            })
    
    return SimulatedSession(
        session_id=f"session_{session_id:05d}",
        session_type=session_type,
        files_changed=files_changed,
        expected_doc_updates=expected_doc_updates,
        complexity=complexity
    )


# ============================================================================
# PATTERN ANALYSIS
# ============================================================================

@dataclass
class UpdatePattern:
    """A detected pattern for doc updates"""
    file_pattern: str  # regex pattern
    content_type: str
    target_doc: str
    update_type: str
    confidence: float
    examples: List[str] = field(default_factory=list)


def analyze_sessions(sessions: List[SimulatedSession]) -> Dict:
    """Analyze sessions to find doc update patterns"""
    
    # Count patterns
    file_to_doc_updates = defaultdict(lambda: defaultdict(int))
    content_to_doc_updates = defaultdict(lambda: defaultdict(int))
    session_type_to_updates = defaultdict(lambda: defaultdict(int))
    
    total_sessions = len(sessions)
    sessions_needing_updates = 0
    total_expected_updates = 0
    
    for session in sessions:
        if session.expected_doc_updates:
            sessions_needing_updates += 1
            total_expected_updates += len(session.expected_doc_updates)
        
        for fc in session.files_changed:
            for update in session.expected_doc_updates:
                # Map file patterns to doc updates
                file_to_doc_updates[fc.path][update['doc']] += 1
                content_to_doc_updates[fc.content_type][update['doc']] += 1
                session_type_to_updates[session.session_type][update['doc']] += 1
    
    # Extract patterns
    patterns = []
    
    # Pattern 1: Backend endpoints -> API docs
    backend_endpoint_count = sum(
        1 for s in sessions 
        for fc in s.files_changed 
        if fc.content_type == 'endpoint'
    )
    api_doc_updates = sum(
        1 for s in sessions 
        for u in s.expected_doc_updates 
        if u['doc'] == 'docs/technical/API_rest_v1.md'
    )
    if backend_endpoint_count > 0:
        patterns.append(UpdatePattern(
            file_pattern=r'backend/app/api/.+\.py$',
            content_type='endpoint',
            target_doc='docs/technical/API_rest_v1.md',
            update_type='add_endpoint',
            confidence=api_doc_updates / backend_endpoint_count if backend_endpoint_count else 0,
            examples=['backend/app/api/v1/endpoints/traffic.py']
        ))
    
    # Pattern 2: Frontend pages -> UI docs
    frontend_page_count = sum(
        1 for s in sessions 
        for fc in s.files_changed 
        if fc.content_type == 'component' and fc.details.get('is_page')
    )
    ui_doc_updates = sum(
        1 for s in sessions 
        for u in s.expected_doc_updates 
        if u['doc'] == 'docs/design/UI_UX_SPEC.md'
    )
    if frontend_page_count > 0:
        patterns.append(UpdatePattern(
            file_pattern=r'frontend/src/pages/.+\.tsx$',
            content_type='page',
            target_doc='docs/design/UI_UX_SPEC.md',
            update_type='add_page',
            confidence=ui_doc_updates / frontend_page_count if frontend_page_count else 0,
            examples=['frontend/src/pages/Topology.tsx']
        ))
    
    # Pattern 3: Docker -> Dev guide
    docker_count = sum(
        1 for s in sessions 
        for fc in s.files_changed 
        if 'docker' in fc.path.lower() or 'Dockerfile' in fc.path
    )
    
    return {
        'total_sessions': total_sessions,
        'sessions_needing_updates': sessions_needing_updates,
        'update_rate': sessions_needing_updates / total_sessions,
        'total_expected_updates': total_expected_updates,
        'avg_updates_per_session': total_expected_updates / sessions_needing_updates if sessions_needing_updates else 0,
        'patterns': [
            {
                'file_pattern': p.file_pattern,
                'content_type': p.content_type,
                'target_doc': p.target_doc,
                'update_type': p.update_type,
                'confidence': p.confidence,
                'examples': p.examples,
            }
            for p in patterns
        ],
        'by_session_type': {
            st: dict(updates) 
            for st, updates in session_type_to_updates.items()
        },
        'by_content_type': {
            ct: dict(updates)
            for ct, updates in content_to_doc_updates.items()
        }
    }


# ============================================================================
# DOC UPDATE STRATEGIES
# ============================================================================

class DocUpdateStrategy:
    """Base class for doc update strategies"""
    
    def __init__(self, name: str):
        self.name = name
        self.updates_attempted = 0
        self.updates_successful = 0
        self.updates_failed = 0
        self.quality_scores = []
    
    def should_update(self, session: SimulatedSession) -> List[Dict]:
        """Return list of updates this strategy would make"""
        raise NotImplementedError
    
    def score_update(self, proposed: Dict, expected: Dict) -> float:
        """Score how well a proposed update matches expected (0-1)"""
        if proposed['doc'] != expected['doc']:
            return 0.0
        if proposed.get('update_type') == expected.get('update_type'):
            return 1.0
        return 0.5  # Same doc, different update type


class NaiveStrategy(DocUpdateStrategy):
    """Naive: Update all related docs for any file change"""
    
    def __init__(self):
        super().__init__('naive')
    
    def should_update(self, session: SimulatedSession) -> List[Dict]:
        updates = []
        for fc in session.files_changed:
            if 'backend/app/api' in fc.path:
                updates.append({'doc': 'docs/technical/API_rest_v1.md', 'update_type': 'any'})
            if 'frontend/src/pages' in fc.path:
                updates.append({'doc': 'docs/design/UI_UX_SPEC.md', 'update_type': 'any'})
            if 'docker' in fc.path.lower():
                updates.append({'doc': 'docs/development/DEVELOPMENT_GUIDE.md', 'update_type': 'any'})
        return updates


class SmartStrategy(DocUpdateStrategy):
    """Smart: Only update docs when content type indicates need"""
    
    def __init__(self):
        super().__init__('smart')
    
    def should_update(self, session: SimulatedSession) -> List[Dict]:
        updates = []
        
        # Only feature sessions need doc updates usually
        if session.session_type not in ['feature', 'docs']:
            if session.session_type == 'bugfix':
                # Bugfixes rarely need updates
                return []
            if session.session_type == 'refactor':
                # Refactors don't change behavior
                return []
        
        for fc in session.files_changed:
            if fc.content_type == 'endpoint' and fc.change_type in ['add', 'modify']:
                updates.append({
                    'doc': 'docs/technical/API_rest_v1.md',
                    'update_type': 'add_endpoint' if fc.change_type == 'add' else 'modify_endpoint',
                    'details': fc.details
                })
            
            if fc.content_type == 'component':
                if fc.details.get('is_page') and fc.change_type == 'add':
                    updates.append({
                        'doc': 'docs/design/UI_UX_SPEC.md',
                        'update_type': 'add_page',
                        'details': fc.details
                    })
        
        return updates


class PatternBasedStrategy(DocUpdateStrategy):
    """Pattern-based: Use learned patterns from analysis"""
    
    def __init__(self, patterns: List[Dict]):
        super().__init__('pattern_based')
        self.patterns = patterns
    
    def should_update(self, session: SimulatedSession) -> List[Dict]:
        updates = []
        
        for fc in session.files_changed:
            for pattern in self.patterns:
                if pattern['confidence'] < 0.5:
                    continue  # Skip low-confidence patterns
                
                if re.match(pattern['file_pattern'], fc.path):
                    updates.append({
                        'doc': pattern['target_doc'],
                        'update_type': pattern['update_type'],
                        'confidence': pattern['confidence'],
                    })
        
        return updates


# ============================================================================
# EVALUATION
# ============================================================================

def evaluate_strategy(strategy: DocUpdateStrategy, sessions: List[SimulatedSession]) -> Dict:
    """Evaluate a strategy's performance"""
    
    true_positives = 0
    false_positives = 0
    false_negatives = 0
    
    for session in sessions:
        proposed = strategy.should_update(session)
        expected = session.expected_doc_updates
        
        # Match proposed to expected
        expected_docs = {e['doc'] for e in expected}
        proposed_docs = {p['doc'] for p in proposed}
        
        # True positives: correctly identified updates
        tp = len(expected_docs & proposed_docs)
        true_positives += tp
        
        # False positives: proposed but not needed
        fp = len(proposed_docs - expected_docs)
        false_positives += fp
        
        # False negatives: needed but not proposed
        fn = len(expected_docs - proposed_docs)
        false_negatives += fn
    
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        'strategy': strategy.name,
        'true_positives': true_positives,
        'false_positives': false_positives,
        'false_negatives': false_negatives,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
    }


# ============================================================================
# MAIN SIMULATION
# ============================================================================

def run_simulation(num_sessions: int = 10000, seed: int = 42) -> Dict:
    """Run full simulation pipeline"""
    
    random.seed(seed)
    
    print(f"🎲 Generating {num_sessions:,} simulated sessions...")
    sessions = [generate_session(i) for i in range(num_sessions)]
    
    # Analyze patterns
    print("📊 Analyzing patterns...")
    analysis = analyze_sessions(sessions)
    
    print(f"\n📈 Analysis Results:")
    print(f"   Sessions needing updates: {analysis['sessions_needing_updates']:,} ({analysis['update_rate']*100:.1f}%)")
    print(f"   Total expected updates: {analysis['total_expected_updates']:,}")
    print(f"   Avg updates per session: {analysis['avg_updates_per_session']:.2f}")
    
    print(f"\n📋 Detected Patterns:")
    for p in analysis['patterns']:
        print(f"   {p['file_pattern']}")
        print(f"      → {p['target_doc']} ({p['update_type']})")
        print(f"      Confidence: {p['confidence']*100:.1f}%")
    
    print(f"\n📁 Updates by session type:")
    for st, updates in analysis['by_session_type'].items():
        print(f"   {st}: {dict(updates)}")
    
    # Evaluate strategies
    print("\n🧪 Evaluating strategies...")
    
    strategies = [
        NaiveStrategy(),
        SmartStrategy(),
        PatternBasedStrategy(analysis['patterns']),
    ]
    
    results = []
    for strategy in strategies:
        result = evaluate_strategy(strategy, sessions)
        results.append(result)
        print(f"\n   {strategy.name}:")
        print(f"      Precision: {result['precision']*100:.1f}%")
        print(f"      Recall: {result['recall']*100:.1f}%")
        print(f"      F1 Score: {result['f1_score']*100:.1f}%")
    
    # Find best strategy
    best = max(results, key=lambda r: r['f1_score'])
    print(f"\n🏆 Best strategy: {best['strategy']} (F1: {best['f1_score']*100:.1f}%)")
    
    return {
        'num_sessions': num_sessions,
        'analysis': analysis,
        'strategy_results': results,
        'best_strategy': best['strategy'],
        'recommendations': generate_recommendations(analysis, results)
    }


def generate_recommendations(analysis: Dict, results: List[Dict]) -> List[str]:
    """Generate recommendations for update_docs.py"""
    
    recommendations = []
    
    best = max(results, key=lambda r: r['f1_score'])
    
    if best['strategy'] == 'smart':
        recommendations.append("Use content-type based detection (endpoint, page, service)")
        recommendations.append("Skip refactor and most bugfix sessions")
    
    if best['strategy'] == 'pattern_based':
        recommendations.append("Use regex patterns for file matching")
        for p in analysis['patterns']:
            if p['confidence'] > 0.7:
                recommendations.append(f"High-confidence: {p['file_pattern']} → {p['target_doc']}")
    
    # General recommendations based on analysis
    if analysis['update_rate'] < 0.5:
        recommendations.append("Most sessions don't need doc updates - be selective")
    
    if analysis['by_session_type'].get('feature', {}):
        recommendations.append("Focus on 'feature' session types for doc updates")
    
    return recommendations


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='AKIS Doc Update Simulation')
    parser.add_argument('--sessions', type=int, default=10000, help='Number of sessions')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--output', type=str, help='Output JSON file')
    
    args = parser.parse_args()
    
    results = run_simulation(args.sessions, args.seed)
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n💾 Results saved to {args.output}")
    
    print("\n" + "="*60)
    print("📝 RECOMMENDATIONS FOR update_docs.py:")
    print("="*60)
    for i, rec in enumerate(results['recommendations'], 1):
        print(f"   {i}. {rec}")
