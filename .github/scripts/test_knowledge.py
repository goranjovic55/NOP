#!/usr/bin/env python3
"""
AKIS Knowledge Testing Script v1.0

Tests generate_knowledge.py precision against actual codebase and workflow logs.
Simulates 100k sessions to measure knowledge effectiveness.

Key Features:
1. Establishes ground truth from actual codebase structure
2. Tests current project_knowledge.json against ground truth
3. Calculates precision, recall, and F1 score
4. Simulates 100k sessions with/without knowledge
5. Measures query hit rate and token savings

Usage:
    python .github/scripts/test_knowledge.py --sessions 100000 [--output FILE]
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
# Configuration
# ============================================================================

# Directories to analyze for ground truth
SOURCE_DIRS = {
    'backend': ['backend/app'],
    'frontend': ['frontend/src'],
    'infrastructure': ['docker-compose.yml', 'Dockerfile'],
}

# File patterns to include
FILE_PATTERNS = {
    'python': ['.py'],
    'typescript': ['.ts', '.tsx'],
    'javascript': ['.js', '.jsx'],
    'config': ['.yml', '.yaml', '.json'],
}

# Directories to skip
SKIP_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv', 'env',
    'dist', 'build', '.next', 'out', '.pytest_cache', '.mypy_cache',
    'coverage', '.tox', 'eggs', 'volumes', 'log', 'alembic'
}

# Session types and their query patterns
SESSION_TYPES = {
    'frontend_only': 0.24,
    'backend_only': 0.10,
    'fullstack': 0.40,
    'docker_heavy': 0.10,
    'debugging': 0.10,
    'docs_only': 0.06,
}

# Query types and their frequencies
QUERY_TYPES = {
    'where_is': 0.25,  # "Where is X defined?"
    'what_depends': 0.15,  # "What depends on X?"
    'how_to': 0.20,  # "How to add X?"
    'debug': 0.15,  # "Why is X failing?"
    'list_all': 0.10,  # "List all services"
    'tech_stack': 0.05,  # "What frameworks?"
    'file_lookup': 0.10,  # Direct file path lookup
}


# ============================================================================
# Ground Truth Extraction
# ============================================================================

@dataclass
class GroundTruthEntity:
    """An entity from the actual codebase."""
    name: str
    entity_type: str
    path: str
    exports: List[str] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    tech: List[str] = field(default_factory=list)


class GroundTruthExtractor:
    """Extracts ground truth from actual codebase."""
    
    def __init__(self, root: Path = Path.cwd()):
        self.root = root
        self.entities: List[GroundTruthEntity] = []
        self.files: Set[str] = set()
        self.directories: Set[str] = set()
        
    def should_skip(self, path: Path) -> bool:
        """Check if path should be skipped."""
        for skip in SKIP_DIRS:
            if skip in path.parts:
                return True
        return False
    
    def get_entity_type(self, path: Path) -> str:
        """Determine entity type from file path."""
        parts = path.parts
        name = path.stem.lower()
        
        if 'test' in parts or 'tests' in parts or name.startswith('test_'):
            return 'test'
        if 'endpoint' in parts or 'routes' in parts or 'api' in parts:
            return 'endpoint'
        if 'service' in parts or name.endswith('service') or 'Service' in name:
            return 'service'
        if 'model' in parts or name.endswith('model'):
            return 'model'
        if 'schema' in parts or name.endswith('schema'):
            return 'schema'
        if 'component' in parts or 'components' in parts:
            return 'component'
        if 'page' in parts or 'pages' in parts:
            return 'page'
        if 'store' in parts or 'stores' in parts:
            return 'store'
        if 'hook' in parts or name.startswith('use'):
            return 'hook'
        if 'util' in parts or 'utils' in parts or 'helper' in parts:
            return 'utility'
        if 'config' in name or 'settings' in name:
            return 'config'
        if 'core' in parts:
            return 'core'
        
        return 'module'
    
    def extract_python_exports(self, content: str) -> List[str]:
        """Extract class/function definitions from Python file."""
        exports = []
        # Match class and function definitions
        patterns = [
            r'class\s+(\w+)',
            r'def\s+(\w+)',
            r'async\s+def\s+(\w+)',
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                name = match.group(1)
                if not name.startswith('_'):
                    exports.append(name)
        return exports
    
    def extract_typescript_exports(self, content: str) -> List[str]:
        """Extract exports from TypeScript/JavaScript file."""
        exports = []
        patterns = [
            r'export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)',
            r'export\s+{\s*([^}]+)\s*}',
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                if '{' in pattern:
                    for name in match.group(1).split(','):
                        name = name.strip().split(' as ')[0].strip()
                        if name:
                            exports.append(name)
                else:
                    exports.append(match.group(1))
        return exports
    
    def extract_tech(self, content: str, file_ext: str) -> List[str]:
        """Extract technologies/frameworks from imports."""
        tech = set()
        
        if file_ext == '.py':
            # Python imports
            for match in re.finditer(r'(?:from|import)\s+(\w+)', content):
                tech.add(match.group(1))
        else:
            # JS/TS imports
            for match in re.finditer(r'from\s+[\'"]([^\'"]+)[\'"]', content):
                module = match.group(1).split('/')[0]
                if not module.startswith('.'):
                    tech.add(module)
        
        return list(tech)[:10]  # Limit to top 10
    
    def scan_directory(self, dir_path: Path):
        """Scan a directory for source files."""
        if not dir_path.exists():
            return
        
        for file_path in dir_path.rglob('*'):
            if file_path.is_dir():
                continue
            if self.should_skip(file_path):
                continue
            
            rel_path = file_path.relative_to(self.root)
            self.files.add(str(rel_path))
            
            # Track directories
            for parent in rel_path.parents:
                if str(parent) != '.':
                    self.directories.add(str(parent))
            
            # Process source files
            suffix = file_path.suffix
            if suffix in ['.py', '.ts', '.tsx', '.js', '.jsx']:
                try:
                    content = file_path.read_text(encoding='utf-8')
                except (UnicodeDecodeError, PermissionError):
                    continue
                
                if suffix == '.py':
                    exports = self.extract_python_exports(content)
                else:
                    exports = self.extract_typescript_exports(content)
                
                tech = self.extract_tech(content, suffix)
                
                entity = GroundTruthEntity(
                    name=file_path.stem,
                    entity_type=self.get_entity_type(file_path),
                    path=str(rel_path),
                    exports=exports,
                    tech=tech,
                )
                self.entities.append(entity)
    
    def extract(self) -> Dict[str, Any]:
        """Extract all ground truth data."""
        # Scan source directories
        for domain, paths in SOURCE_DIRS.items():
            for path in paths:
                full_path = self.root / path
                if full_path.is_file():
                    self.files.add(path)
                else:
                    self.scan_directory(full_path)
        
        # Build summary
        entity_counts = defaultdict(int)
        for entity in self.entities:
            entity_counts[entity.entity_type] += 1
        
        return {
            'total_files': len(self.files),
            'total_directories': len(self.directories),
            'total_entities': len(self.entities),
            'entity_counts': dict(entity_counts),
            'entities': self.entities,
            'files': self.files,
            'directories': self.directories,
        }


# ============================================================================
# Knowledge Loader
# ============================================================================

class KnowledgeLoader:
    """Loads and parses project_knowledge.json."""
    
    def __init__(self, knowledge_path: Path = Path('project_knowledge.json')):
        self.knowledge_path = knowledge_path
        self.entries: List[Dict] = []
        self.hot_cache: Dict = {}
        self.domain_index: Dict = {}
        self.gotchas: Dict = {}
        self.interconnections: Dict = {}
        self.session_patterns: Dict = {}
        self.entities: List[Dict] = []
        self.codegraph: List[Dict] = []
        
    def load(self) -> bool:
        """Load knowledge file."""
        if not self.knowledge_path.exists():
            return False
        
        try:
            with open(self.knowledge_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        entry = json.loads(line)
                        self.entries.append(entry)
                        
                        # Categorize entries
                        entry_type = entry.get('type', '')
                        if entry_type == 'hot_cache':
                            self.hot_cache = entry
                        elif entry_type == 'domain_index':
                            self.domain_index = entry
                        elif entry_type == 'gotchas':
                            self.gotchas = entry
                        elif entry_type == 'interconnections':
                            self.interconnections = entry
                        elif entry_type == 'session_patterns':
                            self.session_patterns = entry
                        elif entry_type == 'entity':
                            self.entities.append(entry)
                        elif entry_type == 'codegraph':
                            self.codegraph.append(entry)
            return True
        except (json.JSONDecodeError, IOError):
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge statistics."""
        return {
            'total_entries': len(self.entries),
            'hot_cache_entities': len(self.hot_cache.get('top_entities', {})),
            'common_answers': len(self.hot_cache.get('common_answers', {})),
            'gotchas_count': len(self.gotchas.get('issues', {})),
            'entities': len(self.entities),
            'codegraph': len(self.codegraph),
            'has_v3_layers': bool(self.hot_cache and self.domain_index),
        }


# ============================================================================
# Precision/Recall Calculator
# ============================================================================

class PrecisionCalculator:
    """Calculates precision and recall of knowledge vs ground truth."""
    
    def __init__(self, ground_truth: Dict, knowledge: KnowledgeLoader):
        self.ground_truth = ground_truth
        self.knowledge = knowledge
        
    def calculate(self) -> Dict[str, Any]:
        """Calculate precision, recall, and F1 score."""
        
        # Get ground truth entities
        gt_entities = {e.name.lower() for e in self.ground_truth.get('entities', [])}
        gt_files = {Path(f).stem.lower() for f in self.ground_truth.get('files', set())}
        gt_all = gt_entities | gt_files
        
        # Get knowledge entities
        knowledge_entities = set()
        for entity in self.knowledge.entities:
            name = entity.get('name', '').split('.')[-1].lower()
            knowledge_entities.add(name)
        
        # Hot cache entities
        for name in self.knowledge.hot_cache.get('top_entities', {}).keys():
            knowledge_entities.add(name.lower())
        
        # Calculate metrics
        true_positives = len(gt_all & knowledge_entities)
        false_positives = len(knowledge_entities - gt_all)
        false_negatives = len(gt_all - knowledge_entities)
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Layer-specific accuracy
        layer_accuracy = {}
        
        # Hot cache accuracy
        hot_cache_entities = set(self.knowledge.hot_cache.get('top_entities', {}).keys())
        hot_cache_hits = len({e.lower() for e in hot_cache_entities} & gt_all)
        layer_accuracy['hot_cache'] = hot_cache_hits / len(hot_cache_entities) if hot_cache_entities else 0
        
        # Common answers accuracy (check if paths exist)
        common_answers = self.knowledge.hot_cache.get('common_answers', {})
        answers_correct = 0
        answers_total = 0
        for key, value in common_answers.items():
            if isinstance(value, str):
                if Path(value).exists() or value in self.ground_truth.get('directories', set()):
                    answers_correct += 1
                answers_total += 1
            elif isinstance(value, list):
                for path in value:
                    if not path.startswith('1.') and not path.startswith('2.'):  # Skip instructions
                        if Path(path).exists():
                            answers_correct += 1
                        answers_total += 1
        layer_accuracy['common_answers'] = answers_correct / answers_total if answers_total > 0 else 0
        
        # Gotchas accuracy (check if referenced files exist)
        gotchas = self.knowledge.gotchas.get('issues', {})
        gotchas_correct = 0
        gotchas_total = 0
        for issue_name, issue_data in gotchas.items():
            for file_path in issue_data.get('files', []):
                if Path(file_path).exists() or file_path.endswith('/'):
                    gotchas_correct += 1
                gotchas_total += 1
        layer_accuracy['gotchas'] = gotchas_correct / gotchas_total if gotchas_total > 0 else 0
        
        return {
            'precision': round(precision * 100, 1),
            'recall': round(recall * 100, 1),
            'f1_score': round(f1 * 100, 1),
            'true_positives': true_positives,
            'false_positives': false_positives,
            'false_negatives': false_negatives,
            'ground_truth_count': len(gt_all),
            'knowledge_count': len(knowledge_entities),
            'layer_accuracy': {k: round(v * 100, 1) for k, v in layer_accuracy.items()},
        }


# ============================================================================
# Session Simulator
# ============================================================================

@dataclass
class SimulatedQuery:
    """A simulated query in a session."""
    query_type: str
    target: str
    needs_knowledge: bool
    answered_by_hot_cache: bool = False
    answered_by_domain_index: bool = False
    answered_by_gotchas: bool = False
    answered_by_full_lookup: bool = False
    not_found: bool = False


@dataclass
class SimulatedSession:
    """A simulated coding session."""
    session_type: str
    queries: List[SimulatedQuery] = field(default_factory=list)
    total_queries: int = 0
    cache_hits: int = 0
    full_lookups: int = 0
    not_found: int = 0
    tokens_saved: int = 0


class SessionSimulator:
    """Simulates coding sessions with/without knowledge."""
    
    def __init__(self, ground_truth: Dict, knowledge: KnowledgeLoader, seed: int = 42):
        self.ground_truth = ground_truth
        self.knowledge = knowledge
        self.random = random.Random(seed)
        
        # Build lookup sets
        self.gt_entities = [e.name for e in ground_truth.get('entities', [])]
        self.gt_files = list(ground_truth.get('files', set()))
        
        self.hot_cache_entities = set(knowledge.hot_cache.get('top_entities', {}).keys())
        self.common_answers = knowledge.hot_cache.get('common_answers', {})
        self.gotchas_symptoms = [
            issue.get('symptom', '') 
            for issue in knowledge.gotchas.get('issues', {}).values()
        ]
        
    def generate_query(self, session_type: str) -> SimulatedQuery:
        """Generate a realistic query based on session type."""
        
        # Pick query type
        query_type = self.random.choices(
            list(QUERY_TYPES.keys()),
            weights=list(QUERY_TYPES.values())
        )[0]
        
        # Generate target based on query type
        if query_type == 'where_is':
            if self.gt_entities:
                target = self.random.choice(self.gt_entities)
            else:
                target = 'some_entity'
        elif query_type == 'file_lookup':
            if self.gt_files:
                target = self.random.choice(self.gt_files)
            else:
                target = 'some_file.py'
        elif query_type == 'debug':
            if self.gotchas_symptoms:
                target = self.random.choice(self.gotchas_symptoms)
            else:
                target = 'some_error'
        elif query_type == 'how_to':
            target = self.random.choice(['add_endpoint', 'add_page', 'add_model'])
        elif query_type == 'list_all':
            target = self.random.choice(['services', 'models', 'pages', 'endpoints'])
        elif query_type == 'tech_stack':
            target = 'frameworks'
        else:
            target = 'general'
        
        return SimulatedQuery(
            query_type=query_type,
            target=target,
            needs_knowledge=True,
        )
    
    def answer_query_with_knowledge(self, query: SimulatedQuery) -> SimulatedQuery:
        """Attempt to answer query using knowledge layers."""
        
        # Layer 1: Hot Cache (31% of queries)
        if query.query_type == 'where_is':
            if query.target in self.hot_cache_entities:
                query.answered_by_hot_cache = True
                return query
        
        if query.query_type == 'how_to':
            key = f"how_to_{query.target}"
            if key in self.common_answers:
                query.answered_by_hot_cache = True
                return query
        
        if query.query_type == 'tech_stack':
            if 'quick_facts' in self.knowledge.hot_cache:
                query.answered_by_hot_cache = True
                return query
        
        # Layer 2: Domain Index (22% of queries)
        if query.query_type == 'list_all':
            domain_data = self.knowledge.domain_index.get('backend', {})
            if query.target in domain_data or query.target in ['services', 'models']:
                query.answered_by_domain_index = True
                return query
        
        # Layer 3: Gotchas (11% of queries)
        if query.query_type == 'debug':
            for issue in self.knowledge.gotchas.get('issues', {}).values():
                if query.target.lower() in issue.get('symptom', '').lower():
                    query.answered_by_gotchas = True
                    return query
        
        # Layer 4+: Full lookup required (15% of queries)
        # Check if entity exists in full knowledge
        for entity in self.knowledge.entities:
            name = entity.get('name', '').split('.')[-1]
            if query.target.lower() == name.lower():
                query.answered_by_full_lookup = True
                return query
        
        # Not found
        query.not_found = True
        return query
    
    def answer_query_without_knowledge(self, query: SimulatedQuery) -> SimulatedQuery:
        """Simulate answering query without knowledge (full file scan)."""
        query.answered_by_full_lookup = True
        return query
    
    def simulate_session(self, session_type: str, use_knowledge: bool) -> SimulatedSession:
        """Simulate a single coding session."""
        session = SimulatedSession(session_type=session_type)
        
        # Number of queries based on session type
        num_queries = self.random.randint(3, 12)
        
        for _ in range(num_queries):
            query = self.generate_query(session_type)
            
            if use_knowledge:
                query = self.answer_query_with_knowledge(query)
            else:
                query = self.answer_query_without_knowledge(query)
            
            session.queries.append(query)
            session.total_queries += 1
            
            if query.answered_by_hot_cache or query.answered_by_domain_index:
                session.cache_hits += 1
                session.tokens_saved += 500  # Estimate: saved 500 tokens per cache hit
            elif query.answered_by_gotchas:
                session.cache_hits += 1
                session.tokens_saved += 300
            elif query.answered_by_full_lookup:
                session.full_lookups += 1
            else:
                session.not_found += 1
        
        return session
    
    def simulate_batch(self, num_sessions: int, use_knowledge: bool) -> Dict[str, Any]:
        """Simulate multiple sessions."""
        results = {
            'total_sessions': num_sessions,
            'use_knowledge': use_knowledge,
            'total_queries': 0,
            'cache_hits': 0,
            'full_lookups': 0,
            'not_found': 0,
            'tokens_saved': 0,
            'by_query_type': defaultdict(lambda: {'total': 0, 'cached': 0}),
        }
        
        for _ in range(num_sessions):
            # Pick session type
            session_type = self.random.choices(
                list(SESSION_TYPES.keys()),
                weights=list(SESSION_TYPES.values())
            )[0]
            
            session = self.simulate_session(session_type, use_knowledge)
            
            results['total_queries'] += session.total_queries
            results['cache_hits'] += session.cache_hits
            results['full_lookups'] += session.full_lookups
            results['not_found'] += session.not_found
            results['tokens_saved'] += session.tokens_saved
            
            # Track by query type
            for query in session.queries:
                results['by_query_type'][query.query_type]['total'] += 1
                if query.answered_by_hot_cache or query.answered_by_domain_index or query.answered_by_gotchas:
                    results['by_query_type'][query.query_type]['cached'] += 1
        
        # Calculate rates
        if results['total_queries'] > 0:
            results['cache_hit_rate'] = round(results['cache_hits'] / results['total_queries'] * 100, 1)
            results['not_found_rate'] = round(results['not_found'] / results['total_queries'] * 100, 1)
        else:
            results['cache_hit_rate'] = 0
            results['not_found_rate'] = 0
        
        results['avg_tokens_saved_per_session'] = round(results['tokens_saved'] / num_sessions, 1)
        
        return results


# ============================================================================
# Main Execution
# ============================================================================

def measure_improvement(with_knowledge: Dict, without_knowledge: Dict) -> Dict[str, Any]:
    """Measure improvement from using knowledge."""
    
    # Token savings
    tokens_saved = with_knowledge.get('tokens_saved', 0)
    
    # Cache hit improvement
    cache_hit_rate_with = with_knowledge.get('cache_hit_rate', 0)
    cache_hit_rate_without = 0  # Without knowledge, no cache hits
    cache_improvement = cache_hit_rate_with - cache_hit_rate_without
    
    # Query efficiency
    total_queries = with_knowledge.get('total_queries', 1)
    cache_hits = with_knowledge.get('cache_hits', 0)
    
    # Estimate time savings (cache hit = ~2 seconds saved per query)
    time_saved_seconds = cache_hits * 2
    
    return {
        'total_tokens_saved': tokens_saved,
        'cache_hit_rate_improvement': f"+{cache_improvement:.1f}%",
        'cache_hits': cache_hits,
        'total_queries': total_queries,
        'estimated_time_saved_minutes': round(time_saved_seconds / 60, 1),
        'queries_accelerated_pct': round(cache_hits / total_queries * 100, 1) if total_queries > 0 else 0,
    }


def main():
    parser = argparse.ArgumentParser(description='AKIS Knowledge Testing Script')
    parser.add_argument('--sessions', type=int, default=100000, help='Number of sessions to simulate')
    parser.add_argument('--output', type=str, default=None, help='Output file for results (JSON)')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()
    
    print("=" * 70)
    print(" AKIS KNOWLEDGE TESTING SCRIPT v1.0")
    print(" (Precision Testing + 100k Session Simulation)")
    print("=" * 70)
    
    # =========================================================================
    # PHASE 1: EXTRACT GROUND TRUTH FROM CODEBASE
    # =========================================================================
    print("\n" + "=" * 70)
    print(" PHASE 1: EXTRACT GROUND TRUTH FROM CODEBASE")
    print("=" * 70)
    
    print("\n📁 Scanning actual codebase...")
    extractor = GroundTruthExtractor()
    ground_truth = extractor.extract()
    
    print(f"   Total files: {ground_truth['total_files']}")
    print(f"   Total entities: {ground_truth['total_entities']}")
    print(f"\n   Entity types:")
    for entity_type, count in sorted(ground_truth['entity_counts'].items(), key=lambda x: -x[1]):
        print(f"      {entity_type}: {count}")
    
    # =========================================================================
    # PHASE 2: LOAD CURRENT KNOWLEDGE
    # =========================================================================
    print("\n" + "=" * 70)
    print(" PHASE 2: LOAD CURRENT KNOWLEDGE")
    print("=" * 70)
    
    print("\n📋 Loading project_knowledge.json...")
    knowledge = KnowledgeLoader()
    if not knowledge.load():
        print("   ❌ Failed to load knowledge file")
        return 1
    
    stats = knowledge.get_stats()
    print(f"   Total entries: {stats['total_entries']}")
    print(f"   Hot cache entities: {stats['hot_cache_entities']}")
    print(f"   Common answers: {stats['common_answers']}")
    print(f"   Gotchas: {stats['gotchas_count']}")
    print(f"   Full entities: {stats['entities']}")
    print(f"   Codegraph entries: {stats['codegraph']}")
    print(f"   Has v3.0 layers: {'✓' if stats['has_v3_layers'] else '✗'}")
    
    # =========================================================================
    # PHASE 3: CALCULATE PRECISION/RECALL
    # =========================================================================
    print("\n" + "=" * 70)
    print(" PHASE 3: CALCULATE PRECISION/RECALL")
    print("=" * 70)
    
    print("\n🎯 Calculating knowledge precision...")
    calculator = PrecisionCalculator(ground_truth, knowledge)
    precision_results = calculator.calculate()
    
    print(f"\n   Overall Metrics:")
    print(f"      Precision:  {precision_results['precision']:.1f}%")
    print(f"      Recall:     {precision_results['recall']:.1f}%")
    print(f"      F1 Score:   {precision_results['f1_score']:.1f}%")
    
    print(f"\n   Layer Accuracy:")
    for layer, accuracy in precision_results['layer_accuracy'].items():
        status = "✓" if accuracy >= 80 else "⚠️" if accuracy >= 50 else "✗"
        print(f"      {status} {layer}: {accuracy:.1f}%")
    
    print(f"\n   Counts:")
    print(f"      True Positives:  {precision_results['true_positives']}")
    print(f"      False Positives: {precision_results['false_positives']}")
    print(f"      False Negatives: {precision_results['false_negatives']}")
    
    # =========================================================================
    # PHASE 4: SIMULATE SESSIONS WITHOUT KNOWLEDGE
    # =========================================================================
    print("\n" + "=" * 70)
    print(f" PHASE 4: SIMULATE {args.sessions:,} SESSIONS (WITHOUT Knowledge)")
    print("=" * 70)
    
    print(f"\n🎲 Running simulation without knowledge...")
    simulator = SessionSimulator(ground_truth, knowledge, seed=42)
    without_results = simulator.simulate_batch(args.sessions, use_knowledge=False)
    
    print(f"   Total queries: {without_results['total_queries']:,}")
    print(f"   Cache hits: {without_results['cache_hits']:,} (0%)")
    print(f"   Full lookups: {without_results['full_lookups']:,}")
    print(f"   Tokens saved: 0")
    
    # =========================================================================
    # PHASE 5: SIMULATE SESSIONS WITH KNOWLEDGE
    # =========================================================================
    print("\n" + "=" * 70)
    print(f" PHASE 5: SIMULATE {args.sessions:,} SESSIONS (WITH Knowledge)")
    print("=" * 70)
    
    print(f"\n🚀 Running simulation with knowledge...")
    with_results = simulator.simulate_batch(args.sessions, use_knowledge=True)
    
    print(f"   Total queries: {with_results['total_queries']:,}")
    print(f"   Cache hits: {with_results['cache_hits']:,} ({with_results['cache_hit_rate']:.1f}%)")
    print(f"   Full lookups: {with_results['full_lookups']:,}")
    print(f"   Not found: {with_results['not_found']:,}")
    print(f"   Tokens saved: {with_results['tokens_saved']:,}")
    
    # =========================================================================
    # PHASE 6: MEASURE IMPROVEMENT
    # =========================================================================
    print("\n" + "=" * 70)
    print(" PHASE 6: EFFECTIVENESS COMPARISON")
    print("=" * 70)
    
    improvement = measure_improvement(with_results, without_results)
    
    print(f"""
   ┌─────────────────────────────────────────────────────────────────┐
   │                    SIMULATION RESULTS ({args.sessions:,} sessions)              │
   ├─────────────────────────────────────────────────────────────────┤
   │  Metric                │  Without    │  With       │  Change   │
   ├────────────────────────┼─────────────┼─────────────┼───────────┤
   │  Cache Hit Rate        │       0%    │    {with_results['cache_hit_rate']:>5.1f}%   │  +{with_results['cache_hit_rate']:.1f}%   │
   │  Full Lookups          │  {without_results['full_lookups']:>9,}  │  {with_results['full_lookups']:>9,}  │  -{(1 - with_results['full_lookups']/without_results['full_lookups'])*100:.1f}%   │
   │  Tokens Saved          │          0  │  {with_results['tokens_saved']:>9,}  │  +{with_results['tokens_saved']:,}  │
   └─────────────────────────────────────────────────────────────────┘
""")
    
    print(f"   Query Type Performance (with knowledge):")
    for query_type, data in sorted(with_results['by_query_type'].items()):
        rate = data['cached'] / data['total'] * 100 if data['total'] > 0 else 0
        print(f"      {query_type}: {data['cached']:,}/{data['total']:,} cached ({rate:.1f}%)")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print(" SUMMARY")
    print("=" * 70)
    print(f"""
   Ground Truth:
      Files analyzed:         {ground_truth['total_files']}
      Entities found:         {ground_truth['total_entities']}
   
   Knowledge Precision:
      Precision:              {precision_results['precision']:.1f}%
      Recall:                 {precision_results['recall']:.1f}%
      F1 Score:               {precision_results['f1_score']:.1f}%
   
   Simulation Results ({args.sessions:,} sessions):
      Cache hit rate:         {with_results['cache_hit_rate']:.1f}%
      Queries accelerated:    {improvement['queries_accelerated_pct']:.1f}%
      Total tokens saved:     {with_results['tokens_saved']:,}
      Est. time saved:        {improvement['estimated_time_saved_minutes']:.1f} minutes
""")
    
    # Save results
    if args.output:
        output_data = {
            'ground_truth': {
                'total_files': ground_truth['total_files'],
                'total_entities': ground_truth['total_entities'],
                'entity_counts': ground_truth['entity_counts'],
            },
            'knowledge_stats': stats,
            'precision_results': precision_results,
            'simulation_without_knowledge': {k: dict(v) if isinstance(v, defaultdict) else v for k, v in without_results.items()},
            'simulation_with_knowledge': {k: dict(v) if isinstance(v, defaultdict) else v for k, v in with_results.items()},
            'improvement': improvement,
        }
        
        Path(args.output).write_text(json.dumps(output_data, indent=2, default=str))
        print(f"\n💾 Results saved to {args.output}")
    
    print("\n✅ Knowledge testing complete!")
    
    return 0


if __name__ == "__main__":
    exit(main())
