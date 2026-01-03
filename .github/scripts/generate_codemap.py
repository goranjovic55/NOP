#!/usr/bin/env python3
"""
AKIS Codemap Generator

Analyzes project source files and generates codegraph entries for project_knowledge.json.
Supports Python, TypeScript/JavaScript, and common web frameworks.

Usage:
    python .github/scripts/generate_codemap.py [--dry-run]
"""

import os
import re
import json
import ast
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Any, Optional

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


def merge_knowledge(existing: List[Dict], new_codegraph: List[Dict]) -> List[Dict]:
    """Merge existing knowledge with new codegraph entries. Deduplicates entities and relations."""
    
    # Separate by type
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
    
    # Find project root (where project_knowledge.json is or should be)
    root = Path.cwd()
    knowledge_path = root / 'project_knowledge.json'
    
    print(f"🔍 Scanning project: {root}")
    
    # Analyze codebase
    analyzer = CodeAnalyzer(root)
    analyzer.scan_files()
    
    print(f"📊 Found {len(analyzer.modules)} source files")
    
    # Build codegraph
    codegraph = analyzer.build_dependency_graph()
    
    # Load and merge
    existing = load_existing_knowledge(knowledge_path)
    merged = merge_knowledge(existing, codegraph)
    
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
    
    # Write back
    with open(knowledge_path, 'w', encoding='utf-8') as f:
        for entry in merged:
            f.write(json.dumps(entry) + '\n')
    
    print(f"✅ Updated {knowledge_path}")


if __name__ == '__main__':
    main()
