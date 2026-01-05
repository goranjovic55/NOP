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
    """Get the most recent workflow log."""
    log_dir = Path('log/workflow')
    if not log_dir.exists():
        return {}
    
    log_files = sorted(log_dir.glob('*.md'), reverse=True)
    if not log_files:
        return {}
    
    latest = log_files[0]
    content = latest.read_text()
    
    # Extract sections
    summary_match = re.search(r'## Summary\n\n(.+?)(?=\n##)', content, re.DOTALL)
    changes_match = re.search(r'## Changes\n\n(.+?)(?=\n##)', content, re.DOTALL)
    decisions_match = re.search(r'## Decisions\n\n(.+?)(?=\n##)', content, re.DOTALL)
    
    return {
        'file': latest.name,
        'summary': summary_match.group(1).strip() if summary_match else '',
        'changes': changes_match.group(1).strip() if changes_match else '',
        'decisions': decisions_match.group(1).strip() if decisions_match else ''
    }


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
    
    # First: Detect patterns from actual code changes
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


def main():
    """Generate skill suggestions from current session."""
    parser = argparse.ArgumentParser(description='Suggest skills from session patterns')
    parser.add_argument('--commits', type=int, default=5, help='Number of commits to analyze')
    args = parser.parse_args()
    
    # Gather session data
    commits = get_recent_commits(count=args.commits)
    workflow = get_recent_workflow_log()
    files = get_changed_files(commits=args.commits)
    diff = get_code_diff(commits=args.commits)
    tech = extract_technologies(diff, files)
    
    # Analyze and suggest
    suggestions = analyze_patterns(commits, workflow, files, diff)
    
    # Output as JSON for agent to parse
    output = {
        'session': {
            'commits': len(commits),
            'workflow_log': workflow.get('file', 'none'),
            'files_changed': len(files),
            'technologies': sorted(list(tech))
        },
        'suggestions': suggestions
    }
    
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
