#!/usr/bin/env python3
"""
AKIS Skill Suggester

Analyzes current session (recent commits, workflow logs, file changes) and suggests
skills that would have been useful. Outputs proposals for agent to present to user.

Usage:
    python .github/scripts/suggest_skill.py
    
Output: JSON array of skill suggestions for user approval
"""

import json
import re
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any


def get_recent_commits(hours: int = 2) -> List[Dict[str, str]]:
    """Get commits from the last N hours."""
    try:
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        result = subprocess.run(
            ['git', 'log', f'--since={since}', '--pretty=format:%H|%s|%b'],
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


def get_changed_files() -> List[str]:
    """Get list of files modified in recent commits."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'HEAD~5', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return [f for f in result.stdout.strip().split('\n') if f]
    except subprocess.CalledProcessError:
        return []


def analyze_patterns(commits: List[Dict], workflow: Dict, files: List[str]) -> List[Dict[str, Any]]:
    """Analyze session patterns and suggest skills."""
    suggestions = []
    
    # Pattern 1: Styling/UI consistency work
    if any('styling' in c['subject'].lower() or 'unified' in c['subject'].lower() for c in commits):
        ui_files = [f for f in files if 'components' in f or 'pages' in f or 'index.css' in f]
        if ui_files:
            suggestions.append({
                'name': 'ui-consistency',
                'title': 'UI Consistency Patterns',
                'description': 'Unifying styling across pages with component libraries and design systems',
                'confidence': 'high',
                'evidence': [
                    'Multiple UI/styling commits detected',
                    f'Modified {len(ui_files)} UI-related files',
                    'Workflow mentions styling/design consistency'
                ],
                'use_cases': [
                    'Creating unified component libraries (like CyberUI)',
                    'Migrating inline styles to reusable components',
                    'Standardizing spacing, colors, and typography',
                    'Ensuring visual consistency across pages'
                ],
                'example_files': ui_files[:3]
            })
    
    # Pattern 2: API endpoint creation/fixes
    if any('endpoint' in c['subject'].lower() or 'api' in c['subject'].lower() for c in commits):
        api_files = [f for f in files if 'endpoints' in f or 'api' in f]
        if api_files:
            suggestions.append({
                'name': 'api-endpoint-patterns',
                'title': 'REST API Endpoint Patterns',
                'description': 'Creating and fixing backend API endpoints with proper error handling',
                'confidence': 'high',
                'evidence': [
                    'API/endpoint commits detected',
                    f'Modified {len(api_files)} API files',
                    'Workflow involves endpoint creation'
                ],
                'use_cases': [
                    'Adding missing backend endpoints',
                    'Implementing request validation and error handling',
                    'Connecting frontend calls to backend services',
                    'Testing endpoints with curl/Postman'
                ],
                'example_files': api_files[:3]
            })
    
    # Pattern 3: Docker hot-reload workflow
    if any('docker' in c['body'].lower() for c in commits) or 'docker' in workflow.get('summary', '').lower():
        suggestions.append({
            'name': 'docker-hot-reload',
            'title': 'Docker Hot-Reload Development',
            'description': 'Fast iteration by copying files into running containers without full rebuilds',
            'confidence': 'medium',
            'evidence': [
                'Docker-related content in commits or logs',
                'Workflow mentions container updates'
            ],
            'use_cases': [
                'Quick testing without waiting for full Docker rebuild',
                'Iterating on backend code changes',
                'Updating frontend build in running nginx container',
                'Development in environments using pre-built images from registries'
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
            'confidence': 'medium',
            'evidence': [
                f'Modified {len(component_changes)} component files',
                'Multiple component updates suggest refactoring'
            ],
            'use_cases': [
                'Creating shared component libraries',
                'Replacing duplicate code with reusable components',
                'Updating all component consumers consistently',
                'Maintaining backward compatibility during refactoring'
            ],
            'example_files': component_changes[:5]
        })
    
    # Pattern 5: Error handling and debugging
    if any('fix' in c['subject'].lower() or 'error' in c['subject'].lower() for c in commits):
        suggestions.append({
            'name': 'api-debugging',
            'title': 'API Debugging Workflows',
            'description': 'Systematic approach to debugging missing endpoints and integration issues',
            'confidence': 'medium',
            'evidence': [
                'Fix-related commits detected',
                'Session involved debugging'
            ],
            'use_cases': [
                'Debugging "404 Not Found" API errors',
                'Testing endpoints with curl/httpie',
                'Checking container logs for errors',
                'Verifying request/response formats'
            ],
            'example_files': []
        })
    
    return suggestions


def main():
    """Generate skill suggestions from current session."""
    root = Path.cwd()
    
    # Gather session data
    commits = get_recent_commits(hours=2)
    workflow = get_recent_workflow_log()
    files = get_changed_files()
    
    # Analyze and suggest
    suggestions = analyze_patterns(commits, workflow, files)
    
    # Output as JSON for agent to parse
    output = {
        'session': {
            'commits': len(commits),
            'workflow_log': workflow.get('file', 'none'),
            'files_changed': len(files)
        },
        'suggestions': suggestions
    }
    
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
