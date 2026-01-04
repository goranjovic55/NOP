#!/usr/bin/env python3
"""
AKIS Workflow Analyzer

Analyzes ALL workflow logs to identify patterns, extract skills, and propose
improvements to documentation, instructions, and knowledge across sessions.

This script is meant to be run periodically to standardize and improve the
AKIS framework based on historical session data.

Usage:
    python .github/scripts/analyze_workflows.py [--output json|markdown] [--min-sessions N]
    
Output: Comprehensive analysis of patterns across all workflow sessions
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Set, Optional
from collections import Counter, defaultdict


def load_workflow_logs(log_dir: Path, min_count: int = 1) -> List[Dict[str, Any]]:
    """Load and parse all workflow logs."""
    if not log_dir.exists():
        return []
    
    logs = []
    log_files = sorted(log_dir.glob('*.md'))
    
    if len(log_files) < min_count:
        return []
    
    for log_file in log_files:
        try:
            content = log_file.read_text(encoding='utf-8')
            
            # Extract metadata from filename
            match = re.match(r'(\d{4}-\d{2}-\d{2})_(\d{6})_(.+)\.md', log_file.name)
            if match:
                date_str = match.group(1)
                time_str = match.group(2)
                task_name = match.group(3)
            else:
                date_str = 'unknown'
                time_str = '000000'
                task_name = log_file.stem
            
            # Extract sections
            summary_match = re.search(r'## Summary\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
            changes_match = re.search(r'## Changes\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
            decisions_match = re.search(r'## Decisions\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
            skills_match = re.search(r'## Skills\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
            verification_match = re.search(r'## Verification\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
            notes_match = re.search(r'## Notes\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
            
            # Extract duration
            duration_match = re.search(r'\*\*Duration\*\*:\s*~?(\d+)\s*minutes?', content)
            duration = int(duration_match.group(1)) if duration_match else 0
            
            logs.append({
                'file': log_file.name,
                'date': date_str,
                'time': time_str,
                'task': task_name,
                'duration': duration,
                'summary': summary_match.group(1).strip() if summary_match else '',
                'changes': changes_match.group(1).strip() if changes_match else '',
                'decisions': decisions_match.group(1).strip() if decisions_match else '',
                'skills': skills_match.group(1).strip() if skills_match else '',
                'verification': verification_match.group(1).strip() if verification_match else '',
                'notes': notes_match.group(1).strip() if notes_match else '',
                'full_content': content
            })
        except Exception as e:
            print(f"Warning: Failed to parse {log_file.name}: {e}")
            continue
    
    return logs


def extract_patterns(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract recurring patterns across sessions."""
    patterns = {
        'common_tasks': Counter(),
        'common_technologies': Counter(),
        'common_decisions': [],
        'skill_mentions': Counter(),
        'documentation_areas': Counter(),
        'file_types': Counter(),
        'error_types': Counter(),
    }
    
    for log in logs:
        task = log['task']
        summary = log['summary'].lower()
        changes = log['changes'].lower()
        decisions = log['decisions']
        skills = log['skills']
        
        # Task categories
        if 'ui' in task or 'frontend' in task or 'styling' in task:
            patterns['common_tasks']['frontend-ui'] += 1
        if 'api' in task or 'endpoint' in task or 'backend' in task:
            patterns['common_tasks']['backend-api'] += 1
        if 'docker' in task or 'deploy' in task or 'infrastructure' in task:
            patterns['common_tasks']['infrastructure'] += 1
        if 'fix' in task or 'bug' in task or 'error' in task:
            patterns['common_tasks']['bugfix'] += 1
        if 'test' in task:
            patterns['common_tasks']['testing'] += 1
        if 'akis' in task or 'workflow' in task or 'skill' in task:
            patterns['common_tasks']['framework-improvement'] += 1
        if 'refactor' in task:
            patterns['common_tasks']['refactoring'] += 1
        
        # Technologies mentioned
        tech_keywords = ['react', 'typescript', 'python', 'fastapi', 'docker', 
                        'nginx', 'postgres', 'redis', 'websocket', 'jwt']
        for tech in tech_keywords:
            if tech in summary or tech in changes:
                patterns['common_technologies'][tech] += 1
        
        # Skills mentioned
        skill_pattern = r'`([^`]+\.md)`'
        for match in re.finditer(skill_pattern, skills):
            skill_name = match.group(1)
            patterns['skill_mentions'][skill_name] += 1
        
        # Documentation areas
        doc_keywords = ['api', 'deployment', 'architecture', 'ui', 'testing', 'security']
        for keyword in doc_keywords:
            if keyword in summary or keyword in changes:
                patterns['documentation_areas'][keyword] += 1
        
        # File types modified
        file_patterns = [r'\.py\b', r'\.tsx?\b', r'\.jsx?\b', r'\.md\b', 
                        r'\.ya?ml\b', r'Dockerfile', r'\.json\b']
        for pattern in file_patterns:
            if re.search(pattern, changes):
                patterns['file_types'][pattern] += 1
        
        # Error/fix patterns
        error_keywords = ['404', '500', 'authentication', 'permission', 'cors', 
                         'timeout', 'connection', 'crash']
        for keyword in error_keywords:
            if keyword in summary or keyword in log['notes'].lower():
                patterns['error_types'][keyword] += 1
    
    return patterns


def identify_skill_candidates(logs: List[Dict[str, Any]], patterns: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Identify potential new skills based on recurring patterns."""
    candidates = []
    
    # Threshold: pattern appears in at least 3 sessions
    MIN_OCCURRENCES = 3
    
    # Check for patterns that could become skills
    task_counts = patterns['common_tasks']
    
    # Pattern: Multi-architecture builds
    multiarch_sessions = [log for log in logs if 'multiarch' in log['task'].lower() or 
                         'arm64' in log['full_content'].lower() or 
                         'amd64' in log['full_content'].lower()]
    if len(multiarch_sessions) >= 2:
        candidates.append({
            'name': 'multiarch-cicd',
            'title': 'Multi-Architecture CI/CD',
            'frequency': len(multiarch_sessions),
            'sessions': [s['file'] for s in multiarch_sessions],
            'description': 'Building and deploying Docker images for multiple architectures (amd64, arm64)',
            'priority': 'high' if len(multiarch_sessions) >= 3 else 'medium'
        })
    
    # Pattern: Workflow/AKIS improvements
    akis_sessions = [log for log in logs if 'akis' in log['task'].lower() or 
                    'workflow' in log['task'].lower() or 
                    'skill' in log['task'].lower()]
    if len(akis_sessions) >= MIN_OCCURRENCES:
        candidates.append({
            'name': 'akis-framework',
            'title': 'AKIS Framework Development',
            'frequency': len(akis_sessions),
            'sessions': [s['file'] for s in akis_sessions],
            'description': 'Improving and evolving the AKIS agent framework',
            'priority': 'medium'
        })
    
    # Pattern: UI/Styling standardization
    ui_sessions = [log for log in logs if 'ui' in log['task'].lower() or 
                  'styling' in log['task'].lower() or 
                  'component' in log['task'].lower()]
    if len(ui_sessions) >= MIN_OCCURRENCES:
        candidates.append({
            'name': 'ui-consistency',
            'title': 'UI Consistency & Component Design',
            'frequency': len(ui_sessions),
            'sessions': [s['file'] for s in ui_sessions],
            'description': 'Creating consistent UI components and design systems',
            'priority': 'high' if len(ui_sessions) >= 5 else 'medium'
        })
    
    # Pattern: Security/vulnerability scanning
    security_sessions = [log for log in logs if 'vuln' in log['task'].lower() or 
                        'security' in log['task'].lower() or 
                        'cve' in log['task'].lower()]
    if len(security_sessions) >= 2:
        candidates.append({
            'name': 'security-scanning',
            'title': 'Security & Vulnerability Scanning',
            'frequency': len(security_sessions),
            'sessions': [s['file'] for s in security_sessions],
            'description': 'Implementing and managing security scans, CVE checks, and vulnerability tracking',
            'priority': 'high'
        })
    
    return candidates


def analyze_documentation_needs(logs: List[Dict[str, Any]], patterns: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Analyze documentation that should be created or updated."""
    needs = []
    
    doc_areas = patterns['documentation_areas']
    
    # API documentation needs
    if doc_areas.get('api', 0) >= 3:
        needs.append({
            'area': 'API Documentation',
            'priority': 'high',
            'reason': f"API mentioned in {doc_areas['api']} sessions",
            'suggested_action': 'Create/update comprehensive API reference with all endpoints',
            'target_docs': ['docs/technical/API_rest_v1.md']
        })
    
    # Deployment documentation
    if doc_areas.get('deployment', 0) >= 2:
        needs.append({
            'area': 'Deployment Guide',
            'priority': 'high',
            'reason': f"Deployment mentioned in {doc_areas['deployment']} sessions",
            'suggested_action': 'Update deployment documentation with current Docker setup',
            'target_docs': ['docs/DEPLOYMENT.md', 'docs/DOCKER_REBUILD.md']
        })
    
    # Architecture documentation
    if doc_areas.get('architecture', 0) >= 2:
        needs.append({
            'area': 'Architecture Documentation',
            'priority': 'medium',
            'reason': f"Architecture changes in {doc_areas['architecture']} sessions",
            'suggested_action': 'Update architecture diagrams and system overview',
            'target_docs': ['docs/architecture/ARCH_system_v1.md']
        })
    
    # UI/UX documentation
    if doc_areas.get('ui', 0) >= 3:
        needs.append({
            'area': 'UI/UX Guidelines',
            'priority': 'medium',
            'reason': f"UI work in {doc_areas['ui']} sessions",
            'suggested_action': 'Document component library and design patterns',
            'target_docs': ['docs/design/UI_UX_SPEC.md']
        })
    
    return needs


def suggest_instruction_updates(logs: List[Dict[str, Any]], patterns: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Suggest updates to agent instructions based on patterns."""
    suggestions = []
    
    # Check if certain decisions are made frequently
    decision_keywords = defaultdict(int)
    for log in logs:
        decisions = log['decisions'].lower()
        if 'typescript' in decisions:
            decision_keywords['prefer-typescript'] += 1
        if 'component' in decisions and 'reusable' in decisions:
            decision_keywords['prefer-reusable-components'] += 1
        if 'docker' in decisions and ('hot' in decisions or 'reload' in decisions):
            decision_keywords['docker-hot-reload'] += 1
        if 'test' in decisions:
            decision_keywords['testing-required'] += 1
    
    for keyword, count in decision_keywords.items():
        if count >= 3:
            suggestions.append({
                'pattern': keyword,
                'frequency': count,
                'suggestion': f"Add guidance about {keyword.replace('-', ' ')} to instructions",
                'priority': 'medium' if count >= 5 else 'low'
            })
    
    return suggestions


def analyze_skill_usage(logs: List[Dict[str, Any]], patterns: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze how skills are being used across sessions."""
    skill_mentions = patterns['skill_mentions']
    
    analysis = {
        'most_used': skill_mentions.most_common(5),
        'rarely_used': [],
        'missing_patterns': []
    }
    
    # Find skills mentioned in less than 2 sessions
    total_sessions = len(logs)
    for skill, count in skill_mentions.items():
        if count < 2:
            analysis['rarely_used'].append({
                'skill': skill,
                'usage_count': count,
                'usage_percent': round(count / total_sessions * 100, 1)
            })
    
    return analysis


def generate_knowledge_updates(logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate knowledge updates based on session history."""
    updates = []
    
    # Identify commonly modified areas that should be tracked
    area_modifications = defaultdict(list)
    
    for log in logs:
        changes = log['changes']
        
        # Parse file modifications
        file_matches = re.finditer(r'`([^`]+\.[a-z]+)`', changes)
        for match in file_matches:
            file_path = match.group(1)
            parts = Path(file_path).parts
            
            if parts:
                area = parts[0]
                area_modifications[area].append(log['file'])
    
    # Suggest tracking areas modified in 5+ sessions
    for area, sessions in area_modifications.items():
        if len(sessions) >= 5:
            updates.append({
                'type': 'entity',
                'name': f'{area.capitalize()}.Module',
                'entityType': 'module',
                'reason': f'Modified in {len(sessions)} sessions',
                'sessions': sessions[:5],
                'suggested_observation': f'Frequently modified area across {len(sessions)} sessions'
            })
    
    return updates


def main():
    import sys
    
    # Parse arguments
    output_format = 'json'
    min_sessions = 1
    
    for i, arg in enumerate(sys.argv[1:]):
        if arg == '--output' and i + 2 < len(sys.argv):
            output_format = sys.argv[i + 2]
        elif arg == '--min-sessions' and i + 2 < len(sys.argv):
            min_sessions = int(sys.argv[i + 2])
    
    # Load workflow logs
    log_dir = Path('log/workflow')
    logs = load_workflow_logs(log_dir, min_sessions)
    
    if not logs:
        print(json.dumps({
            'error': 'No workflow logs found or minimum session count not met',
            'log_dir': str(log_dir),
            'min_sessions': min_sessions
        }))
        return 1
    
    print(f"📊 Analyzing {len(logs)} workflow sessions...\n", file=sys.stderr)
    
    # Perform analysis
    patterns = extract_patterns(logs)
    skill_candidates = identify_skill_candidates(logs, patterns)
    doc_needs = analyze_documentation_needs(logs, patterns)
    instruction_suggestions = suggest_instruction_updates(logs, patterns)
    skill_usage = analyze_skill_usage(logs, patterns)
    knowledge_updates = generate_knowledge_updates(logs)
    
    # Compile results
    analysis = {
        'metadata': {
            'analysis_date': datetime.now().isoformat(),
            'total_sessions': len(logs),
            'date_range': {
                'earliest': logs[0]['date'] if logs else None,
                'latest': logs[-1]['date'] if logs else None
            },
            'total_duration_minutes': sum(log['duration'] for log in logs)
        },
        'patterns': {
            'common_tasks': dict(patterns['common_tasks'].most_common(10)),
            'common_technologies': dict(patterns['common_technologies'].most_common(10)),
            'file_types': dict(patterns['file_types'].most_common()),
            'error_types': dict(patterns['error_types'].most_common())
        },
        'skills': {
            'candidates': skill_candidates,
            'usage_analysis': skill_usage,
            'recommendations': []
        },
        'documentation': {
            'needs': doc_needs,
            'priority_count': {
                'high': len([n for n in doc_needs if n['priority'] == 'high']),
                'medium': len([n for n in doc_needs if n['priority'] == 'medium']),
                'low': len([n for n in doc_needs if n['priority'] == 'low'])
            }
        },
        'instructions': {
            'suggestions': instruction_suggestions
        },
        'knowledge': {
            'suggested_updates': knowledge_updates
        }
    }
    
    # Add skill recommendations
    if skill_candidates:
        analysis['skills']['recommendations'].append({
            'action': 'create_skills',
            'count': len(skill_candidates),
            'priority': 'high',
            'reason': f'Found {len(skill_candidates)} recurring patterns that could become skills'
        })
    
    if skill_usage['rarely_used']:
        analysis['skills']['recommendations'].append({
            'action': 'review_unused_skills',
            'count': len(skill_usage['rarely_used']),
            'priority': 'low',
            'reason': 'Some skills are rarely used and may need improvement or removal'
        })
    
    # Output results
    if output_format == 'markdown':
        print(generate_markdown_report(analysis))
    else:
        print(json.dumps(analysis, indent=2))
    
    return 0


def generate_markdown_report(analysis: Dict[str, Any]) -> str:
    """Generate a markdown report from analysis results."""
    lines = []
    
    lines.append("# AKIS Workflow Analysis Report")
    lines.append("")
    lines.append(f"**Generated**: {analysis['metadata']['analysis_date']}")
    lines.append(f"**Sessions Analyzed**: {analysis['metadata']['total_sessions']}")
    lines.append(f"**Date Range**: {analysis['metadata']['date_range']['earliest']} to {analysis['metadata']['date_range']['latest']}")
    lines.append(f"**Total Duration**: {analysis['metadata']['total_duration_minutes']} minutes")
    lines.append("")
    
    lines.append("## Pattern Analysis")
    lines.append("")
    lines.append("### Common Task Types")
    for task, count in analysis['patterns']['common_tasks'].items():
        lines.append(f"- **{task}**: {count} sessions")
    lines.append("")
    
    lines.append("### Technologies Used")
    for tech, count in analysis['patterns']['common_technologies'].items():
        lines.append(f"- {tech}: {count} mentions")
    lines.append("")
    
    lines.append("## Skill Recommendations")
    lines.append("")
    
    candidates = analysis['skills']['candidates']
    if candidates:
        lines.append(f"### New Skill Candidates ({len(candidates)})")
        for candidate in candidates:
            lines.append(f"#### {candidate['title']} (`{candidate['name']}.md`)")
            lines.append(f"- **Priority**: {candidate['priority']}")
            lines.append(f"- **Frequency**: {candidate['frequency']} sessions")
            lines.append(f"- **Description**: {candidate['description']}")
            lines.append("")
    else:
        lines.append("*No new skill candidates identified*")
        lines.append("")
    
    lines.append("### Skill Usage Analysis")
    most_used = analysis['skills']['usage_analysis']['most_used']
    if most_used:
        lines.append("**Most Used Skills:**")
        for skill, count in most_used:
            lines.append(f"- {skill}: {count} sessions")
    lines.append("")
    
    lines.append("## Documentation Needs")
    lines.append("")
    
    needs = analysis['documentation']['needs']
    if needs:
        for need in sorted(needs, key=lambda x: 0 if x['priority'] == 'high' else 1):
            lines.append(f"### {need['area']} (Priority: {need['priority']})")
            lines.append(f"- **Reason**: {need['reason']}")
            lines.append(f"- **Action**: {need['suggested_action']}")
            lines.append(f"- **Target**: {', '.join(need['target_docs'])}")
            lines.append("")
    else:
        lines.append("*No documentation updates needed*")
        lines.append("")
    
    lines.append("## Instruction Updates")
    lines.append("")
    
    suggestions = analysis['instructions']['suggestions']
    if suggestions:
        for suggestion in suggestions:
            lines.append(f"- **{suggestion['pattern']}** ({suggestion['frequency']} occurrences): {suggestion['suggestion']}")
        lines.append("")
    else:
        lines.append("*No instruction updates suggested*")
        lines.append("")
    
    lines.append("## Knowledge Updates")
    lines.append("")
    
    updates = analysis['knowledge']['suggested_updates']
    if updates:
        for update in updates[:5]:  # Show top 5
            lines.append(f"### {update['name']}")
            lines.append(f"- **Type**: {update['type']}")
            lines.append(f"- **Reason**: {update['reason']}")
            lines.append(f"- **Observation**: {update['suggested_observation']}")
            lines.append("")
    else:
        lines.append("*No knowledge updates suggested*")
        lines.append("")
    
    return '\n'.join(lines)


if __name__ == '__main__':
    exit(main())
