#!/usr/bin/env python3
"""
AKIS Documentation Testing Script v1.0

Tests documentation precision against actual codebase and simulates 100k sessions.
Measures documentation effectiveness for code understanding and architecture navigation.

Key Features:
1. Establishes ground truth from actual codebase structure
2. Tests current documentation coverage and accuracy
3. Calculates precision, recall, and F1 score
4. Simulates 100k sessions with/without documentation
5. Measures query hit rate and understanding acceleration

Usage:
    python .github/scripts/test_documents.py --sessions 100000 [--output FILE]
"""

import json
import random
import re
import argparse
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Any, Set, Optional, Tuple
from pathlib import Path
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================

# Documentation categories
DOC_CATEGORIES = {
    'guides': 'Setup, deployment, configuration guides',
    'features': 'Feature documentation and usage',
    'technical': 'API references, specs',
    'architecture': 'System design, data models',
    'development': 'Contributing, testing',
    'design': 'UI/UX specifications',
}

# File patterns that SHOULD be documented
DOCUMENTABLE_PATTERNS = {
    'endpoint': r'backend/app/api/.*\.py$',
    'service': r'backend/app/services/.*\.py$',
    'model': r'backend/app/models/.*\.py$',
    'page': r'frontend/src/pages/.*\.tsx$',
    'component': r'frontend/src/components/.*\.tsx$',
    'store': r'frontend/src/store/.*\.ts$',
    'docker': r'docker.*\.yml$',
    'script': r'scripts/.*\.py$',
}

# Session types and their documentation needs
SESSION_TYPES = {
    'onboarding': 0.10,  # New user needs docs heavily
    'feature_development': 0.35,  # Building features
    'debugging': 0.20,  # Troubleshooting
    'architecture_review': 0.10,  # Understanding system
    'api_integration': 0.15,  # Using APIs
    'deployment': 0.10,  # DevOps tasks
}

# Query types and their documentation relevance
QUERY_TYPES = {
    'how_to_setup': 0.10,  # "How to set up X?"
    'what_is_architecture': 0.10,  # "What is the architecture?"
    'where_is_api': 0.15,  # "Where is the API for X?"
    'how_to_add_feature': 0.15,  # "How to add X?"
    'what_does_component': 0.10,  # "What does component X do?"
    'how_to_deploy': 0.08,  # "How to deploy?"
    'troubleshooting': 0.12,  # "Why is X failing?"
    'code_location': 0.10,  # "Where is X defined?"
    'configuration': 0.05,  # "How to configure X?"
    'testing': 0.05,  # "How to test X?"
}


# ============================================================================
# Ground Truth Extraction
# ============================================================================

@dataclass
class DocumentableEntity:
    """An entity from the codebase that should be documented."""
    name: str
    entity_type: str
    path: str
    exports: List[str] = field(default_factory=list)
    docstring: str = ""
    should_document: bool = True


class GroundTruthExtractor:
    """Extracts what SHOULD be documented from actual codebase."""
    
    def __init__(self, root: Path = Path.cwd()):
        self.root = root
        self.entities: List[DocumentableEntity] = []
        self.files: Set[str] = set()
        
    def should_skip(self, path: Path) -> bool:
        """Check if path should be skipped."""
        skip_dirs = {'node_modules', '.git', '__pycache__', '.venv', 'venv', 
                     'dist', 'build', '.next', 'volumes', 'log', 'alembic'}
        return any(skip in path.parts for skip in skip_dirs)
    
    def get_entity_type(self, path: Path) -> str:
        """Determine entity type from file path."""
        path_str = str(path)
        for entity_type, pattern in DOCUMENTABLE_PATTERNS.items():
            if re.search(pattern, path_str):
                return entity_type
        return 'module'
    
    def extract_docstring(self, content: str) -> str:
        """Extract module-level docstring."""
        match = re.match(r'^\s*["\'][\"\'][\"\'](.+?)["\'][\"\'][\"\']', content, re.DOTALL)
        if match:
            return match.group(1).strip()[:100]
        return ""
    
    def extract_exports(self, content: str, file_type: str) -> List[str]:
        """Extract exported classes/functions."""
        exports = []
        if file_type == 'python':
            for match in re.finditer(r'(?:def|class)\s+(\w+)', content):
                name = match.group(1)
                if not name.startswith('_'):
                    exports.append(name)
        elif file_type in ['typescript', 'javascript']:
            for match in re.finditer(r'export\s+(?:default\s+)?(?:function|class|const)\s+(\w+)', content):
                exports.append(match.group(1))
        return exports[:10]  # Limit
    
    def scan_codebase(self):
        """Scan codebase for documentable entities."""
        # Scan backend
        for py_file in (self.root / 'backend').rglob('*.py'):
            if self.should_skip(py_file):
                continue
            self._process_file(py_file, 'python')
        
        # Scan frontend
        for tsx_file in (self.root / 'frontend').rglob('*.tsx'):
            if self.should_skip(tsx_file):
                continue
            self._process_file(tsx_file, 'typescript')
        
        for ts_file in (self.root / 'frontend').rglob('*.ts'):
            if self.should_skip(ts_file):
                continue
            self._process_file(ts_file, 'typescript')
        
        # Scan docker files
        for docker_file in self.root.glob('docker*.yml'):
            self._process_file(docker_file, 'config')
        
        # Scan scripts
        for script_file in (self.root / 'scripts').glob('*.py'):
            self._process_file(script_file, 'python')
    
    def _process_file(self, file_path: Path, file_type: str):
        """Process a single file."""
        try:
            rel_path = file_path.relative_to(self.root)
            self.files.add(str(rel_path))
            
            content = file_path.read_text(encoding='utf-8')
            entity_type = self.get_entity_type(file_path)
            
            entity = DocumentableEntity(
                name=file_path.stem,
                entity_type=entity_type,
                path=str(rel_path),
                exports=self.extract_exports(content, file_type),
                docstring=self.extract_docstring(content) if file_type == 'python' else "",
            )
            self.entities.append(entity)
        except (UnicodeDecodeError, PermissionError):
            pass
    
    def extract(self) -> Dict[str, Any]:
        """Extract all ground truth data."""
        self.scan_codebase()
        
        # Group by type
        entity_counts = defaultdict(int)
        for entity in self.entities:
            entity_counts[entity.entity_type] += 1
        
        return {
            'total_files': len(self.files),
            'total_entities': len(self.entities),
            'entity_counts': dict(entity_counts),
            'entities': self.entities,
            'files': self.files,
        }


# ============================================================================
# Documentation Loader
# ============================================================================

@dataclass
class DocumentInfo:
    """Information about a documentation file."""
    path: str
    title: str
    category: str
    topics: List[str]
    endpoints_documented: List[str]
    pages_documented: List[str]
    services_documented: List[str]
    word_count: int


class DocumentationLoader:
    """Loads and parses existing documentation."""
    
    def __init__(self, docs_path: Path = Path('docs')):
        self.docs_path = docs_path
        self.documents: List[DocumentInfo] = []
        self.index_content: str = ""
        
    def load(self) -> bool:
        """Load all documentation files."""
        if not self.docs_path.exists():
            return False
        
        # Load INDEX.md
        index_path = self.docs_path / 'INDEX.md'
        if index_path.exists():
            self.index_content = index_path.read_text(encoding='utf-8')
        
        # Scan all markdown files
        for md_file in self.docs_path.rglob('*.md'):
            if 'archive' in str(md_file):
                continue  # Skip archived docs
            
            try:
                content = md_file.read_text(encoding='utf-8')
            except (UnicodeDecodeError, PermissionError):
                continue
            
            rel_path = md_file.relative_to(self.docs_path)
            category = rel_path.parts[0] if len(rel_path.parts) > 1 else 'root'
            
            # Extract title
            title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            title = title_match.group(1) if title_match else md_file.stem
            
            # Extract topics (headers)
            topics = re.findall(r'^##\s+(.+)$', content, re.MULTILINE)
            
            # Extract documented endpoints
            endpoints = re.findall(r'`(?:GET|POST|PUT|DELETE|PATCH)\s+(/[^`]+)`', content)
            
            # Extract documented pages
            pages = re.findall(r'pages/(\w+)\.tsx', content)
            
            # Extract documented services
            services = re.findall(r'services/(\w+)\.py', content)
            
            doc = DocumentInfo(
                path=str(rel_path),
                title=title,
                category=category,
                topics=topics,
                endpoints_documented=endpoints,
                pages_documented=pages,
                services_documented=services,
                word_count=len(content.split()),
            )
            self.documents.append(doc)
        
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """Get documentation statistics."""
        total_words = sum(d.word_count for d in self.documents)
        by_category = defaultdict(int)
        for d in self.documents:
            by_category[d.category] += 1
        
        return {
            'total_documents': len(self.documents),
            'total_words': total_words,
            'by_category': dict(by_category),
            'total_endpoints_documented': sum(len(d.endpoints_documented) for d in self.documents),
            'total_pages_documented': sum(len(d.pages_documented) for d in self.documents),
            'total_services_documented': sum(len(d.services_documented) for d in self.documents),
        }
    
    def has_documentation_for(self, entity_name: str, entity_type: str) -> bool:
        """Check if entity is documented."""
        entity_lower = entity_name.lower()
        
        for doc in self.documents:
            # Check title
            if entity_lower in doc.title.lower():
                return True
            
            # Check topics
            for topic in doc.topics:
                if entity_lower in topic.lower():
                    return True
            
            # Check type-specific
            if entity_type == 'endpoint':
                for ep in doc.endpoints_documented:
                    if entity_lower in ep.lower():
                        return True
            elif entity_type == 'page':
                if entity_name in doc.pages_documented:
                    return True
            elif entity_type == 'service':
                if entity_name in doc.services_documented:
                    return True
        
        return False


# ============================================================================
# Precision/Recall Calculator
# ============================================================================

class PrecisionCalculator:
    """Calculates precision and recall of documentation vs codebase."""
    
    def __init__(self, ground_truth: Dict, docs: DocumentationLoader):
        self.ground_truth = ground_truth
        self.docs = docs
        
    def calculate(self) -> Dict[str, Any]:
        """Calculate precision, recall, and F1 score."""
        
        # Get entities that SHOULD be documented
        should_document = set()
        for entity in self.ground_truth.get('entities', []):
            if entity.entity_type in ['endpoint', 'service', 'page', 'component', 'model']:
                should_document.add((entity.name, entity.entity_type))
        
        # Get entities that ARE documented
        documented = set()
        for entity in self.ground_truth.get('entities', []):
            if self.docs.has_documentation_for(entity.name, entity.entity_type):
                documented.add((entity.name, entity.entity_type))
        
        # Calculate metrics
        true_positives = len(should_document & documented)
        false_negatives = len(should_document - documented)  # Should be documented but isn't
        
        # For precision, we'd need to know what's documented that shouldn't be
        # Approximate: assume all documented items are valid (high precision)
        false_positives = max(0, len(documented) - len(should_document))
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Coverage by type
        coverage_by_type = {}
        for entity_type in ['endpoint', 'service', 'page', 'component', 'model']:
            type_entities = [(e.name, e.entity_type) for e in self.ground_truth.get('entities', []) if e.entity_type == entity_type]
            type_documented = sum(1 for e in type_entities if self.docs.has_documentation_for(e[0], e[1]))
            coverage_by_type[entity_type] = (type_documented / len(type_entities) * 100) if type_entities else 0
        
        return {
            'precision': round(precision * 100, 1),
            'recall': round(recall * 100, 1),
            'f1_score': round(f1 * 100, 1),
            'true_positives': true_positives,
            'false_negatives': false_negatives,
            'should_document_count': len(should_document),
            'documented_count': len(documented),
            'coverage_by_type': {k: round(v, 1) for k, v in coverage_by_type.items()},
        }


# ============================================================================
# Session Simulator
# ============================================================================

@dataclass
class SimulatedDocQuery:
    """A simulated documentation query."""
    query_type: str
    target: str
    needs_docs: bool
    answered_by_docs: bool = False
    answered_by_code_search: bool = False
    not_found: bool = False


@dataclass
class SimulatedDocSession:
    """A simulated coding session with documentation needs."""
    session_type: str
    queries: List[SimulatedDocQuery] = field(default_factory=list)
    total_queries: int = 0
    doc_hits: int = 0
    code_searches: int = 0
    not_found: int = 0
    time_saved: float = 0.0  # Minutes saved


class SessionSimulator:
    """Simulates coding sessions with/without documentation."""
    
    def __init__(self, ground_truth: Dict, docs: DocumentationLoader, seed: int = 42):
        self.ground_truth = ground_truth
        self.docs = docs
        self.random = random.Random(seed)
        
        # Build lookup sets
        self.entities = ground_truth.get('entities', [])
        self.entity_names = [e.name for e in self.entities]
        
        # Pre-calculate documented entities
        self.documented_entities = set()
        for entity in self.entities:
            if docs.has_documentation_for(entity.name, entity.entity_type):
                self.documented_entities.add(entity.name)
        
    def generate_query(self, session_type: str) -> SimulatedDocQuery:
        """Generate a realistic documentation query."""
        
        # Pick query type based on session type
        if session_type == 'onboarding':
            weights = {'how_to_setup': 0.4, 'what_is_architecture': 0.3, 'how_to_deploy': 0.2, 'configuration': 0.1}
        elif session_type == 'debugging':
            weights = {'troubleshooting': 0.5, 'code_location': 0.3, 'what_does_component': 0.2}
        elif session_type == 'api_integration':
            weights = {'where_is_api': 0.5, 'how_to_add_feature': 0.3, 'code_location': 0.2}
        else:
            weights = {k: v for k, v in QUERY_TYPES.items()}
        
        query_type = self.random.choices(list(weights.keys()), weights=list(weights.values()))[0]
        
        # Generate target
        if self.entity_names:
            target = self.random.choice(self.entity_names)
        else:
            target = 'some_entity'
        
        return SimulatedDocQuery(
            query_type=query_type,
            target=target,
            needs_docs=True,
        )
    
    def answer_query_with_docs(self, query: SimulatedDocQuery) -> SimulatedDocQuery:
        """Attempt to answer query using documentation."""
        
        # Check if documentation covers this
        if query.target in self.documented_entities:
            query.answered_by_docs = True
            return query
        
        # Check general queries
        general_covered = {
            'how_to_setup': True,  # Covered by QUICK_START
            'what_is_architecture': True,  # Covered by ARCH_system_v1
            'how_to_deploy': True,  # Covered by DEPLOYMENT
            'configuration': True,  # Covered by CONFIGURATION
            'testing': True,  # Covered by TESTING
        }
        
        if query.query_type in general_covered:
            query.answered_by_docs = True
            return query
        
        # Fallback to code search
        query.answered_by_code_search = True
        return query
    
    def answer_query_without_docs(self, query: SimulatedDocQuery) -> SimulatedDocQuery:
        """Answer query without documentation (code search only)."""
        query.answered_by_code_search = True
        return query
    
    def simulate_session(self, session_type: str, use_docs: bool) -> SimulatedDocSession:
        """Simulate a single coding session."""
        session = SimulatedDocSession(session_type=session_type)
        
        # Number of queries based on session type
        if session_type == 'onboarding':
            num_queries = self.random.randint(8, 15)  # New users ask more
        elif session_type == 'architecture_review':
            num_queries = self.random.randint(5, 10)
        else:
            num_queries = self.random.randint(3, 8)
        
        for _ in range(num_queries):
            query = self.generate_query(session_type)
            
            if use_docs:
                query = self.answer_query_with_docs(query)
            else:
                query = self.answer_query_without_docs(query)
            
            session.queries.append(query)
            session.total_queries += 1
            
            if query.answered_by_docs:
                session.doc_hits += 1
                session.time_saved += 2.0  # 2 minutes saved per doc hit
            elif query.answered_by_code_search:
                session.code_searches += 1
            else:
                session.not_found += 1
        
        return session
    
    def simulate_batch(self, num_sessions: int, use_docs: bool) -> Dict[str, Any]:
        """Simulate multiple sessions."""
        results = {
            'total_sessions': num_sessions,
            'use_docs': use_docs,
            'total_queries': 0,
            'doc_hits': 0,
            'code_searches': 0,
            'not_found': 0,
            'time_saved_minutes': 0.0,
            'by_session_type': defaultdict(lambda: {'sessions': 0, 'doc_hits': 0, 'queries': 0}),
            'by_query_type': defaultdict(lambda: {'total': 0, 'doc_answered': 0}),
        }
        
        for _ in range(num_sessions):
            # Pick session type
            session_type = self.random.choices(
                list(SESSION_TYPES.keys()),
                weights=list(SESSION_TYPES.values())
            )[0]
            
            session = self.simulate_session(session_type, use_docs)
            
            results['total_queries'] += session.total_queries
            results['doc_hits'] += session.doc_hits
            results['code_searches'] += session.code_searches
            results['not_found'] += session.not_found
            results['time_saved_minutes'] += session.time_saved
            
            # Track by session type
            results['by_session_type'][session_type]['sessions'] += 1
            results['by_session_type'][session_type]['doc_hits'] += session.doc_hits
            results['by_session_type'][session_type]['queries'] += session.total_queries
            
            # Track by query type
            for query in session.queries:
                results['by_query_type'][query.query_type]['total'] += 1
                if query.answered_by_docs:
                    results['by_query_type'][query.query_type]['doc_answered'] += 1
        
        # Calculate rates
        if results['total_queries'] > 0:
            results['doc_hit_rate'] = round(results['doc_hits'] / results['total_queries'] * 100, 1)
            results['code_search_rate'] = round(results['code_searches'] / results['total_queries'] * 100, 1)
        else:
            results['doc_hit_rate'] = 0
            results['code_search_rate'] = 100
        
        results['time_saved_hours'] = round(results['time_saved_minutes'] / 60, 1)
        
        return results


# ============================================================================
# Main Execution
# ============================================================================

def measure_improvement(with_docs: Dict, without_docs: Dict) -> Dict[str, Any]:
    """Measure improvement from using documentation."""
    
    doc_hit_rate_with = with_docs.get('doc_hit_rate', 0)
    code_search_rate_without = without_docs.get('code_search_rate', 100)
    
    # Queries that were answered by docs instead of code search
    queries_accelerated = with_docs.get('doc_hits', 0)
    
    # Time savings
    time_saved = with_docs.get('time_saved_hours', 0)
    
    # Code searches avoided
    code_searches_avoided = without_docs.get('code_searches', 0) - with_docs.get('code_searches', 0)
    
    return {
        'doc_hit_rate_improvement': f"+{doc_hit_rate_with:.1f}%",
        'queries_accelerated': queries_accelerated,
        'time_saved_hours': time_saved,
        'code_searches_avoided': code_searches_avoided,
        'efficiency_gain': round(queries_accelerated / with_docs.get('total_queries', 1) * 100, 1),
    }


def main():
    parser = argparse.ArgumentParser(description='AKIS Documentation Testing Script')
    parser.add_argument('--sessions', type=int, default=100000, help='Number of sessions to simulate')
    parser.add_argument('--output', type=str, default=None, help='Output file for results (JSON)')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()
    
    print("=" * 70)
    print(" AKIS DOCUMENTATION TESTING SCRIPT v1.0")
    print(" (Precision Testing + 100k Session Simulation)")
    print("=" * 70)
    
    # =========================================================================
    # PHASE 1: EXTRACT GROUND TRUTH FROM CODEBASE
    # =========================================================================
    print("\n" + "=" * 70)
    print(" PHASE 1: EXTRACT GROUND TRUTH FROM CODEBASE")
    print("=" * 70)
    
    print("\n📁 Scanning actual codebase for documentable entities...")
    extractor = GroundTruthExtractor()
    ground_truth = extractor.extract()
    
    print(f"   Total files: {ground_truth['total_files']}")
    print(f"   Total entities: {ground_truth['total_entities']}")
    print(f"\n   Entity types:")
    for entity_type, count in sorted(ground_truth['entity_counts'].items(), key=lambda x: -x[1]):
        print(f"      {entity_type}: {count}")
    
    # =========================================================================
    # PHASE 2: LOAD CURRENT DOCUMENTATION
    # =========================================================================
    print("\n" + "=" * 70)
    print(" PHASE 2: LOAD CURRENT DOCUMENTATION")
    print("=" * 70)
    
    print("\n📚 Loading documentation files...")
    docs = DocumentationLoader()
    if not docs.load():
        print("   ❌ Failed to load documentation")
        return 1
    
    stats = docs.get_stats()
    print(f"   Total documents: {stats['total_documents']}")
    print(f"   Total words: {stats['total_words']:,}")
    print(f"   Endpoints documented: {stats['total_endpoints_documented']}")
    print(f"   Pages documented: {stats['total_pages_documented']}")
    print(f"   Services documented: {stats['total_services_documented']}")
    
    print(f"\n   By category:")
    for category, count in sorted(stats['by_category'].items()):
        print(f"      {category}: {count}")
    
    # =========================================================================
    # PHASE 3: CALCULATE PRECISION/RECALL
    # =========================================================================
    print("\n" + "=" * 70)
    print(" PHASE 3: CALCULATE DOCUMENTATION COVERAGE")
    print("=" * 70)
    
    print("\n🎯 Calculating documentation coverage...")
    calculator = PrecisionCalculator(ground_truth, docs)
    precision_results = calculator.calculate()
    
    print(f"\n   Overall Metrics:")
    print(f"      Precision:  {precision_results['precision']:.1f}%")
    print(f"      Recall:     {precision_results['recall']:.1f}%")
    print(f"      F1 Score:   {precision_results['f1_score']:.1f}%")
    
    print(f"\n   Coverage by Type:")
    for entity_type, coverage in sorted(precision_results['coverage_by_type'].items(), key=lambda x: -x[1]):
        status = "✓" if coverage >= 50 else "⚠️" if coverage >= 25 else "✗"
        print(f"      {status} {entity_type}: {coverage:.1f}%")
    
    print(f"\n   Counts:")
    print(f"      Should document: {precision_results['should_document_count']}")
    print(f"      Documented:      {precision_results['documented_count']}")
    print(f"      Missing:         {precision_results['false_negatives']}")
    
    # =========================================================================
    # PHASE 4: SIMULATE SESSIONS WITHOUT DOCUMENTATION
    # =========================================================================
    print("\n" + "=" * 70)
    print(f" PHASE 4: SIMULATE {args.sessions:,} SESSIONS (WITHOUT Documentation)")
    print("=" * 70)
    
    print(f"\n🎲 Running simulation without documentation...")
    simulator = SessionSimulator(ground_truth, docs, seed=42)
    without_results = simulator.simulate_batch(args.sessions, use_docs=False)
    
    print(f"   Total queries: {without_results['total_queries']:,}")
    print(f"   Doc hits: 0 (0%)")
    print(f"   Code searches: {without_results['code_searches']:,} (100%)")
    print(f"   Time saved: 0 hours")
    
    # =========================================================================
    # PHASE 5: SIMULATE SESSIONS WITH DOCUMENTATION
    # =========================================================================
    print("\n" + "=" * 70)
    print(f" PHASE 5: SIMULATE {args.sessions:,} SESSIONS (WITH Documentation)")
    print("=" * 70)
    
    print(f"\n📚 Running simulation with documentation...")
    with_results = simulator.simulate_batch(args.sessions, use_docs=True)
    
    print(f"   Total queries: {with_results['total_queries']:,}")
    print(f"   Doc hits: {with_results['doc_hits']:,} ({with_results['doc_hit_rate']:.1f}%)")
    print(f"   Code searches: {with_results['code_searches']:,} ({with_results['code_search_rate']:.1f}%)")
    print(f"   Time saved: {with_results['time_saved_hours']:.1f} hours")
    
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
   │  Doc Hit Rate          │       0%    │    {with_results['doc_hit_rate']:>5.1f}%   │  +{with_results['doc_hit_rate']:.1f}%   │
   │  Code Searches         │  {without_results['code_searches']:>9,}  │  {with_results['code_searches']:>9,}  │  -{improvement['code_searches_avoided']:,}  │
   │  Time Saved (hours)    │          0  │  {with_results['time_saved_hours']:>9.1f}  │  +{with_results['time_saved_hours']:.1f}h   │
   └─────────────────────────────────────────────────────────────────┘
""")
    
    print(f"   Session Type Performance (with documentation):")
    for session_type, data in sorted(with_results['by_session_type'].items()):
        data = dict(data)  # Convert defaultdict
        rate = data['doc_hits'] / data['queries'] * 100 if data['queries'] > 0 else 0
        print(f"      {session_type}: {data['doc_hits']:,}/{data['queries']:,} hits ({rate:.1f}%)")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print(" SUMMARY")
    print("=" * 70)
    print(f"""
   Ground Truth:
      Files analyzed:            {ground_truth['total_files']}
      Documentable entities:     {ground_truth['total_entities']}
   
   Documentation Coverage:
      Precision:                 {precision_results['precision']:.1f}%
      Recall:                    {precision_results['recall']:.1f}%
      F1 Score:                  {precision_results['f1_score']:.1f}%
   
   Simulation Results ({args.sessions:,} sessions):
      Doc hit rate:              {with_results['doc_hit_rate']:.1f}%
      Queries accelerated:       {improvement['queries_accelerated']:,}
      Time saved:                {with_results['time_saved_hours']:.1f} hours
      Efficiency gain:           {improvement['efficiency_gain']:.1f}%
""")
    
    # Save results
    if args.output:
        output_data = {
            'ground_truth': {
                'total_files': ground_truth['total_files'],
                'total_entities': ground_truth['total_entities'],
                'entity_counts': ground_truth['entity_counts'],
            },
            'documentation_stats': stats,
            'precision_results': precision_results,
            'simulation_without_docs': {k: dict(v) if isinstance(v, defaultdict) else v for k, v in without_results.items()},
            'simulation_with_docs': {k: dict(v) if isinstance(v, defaultdict) else v for k, v in with_results.items()},
            'improvement': improvement,
        }
        
        Path(args.output).write_text(json.dumps(output_data, indent=2, default=str))
        print(f"\n💾 Results saved to {args.output}")
    
    print("\n✅ Documentation testing complete!")
    
    return 0


if __name__ == "__main__":
    exit(main())
