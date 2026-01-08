#!/usr/bin/env python3
"""
AKIS Codemap Generator v2.0 (Optimized)

Analyzes project source files and generates codegraph entries for project_knowledge.json.
Supports Python, TypeScript/JavaScript, and common web frameworks.

KNOWLEDGE SCHEMA v2.0:
  Layer 1 - HOT_CACHE: Top 20 entities + common answers (always in context)
  Layer 2 - DOMAIN_INDEX: Per-domain entity indexes (fast lookup)
  Layer 3 - ENTITIES + CODEGRAPH: Full knowledge (on-demand)

Usage:
    python .github/scripts/generate_codemap.py [--dry-run] [--optimize]
"""

import os
import re
import json
import ast
import sys
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Any, Optional
from collections import Counter

# File patterns to analyze
PATTERNS = {
    'python': ['**/*.py'],
    'typescript': ['**/*.ts', '**/*.tsx'],
    'javascript': ['**/*.js', '**/*.jsx'],
}

# Directories to skip
SKIP_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv', 'env',
    'dist', 'build', '.next', 'out', '.pytest_cache', '.mypy_cache',
    'coverage', '.tox', 'eggs', '*.egg-info', 'volumes', 'log'
}

# Files to skip
SKIP_FILES = {'__init__.py', 'conftest.py', 'setup.py'}


class CodeAnalyzer:
    """Analyzes source files to extract dependencies and exports."""
    
    def __init__(self, root_path: Path):
        self.root = root_path
        self.modules: Dict[str, Dict[str, Any]] = {}
        
    def should_skip(self, path: Path) -> bool:
        """Check if path should be skipped."""
        parts = path.parts
        for skip in SKIP_DIRS:
            if skip in parts:
                return True
        if path.name in SKIP_FILES:
            return True
        return False
    
    def analyze_python(self, file_path: Path) -> Optional[Dict]:
        """Analyze a Python file for imports and definitions."""
        try:
            content = file_path.read_text(encoding='utf-8')
            tree = ast.parse(content)
        except (SyntaxError, UnicodeDecodeError):
            return None
            
        imports = set()
        exports = set()
        
        for node in ast.walk(tree):
            # Collect imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
            
            # Collect exports (top-level definitions)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                if not node.name.startswith('_'):
                    exports.add(node.name)
        
        return {
            'imports': list(imports),
            'exports': list(exports)
        }
    
    def analyze_typescript(self, file_path: Path) -> Optional[Dict]:
        """Analyze a TypeScript/JavaScript file for imports and exports."""
        try:
            content = file_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            return None
        
        imports = set()
        exports = set()
        
        # Import patterns
        import_patterns = [
            r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]',
            r'import\s+[\'"]([^\'"]+)[\'"]',
            r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
        ]
        
        for pattern in import_patterns:
            for match in re.finditer(pattern, content):
                module = match.group(1)
                # Normalize path imports
                if module.startswith('.'):
                    module = module.split('/')[-1]
                else:
                    module = module.split('/')[0]
                imports.add(module)
        
        # Export patterns
        export_patterns = [
            r'export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)',
            r'export\s+{\s*([^}]+)\s*}',
        ]
        
        for pattern in export_patterns:
            for match in re.finditer(pattern, content):
                if '{' in pattern:
                    # Named exports
                    for name in match.group(1).split(','):
                        name = name.strip().split(' as ')[0].strip()
                        if name:
                            exports.add(name)
                else:
                    exports.add(match.group(1))
        
        return {
            'imports': list(imports),
            'exports': list(exports)
        }
    
    def get_node_type(self, file_path: Path) -> str:
        """Determine the node type based on file location and name."""
        parts = file_path.parts
        name = file_path.stem.lower()
        
        # Common patterns
        if 'test' in parts or 'tests' in parts or name.startswith('test_'):
            return 'test'
        if 'endpoint' in parts or 'routes' in parts or 'api' in parts:
            return 'endpoint'
        if 'service' in parts or name.endswith('service'):
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
        
        return 'module'
    
    def scan_files(self):
        """Scan all source files in the project."""
        for lang, patterns in PATTERNS.items():
            for pattern in patterns:
                for file_path in self.root.glob(pattern):
                    if self.should_skip(file_path):
                        continue
                    
                    rel_path = file_path.relative_to(self.root)
                    
                    if lang == 'python':
                        result = self.analyze_python(file_path)
                    else:
                        result = self.analyze_typescript(file_path)
                    
                    if result:
                        self.modules[str(rel_path)] = {
                            'nodeType': self.get_node_type(file_path),
                            'imports': result['imports'],
                            'exports': result['exports']
                        }
    
    def build_dependency_graph(self) -> List[Dict]:
        """Build codegraph entries from analyzed modules."""
        entries = []
        
        # Build reverse lookup for exports
        export_to_module: Dict[str, str] = {}
        for module_path, data in self.modules.items():
            for export in data.get('exports', []):
                export_to_module[export] = module_path
        
        for module_path, data in self.modules.items():
            # Find dependencies (modules this file imports from)
            dependencies = []
            for imp in data.get('imports', []):
                # Check if it's an internal module
                for other_path in self.modules:
                    other_name = Path(other_path).stem
                    if imp == other_name or imp in Path(other_path).parts:
                        dependencies.append(other_path)
                        break
            
            # Find dependents (modules that import from this file)
            dependents = []
            module_name = Path(module_path).stem
            for other_path, other_data in self.modules.items():
                if other_path == module_path:
                    continue
                for imp in other_data.get('imports', []):
                    if imp == module_name:
                        dependents.append(other_path)
                        break
            
            entry = {
                'type': 'codegraph',
                'name': module_path,
                'nodeType': data['nodeType'],
                'dependencies': dependencies[:10],  # Limit for readability
                'dependents': dependents[:10]
            }
            entries.append(entry)
        
        return entries


def load_existing_knowledge(knowledge_path: Path) -> List[Dict]:
    """Load existing project_knowledge.json entries."""
    if not knowledge_path.exists():
        return []
    
    entries = []
    try:
        with open(knowledge_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
    except (json.JSONDecodeError, IOError):
        return []
    
    return entries


def update_domain_map(entries: List[Dict]) -> Dict:
    """Generate/update domain map based on current knowledge entries."""
    domains = {}
    quick_nav = {}
    
    # Scan entities to build domain map
    for i, entry in enumerate(entries, 1):
        if entry.get('type') != 'entity':
            continue
        
        name = entry.get('name', '')
        prefix = name.split('.')[0] if '.' in name else ''
        
        # Track domain line ranges
        if prefix and prefix not in domains:
            domains[prefix] = f"Line {i}+"
    
    # Build quick navigation for common tasks
    task_keywords = {
        'Scans_Vulnerabilities': ['Scan', 'CVE', 'Vulnerability', 'Exploit'],
        'Traffic_PacketCapture': ['Traffic', 'Packet', 'Sniffer', 'Flow'],
        'AccessHub_RemoteAccess': ['AccessHub', 'Guacamole', 'Credential', 'Vault'],
        'Assets_Discovery': ['Asset', 'Discovery', 'NMAP'],
        'Settings_Config': ['Settings', 'Config']
    }
    
    for task, keywords in task_keywords.items():
        matches = []
        for i, entry in enumerate(entries, 1):
            if entry.get('type') != 'entity':
                continue
            name = entry.get('name', '')
            if any(kw in name for kw in keywords):
                matches.append(f"{name} (line {i})")
                if len(matches) >= 2:
                    break
        if matches:
            quick_nav[task] = ', '.join(matches)
    
    return {
        'type': 'map',
        'purpose': 'Quick domain overview - Read first for context, then query specific domains below',
        'domains': domains,
        'quickNav': quick_nav,
        'upd': datetime.now().strftime('%Y-%m-%d')
    }


def generate_hot_cache(entities: List[Dict], codegraph: List[Dict]) -> Dict:
    """
    Generate HOT_CACHE layer (Layer 1).
    Contains top 20 most important entities + common answers.
    This should be always in context (via attachment).
    """
    # Calculate frecency scores (frequency + recency)
    frecency_scores: Dict[str, float] = {}
    
    # Count references in codegraph (dependents = high value)
    reference_counts = Counter()
    for entry in codegraph:
        for dep in entry.get('dependents', []):
            reference_counts[dep] += 1
        # Also count exports (more exports = more important)
        reference_counts[entry.get('name', '')] += len(entry.get('exports', []))
    
    # Score entities based on:
    # - Type importance (Service/Store > Model > Schema)
    # - Reference count
    # - Recent updates
    type_weights = {
        'Service': 1.5,
        'Store': 1.5,
        'Context': 1.3,
        'Component': 1.2,
        'Class': 1.0,
        'Model': 1.0,
        'Schema': 0.8,
        'Container': 0.7,
    }
    
    for entity in entities:
        name = entity.get('name', '')
        entity_type = entity.get('entityType', '')
        
        # Base score from type
        base_score = type_weights.get(entity_type, 0.5)
        
        # Add reference bonus
        ref_bonus = min(reference_counts.get(name, 0) * 0.1, 0.5)
        
        # Add recency bonus (updated today = 0.2, this week = 0.1)
        updated = entity.get('updated', '')
        today = datetime.now().strftime('%Y-%m-%d')
        recency_bonus = 0.2 if updated == today else 0.1 if updated else 0
        
        frecency_scores[name] = base_score + ref_bonus + recency_bonus
    
    # Get top 20 entities by frecency
    top_entities = sorted(frecency_scores.items(), key=lambda x: -x[1])[:20]
    
    # Build top entities map
    top_entity_map = {}
    for name, score in top_entities:
        entity = next((e for e in entities if e.get('name') == name), None)
        if entity:
            # Extract path from observations
            observations = entity.get('observations', [])
            path = next((o.replace('Defined in ', '') for o in observations if 'Defined in' in o), '')
            
            top_entity_map[name.split('.')[-1]] = {
                'full_name': name,
                'path': path,
                'type': entity.get('entityType', ''),
                'frecency': round(score, 2)
            }
    
    # Common answers for frequent questions
    common_answers = {
        'where_is_auth': [
            'frontend/src/store/authStore.ts',
            'backend/app/core/security.py',
            'backend/app/api/v1/auth.py'
        ],
        'where_is_models': 'backend/app/models/',
        'where_is_schemas': 'backend/app/schemas/',
        'where_is_api': 'backend/app/api/v1/',
        'where_is_pages': 'frontend/src/pages/',
        'where_is_components': 'frontend/src/components/',
        'where_is_stores': 'frontend/src/store/',
        'how_to_add_endpoint': [
            '1. Create route in backend/app/api/v1/<name>.py',
            '2. Add router to backend/app/main.py',
            '3. Create service in backend/app/services/ if needed'
        ],
        'how_to_add_page': [
            '1. Create page in frontend/src/pages/<Name>.tsx',
            '2. Add route in frontend/src/App.tsx',
            '3. Add nav link in frontend/src/components/Layout.tsx'
        ],
        'how_to_add_model': [
            '1. Create model in backend/app/models/<name>.py',
            '2. Import in backend/app/models/__init__.py',
            '3. Run: alembic revision --autogenerate && alembic upgrade head'
        ]
    }
    
    # Hot paths (most edited directories)
    hot_paths = [
        'frontend/src/pages/',
        'frontend/src/components/',
        'backend/app/api/v1/',
        'backend/app/services/',
        'backend/app/models/'
    ]
    
    return {
        'type': 'hot_cache',
        'version': '2.0',
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'description': 'Top 20 entities + common answers - Always in context',
        'top_entities': top_entity_map,
        'common_answers': common_answers,
        'hot_paths': hot_paths
    }


def generate_domain_index(entities: List[Dict], codegraph: List[Dict]) -> Dict:
    """
    Generate DOMAIN_INDEX layer (Layer 2).
    Per-domain indexes for O(1) lookup.
    """
    # Group entities by domain
    frontend = {'pages': [], 'components': [], 'stores': [], 'hooks': [], 'services': []}
    backend = {'models': [], 'schemas': [], 'services': [], 'endpoints': [], 'core': []}
    infra = {'containers': [], 'configs': []}
    
    for entity in entities:
        name = entity.get('name', '')
        entity_type = entity.get('entityType', '')
        
        if 'Infrastructure' in name:
            if entity_type == 'Container':
                infra['containers'].append(name.split('.')[-1])
            else:
                infra['configs'].append(name.split('.')[-1])
        elif 'frontend' in name.lower():
            short_name = name.split('.')[-1]
            if 'page' in name.lower():
                frontend['pages'].append(short_name)
            elif 'component' in name.lower():
                frontend['components'].append(short_name)
            elif 'store' in name.lower():
                frontend['stores'].append(short_name)
            elif 'hook' in name.lower() or short_name.startswith('use'):
                frontend['hooks'].append(short_name)
            else:
                frontend['services'].append(short_name)
        elif 'backend' in name.lower():
            short_name = name.split('.')[-1]
            if 'models' in name:
                backend['models'].append(short_name)
            elif 'schemas' in name:
                backend['schemas'].append(short_name)
            elif 'services' in name:
                backend['services'].append(short_name)
            elif 'api' in name:
                backend['endpoints'].append(short_name)
            else:
                backend['core'].append(short_name)
    
    # Technology mapping
    tech_map = {}
    for entity in entities:
        for tech in entity.get('tech', []):
            if tech not in tech_map:
                tech_map[tech] = []
            tech_map[tech].append(entity.get('name', '').split('.')[-1])
    
    # Keep only top 5 per tech
    tech_map = {k: v[:5] for k, v in tech_map.items() if len(v) > 0}
    
    return {
        'type': 'domain_index',
        'description': 'Per-domain entity indexes - Fast O(1) lookup',
        'frontend': {k: v for k, v in frontend.items() if v},
        'backend': {k: v for k, v in backend.items() if v},
        'infrastructure': {k: v for k, v in infra.items() if v},
        'by_technology': tech_map
    }


def generate_change_tracking(root: Path, entities: List[Dict]) -> Dict:
    """
    Generate CHANGE_TRACKING layer.
    Track file hashes to detect stale knowledge.
    """
    file_hashes = {}
    
    # Key files to track
    key_files = [
        'frontend/src/App.tsx',
        'backend/app/main.py',
        'docker-compose.yml',
        'backend/app/models/__init__.py',
        'frontend/src/store/authStore.ts',
    ]
    
    for file_rel in key_files:
        file_path = root / file_rel
        if file_path.exists():
            try:
                content = file_path.read_bytes()
                file_hash = hashlib.md5(content).hexdigest()[:8]
                file_hashes[file_rel] = {
                    'hash': file_hash,
                    'analyzed': datetime.now().strftime('%Y-%m-%d')
                }
            except Exception:
                pass
    
    return {
        'type': 'change_tracking',
        'description': 'File hashes for staleness detection',
        'file_hashes': file_hashes,
        'invalidation_rules': {
            'App.tsx': 'pages, routes',
            'main.py': 'endpoints',
            'models/__init__.py': 'model list',
            'docker-compose.yml': 'infrastructure'
        }
    }


def merge_knowledge(existing: List[Dict], new_codegraph: List[Dict]) -> List[Dict]:
    """Merge existing knowledge with new codegraph entries. Deduplicates entities and relations."""
    
    # Separate by type (skip old map)
    entities = [e for e in existing if e.get('type') == 'entity']
    relations = [e for e in existing if e.get('type') == 'relation']
    
    # Deduplicate entities by name (merge observations)
    entity_map: Dict[str, Dict] = {}
    for entity in entities:
        name = entity.get('name')
        if not name:
            continue
        
        if name in entity_map:
            # Merge observations, keep unique ones
            existing_obs = entity_map[name].get('observations', [])
            new_obs = entity.get('observations', [])
            combined = list(dict.fromkeys(existing_obs + new_obs))  # Preserve order, remove duplicates
            # Keep last 10 observations to prevent unbounded growth
            entity_map[name]['observations'] = combined[-10:]
        else:
            entity_map[name] = entity.copy()
    
    # Deduplicate relations by (from, to, relationType)
    relation_map: Dict[tuple, Dict] = {}
    for relation in relations:
        key = (relation.get('from'), relation.get('to'), relation.get('relationType'))
        if None in key:
            continue
        # Keep the most recent relation (last one wins)
        relation_map[key] = relation
    
    # Build result
    result = list(entity_map.values()) + list(relation_map.values())
    
    # Add new codegraph entries
    result.extend(new_codegraph)
    
    return result


def main():
    dry_run = '--dry-run' in sys.argv
    optimize = '--optimize' in sys.argv or True  # Default to optimized v2.0
    
    # Find project root (where project_knowledge.json is or should be)
    root = Path.cwd()
    knowledge_path = root / 'project_knowledge.json'
    
    print(f"🔍 Scanning project: {root}")
    print(f"📦 Schema version: {'v2.0 (optimized)' if optimize else 'v1.0 (legacy)'}")
    
    # Analyze codebase
    analyzer = CodeAnalyzer(root)
    analyzer.scan_files()
    
    print(f"📊 Found {len(analyzer.modules)} source files")
    
    # Build codegraph
    codegraph = analyzer.build_dependency_graph()
    
    # Load and merge
    existing = load_existing_knowledge(knowledge_path)
    merged = merge_knowledge(existing, codegraph)
    
    # Separate entities for layer generation
    entities = [e for e in merged if e.get('type') == 'entity']
    
    # Count changes
    old_entities = len([e for e in existing if e.get('type') == 'entity'])
    old_relations = len([e for e in existing if e.get('type') == 'relation'])
    old_codegraph = len([e for e in existing if e.get('type') == 'codegraph'])
    
    new_entities = len([e for e in merged if e.get('type') == 'entity'])
    new_relations = len([e for e in merged if e.get('type') == 'relation'])
    new_codegraph = len(codegraph)
    
    print(f"📊 Entities: {old_entities} → {new_entities} (deduplicated)")
    print(f"📊 Relations: {old_relations} → {new_relations} (deduplicated)")
    print(f"📈 Codegraph: {old_codegraph} → {new_codegraph} entries")
    
    if dry_run:
        print("\n🔍 DRY RUN - No changes written")
        print("\nSample entries:")
        for entry in codegraph[:3]:
            print(json.dumps(entry))
        return
    
    if optimize:
        # v2.0 Schema with caching layers
        hot_cache = generate_hot_cache(entities, codegraph)
        domain_index = generate_domain_index(entities, codegraph)
        change_tracking = generate_change_tracking(root, entities)
        domain_map = update_domain_map(merged)
        
        # Write with layers
        with open(knowledge_path, 'w', encoding='utf-8') as f:
            # Layer 1: Hot Cache (always in context)
            f.write(json.dumps(hot_cache) + '\n')
            # Layer 2: Domain Index (fast lookup)
            f.write(json.dumps(domain_index) + '\n')
            # Layer 2b: Change Tracking
            f.write(json.dumps(change_tracking) + '\n')
            # Legacy map for compatibility
            f.write(json.dumps(domain_map) + '\n')
            # Layer 3: Full knowledge
            for entry in merged:
                f.write(json.dumps(entry) + '\n')
        
        print(f"✅ Updated {knowledge_path} (v2.0 optimized schema)")
        print(f"   📦 Layer 1: HOT_CACHE ({len(hot_cache.get('top_entities', {}))} top entities)")
        print(f"   📦 Layer 2: DOMAIN_INDEX (frontend/backend/infra)")
        print(f"   📦 Layer 3: {new_entities} entities + {new_codegraph} codegraph")
    else:
        # v1.0 Legacy Schema
        domain_map = update_domain_map(merged)
        
        with open(knowledge_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(domain_map) + '\n')
            for entry in merged:
                f.write(json.dumps(entry) + '\n')
        
        print(f"✅ Updated {knowledge_path} (v1.0 legacy schema)")


if __name__ == '__main__':
    main()
