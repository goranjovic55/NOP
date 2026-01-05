#!/usr/bin/env python3
"""
AKIS Skill Suggester - Enhanced Pattern Detection

Analyzes session by examining:
1. Git diffs - actual code patterns added/modified
2. Workflow logs - decisions and technical choices
3. File changes - scope and technology stack
4. Commit messages - intent and features

Suggests reusable skills based on detected patterns.

Usage:
    python .github/scripts/suggest_skill.py [--commits N]
    
Output: JSON array of skill suggestions for user approval
"""

import json
import re
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Set
import argparse


def get_recent_commits(count: int = 5) -> List[Dict[str, str]]:
    """Get last N commits regardless of time."""
    try:
        result = subprocess.run(
            ['git', 'log', f'-{count}', '--pretty=format:%H|%s|%b'],
            capture_output=True,
            text=True,
            check=True
        )
        
        commits = []
        for line in result.stdout.strip().split('\n'):
            if '|' in line:
                parts = line.split('|', 2)
                commits.append({
                    'hash': parts[0],
                    'subject': parts[1],
                    'body': parts[2] if len(parts) > 2 else ''
                })
        return commits
    except subprocess.CalledProcessError:
        return []


def get_recent_workflow_log() -> Dict[str, Any]:
    """Get the most recent workflow log by modification time."""
    log_dir = Path('log/workflow')
    if not log_dir.exists():
        return {}
    
    # Sort by modification time, most recent first
    log_files = sorted(log_dir.glob('*.md'), key=lambda p: p.stat().st_mtime, reverse=True)
    if not log_files:
        return {}
    
    latest = log_files[0]
    content = latest.read_text()
    
    # Extract all sections - handle any order and varying whitespace
    def extract_section(section_name: str) -> str:
        # Match section until next ## or end of file, flexible whitespace
        pattern = rf'## {section_name}\s*\n(.+?)(?=\n## |\Z)'
        match = re.search(pattern, content, re.DOTALL)
        return match.group(1).strip() if match else ''
    
    return {
        'file': latest.name,
        'content': content,
        'summary': extract_section('Summary'),
        'changes': extract_section('Changes'),
        'decisions': extract_section('Decisions'),
        'notes': extract_section('Notes'),
        'updates': extract_section('Updates')
    }


def get_multiple_workflow_logs(count: int = 5) -> List[Dict[str, Any]]:
    """Get multiple workflow logs for pattern analysis."""
    log_dir = Path('log/workflow')
    if not log_dir.exists():
        return []
    
    log_files = sorted(log_dir.glob('*.md'), reverse=True)[:count]
    logs = []
    
    for log_file in log_files:
        content = log_file.read_text()
        notes_match = re.search(r'## Notes\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
        
        logs.append({
            'file': log_file.name,
            'content': content,
            'notes': notes_match.group(1).strip() if notes_match else ''
        })
    
    return logs


def get_changed_files(commits: int = 5) -> List[str]:
    """Get list of files modified in recent commits."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--name-only', f'HEAD~{commits}', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return [f for f in result.stdout.strip().split('\n') if f]
    except subprocess.CalledProcessError:
        return []


def get_code_diff(commits: int = 5) -> str:
    """Get actual code diff to analyze patterns."""
    try:
        result = subprocess.run(
            ['git', 'diff', f'HEAD~{commits}', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError:
        return ""


def extract_technologies(diff: str, files: List[str]) -> Set[str]:
    """Detect technologies/frameworks used in changes."""
    tech = set()
    
    # Check file extensions and paths
    for f in files:
        if '.tsx' in f or '.jsx' in f:
            tech.add('react')
        if '.py' in f:
            tech.add('python')
        if 'docker' in f.lower():
            tech.add('docker')
        if 'backend' in f and '.py' in f:
            tech.add('fastapi')
        if 'sql' in f.lower() or 'alembic' in f.lower():
            tech.add('sqlalchemy')
    
    # Check import statements and code patterns
    if 'websocket' in diff.lower():
        tech.add('websockets')
    if 'sqlalchemy' in diff.lower():
        tech.add('sqlalchemy')
    if 'asyncio' in diff.lower():
        tech.add('asyncio')
    if 'docker-compose' in diff.lower():
        tech.add('docker-compose')
    if 'proxychains' in diff.lower():
        tech.add('proxychains')
    if '@router.websocket' in diff:
        tech.add('fastapi-websockets')
    if 'flag_modified' in diff:
        tech.add('sqlalchemy-orm')
    
    return tech


def extract_problem_solution_patterns(workflow: Dict, commits: List[Dict]) -> List[Dict[str, Any]]:
    """Extract problem-solution patterns from workflow logs and commits."""
    patterns = []
    
    notes = workflow.get('notes', '')
    decisions = workflow.get('decisions', '')
    content = workflow.get('content', '')
    
    # Pattern: Gotchas section with solutions
    if 'Gotchas' in notes:
        gotchas_section = notes.split('Gotchas')[1].split('Future')[0] if 'Future' in notes else notes.split('Gotchas')[1]
        
        # SQLAlchemy JSON field issue
        if 'flag_modified' in gotchas_section or 'flag_modified' in content:
            patterns.append({
                'name': 'troubleshoot-sqlalchemy-json-persistence',
                'title': 'Troubleshooting SQLAlchemy JSON Field Persistence',
                'type': 'troubleshooting',
                'problem': 'JSON column modifications not persisting to database after commit',
                'symptoms': [
                    'Changes to dict/list in JSON field disappear after refresh',
                    'commit() called but database shows old values',
                    'In-memory object has changes but DB doesnt'
                ],
                'root_cause': 'SQLAlchemy doesnt track in-place modifications to mutable objects (dict, list) in JSON columns',
                'solution_steps': [
                    '1. Verify: Check if youre modifying dict in-place (obj.json_field["key"] = val)',
                    '2. Add: from sqlalchemy.orm.attributes import flag_modified',
                    '3. Call: flag_modified(obj, "field_name") after modification',
                    '4. Commit: await db.commit() will now persist changes'
                ],
                'verification': 'Query database directly or refresh object - changes should persist',
                'avoid': [
                    {'wrong': 'Replacing entire dict to trigger change', 'right': 'Use flag_modified()'},
                    {'wrong': 'Manual JSON serialization', 'right': 'Let SQLAlchemy handle it'},
                    {'wrong': 'Assuming SQLAlchemy tracks all changes', 'right': 'Explicitly flag mutable changes'}
                ],
                'confidence': 'high',
                'evidence': ['Documented in workflow gotchas', 'flag_modified in code changes'],
                'portable': True,
                'applies_to': ['SQLAlchemy', 'PostgreSQL JSONB', 'MySQL JSON', 'any ORM with JSON columns']
            })
        
        # Docker network conflict
        if 'subnet' in gotchas_section.lower() or 'network' in gotchas_section.lower():
            patterns.append({
                'name': 'troubleshoot-docker-network-conflicts',
                'title': 'Troubleshooting Docker Network Subnet Conflicts',
                'type': 'troubleshooting',
                'problem': 'Docker compose fails with "network already exists" or subnet conflicts',
                'symptoms': [
                    'Error: "network with name X already exists"',
                    'Services cant communicate across environments',
                    'IP address conflicts between containers',
                    'docker-compose up fails with network errors'
                ],
                'root_cause': 'Multiple docker-compose files using same network name or overlapping subnet ranges',
                'solution_steps': [
                    '1. Diagnose: docker network ls - check existing networks',
                    '2. Inspect: docker network inspect <name> - check subnet ranges',
                    '3. Identify: Find overlapping subnets (e.g., both using 172.28.0.0/16)',
                    '4. Fix: Change dev/test subnets to unique ranges (172.29, 172.30, etc)',
                    '5. Clean: docker-compose down && docker network prune',
                    '6. Rebuild: docker-compose up with new subnet config'
                ],
                'verification': 'docker network ls shows unique subnets, docker-compose up succeeds',
                'avoid': [
                    {'wrong': 'Using same subnet for all environments', 'right': 'Plan subnet allocation (dev=.29, prod=.28)'},
                    {'wrong': 'Ignoring network errors', 'right': 'Check existing networks first'},
                    {'wrong': 'Deleting networks manually', 'right': 'Use docker-compose down properly'}
                ],
                'confidence': 'high',
                'evidence': ['Network conflict mentioned in gotchas', 'docker-compose changes'],
                'portable': True,
                'applies_to': ['Docker Compose', 'multi-environment setups', 'microservices', 'dev containers']
            })
    
    # Pattern: Syntax errors from multi-replace operations
    if 'syntax' in content.lower() and 'duplicate' in content.lower():
        patterns.append({
            'name': 'troubleshoot-syntax-errors-after-refactor',
            'title': 'Troubleshooting Syntax Errors After Bulk Edits',
            'type': 'troubleshooting',
            'problem': 'Syntax errors appear after multi-file or multi-replace operations',
            'symptoms': [
                'SyntaxError: unmatched )',
                'ImportError: cannot import module',
                'Duplicate function parameters or statements',
                'Code worked before bulk edit, now crashes on startup'
            ],
            'root_cause': 'Multi-replace operations can create duplicates or mismatched brackets when context overlaps',
            'solution_steps': [
                '1. Check logs: Look for exact error line number',
                '2. Inspect file: Read around error line for duplicates or extra brackets',
                '3. Compare: git diff to see what actually changed',
                '4. Look for: Duplicate function signatures, extra closing brackets, misplaced code',
                '5. Fix: Remove duplicates, balance brackets',
                '6. Verify: Run syntax checker or try importing module'
            ],
            'verification': 'Code runs without SyntaxError, imports succeed, no duplicate definitions',
            'avoid': [
                {'wrong': 'Replacing without enough context', 'right': 'Include 3-5 lines before/after'},
                {'wrong': 'Multi-replace on overlapping code', 'right': 'Single targeted edits'},
                {'wrong': 'No syntax check after edit', 'right': 'Always verify compilation'}
            ],
            'confidence': 'medium',
            'evidence': ['Syntax error fix in commits or workflow'],
            'portable': True,
            'applies_to': ['Any language', 'refactoring', 'automated code edits', 'find-replace operations']
        })
    
    # Pattern: Dev container rebuild vs file copying
    if 'rebuild' in decisions.lower() or 'dev container' in content.lower():
        patterns.append({
            'name': 'decide-dev-rebuild-vs-hotreload',
            'title': 'Deciding: Dev Container Rebuild vs Hot-Reload',
            'type': 'decision-making',
            'problem': 'When to rebuild dev containers from source vs copying files for quick iteration',
            'decision_factors': [
                'Changed dependencies (requirements.txt, package.json) → REBUILD',
                'Changed Dockerfile (system packages, ENV vars) → REBUILD',
                'Changed source code only (.py, .ts files) → HOT-RELOAD',
                'Changed config files (docker-compose) → REBUILD',
                'Testing quick fix → HOT-RELOAD, then rebuild if it works'
            ],
            'rebuild_approach': [
                '1. Stop containers: docker-compose down',
                '2. Rebuild: docker-compose build <service>',
                '3. Start: docker-compose up -d',
                '4. Verify: Check logs for clean startup'
            ],
            'hotreload_approach': [
                '1. Copy file: docker cp file.py container:/app/path/',
                '2. Restart service: docker exec container supervisorctl restart app',
                '3. Test changes',
                '4. If works: Update source and rebuild properly'
            ],
            'tradeoffs': {
                'rebuild': 'Slow (minutes) but guaranteed correct environment',
                'hotreload': 'Fast (seconds) but changes lost on container restart'
            },
            'confidence': 'high',
            'evidence': ['Dev container rebuild discussed in workflow'],
            'portable': True,
            'applies_to': ['Docker development', 'dev containers', 'microservices', 'any containerized dev env']
        })
    
    # Pattern: Missing dependencies in container
    if 'proxychains' in content or ('installed' in content.lower() and 'dockerfile' in content.lower()):
        patterns.append({
            'name': 'troubleshoot-missing-container-dependencies',
            'title': 'Troubleshooting Missing Dependencies in Containers',
            'type': 'troubleshooting',
            'problem': 'Command not found or module missing inside running container',
            'symptoms': [
                'bash: command not found',
                'ModuleNotFoundError or ImportError',
                'which <command> returns nothing',
                'Code works locally but fails in container'
            ],
            'root_cause': 'Dependency not installed in Dockerfile, only available on host system',
            'solution_steps': [
                '1. Verify: docker exec <container> which <command> - confirm missing',
                '2. Quick test: docker exec <container> apt-get install -y <package>',
                '3. If works: Add to Dockerfile RUN apt-get install line',
                '4. Rebuild: docker-compose build <service>',
                '5. Verify: Check dependency available in new container'
            ],
            'verification': 'which <command> returns path, import succeeds, command executes',
            'avoid': [
                {'wrong': 'Installing in running container permanently', 'right': 'Add to Dockerfile'},
                {'wrong': 'Assuming host dependencies in container', 'right': 'Explicitly install all deps'},
                {'wrong': 'No apt cleanup', 'right': 'rm -rf /var/lib/apt/lists/* after install'}
            ],
            'confidence': 'high',
            'evidence': ['Dependency added to Dockerfile in changes'],
            'portable': True,
            'applies_to': ['Docker', 'Kubernetes', 'any containerized app', 'CI/CD pipelines']
        })
    
    return patterns


def detect_code_patterns(diff: str, workflow: Dict) -> List[Dict[str, Any]]:
    """Detect reusable code patterns from actual changes."""
    patterns = []
    
    # Pattern: WebSocket endpoint with lifecycle management
    if '@router.websocket' in diff and 'await websocket.accept()' in diff:
        evidence = []
        if 'cleanup' in diff.lower() or 'finally:' in diff:
            evidence.append('Cleanup/finally blocks for resource management')
        if 'auth' in diff.lower() and 'token' in diff.lower():
            evidence.append('Authentication validation in WebSocket')
        if 'register' in diff.lower():
            evidence.append('Agent/client registration pattern')
        
        patterns.append({
            'name': 'websocket-lifecycle-management',
            'title': 'WebSocket Lifecycle Management',
            'description': 'Managing WebSocket connections with authentication, service binding, and cleanup',
            'when_to_use': [
                'Creating WebSocket endpoints with FastAPI',
                'Binding services to WebSocket connection lifetime',
                'Implementing authentication for WebSocket connections',
                'Managing cleanup when connections close'
            ],
            'avoid': [
                {'wrong': 'No cleanup on disconnect', 'right': 'Use try/finally for resource cleanup'},
                {'wrong': 'Accepting before auth', 'right': 'Validate credentials after accept()'},
                {'wrong': 'Storing websocket globally', 'right': 'Track by client ID in dict'}
            ],
            'pattern': 'detected',
            'confidence': 'high',
            'evidence': evidence,
            'code_example': '''@router.websocket("/ws")
async def endpoint(websocket: WebSocket, db: AsyncSession):
    await websocket.accept()
    client_id = None
    service = None
    
    try:
        # 1. Wait for registration with auth
        data = await websocket.receive_text()
        message = json.loads(data)
        client_id = validate_credentials(message)
        
        # 2. Create service bound to connection
        service = SomeService(client_id, websocket)
        await service.start()
        
        # 3. Message loop
        while True:
            data = await websocket.receive_text()
            await handle_message(data)
    finally:
        # 4. Cleanup resources
        if service:
            await service.stop()
        if client_id:
            del connected_clients[client_id]'''
        })
    
    # Pattern: SQLAlchemy JSON field modification
    if 'flag_modified' in diff and 'agent_metadata' in diff.lower():
        patterns.append({
            'name': 'sqlalchemy-json-field-modification',
            'title': 'SQLAlchemy JSON Field Modification',
            'description': 'Properly updating JSON columns so SQLAlchemy detects changes',
            'when_to_use': [
                'Modifying nested dict/list in JSON column',
                'In-place updates to JSON fields not being persisted',
                'Working with PostgreSQL JSONB or MySQL JSON columns',
                'Need to trigger SQLAlchemy change detection'
            ],
            'avoid': [
                {'wrong': 'obj.json_field["key"] = value; commit()', 'right': 'Use flag_modified() after change'},
                {'wrong': 'Replacing entire dict unnecessarily', 'right': 'Modify in place + flag'},
                {'wrong': 'Manual JSON serialization', 'right': 'Let SQLAlchemy handle it'}
            ],
            'pattern': 'detected',
            'confidence': 'high',
            'evidence': ['flag_modified usage detected', 'JSON metadata field modification'],
            'code_example': '''from sqlalchemy.orm.attributes import flag_modified

# Modifying JSON field in-place
if not agent.agent_metadata:
    agent.agent_metadata = {}
agent.agent_metadata["new_key"] = "value"

# CRITICAL: Tell SQLAlchemy the field changed
flag_modified(agent, "agent_metadata")

await db.commit()  # Now changes will persist'''
        })
    
    # Pattern: Docker network isolation
    if 'docker-compose' in diff and 'networks:' in diff and '172.' in diff:
        patterns.append({
            'name': 'docker-network-isolation',
            'title': 'Docker Network Isolation for Dev/Prod',
            'description': 'Using separate Docker networks to avoid subnet conflicts between environments',
            'when_to_use': [
                'Running multiple docker-compose environments simultaneously',
                'Separating dev/test/prod network spaces',
                'Avoiding "network already exists" errors',
                'Need different subnet ranges for isolation'
            ],
            'avoid': [
                {'wrong': 'Same subnet for all environments', 'right': 'Unique subnets (172.28 vs 172.29)'},
                {'wrong': 'Overlapping IP ranges', 'right': 'Plan subnet allocation upfront'},
                {'wrong': 'No network name prefix', 'right': 'Use project-specific names'}
            ],
            'pattern': 'detected',
            'confidence': 'high',
            'evidence': ['Multiple subnet configurations', 'docker-compose network definitions'],
            'code_example': '''# docker-compose.dev.yml
networks:
  dev-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.29.0.0/16  # Dev uses .29

# docker-compose.yml (production)
networks:
  prod-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16  # Prod uses .28'''
        })
    
    # Pattern: ProxyChains dynamic configuration
    if 'proxychains' in diff.lower() and 'tempfile' in diff:
        patterns.append({
            'name': 'proxychains-dynamic-config',
            'title': 'ProxyChains Dynamic Configuration',
            'description': 'Generating temporary ProxyChains configs for per-operation SOCKS routing',
            'when_to_use': [
                'Need different SOCKS proxy per operation',
                'Routing tools (nmap, curl) through agent proxies',
                'Temporary proxy configs to avoid conflicts',
                'Point-of-view scanning through remote agents'
            ],
            'avoid': [
                {'wrong': 'Modifying global /etc/proxychains.conf', 'right': 'Generate temp configs'},
                {'wrong': 'Hardcoded proxy ports', 'right': 'Accept port as parameter'},
                {'wrong': 'Not cleaning up temp files', 'right': 'Use finally block for cleanup'}
            ],
            'pattern': 'detected',
            'confidence': 'high',
            'evidence': ['Temp file creation for ProxyChains', 'Dynamic SOCKS port configuration'],
            'code_example': '''import tempfile
import os

def create_proxychains_config(socks_port: int) -> str:
    """Generate temp ProxyChains config for specific SOCKS port."""
    config_content = f"""strict_chain
proxy_dns
[ProxyList]
socks5 127.0.0.1 {socks_port}
"""
    fd, path = tempfile.mkstemp(suffix='.conf', text=True)
    with os.fdopen(fd, 'w') as f:
        f.write(config_content)
    return path

# Usage
config_path = None
try:
    config_path = create_proxychains_config(10080)
    cmd = ["proxychains4", "-f", config_path, "-q", "nmap", target]
    result = subprocess.run(cmd, capture_output=True)
finally:
    if config_path and os.path.exists(config_path):
        os.unlink(config_path)'''
        })
    
    # Pattern: E2E test automation
    if 'test_' in diff and 'asyncio.run' in diff and 'assert' in diff.lower():
        patterns.append({
            'name': 'e2e-integration-testing',
            'title': 'E2E Integration Test Automation',
            'description': 'Automated end-to-end testing of multi-component integrations',
            'when_to_use': [
                'Testing WebSocket connections and handshakes',
                'Verifying database persistence after operations',
                'Testing service lifecycle and cleanup',
                'Validating multi-step workflows'
            ],
            'avoid': [
                {'wrong': 'Manual testing only', 'right': 'Automated test scripts'},
                {'wrong': 'Testing in production', 'right': 'Separate test environment'},
                {'wrong': 'No cleanup between tests', 'right': 'Reset state or use unique IDs'}
            ],
            'pattern': 'detected',
            'confidence': 'medium',
            'evidence': ['Test script with async/await patterns', 'Multiple test phases'],
            'code_example': '''import asyncio

async def test_websocket_integration():
    """Test WebSocket connection and service creation."""
    print("TEST 1: Connection")
    
    async with websockets.connect(WS_URL) as ws:
        # Send registration
        await ws.send(json.dumps({"type": "register", "id": "test"}))
        
        # Verify response
        response = await asyncio.wait_for(ws.recv(), timeout=5)
        data = json.loads(response)
        assert data["type"] == "registered"
        
        return data["service_port"]

if __name__ == "__main__":
    result = asyncio.run(test_websocket_integration())
    print(f"✅ Test passed: {result}")'''
        })
    
    # Pattern: Workflow decisions (from workflow log)
    if workflow.get('decisions'):
        decisions_text = workflow['decisions']
        if 'port' in decisions_text.lower() and 'auto' in decisions_text.lower():
            patterns.append({
                'name': 'auto-port-allocation',
                'title': 'Auto Port Allocation Pattern',
                'description': 'Automatically assigning incremental ports to avoid conflicts',
                'when_to_use': [
                    'Creating multiple services that need unique ports',
                    'SOCKS proxies, databases, or servers per client',
                    'Development environments with dynamic services',
                    'Avoiding port conflict errors'
                ],
                'avoid': [
                    {'wrong': 'Hardcoded port numbers', 'right': 'Auto-increment from base'},
                    {'wrong': 'No port tracking', 'right': 'Global counter or registry'},
                    {'wrong': 'Ports below 1024', 'right': 'Use 10000+ range'}
                ],
                'pattern': 'inferred',
                'confidence': 'medium',
                'evidence': ['Port allocation mentioned in workflow decisions'],
                'code_example': '''# Global state
next_port = 10080
port_registry = {}

def allocate_port(client_id: str) -> int:
    """Allocate unique port for client."""
    global next_port
    
    if client_id in port_registry:
        return port_registry[client_id]
    
    port = next_port
    next_port += 1
    port_registry[client_id] = port
    
    return port

def release_port(client_id: str):
    """Release port when client disconnects."""
    port_registry.pop(client_id, None)'''
            })
    
    return patterns
def analyze_patterns(commits: List[Dict], workflow: Dict, files: List[str], diff: str) -> List[Dict[str, Any]]:
    """Analyze session patterns intelligently."""
    suggestions = []
    
    # First: Extract problem-solution patterns from workflow (learning from issues)
    problem_patterns = extract_problem_solution_patterns(workflow, commits)
    suggestions.extend(problem_patterns)
    
    # Second: Detect code patterns from actual changes
    code_patterns = detect_code_patterns(diff, workflow)
    suggestions.extend(code_patterns)
    
    # Legacy patterns (kept for backward compatibility)
    
    # UI consistency work
    if any('styling' in c['subject'].lower() or 'unified' in c['subject'].lower() for c in commits):
        ui_files = [f for f in files if 'components' in f or 'pages' in f or 'index.css' in f]
        if ui_files and not any(s['name'] == 'ui-consistency' for s in suggestions):
            suggestions.append({
                'name': 'ui-consistency',
                'title': 'UI Consistency Patterns',
                'description': 'Unifying styling across pages with component libraries and design systems',
                'when_to_use': [
                    'Creating unified component libraries (like CyberUI)',
                    'Migrating inline styles to reusable components',
                    'Standardizing spacing, colors, and typography',
                    'Ensuring visual consistency across pages'
                ],
                'avoid': [
                    {'wrong': 'Inline styles everywhere', 'right': 'Reusable styled components'},
                    {'wrong': 'Duplicated styling logic', 'right': 'Centralized design tokens'},
                    {'wrong': 'Inconsistent spacing', 'right': 'Systematic spacing scale'}
                ],
                'related_skills': ['frontend-react.md', 'documentation.md'],
                'confidence': 'high',
                'evidence': [
                    'Multiple UI/styling commits detected',
                    f'Modified {len(ui_files)} UI-related files',
                    'Workflow mentions styling/design consistency'
                ],
                'example_files': ui_files[:3]
            })
    
    # API endpoint patterns
    if any('endpoint' in c['subject'].lower() or 'api' in c['subject'].lower() for c in commits):
        api_files = [f for f in files if 'endpoints' in f or 'api' in f]
        if api_files and not any(s['name'] == 'api-endpoint-patterns' for s in suggestions):
            suggestions.append({
                'name': 'api-endpoint-patterns',
                'title': 'REST API Endpoint Patterns',
                'description': 'Creating and fixing backend API endpoints with proper error handling',
                'when_to_use': [
                    'Adding missing backend endpoints',
                    'Implementing request validation and error handling',
                    'Connecting frontend calls to backend services',
                    'Testing endpoints with curl/Postman'
                ],
                'avoid': [
                    {'wrong': 'Direct DB access in routes', 'right': 'Service layer separation'},
                    {'wrong': 'No response validation', 'right': 'Pydantic response_model'},
                    {'wrong': 'Generic error messages', 'right': 'Specific HTTP exceptions'}
                ],
                'related_skills': ['backend-api.md', 'error-handling.md', 'testing.md'],
                'confidence': 'high',
                'evidence': [
                    'API/endpoint commits detected',
                    f'Modified {len(api_files)} API files',
                    'Workflow involves endpoint creation'
                ],
                'example_files': api_files[:3]
            })
    
    # Pattern 3: Docker hot-reload workflow
    if any('docker' in c['body'].lower() for c in commits) or 'docker' in workflow.get('summary', '').lower():
        suggestions.append({
            'name': 'docker-hot-reload',
            'title': 'Docker Hot-Reload Development',
            'description': 'Fast iteration by copying files into running containers without full rebuilds',
            'when_to_use': [
                'Quick testing without waiting for full Docker rebuild',
                'Iterating on backend code changes',
                'Updating frontend build in running nginx container',
                'Development in environments using pre-built images from registries'
            ],
            'avoid': [
                {'wrong': 'Full rebuild for each change', 'right': 'docker cp for quick tests'},
                {'wrong': 'No volume mounts', 'right': 'Bind mounts for development'},
                {'wrong': 'Forgetting to restart services', 'right': 'docker exec reload'}
            ],
            'related_skills': ['infrastructure.md', 'debugging.md'],
            'confidence': 'medium',
            'evidence': [
                'Docker-related content in commits or logs',
                'Workflow mentions container updates'
            ],
            'example_files': ['docker-compose.yml']
        })
    
    # Pattern 4: Component refactoring
    component_changes = [f for f in files if '.tsx' in f or '.jsx' in f]
    if len(component_changes) >= 3:
        suggestions.append({
            'name': 'component-refactoring',
            'title': 'Component Refactoring Patterns',
            'description': 'Extracting reusable components and updating multiple consumers',
            'when_to_use': [
                'Creating shared component libraries',
                'Replacing duplicate code with reusable components',
                'Updating all component consumers consistently',
                'Maintaining backward compatibility during refactoring'
            ],
            'avoid': [
                {'wrong': 'Breaking existing consumers', 'right': 'Gradual migration'},
                {'wrong': 'Over-engineering components', 'right': 'Start simple, extend when needed'},
                {'wrong': 'No prop validation', 'right': 'TypeScript interfaces'}
            ],
            'related_skills': ['frontend-react.md', 'testing.md'],
            'confidence': 'medium',
            'evidence': [
                f'Modified {len(component_changes)} component files',
                'Multiple component updates suggest refactoring'
            ],
            'example_files': component_changes[:5]
        })
    
    # Pattern 5: Error handling and debugging
    if any('fix' in c['subject'].lower() or 'error' in c['subject'].lower() for c in commits):
        suggestions.append({
            'name': 'api-debugging',
            'title': 'API Debugging Workflows',
            'description': 'Systematic approach to debugging missing endpoints and integration issues',
            'when_to_use': [
                'Debugging "404 Not Found" API errors',
                'Testing endpoints with curl/httpie',
                'Checking container logs for errors',
                'Verifying request/response formats'
            ],
            'avoid': [
                {'wrong': 'Random code changes', 'right': 'Systematic debugging process'},
                {'wrong': 'Ignoring logs', 'right': 'Check logs first'},
                {'wrong': 'No request logging', 'right': 'Log all API requests'}
            ],
            'related_skills': ['debugging.md', 'backend-api.md', 'error-handling.md'],
            'confidence': 'medium',
            'evidence': [
                'Fix-related commits detected',
                'Session involved debuggingrs',
                'Testing endpoints with curl/httpie',
                'Checking container logs for errors',
                'Verifying request/response formats'
            ],
            'example_files': []
        })
    
    return suggestions


def merge_skills(suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merge granular skills into broader, more reusable categories.
    
    Goal: Max 3 skills per session to avoid context bloat while maintaining utility.
    - Too specific = too many skills to load
    - Too broad = not helpful for solving issues
    """
    
    # Group skills by domain
    websocket_related = []
    database_related = []
    docker_related = []
    testing_related = []
    
    for skill in suggestions:
        name = skill.get('name', '')
        title = skill.get('title', '')
        
        # Categorize by technology/domain
        if any(kw in name.lower() or kw in title.lower() 
               for kw in ['websocket', 'connection', 'port', 'proxy', 'service']):
            websocket_related.append(skill)
        elif any(kw in name.lower() or kw in title.lower() 
                 for kw in ['sqlalchemy', 'database', 'json', 'persistence', 'orm']):
            database_related.append(skill)
        elif any(kw in name.lower() or kw in title.lower() 
                 for kw in ['docker', 'network', 'container', 'dependency']):
            docker_related.append(skill)
        elif any(kw in name.lower() or kw in title.lower() 
                 for kw in ['test', 'e2e', 'integration']):
            testing_related.append(skill)
    
    merged = []
    
    # Merge WebSocket/Service patterns
    if websocket_related:
        when_to_use = set()
        avoid_pairs = []
        examples = []
        all_evidence = []
        
        for skill in websocket_related:
            when_to_use.update(skill.get('when_to_use', []))
            avoid_pairs.extend(skill.get('avoid', []))
            if 'code_example' in skill:
                examples.append(skill['code_example'])
            all_evidence.extend(skill.get('evidence', []))
        
        merged.append({
            'name': 'websocket-service-management',
            'title': 'WebSocket & Service Management',
            'description': 'Managing WebSocket connections with lifecycle, authentication, service binding, and dynamic port allocation',
            'when_to_use': sorted(list(when_to_use))[:8],  # Limit to most relevant
            'avoid': avoid_pairs[:6],
            'examples': examples[:2],  # Max 2 code examples
            'checklist': [
                '[ ] Validate credentials after websocket.accept()',
                '[ ] Use try/finally for resource cleanup',
                '[ ] Track connections by client ID',
                '[ ] Allocate unique ports per service (10000+ range)',
                '[ ] Clean up ports on disconnect',
                '[ ] Bind service lifecycle to WebSocket connection'
            ],
            'confidence': 'high',
            'evidence': list(set(all_evidence)),
            'portable': True,
            'type': 'code'
        })
    
    # Merge Database/ORM patterns
    if database_related:
        # Combine code patterns AND troubleshooting
        code_skills = [s for s in database_related if s.get('type') == 'code']
        troubleshooting_skills = [s for s in database_related if s.get('type') == 'troubleshooting']
        
        when_to_use = set()
        avoid_pairs = []
        examples = []
        gotchas = []
        
        for skill in database_related:
            when_to_use.update(skill.get('when_to_use', []))
            avoid_pairs.extend(skill.get('avoid', []))
            if 'code_example' in skill:
                examples.append(skill['code_example'])
            if 'symptoms' in skill:  # Troubleshooting skill
                gotchas.append({
                    'problem': skill.get('problem'),
                    'solution': skill.get('solution_steps', [])
                })
        
        merged.append({
            'name': 'sqlalchemy-patterns',
            'title': 'SQLAlchemy Patterns & Troubleshooting',
            'description': 'Working with SQLAlchemy ORM, JSON fields, and common persistence gotchas',
            'when_to_use': sorted(list(when_to_use))[:8],
            'avoid': avoid_pairs[:6],
            'examples': examples[:2],
            'checklist': [
                '[ ] Use flag_modified() for in-place JSON changes',
                '[ ] Type hint return values',
                '[ ] Use async/await for I/O operations',
                '[ ] Commit after modifications',
                '[ ] Refresh objects to see DB changes'
            ],
            'gotchas': gotchas[:2],  # Include troubleshooting context
            'confidence': 'high',
            'evidence': ['SQLAlchemy usage detected', 'JSON field modifications'],
            'portable': True,
            'applies_to': ['SQLAlchemy', 'PostgreSQL', 'MySQL', 'any ORM with JSON columns'],
            'type': 'code'
        })
    
    # Merge Docker/Infrastructure patterns
    if docker_related:
        code_skills = [s for s in docker_related if s.get('type') == 'code']
        troubleshooting_skills = [s for s in docker_related if s.get('type') == 'troubleshooting']
        
        when_to_use = set()
        avoid_pairs = []
        examples = []
        gotchas = []
        
        for skill in docker_related:
            when_to_use.update(skill.get('when_to_use', []))
            avoid_pairs.extend(skill.get('avoid', []))
            if 'code_example' in skill:
                examples.append(skill['code_example'])
            if 'symptoms' in skill:
                gotchas.append({
                    'problem': skill.get('problem'),
                    'symptoms': skill.get('symptoms', []),
                    'solution': skill.get('solution_steps', [])
                })
        
        merged.append({
            'name': 'docker-development-workflow',
            'title': 'Docker Development Workflow',
            'description': 'Docker Compose patterns, network isolation, troubleshooting conflicts, and dependency management',
            'when_to_use': sorted(list(when_to_use))[:8],
            'avoid': avoid_pairs[:6],
            'examples': examples[:2],
            'checklist': [
                '[ ] Unique subnets per environment (172.28, 172.29, etc)',
                '[ ] Add all dependencies to Dockerfile',
                '[ ] Use docker network inspect to diagnose conflicts',
                '[ ] Clean with docker-compose down && docker network prune',
                '[ ] Rebuild after Dockerfile changes'
            ],
            'gotchas': gotchas[:3],  # Include multiple troubleshooting scenarios
            'confidence': 'high',
            'evidence': ['Docker Compose configuration', 'Network setup', 'Container dependency management'],
            'portable': True,
            'applies_to': ['Docker', 'Docker Compose', 'Kubernetes', 'any containerized development'],
            'type': 'code'
        })
    
    # Only include testing if it's substantial
    if len(testing_related) >= 2:
        when_to_use = set()
        avoid_pairs = []
        examples = []
        
        for skill in testing_related:
            when_to_use.update(skill.get('when_to_use', []))
            avoid_pairs.extend(skill.get('avoid', []))
            if 'code_example' in skill:
                examples.append(skill['code_example'])
        
        # Only add if we have substantial content
        if when_to_use:
            merged.append({
                'name': 'integration-testing',
                'title': 'Integration Testing Patterns',
                'description': 'E2E testing of multi-component integrations with async operations',
                'when_to_use': sorted(list(when_to_use))[:6],
                'avoid': avoid_pairs[:4],
                'examples': examples[:1],
                'checklist': [
                    '[ ] Separate test environment',
                    '[ ] Use asyncio.run() for async tests',
                    '[ ] Clean up resources in finally blocks',
                    '[ ] Verify each integration point',
                    '[ ] Use unique IDs to avoid conflicts'
                ],
                'confidence': 'medium',
                'evidence': ['E2E test patterns detected'],
                'portable': True,
                'type': 'code'
            })
    
    return merged[:3]  # Max 3 skills


def format_skill_as_markdown(skill: Dict[str, Any]) -> str:
    """Format skill suggestion as markdown matching template structure."""
    lines = [f"# {skill['title']}\n"]
    lines.append(f"{skill['description']}\n")
    
    # When to Use section
    if skill.get('when_to_use'):
        lines.append("## When to Use")
        for item in skill['when_to_use']:
            lines.append(f"- {item}")
        lines.append("")
    
    # Checklist section
    if skill.get('checklist'):
        lines.append("## Checklist")
        for item in skill['checklist']:
            lines.append(f"- {item}")
        lines.append("")
    
    # Avoid section
    if skill.get('avoid'):
        lines.append("## Avoid")
        for item in skill['avoid']:
            if isinstance(item, dict):
                lines.append(f"- ❌ {item.get('wrong', '')} → ✅ {item.get('right', '')}")
            else:
                lines.append(f"- {item}")
        lines.append("")
    
    # Gotchas section (if troubleshooting included)
    if skill.get('gotchas'):
        lines.append("## Gotchas")
        for gotcha in skill['gotchas']:
            lines.append(f"### {gotcha.get('problem', 'Issue')}")
            if 'symptoms' in gotcha:
                lines.append("**Symptoms:**")
                for symptom in gotcha['symptoms']:
                    lines.append(f"- {symptom}")
            if 'solution' in gotcha:
                lines.append("**Solution:**")
                for step in gotcha['solution']:
                    lines.append(f"{step}")
            lines.append("")
    
    # Examples section
    if skill.get('examples'):
        lines.append("## Examples")
        for i, example in enumerate(skill['examples'], 1):
            if i > 1:
                lines.append("---\n")
            lines.append(f"```python\n{example}\n```\n")
    
    return '\n'.join(lines)


def main():
    """Generate skill suggestions from current session."""
    parser = argparse.ArgumentParser(description='Suggest skills from session patterns')
    parser.add_argument('--commits', type=int, default=5, help='Number of commits to analyze')
    parser.add_argument('--workflow-logs', type=int, default=1, help='Number of workflow logs to analyze')
    parser.add_argument('--type', choices=['all', 'code', 'troubleshooting', 'decision'], 
                       default='all', help='Type of skills to suggest')
    parser.add_argument('--format', choices=['json', 'markdown'], default='json',
                       help='Output format (json or markdown)')
    parser.add_argument('--no-merge', action='store_true',
                       help='Skip merging similar skills')
    args = parser.parse_args()
    
    # Gather session data
    commits = get_recent_commits(count=args.commits)
    workflow = get_recent_workflow_log()
    files = get_changed_files(commits=args.commits)
    diff = get_code_diff(commits=args.commits)
    tech = extract_technologies(diff, files)
    
    # Analyze and suggest
    suggestions = analyze_patterns(commits, workflow, files, diff)
    
    # Filter by type if specified
    if args.type != 'all':
        suggestions = [s for s in suggestions if s.get('type', 'code') == args.type or s.get('pattern') == 'detected']
    
    # Add metadata
    for s in suggestions:
        if 'type' not in s:
            s['type'] = 'code'
    
    # Merge skills unless disabled
    if not args.no_merge:
        suggestions = merge_skills(suggestions)
    
    # Output format
    if args.format == 'markdown':
        for skill in suggestions:
            print(format_skill_as_markdown(skill))
            print("\n" + "="*80 + "\n")
    else:
        # Output as JSON for agent to parse
        output = {
            'session': {
                'commits': len(commits),
                'workflow_log': workflow.get('file', 'none'),
                'files_changed': len(files),
                'technologies': sorted(list(tech))
            },
            'suggestions': suggestions,
            'summary': {
                'total': len(suggestions),
                'by_type': {
                    'troubleshooting': len([s for s in suggestions if s.get('type') == 'troubleshooting']),
                    'code': len([s for s in suggestions if s.get('type') == 'code' or s.get('pattern') == 'detected']),
                    'decision': len([s for s in suggestions if s.get('type') == 'decision-making'])
                },
                'high_confidence': len([s for s in suggestions if s.get('confidence') == 'high'])
            }
        }
        
        print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
