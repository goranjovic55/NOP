#!/usr/bin/env python3
"""
AKIS Documentation Updater

Analyzes session changes and generates/updates documentation.
Creates new docs only when necessary, merges with existing structure.

Principles:
1. Minimal: Only essential information, no filler
2. Merge-first: Update existing docs before creating new
3. Indexed: All new docs registered in INDEX.md
4. Structured: Follow docs/{category}/ convention

Usage:
    python .github/scripts/update_docs.py [--dry-run] [--json]
"""

import json
import re
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple


# Documentation structure
DOC_STRUCTURE = {
    'guides': 'How-to guides, setup, deployment',
    'features': 'Feature documentation',
    'technical': 'API references, specs',
    'architecture': 'System design, ADRs',
    'development': 'Contributing, testing',
    'design': 'UI/UX specs',
    'archive': 'Historical, deprecated'
}

# File pattern to doc category mapping
CATEGORY_MAP = {
    'backend/app/api/': 'technical',
    'backend/app/models/': 'architecture',
    'backend/app/services/': 'technical',
    'frontend/src/pages/': 'features',
    'frontend/src/components/': 'design',
    'docker': 'guides',
    '.github/': 'development',
    'scripts/': 'development',
}

# Existing docs to update (pattern -> doc path)
UPDATE_TARGETS = {
    'backend/app/api/': 'docs/technical/API_rest_v1.md',
    'backend/app/models/': 'docs/architecture/ARCH_system_v1.md',
    'docker': 'docs/guides/DEPLOYMENT.md',
    'frontend/src/': 'docs/design/UI_UX_SPEC.md',
}


def get_session_data() -> Tuple[List[Dict], List[str], Optional[Dict]]:
    """Get commits, changed files, and workflow log."""
    commits = []
    files = []
    workflow = None
    
    # Get recent commits
    try:
        result = subprocess.run(
            ['git', 'log', '-5', '--pretty=format:%H|%s|%an'],
            capture_output=True, text=True, check=True
        )
        for line in result.stdout.strip().split('\n'):
            if '|' in line:
                parts = line.split('|')
                commits.append({
                    'hash': parts[0][:8],
                    'subject': parts[1],
                    'author': parts[2] if len(parts) > 2 else ''
                })
    except subprocess.CalledProcessError:
        pass
    
    # Get changed files
    try:
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'HEAD~5', 'HEAD'],
            capture_output=True, text=True, check=True
        )
        files = [f for f in result.stdout.strip().split('\n') if f]
    except subprocess.CalledProcessError:
        pass
    
    # Get workflow log
    log_dir = Path('log/workflow')
    if log_dir.exists():
        logs = sorted(log_dir.glob('*.md'), key=lambda p: p.stat().st_mtime, reverse=True)
        if logs:
            content = logs[0].read_text()
            summary = re.search(r'## Summary\s*\n+(.+?)(?=\n##|\Z)', content, re.DOTALL)
            workflow = {
                'file': logs[0].name,
                'summary': summary.group(1).strip() if summary else ''
            }
    
    return commits, files, workflow


def detect_category(file_path: str) -> str:
    """Detect documentation category for a file."""
    for pattern, category in CATEGORY_MAP.items():
        if pattern in file_path:
            return category
    return 'technical'  # Default


def find_existing_doc(topic: str, category: str) -> Optional[Path]:
    """Find existing documentation for a topic."""
    docs_dir = Path(f'docs/{category}')
    if not docs_dir.exists():
        return None
    
    # Search for docs mentioning the topic
    topic_lower = topic.lower()
    for doc in docs_dir.glob('*.md'):
        content = doc.read_text().lower()
        if topic_lower in content or topic_lower in doc.name.lower():
            return doc
    
    return None


def extract_function_info(file_path: str) -> List[Dict[str, str]]:
    """Extract function/class info from a Python file."""
    functions = []
    path = Path(file_path)
    
    if not path.exists() or not file_path.endswith('.py'):
        return functions
    
    try:
        content = path.read_text()
        
        # Extract functions/classes with docstrings
        pattern = r'(?:def|class)\s+(\w+)\s*\([^)]*\).*?:\s*(?:"""([^"]*?)"""|\'\'\'([^\']*?)\'\'\')?'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for match in matches:
            name = match[0]
            docstring = match[1] or match[2] or ''
            if not name.startswith('_'):
                functions.append({
                    'name': name,
                    'doc': docstring.strip().split('\n')[0] if docstring else ''
                })
    except Exception:
        pass
    
    return functions


def generate_minimal_doc(topic: str, category: str, info: Dict[str, Any]) -> str:
    """Generate minimal documentation content."""
    date = datetime.now().strftime('%Y-%m-%d')
    
    content = f"""# {topic}

**Category**: {category} | **Updated**: {date}

## Overview

{info.get('summary', 'Auto-generated documentation.')}

"""
    
    if info.get('functions'):
        content += "## Reference\n\n"
        content += "| Function | Description |\n"
        content += "|----------|-------------|\n"
        for func in info['functions'][:10]:
            content += f"| `{func['name']}` | {func['doc'][:50]} |\n"
        content += "\n"
    
    if info.get('files'):
        content += "## Related Files\n\n"
        for f in info['files'][:5]:
            content += f"- `{f}`\n"
        content += "\n"
    
    return content


def update_index(doc_path: Path, title: str, description: str) -> bool:
    """Add new documentation to INDEX.md."""
    index_path = Path('docs/INDEX.md')
    if not index_path.exists():
        return False
    
    content = index_path.read_text()
    
    # Check if already indexed
    relative_path = str(doc_path.relative_to('docs'))
    if relative_path in content:
        return False
    
    # Find the appropriate section
    category = doc_path.parent.name
    section_pattern = rf'(## {category.title()}\s*\n)'
    match = re.search(section_pattern, content, re.IGNORECASE)
    
    if match:
        # Add entry after section header
        entry = f"\n### [{doc_path.name}]({relative_path})\n**{title}**\n{description}\n"
        insert_pos = match.end()
        
        # Find next section to insert before
        next_section = re.search(r'\n---\n|\n## ', content[insert_pos:])
        if next_section:
            insert_pos += next_section.start()
        
        new_content = content[:insert_pos] + entry + content[insert_pos:]
        index_path.write_text(new_content)
        return True
    
    return False


def append_to_existing(doc_path: Path, section: str, content: str) -> bool:
    """Append content to existing doc section."""
    if not doc_path.exists():
        return False
    
    doc_content = doc_path.read_text()
    
    # Find section
    section_pattern = rf'(## {section}\s*\n)'
    match = re.search(section_pattern, doc_content, re.IGNORECASE)
    
    if match:
        # Find end of section (next ## or end)
        section_start = match.end()
        next_section = re.search(r'\n## ', doc_content[section_start:])
        
        if next_section:
            insert_pos = section_start + next_section.start()
        else:
            insert_pos = len(doc_content)
        
        # Insert content
        new_content = doc_content[:insert_pos] + '\n' + content + doc_content[insert_pos:]
        doc_path.write_text(new_content)
        return True
    
    return False


def analyze_and_update(dry_run: bool = False) -> Dict[str, Any]:
    """Analyze session and perform documentation updates."""
    commits, files, workflow = get_session_data()
    
    results = {
        'session': {
            'commits': len(commits),
            'files': len(files),
            'workflow': workflow['file'] if workflow else None
        },
        'updates': [],
        'created': [],
        'indexed': [],
        'skipped': []
    }
    
    if not files:
        results['message'] = 'No changed files detected'
        return results
    
    # Group files by category
    categorized: Dict[str, List[str]] = {}
    for f in files:
        if f.startswith('docs/') or f.endswith('.md'):
            continue  # Skip docs themselves
        cat = detect_category(f)
        categorized.setdefault(cat, []).append(f)
    
    # Process each category
    for category, cat_files in categorized.items():
        # Check for existing doc to update
        for pattern, target in UPDATE_TARGETS.items():
            if any(pattern in f for f in cat_files):
                target_path = Path(target)
                if target_path.exists():
                    results['updates'].append({
                        'doc': target,
                        'reason': f'{len(cat_files)} related files changed',
                        'files': cat_files[:5]
                    })
    
    # Check for new feature commits
    feature_commits = [c for c in commits if 
                       any(kw in c['subject'].lower() 
                           for kw in ['feat:', 'feature:', 'add:', 'implement:'])]
    
    if feature_commits:
        impl_path = Path('docs/features/IMPLEMENTED_FEATURES.md')
        if impl_path.exists():
            feature_entries = '\n'.join([
                f"- {c['subject']}" for c in feature_commits
            ])
            
            if not dry_run:
                append_to_existing(impl_path, 'Features', feature_entries)
                results['updates'].append({
                    'doc': str(impl_path),
                    'reason': 'New features added',
                    'added': [c['subject'] for c in feature_commits]
                })
            else:
                results['updates'].append({
                    'doc': str(impl_path),
                    'reason': 'Would add new features',
                    'features': [c['subject'] for c in feature_commits]
                })
    
    # Check for new scripts that need documentation
    new_scripts = [f for f in files if f.startswith('scripts/') and f.endswith('.py')]
    for script in new_scripts:
        script_name = Path(script).stem
        existing = find_existing_doc(script_name, 'development')
        
        if not existing:
            # Check if script is significant (has docstring)
            funcs = extract_function_info(script)
            if funcs:
                doc_name = f"{script_name.upper()}.md"
                doc_path = Path(f'docs/development/{doc_name}')
                
                if not dry_run and not doc_path.exists():
                    info = {
                        'summary': f'Documentation for {script_name} script.',
                        'functions': funcs,
                        'files': [script]
                    }
                    content = generate_minimal_doc(script_name, 'development', info)
                    doc_path.parent.mkdir(parents=True, exist_ok=True)
                    doc_path.write_text(content)
                    results['created'].append(str(doc_path))
                    
                    # Update index
                    if update_index(doc_path, script_name, f'Script: {script}'):
                        results['indexed'].append(str(doc_path))
                else:
                    results['skipped'].append({
                        'file': script,
                        'reason': 'Would create doc' if dry_run else 'Already exists'
                    })
    
    return results


def format_report(results: Dict[str, Any]) -> str:
    """Format results as human-readable report."""
    lines = [
        '📚 AKIS Documentation Updater',
        '=' * 40,
        f"Session: {results['session']['commits']} commits, {results['session']['files']} files",
        ''
    ]
    
    if results.get('updates'):
        lines.append('📝 Updates:')
        for u in results['updates']:
            lines.append(f"  • {u['doc']}: {u['reason']}")
    
    if results.get('created'):
        lines.append('\n✨ Created:')
        for c in results['created']:
            lines.append(f"  • {c}")
    
    if results.get('indexed'):
        lines.append('\n📋 Indexed:')
        for i in results['indexed']:
            lines.append(f"  • {i}")
    
    if not results.get('updates') and not results.get('created'):
        lines.append('✓ No documentation updates needed')
    
    return '\n'.join(lines)


def main():
    """Run documentation updater."""
    import sys
    dry_run = '--dry-run' in sys.argv
    json_mode = '--json' in sys.argv
    
    print("📚 AKIS Documentation Updater")
    print("=" * 40)
    
    results = analyze_and_update(dry_run)
    
    if json_mode:
        print(json.dumps(results, indent=2))
    else:
        print(format_report(results))
    
    if dry_run:
        print("\n🔍 DRY RUN - No changes made")
    
    return 0


if __name__ == '__main__':
    exit(main())
