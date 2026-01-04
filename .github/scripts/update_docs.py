#!/usr/bin/env python3
"""
AKIS Documentation Updater

Analyzes session changes and suggests lightweight documentation updates.
Runs during LEARN phase to keep docs current without bloat.

Usage:
    python .github/scripts/update_docs.py [--dry-run]
    
Output: JSON array of documentation update suggestions for agent to review
"""

import json
import re
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Set, Optional


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


def get_recent_workflow_log() -> Optional[Dict[str, Any]]:
    """Get the most recent workflow log."""
    log_dir = Path('log/workflow')
    if not log_dir.exists():
        return None
    
    log_files = sorted(log_dir.glob('*.md'), reverse=True)
    if not log_files:
        return None
    
    latest = log_files[0]
    content = latest.read_text()
    
    # Extract sections
    summary_match = re.search(r'## Summary\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
    changes_match = re.search(r'## Changes\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
    
    return {
        'file': latest.name,
        'summary': summary_match.group(1).strip() if summary_match else '',
        'changes': changes_match.group(1).strip() if changes_match else ''
    }


def categorize_files(files: List[str]) -> Dict[str, List[str]]:
    """Categorize changed files by type."""
    categories = {
        'backend': [],
        'frontend': [],
        'infrastructure': [],
        'docs': [],
        'tests': [],
        'config': []
    }
    
    for file in files:
        if file.startswith('backend/'):
            categories['backend'].append(file)
        elif file.startswith('frontend/'):
            categories['frontend'].append(file)
        elif file.startswith('docker') or 'Dockerfile' in file or file.endswith('.yml'):
            categories['infrastructure'].append(file)
        elif file.startswith('docs/'):
            categories['docs'].append(file)
        elif 'test' in file or file.endswith('_test.py') or file.endswith('.test.ts'):
            categories['tests'].append(file)
        elif file.endswith('.json') or file.endswith('.env') or 'config' in file:
            categories['config'].append(file)
    
    return {k: v for k, v in categories.items() if v}


def find_related_docs(changed_files: List[str], all_docs: List[Path]) -> Set[str]:
    """Find documentation that might be affected by file changes."""
    related = set()
    
    # Map of file patterns to documentation
    doc_mappings = {
        'backend/app/api/': ['docs/technical/API_rest_v1.md'],
        'backend/app/models/': ['docs/architecture/ARCH_system_v1.md'],
        'docker': ['docs/DEPLOYMENT.md', 'docs/DOCKER_REBUILD.md', 'docs/guides/DEPLOYMENT.md'],
        'frontend/src/components/': ['docs/design/UI_UX_SPEC.md'],
        'README.md': ['docs/INDEX.md'],
        '.github/': ['docs/development/CONTRIBUTING.md']
    }
    
    for file in changed_files:
        for pattern, docs in doc_mappings.items():
            if pattern in file:
                related.update(docs)
    
    return related


def analyze_impact(commits: List[Dict], files: List[str], workflow: Optional[Dict]) -> List[Dict[str, Any]]:
    """Analyze session impact and suggest documentation updates."""
    suggestions = []
    categories = categorize_files(files)
    
    # Find all docs
    docs_dir = Path('docs')
    all_docs = list(docs_dir.glob('**/*.md')) if docs_dir.exists() else []
    
    # Find potentially affected docs
    affected_docs = find_related_docs(files, all_docs)
    
    # Pattern 1: API endpoint changes
    if categories.get('backend') and any('api' in f or 'endpoint' in f for f in categories['backend']):
        api_files = [f for f in categories['backend'] if 'api' in f or 'endpoint' in f]
        suggestions.append({
            'doc': 'docs/technical/API_rest_v1.md',
            'reason': 'API endpoints modified',
            'type': 'update',
            'priority': 'high',
            'changes': api_files[:5],
            'suggestion': 'Review and update API documentation for modified endpoints',
            'sections': ['Endpoints', 'Request/Response schemas'],
            'keep_lightweight': True
        })
    
    # Pattern 2: Frontend UI changes
    if categories.get('frontend') and any('component' in f or 'page' in f for f in categories['frontend']):
        ui_files = [f for f in categories['frontend'] if 'component' in f or 'page' in f]
        suggestions.append({
            'doc': 'docs/design/UI_UX_SPEC.md',
            'reason': 'UI components modified',
            'type': 'update',
            'priority': 'medium',
            'changes': ui_files[:5],
            'suggestion': 'Update component documentation if new patterns introduced',
            'sections': ['Component library', 'Design patterns'],
            'keep_lightweight': True
        })
    
    # Pattern 3: Infrastructure/Docker changes
    if categories.get('infrastructure'):
        suggestions.append({
            'doc': 'docs/DEPLOYMENT.md',
            'reason': 'Infrastructure configuration modified',
            'type': 'update',
            'priority': 'high',
            'changes': categories['infrastructure'][:5],
            'suggestion': 'Update deployment docs with configuration changes',
            'sections': ['Configuration', 'Docker setup'],
            'keep_lightweight': True
        })
    
    # Pattern 4: New features (from commit messages)
    if commits:
        feature_commits = [c for c in commits if 'feat' in c['subject'].lower() or 'feature' in c['subject'].lower()]
        if feature_commits:
            suggestions.append({
                'doc': 'docs/features/IMPLEMENTED_FEATURES.md',
                'reason': 'New feature implemented',
                'type': 'append',
                'priority': 'medium',
                'changes': [c['subject'] for c in feature_commits],
                'suggestion': 'Add brief feature entry to implemented features list',
                'sections': ['Features list'],
                'keep_lightweight': True
            })
    
    # Pattern 5: Architecture changes (models, services)
    if categories.get('backend') and any('model' in f or 'service' in f for f in categories['backend']):
        arch_files = [f for f in categories['backend'] if 'model' in f or 'service' in f]
        suggestions.append({
            'doc': 'docs/architecture/ARCH_system_v1.md',
            'reason': 'Data models or services modified',
            'type': 'review',
            'priority': 'low',
            'changes': arch_files[:5],
            'suggestion': 'Review if architecture diagrams need updates (only for major changes)',
            'sections': ['Data models', 'Service layer'],
            'keep_lightweight': True
        })
    
    # Pattern 6: README updates (for user-facing changes)
    user_facing = any('page' in f or 'component' in f for f in files) or any('api' in f for f in files)
    if user_facing and 'README.md' not in files:
        suggestions.append({
            'doc': 'README.md',
            'reason': 'User-facing changes made but README not updated',
            'type': 'review',
            'priority': 'medium',
            'changes': [],
            'suggestion': 'Check if README needs updates for user-facing changes',
            'sections': ['Features', 'Usage'],
            'keep_lightweight': True
        })
    
    # Filter suggestions to only those with actual impact
    filtered = []
    for s in suggestions:
        # Check if doc exists
        doc_path = Path(s['doc'])
        if doc_path.exists() or s['type'] == 'create':
            filtered.append(s)
    
    return filtered


def generate_update_plan(suggestions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate a lightweight documentation update plan."""
    if not suggestions:
        return {
            'has_updates': False,
            'message': 'No documentation updates needed'
        }
    
    # Group by priority
    high_priority = [s for s in suggestions if s['priority'] == 'high']
    medium_priority = [s for s in suggestions if s['priority'] == 'medium']
    low_priority = [s for s in suggestions if s['priority'] == 'low']
    
    plan = {
        'has_updates': True,
        'summary': f'{len(suggestions)} documentation update(s) suggested',
        'high_priority': high_priority,
        'medium_priority': medium_priority,
        'low_priority': low_priority,
        'principles': [
            'Keep updates minimal and focused',
            'Only update sections directly affected by changes',
            'Avoid verbose explanations',
            'Prefer bullet points over paragraphs',
            'Update dates on modified sections'
        ]
    }
    
    return plan


def main():
    """Generate documentation update suggestions from current session."""
    import sys
    dry_run = '--dry-run' in sys.argv
    
    print("📚 Analyzing session for documentation updates...")
    
    # Gather session data
    commits = get_recent_commits(hours=2)
    files = get_changed_files()
    workflow = get_recent_workflow_log()
    
    print(f"📊 Session data: {len(commits)} commits, {len(files)} files changed")
    
    # Analyze impact
    suggestions = analyze_impact(commits, files, workflow)
    
    # Generate plan
    plan = generate_update_plan(suggestions)
    
    # Output as JSON for agent
    output = {
        'session': {
            'commits': len(commits),
            'files_changed': len(files),
            'workflow_log': workflow['file'] if workflow else None
        },
        'plan': plan
    }
    
    print(json.dumps(output, indent=2))
    
    if dry_run:
        print("\n🔍 DRY RUN - Suggestions shown above")
        return
    
    # Return 0 if updates needed, 1 if none
    return 0 if plan['has_updates'] else 1


if __name__ == '__main__':
    exit(main())
