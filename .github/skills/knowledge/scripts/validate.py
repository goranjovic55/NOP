#!/usr/bin/env python3
"""
Knowledge Skill Validation Script

Validates project_knowledge.json structure and content.
"""

import json
import sys
from pathlib import Path


def validate_knowledge_file(filepath: Path) -> list:
    """Validate knowledge graph file."""
    issues = []
    
    try:
        content = filepath.read_text()
        data = json.loads(content)
        
        # Check for required top-level keys
        if 'type' not in data:
            issues.append({
                'file': str(filepath),
                'message': 'Missing "type" field',
                'severity': 'warning'
            })
        
        if 'version' not in data:
            issues.append({
                'file': str(filepath),
                'message': 'Missing "version" field',
                'severity': 'warning'
            })
            
    except json.JSONDecodeError as e:
        issues.append({
            'file': str(filepath),
            'message': f'Invalid JSON: {e}',
            'severity': 'error'
        })
    except Exception as e:
        issues.append({
            'file': str(filepath),
            'message': f'Could not read file: {e}',
            'severity': 'error'
        })
    
    return issues


def main():
    """Run validation."""
    print("Knowledge Skill Validation")
    print("=" * 60)
    
    issues = []
    
    knowledge_file = Path('project_knowledge.json')
    if knowledge_file.exists():
        issues.extend(validate_knowledge_file(knowledge_file))
    else:
        print("⚠️ project_knowledge.json not found")
    
    if issues:
        for issue in issues:
            prefix = '❌' if issue['severity'] == 'error' else '⚠️'
            print(f"{prefix} {issue['file']}: {issue['message']}")
    else:
        print("✅ Knowledge graph validated")
    
    return 0 if not any(i['severity'] == 'error' for i in issues) else 1


if __name__ == '__main__':
    sys.exit(main())
