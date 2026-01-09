#!/usr/bin/env python3
"""
AKIS Knowledge Updater v3.2

Updates project_knowledge.json based on current session or generates from scratch.
Supports Python, TypeScript/JavaScript, and common web frameworks.
Enriched with workflow-derived patterns and solutions.

MODES:
  Default (no args): Update knowledge based on current session files
                     Intelligently inserts and rearranges based on session activity
  --generate:        Full generation from all workflows, codebase, and docs

KNOWLEDGE SCHEMA v3.2:
  Layer 1 - HOT_CACHE: Top 20 entities + common answers + quick facts (workflow-enriched)
  Layer 2 - DOMAIN_INDEX: Per-domain entity indexes (fast lookup)
  Layer 3 - CHANGE_TRACKING: File hashes for staleness detection
  Layer 4 - GOTCHAS: Historical issues + solutions (enriched from workflow logs)
  Layer 5 - INTERCONNECTIONS: Service→Model→Endpoint→Page mapping (with frontend chains)
  Layer 6 - SESSION_PATTERNS: Predictive file loading based on history
  Layer 7+ - ENTITIES + CODEGRAPH: Full knowledge (on-demand)

Usage:
    # Update based on current session (default - for end of session)
    python .github/scripts/update_knowledge.py
    
    # Update with specific files from current session
    python .github/scripts/update_knowledge.py --files file1.py file2.tsx
    
    # Full generation from scratch (all workflows + codebase)
    python .github/scripts/update_knowledge.py --generate
    
    # Dry run (show what would change)
    python .github/scripts/update_knowledge.py --dry-run
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


def generate_gotchas(root: Path) -> Dict:
    """
    Generate GOTCHAS layer (Layer 3).
    Historical issues and solutions for debug acceleration.
    Now enriched with solutions extracted from workflow logs.
    """
    # Base gotchas (hardcoded common issues)
    gotchas = {
        'db_connection': {
            'symptom': 'Connection refused to database',
            'solution': 'Check docker-compose up -d db, verify DATABASE_URL env',
            'files': ['backend/app/core/database.py', 'docker-compose.yml'],
            'source': 'manual'
        },
        'alembic_conflict': {
            'symptom': 'Multiple heads in alembic',
            'solution': 'alembic merge heads, then alembic upgrade head',
            'files': ['backend/alembic/versions/'],
            'source': 'manual'
        },
        'cors_error': {
            'symptom': 'CORS error in browser console',
            'solution': 'Check backend/app/main.py CORSMiddleware origins',
            'files': ['backend/app/main.py'],
            'source': 'manual'
        },
        'websocket_timeout': {
            'symptom': 'WebSocket connection closes unexpectedly',
            'solution': 'Check nginx proxy_read_timeout, guacamole ping interval',
            'files': ['frontend/nginx.conf', 'backend/app/api/v1/access_hub.py'],
            'source': 'manual'
        },
        'import_error': {
            'symptom': 'ModuleNotFoundError in backend',
            'solution': 'Verify __init__.py exists, check PYTHONPATH',
            'files': ['backend/app/__init__.py'],
            'source': 'manual'
        },
        'typescript_error': {
            'symptom': 'TypeScript type errors after model change',
            'solution': 'Regenerate types from OpenAPI, check frontend/src/types/',
            'files': ['frontend/src/types/'],
            'source': 'manual'
        },
        'docker_build_fail': {
            'symptom': 'Docker build fails with memory error',
            'solution': 'Use scripts/build-with-limits.sh, increase Docker memory',
            'files': ['scripts/build-with-limits.sh', 'Dockerfile'],
            'source': 'manual'
        },
        'agent_connection': {
            'symptom': 'Agent not connecting to backend',
            'solution': 'Check SOCKS proxy config, verify agent WS endpoint',
            'files': ['scripts/agent.py', 'backend/app/api/v1/agents.py'],
            'source': 'manual'
        }
    }
    
    # Extract additional gotchas from workflow logs
    workflow_gotchas = extract_workflow_gotchas(root)
    gotchas.update(workflow_gotchas)
    
    return {
        'type': 'gotchas',
        'version': '3.1',
        'description': 'Historical issues + solutions - 75% debug acceleration (enriched from workflow logs)',
        'issues': gotchas,
        'workflow_derived_count': len(workflow_gotchas)
    }


def extract_workflow_gotchas(root: Path) -> Dict:
    """Extract problem→solution patterns from workflow logs."""
    workflow_dir = root / 'log' / 'workflow'
    if not workflow_dir.exists():
        return {}
    
    gotchas = {}
    
    for log_file in workflow_dir.glob('*.md'):
        try:
            content = log_file.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        
        # Extract learnings section
        learning_match = re.search(r'## Learnings?\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
        if learning_match:
            learnings_text = learning_match.group(1)
            
            # Parse numbered learnings like "1. **Pattern**: Description"
            for match in re.finditer(r'\d+\.\s*\*\*([^*]+)\*\*:\s*(.+?)(?=\n\d+\.|\Z)', learnings_text, re.DOTALL):
                pattern_name = match.group(1).strip().lower().replace(' ', '_').replace('-', '_')
                solution = match.group(2).strip().replace('\n', ' ')
                
                if len(solution) > 20 and pattern_name not in gotchas:
                    gotchas[pattern_name] = {
                        'symptom': f"Related to: {pattern_name.replace('_', ' ')}",
                        'solution': solution[:200],
                        'files': [],
                        'source': f'workflow:{log_file.name}'
                    }
        
        # Extract from Decision & Execution Flow (SUCCESS patterns)
        decision_match = re.search(r'## Decision.*?Flow\s*\n```(.*?)```', content, re.DOTALL)
        if decision_match:
            flow_text = decision_match.group(1)
            
            # Find successful attempts
            for match in re.finditer(r'\[DECISION:\s*([^\]]+)\].*?→ ✓\s*(.+?)(?=\[DECISION|\Z)', flow_text, re.DOTALL):
                problem = match.group(1).strip()
                solution_lines = match.group(2).strip()
                
                # Extract the solution from successful attempts
                success_match = re.search(r'✓\s*(.+?)(?=\n|$)', solution_lines)
                if success_match:
                    solution = success_match.group(1).strip()
                    problem_key = re.sub(r'[^a-z0-9_]', '_', problem.lower())[:30]
                    
                    if problem_key not in gotchas and len(solution) > 10:
                        gotchas[problem_key] = {
                            'symptom': problem,
                            'solution': solution[:200],
                            'files': [],
                            'source': f'workflow:{log_file.name}'
                        }
    
    return gotchas


def extract_code_observations(root: Path) -> Dict[str, List[str]]:
    """Extract valuable observations about code from workflow logs."""
    workflow_dir = root / 'log' / 'workflow'
    if not workflow_dir.exists():
        return {}
    
    observations = {}  # file_path -> list of observations
    
    for log_file in workflow_dir.glob('*.md'):
        try:
            content = log_file.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        
        # Extract files modified with changes
        files_match = re.search(r'## Files Modified\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
        if files_match:
            files_text = files_match.group(1)
            
            # Parse table rows: | file | changes |
            for match in re.finditer(r'\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|', files_text):
                file_path = match.group(1).strip()
                changes = match.group(2).strip()
                
                # Clean file path
                file_path = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', file_path)
                file_path = file_path.strip('`').strip()
                
                if file_path and not file_path.startswith('File') and changes and len(changes) > 5:
                    if file_path not in observations:
                        observations[file_path] = []
                    if changes not in observations[file_path]:
                        observations[file_path].append(changes)
        
        # Extract specific patterns for key files
        for pattern in [
            (r'frontend/src/pages/(\w+)\.tsx', 'page'),
            (r'backend/app/services/(\w+)\.py', 'service'),
            (r'backend/app/api/v1/(\w+)\.py', 'endpoint'),
        ]:
            for match in re.finditer(pattern[0], content):
                file_path = match.group(0)
                if file_path not in observations:
                    observations[file_path] = []
    
    return observations


def generate_interconnections(entities: List[Dict], codegraph: List[Dict], root: Path = Path.cwd()) -> Dict:
    """
    Generate INTERCONNECTIONS layer (Layer 4).
    Service→Model→Endpoint→Page mapping for dependency lookup.
    Now includes frontend pages and deeper chains.
    """
    # Build service→model→endpoint chains
    chains = {}
    
    # Extract service files
    services = [e for e in codegraph if e.get('nodeType') == 'service']
    models = [e for e in codegraph if e.get('nodeType') == 'model']
    endpoints = [e for e in codegraph if e.get('nodeType') == 'endpoint']
    pages = [e for e in codegraph if e.get('nodeType') == 'page']
    stores = [e for e in codegraph if e.get('nodeType') == 'store']
    
    # Build reverse dependency map
    for service in services:
        service_name = Path(service.get('name', '')).stem
        chain = {'models': [], 'endpoints': [], 'stores': [], 'pages': []}
        
        # Find models this service uses
        for dep in service.get('dependencies', []):
            if 'models' in dep:
                chain['models'].append(Path(dep).stem)
        
        # Find endpoints that use this service
        for endpoint in endpoints:
            if service.get('name') in endpoint.get('dependencies', []):
                chain['endpoints'].append(Path(endpoint.get('name', '')).stem)
        
        if chain['models'] or chain['endpoints']:
            chains[service_name] = chain
    
    # Add page→endpoint→service chains (frontend perspective)
    frontend_chains = {}
    pages_dir = root / 'frontend' / 'src' / 'pages'
    if pages_dir.exists():
        for page_file in pages_dir.glob('*.tsx'):
            try:
                content = page_file.read_text(encoding='utf-8')
            except (UnicodeDecodeError, PermissionError):
                continue
            
            page_name = page_file.stem
            chain = {'stores': [], 'api_calls': [], 'components': []}
            
            # Find store imports
            for match in re.finditer(r'from\s+[\'"].*?store/(\w+)[\'"]', content):
                chain['stores'].append(match.group(1))
            
            # Find API calls (fetch patterns)
            for match in re.finditer(r'fetch\([\'"]([^\'\"]+)[\'"]', content):
                chain['api_calls'].append(match.group(1))
            
            # Find component imports
            for match in re.finditer(r'from\s+[\'"].*?components/([^/\'\"]+)', content):
                chain['components'].append(match.group(1))
            
            if any(chain.values()):
                frontend_chains[page_name] = chain
    
    # Common modification patterns
    patterns = {
        'add_field_to_model': [
            'backend/app/models/<name>.py',
            'backend/app/schemas/<name>.py',
            'alembic revision --autogenerate',
            'frontend/src/types/<name>.ts'
        ],
        'add_new_endpoint': [
            'backend/app/api/v1/<name>.py',
            'backend/app/main.py (register router)',
            'backend/app/services/<name>_service.py (optional)',
            'frontend/src/api/<name>.ts'
        ],
        'add_new_page': [
            'frontend/src/pages/<Name>.tsx',
            'frontend/src/App.tsx (add route)',
            'frontend/src/components/Layout.tsx (add nav)'
        ],
        'fix_auth_issue': [
            'frontend/src/store/authStore.ts',
            'backend/app/core/security.py',
            'backend/app/api/v1/auth.py'
        ],
        'add_websocket': [
            'backend/app/api/v1/<name>.py (WebSocket endpoint)',
            'frontend/src/pages/<Name>.tsx (useEffect + WebSocket)',
            'docker-compose.yml (check timeouts)'
        ]
    }
    
    # Extract modification patterns from workflow logs
    workflow_patterns = extract_modification_patterns(root)
    patterns.update(workflow_patterns)
    
    return {
        'type': 'interconnections',
        'version': '3.1',
        'description': 'Service→Model→Endpoint→Page chains - 14% of queries (enhanced with frontend)',
        'backend_chains': chains,
        'frontend_chains': frontend_chains,
        'modification_patterns': patterns
    }


def extract_modification_patterns(root: Path) -> Dict:
    """Extract file modification patterns from workflow logs."""
    workflow_dir = root / 'log' / 'workflow'
    if not workflow_dir.exists():
        return {}
    
    # Track which files are often modified together
    co_modifications = {}
    
    for log_file in workflow_dir.glob('*.md'):
        try:
            content = log_file.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        
        # Extract files modified
        files_match = re.search(r'## Files Modified\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
        if files_match:
            files_text = files_match.group(1)
            
            # Parse table rows
            files_in_session = []
            for match in re.finditer(r'\|\s*([^|]+)\s*\|', files_text):
                file_path = match.group(1).strip()
                file_path = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', file_path)
                file_path = file_path.strip('`').strip()
                
                if file_path and not file_path.startswith('File') and '/' in file_path:
                    files_in_session.append(file_path)
            
            # Track co-modifications
            if len(files_in_session) >= 2:
                # Use first file as key, rest as co-modified
                key_file = files_in_session[0]
                if key_file not in co_modifications:
                    co_modifications[key_file] = set()
                co_modifications[key_file].update(files_in_session[1:])
    
    # Convert to patterns (top 5 most common co-modification groups)
    patterns = {}
    for key_file, related in sorted(co_modifications.items(), key=lambda x: -len(x[1]))[:5]:
        pattern_name = f"modify_{Path(key_file).stem}"
        patterns[pattern_name] = [key_file] + list(related)[:4]
    
    return patterns


def generate_session_patterns() -> Dict:
    """
    Generate SESSION_PATTERNS layer (Layer 5).
    Predictive file loading based on edit patterns.
    """
    patterns = {
        'backend_model_change': {
            'trigger': 'backend/app/models/*.py',
            'preload': [
                'backend/app/schemas/{same_name}.py',
                'backend/alembic/env.py',
                'backend/app/services/{same_name}_service.py'
            ]
        },
        'frontend_page_change': {
            'trigger': 'frontend/src/pages/*.tsx',
            'preload': [
                'frontend/src/App.tsx',
                'frontend/src/components/Layout.tsx',
                'frontend/src/store/*Store.ts'
            ]
        },
        'api_endpoint_change': {
            'trigger': 'backend/app/api/v1/*.py',
            'preload': [
                'backend/app/main.py',
                'backend/app/schemas/{same_name}.py',
                'frontend/src/api/{same_name}.ts'
            ]
        },
        'docker_change': {
            'trigger': 'docker-compose*.yml OR Dockerfile',
            'preload': [
                'scripts/deploy.sh',
                'scripts/build-with-limits.sh'
            ]
        },
        'akis_change': {
            'trigger': '.github/copilot-instructions.md',
            'preload': [
                '.github/instructions/*.md',
                '.github/skills/*/SKILL.md'
            ]
        }
    }
    
    return {
        'type': 'session_patterns',
        'version': '3.0',
        'description': 'Predictive file loading - 7% of queries',
        'patterns': patterns
    }


def generate_hot_cache(entities: List[Dict], codegraph: List[Dict], root: Path = Path.cwd()) -> Dict:
    """
    Generate HOT_CACHE layer (Layer 1).
    Contains top 20 most important entities + common answers + quick facts.
    This should be always in context (via attachment).
    Now enriched with workflow-derived query patterns.
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
    
    # Boost entities that appear frequently in workflow logs
    workflow_mentions = count_workflow_mentions(root)
    for name, count in workflow_mentions.items():
        reference_counts[name] += count * 2  # Workflow mention = 2x weight
    
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
        
        # Add workflow mention bonus
        short_name = name.split('.')[-1]
        workflow_bonus = min(workflow_mentions.get(short_name, 0) * 0.15, 0.4)
        
        # Add recency bonus (updated today = 0.2, this week = 0.1)
        updated = entity.get('updated', '')
        today = datetime.now().strftime('%Y-%m-%d')
        recency_bonus = 0.2 if updated == today else 0.1 if updated else 0
        
        frecency_scores[name] = base_score + ref_bonus + workflow_bonus + recency_bonus
    
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
        ],
        'how_to_fix_401': 'Call logout() from authStore on 401 to trigger app-level redirect',
        'docker_restart_vs_build': 'docker-compose restart != rebuild. Code changes require docker-compose build first',
        'so_broadcast': 'Raw sockets require sock.setsockopt(SOL_SOCKET, SO_BROADCAST, 1) for broadcast addresses'
    }
    
    # Extract additional answers from workflow learnings
    workflow_answers = extract_workflow_quick_answers(root)
    common_answers.update(workflow_answers)
    
    # Hot paths (most edited directories)
    hot_paths = [
        'frontend/src/pages/',
        'frontend/src/components/',
        'backend/app/api/v1/',
        'backend/app/services/',
        'backend/app/models/'
    ]
    
    # Quick facts for instant answers
    quick_facts = {
        'backend_port': 8000,
        'frontend_port': 3000,
        'db_port': 5432,
        'python_version': '3.11',
        'node_version': '20',
        'framework_backend': 'FastAPI + SQLAlchemy',
        'framework_frontend': 'React + TypeScript + Zustand',
        'test_command': 'pytest backend/tests/',
        'lint_command': 'ruff check backend/',
        'default_branch': 'main',
        'docker_dev_command': 'docker-compose -f docker-compose.dev.yml up --build',
        'frontend_dev_command': 'npm run dev'
    }
    
    return {
        'type': 'hot_cache',
        'version': '3.1',
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'description': 'Top 20 entities + common answers + quick facts - 31% of queries (workflow-enriched)',
        'top_entities': top_entity_map,
        'common_answers': common_answers,
        'hot_paths': hot_paths,
        'quick_facts': quick_facts,
        'workflow_enriched': True
    }


def count_workflow_mentions(root: Path) -> Dict[str, int]:
    """Count entity mentions in workflow logs for frecency boosting."""
    workflow_dir = root / 'log' / 'workflow'
    if not workflow_dir.exists():
        return {}
    
    mentions = Counter()
    
    for log_file in workflow_dir.glob('*.md'):
        try:
            content = log_file.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        
        # Count mentions of common patterns
        patterns = [
            r'(\w+Service)',
            r'(\w+Store)',
            r'(\w+\.tsx)',
            r'(\w+\.py)',
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                name = match.group(1).replace('.tsx', '').replace('.py', '')
                mentions[name] += 1
    
    return dict(mentions)


def extract_workflow_quick_answers(root: Path) -> Dict:
    """Extract quick answer patterns from workflow logs."""
    workflow_dir = root / 'log' / 'workflow'
    if not workflow_dir.exists():
        return {}
    
    answers = {}
    
    for log_file in workflow_dir.glob('*.md'):
        try:
            content = log_file.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        
        # Extract anti-patterns
        for match in re.finditer(r'\*\*Anti-pattern\*\*:\s*(.+?)(?=\n|$)', content):
            pattern = match.group(1).strip()
            key = f"avoid_{re.sub(r'[^a-z0-9_]', '_', pattern.lower())[:30]}"
            if key not in answers:
                answers[key] = f"AVOID: {pattern}"
        
        # Extract patterns
        for match in re.finditer(r'\*\*Pattern\*\*:\s*(.+?)(?=\n|$)', content):
            pattern = match.group(1).strip()
            key = f"pattern_{re.sub(r'[^a-z0-9_]', '_', pattern.lower())[:30]}"
            if key not in answers:
                answers[key] = pattern
    
    return answers


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


def get_session_files() -> List[str]:
    """Get files modified in current git session."""
    import subprocess
    try:
        # Get staged and modified files
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'HEAD'],
            capture_output=True, text=True, timeout=10
        )
        files = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        # Also get staged files
        result2 = subprocess.run(
            ['git', 'diff', '--cached', '--name-only'],
            capture_output=True, text=True, timeout=10
        )
        staged = result2.stdout.strip().split('\n') if result2.stdout.strip() else []
        
        # Combine and deduplicate
        all_files = list(set(files + staged))
        return [f for f in all_files if f]
    except Exception:
        return []


def update_knowledge_for_session(root: Path, session_files: List[str], existing: List[Dict]) -> List[Dict]:
    """Update knowledge incrementally based on session files."""
    
    # Analyze only session files
    analyzer = CodeAnalyzer(root)
    
    for file_path in session_files:
        full_path = root / file_path
        if not full_path.exists():
            continue
        
        if analyzer.should_skip(full_path):
            continue
        
        rel_path = full_path.relative_to(root)
        
        if file_path.endswith('.py'):
            result = analyzer.analyze_python(full_path)
        elif file_path.endswith(('.ts', '.tsx', '.js', '.jsx')):
            result = analyzer.analyze_typescript(full_path)
        else:
            continue
        
        if result:
            analyzer.modules[str(rel_path)] = {
                'nodeType': analyzer.get_node_type(full_path),
                'imports': result['imports'],
                'exports': result['exports']
            }
    
    if not analyzer.modules:
        return existing
    
    # Build codegraph for session files only
    codegraph = analyzer.build_dependency_graph()
    
    # Merge with existing
    merged = merge_knowledge(existing, codegraph)
    
    return merged


def boost_session_entities(hot_cache: Dict, session_files: List[str]) -> Dict:
    """Boost frecency of entities touched in current session."""
    if not session_files:
        return hot_cache
    
    top_entities = hot_cache.get('top_entities', {})
    
    # Extract entity names from session files
    session_entities = set()
    for f in session_files:
        stem = Path(f).stem
        session_entities.add(stem)
        # Also add camelCase variants
        session_entities.add(stem.replace('_', ''))
    
    # Boost frecency for session entities
    for name, data in top_entities.items():
        if name.lower() in {e.lower() for e in session_entities}:
            data['frecency'] = round(data.get('frecency', 1.0) + 0.5, 2)
            data['session_touched'] = True
    
    hot_cache['top_entities'] = top_entities
    return hot_cache


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='AKIS Knowledge Updater')
    parser.add_argument('--generate', action='store_true', 
                        help='Full generation from all workflows, codebase, and docs')
    parser.add_argument('--files', nargs='*', default=None,
                        help='Specific files to update knowledge for')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would change without writing')
    parser.add_argument('--v3', action='store_true', default=True,
                        help='Use v3.x schema (default)')
    args = parser.parse_args()
    
    dry_run = args.dry_run
    full_generate = args.generate
    v3 = args.v3 or True
    
    # Find project root
    root = Path.cwd()
    knowledge_path = root / 'project_knowledge.json'
    
    # Determine mode
    if full_generate:
        print("=" * 60)
        print(" AKIS KNOWLEDGE UPDATER v3.2 - FULL GENERATION MODE")
        print("=" * 60)
        print(f"\n🔍 Scanning entire project: {root}")
        session_files = None
    else:
        print("=" * 60)
        print(" AKIS KNOWLEDGE UPDATER v3.2 - SESSION UPDATE MODE")
        print("=" * 60)
        
        # Get session files
        if args.files:
            session_files = args.files
        else:
            session_files = get_session_files()
        
        if session_files:
            print(f"\n📝 Updating knowledge for {len(session_files)} session files:")
            for f in session_files[:10]:
                print(f"   • {f}")
            if len(session_files) > 10:
                print(f"   ... and {len(session_files) - 10} more")
        else:
            print("\n📝 No session files detected. Running full update...")
            full_generate = True
    
    # Load existing knowledge
    existing = load_existing_knowledge(knowledge_path)
    
    if full_generate:
        # Full generation mode - analyze entire codebase
        print(f"📦 Schema version: v3.2 (workflow-enriched)")
        
        analyzer = CodeAnalyzer(root)
        analyzer.scan_files()
        
        print(f"📊 Found {len(analyzer.modules)} source files")
        
        codegraph = analyzer.build_dependency_graph()
        merged = merge_knowledge(existing, codegraph)
    else:
        # Session update mode - analyze only session files
        merged = update_knowledge_for_session(root, session_files, existing)
        codegraph = [e for e in merged if e.get('type') == 'codegraph']
        print(f"📊 Analyzed {len(session_files)} session files")
    
    # Separate entities for layer generation
    entities = [e for e in merged if e.get('type') == 'entity']
    
    # Count changes
    old_entities = len([e for e in existing if e.get('type') == 'entity'])
    old_codegraph = len([e for e in existing if e.get('type') == 'codegraph'])
    
    new_entities = len([e for e in merged if e.get('type') == 'entity'])
    new_codegraph = len([e for e in merged if e.get('type') == 'codegraph'])
    
    print(f"📊 Entities: {old_entities} → {new_entities}")
    print(f"📈 Codegraph: {old_codegraph} → {new_codegraph} entries")
    
    if dry_run:
        print("\n🔍 DRY RUN - No changes written")
        print("\nSample entries:")
        sample_codegraph = [e for e in merged if e.get('type') == 'codegraph'][:3]
        for entry in sample_codegraph:
            print(json.dumps(entry))
        return
    
    if v3:
        # v3.2 Schema with all caching layers (workflow-enriched)
        hot_cache = generate_hot_cache(entities, codegraph if full_generate else [e for e in merged if e.get('type') == 'codegraph'], root)
        
        # Boost session entities in hot cache
        if session_files:
            hot_cache = boost_session_entities(hot_cache, session_files)
        
        domain_index = generate_domain_index(entities, codegraph if full_generate else [e for e in merged if e.get('type') == 'codegraph'])
        change_tracking = generate_change_tracking(root, entities)
        gotchas = generate_gotchas(root)
        interconnections = generate_interconnections(entities, codegraph if full_generate else [e for e in merged if e.get('type') == 'codegraph'], root)
        session_patterns = generate_session_patterns()
        domain_map = update_domain_map(merged)
        
        # Write with layers (order matters for line-based access)
        with open(knowledge_path, 'w', encoding='utf-8') as f:
            # Layer 1: Hot Cache (always in context) - Line 1
            f.write(json.dumps(hot_cache) + '\n')
            # Layer 2: Domain Index (fast lookup) - Line 2
            f.write(json.dumps(domain_index) + '\n')
            # Layer 3: Change Tracking - Line 3
            f.write(json.dumps(change_tracking) + '\n')
            # Layer 4: Gotchas (debug acceleration) - Line 4
            f.write(json.dumps(gotchas) + '\n')
            # Layer 5: Interconnections (dependency mapping) - Line 5
            f.write(json.dumps(interconnections) + '\n')
            # Layer 6: Session Patterns (predictive loading) - Line 6
            f.write(json.dumps(session_patterns) + '\n')
            # Legacy map for compatibility - Line 7
            f.write(json.dumps(domain_map) + '\n')
            # Layer 7+: Full knowledge (entities + codegraph)
            for entry in merged:
                f.write(json.dumps(entry) + '\n')
        
        workflow_gotchas = gotchas.get('workflow_derived_count', 0)
        mode_str = "SESSION UPDATE" if session_files else "FULL GENERATION"
        print(f"\n✅ Knowledge updated ({mode_str})")
        print(f"   📦 Layer 1: HOT_CACHE ({len(hot_cache.get('top_entities', {}))} entities, {len(hot_cache.get('common_answers', {}))} answers)")
        print(f"   📦 Layer 2: DOMAIN_INDEX (frontend/backend/infra)")
        print(f"   📦 Layer 3: CHANGE_TRACKING ({len(change_tracking.get('file_hashes', {}))} files)")
        print(f"   📦 Layer 4: GOTCHAS ({len(gotchas.get('issues', {}))} issues, {workflow_gotchas} from workflows)")
        print(f"   📦 Layer 5: INTERCONNECTIONS ({len(interconnections.get('backend_chains', {}))} backend + {len(interconnections.get('frontend_chains', {}))} frontend chains)")
        print(f"   📦 Layer 6: SESSION_PATTERNS ({len(session_patterns.get('patterns', {}))} patterns)")
        print(f"   📦 Layer 7+: {new_entities} entities + {new_codegraph} codegraph")
        
        if session_files:
            boosted = sum(1 for e in hot_cache.get('top_entities', {}).values() if e.get('session_touched'))
            print(f"\n   🔥 Session boost applied to {boosted} entities")
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
