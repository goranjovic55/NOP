#!/usr/bin/env python3
"""
Test suggest_skill.py against ALL workflow logs.

Analyzes what NEW skills would be suggested across all historical sessions.
Goal: Find patterns that would give us an edge in future similar sessions.
"""

import json
import re
from pathlib import Path
from collections import defaultdict
from typing import List, Dict, Any, Set


def extract_workflow_data(workflow_path: Path) -> Dict[str, Any]:
    """Extract relevant data from a workflow log."""
    content = workflow_path.read_text()
    
    # Extract session type from filename or content
    filename = workflow_path.stem
    session_type = 'feature'
    if 'fix' in filename.lower() or 'bug' in filename.lower():
        session_type = 'bugfix'
    elif 'debug' in filename.lower():
        session_type = 'debug'
    elif 'doc' in filename.lower():
        session_type = 'docs'
    elif 'refactor' in filename.lower():
        session_type = 'refactor'
    
    # Extract files modified
    files = []
    files_section = re.search(r'## Files Modified\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if files_section:
        for line in files_section.group(1).split('\n'):
            match = re.search(r'\|\s*`?([^|`]+)`?\s*\|', line)
            if match and not match.group(1).strip().startswith('File'):
                files.append(match.group(1).strip())
    
    # Extract skills used
    skills_used = set()
    skills_section = re.search(r'## Skills Used\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if skills_section:
        for line in skills_section.group(1).split('\n'):
            match = re.search(r'\.github/skills/([^/]+)/', line)
            if match:
                skills_used.add(match.group(1))
    
    # Extract summary
    summary = ''
    summary_section = re.search(r'## Summary\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if summary_section:
        summary = summary_section.group(1).strip()
    
    # Extract technologies from content
    technologies = set()
    tech_patterns = {
        'react': r'\breact\b',
        'fastapi': r'\bfastapi\b',
        'docker': r'\bdocker\b',
        'sqlalchemy': r'\bsqlalchemy\b',
        'websocket': r'\bwebsocket\b',
        'typescript': r'\btypescript\b',
        'python': r'\.py\b',
        'alembic': r'\balembic\b',
        'scapy': r'\bscapy\b',
        'pytest': r'\bpytest\b',
    }
    content_lower = content.lower()
    for tech, pattern in tech_patterns.items():
        if re.search(pattern, content_lower):
            technologies.add(tech)
    
    return {
        'file': workflow_path.name,
        'session_type': session_type,
        'files': files,
        'skills_used': list(skills_used),
        'technologies': list(technologies),
        'summary': summary[:200],
        'content': content,
    }


def detect_existing_skills(workflow_data: Dict) -> List[Dict]:
    """Detect which existing skills would help."""
    EXISTING_SKILL_TRIGGERS = {
        'frontend-react': {
            'file_patterns': [r'\.tsx$', r'\.jsx$', r'frontend/', r'components/', r'pages/'],
            'patterns': ['react', 'component', 'frontend', 'ui', 'page', 'hook', 'state'],
        },
        'backend-api': {
            'file_patterns': [r'\.py$', r'backend/', r'api/', r'endpoints/', r'services/'],
            'patterns': ['fastapi', 'api', 'endpoint', 'backend', 'service', 'sqlalchemy', 'database', 'model', 'websocket'],
        },
        'docker': {
            'file_patterns': [r'Dockerfile', r'docker-compose.*\.yml$'],
            'patterns': ['docker', 'container', 'compose'],
        },
        'debugging': {
            'file_patterns': [],
            'patterns': ['fix', 'bug', 'error', 'debug', 'issue', 'traceback'],
        },
        'testing': {
            'file_patterns': [r'test_.*\.py$', r'.*_test\.py$', r'tests/'],
            'patterns': ['test', 'pytest', 'assert', 'mock'],
        },
        'documentation': {
            'file_patterns': [r'\.md$', r'docs/', r'README'],
            'patterns': ['doc', 'readme', 'documentation'],
        },
    }
    
    detected = []
    all_text = (workflow_data['summary'] + ' ' + workflow_data['content']).lower()
    files = workflow_data['files']
    
    for skill_name, triggers in EXISTING_SKILL_TRIGGERS.items():
        score = 0
        
        for pattern in triggers.get('file_patterns', []):
            for f in files:
                if re.search(pattern, f, re.IGNORECASE):
                    score += 2
                    break
        
        for pattern in triggers.get('patterns', []):
            if pattern in all_text:
                score += 1
        
        if score >= 2:
            detected.append({'skill': skill_name, 'score': score})
    
    return detected


def analyze_skill_gaps(workflow_data: Dict, detected_skills: List[Dict]) -> List[str]:
    """Identify patterns NOT covered by existing skills."""
    gaps = []
    content = workflow_data['content'].lower()
    
    # Patterns that might need new skills
    gap_patterns = {
        'websocket-lifecycle': ['websocket', 'accept', 'finally', 'cleanup', 'send_text'],
        'database-migration': ['alembic', 'migration', 'revision', 'upgrade', 'downgrade'],
        'network-capture': ['scapy', 'packet', 'sniff', 'sniffer', 'capture'],
        'authentication': ['jwt', 'token', 'auth', 'login', 'oauth', 'bearer'],
        'state-management': ['zustand', 'redux', 'store', 'useStore', 'state'],
        'performance': ['cache', 'memoization', 'lazy', 'suspense', 'optimize'],
        'error-handling': ['exception', 'try', 'except', 'error boundary', 'catch'],
        'logging': ['logger', 'logging', 'log level', 'debug', 'info'],
        'ci-cd': ['workflow', 'github actions', 'deploy', 'pipeline'],
        'api-versioning': ['v1', 'v2', 'api version', 'router', 'prefix'],
    }
    
    detected_skill_names = {s['skill'] for s in detected_skills}
    
    for gap_name, patterns in gap_patterns.items():
        match_count = sum(1 for p in patterns if p in content)
        if match_count >= 2:
            # Check if existing skill covers this
            if gap_name.startswith('websocket') and 'backend-api' in detected_skill_names:
                continue  # Covered by backend-api
            if gap_name.startswith('database') and 'backend-api' in detected_skill_names:
                continue  # Could be covered by backend-api
            if gap_name.startswith('network') and 'backend-api' in detected_skill_names:
                continue  # Covered by backend-api
            if gap_name.startswith('error') and 'debugging' in detected_skill_names:
                continue  # Covered by debugging
                
            gaps.append(gap_name)
    
    return gaps


def main():
    log_dir = Path('log/workflow')
    workflows = sorted(log_dir.glob('*.md'))
    
    print(f"📊 Analyzing {len(workflows)} workflow logs...")
    print("=" * 60)
    
    all_gaps = defaultdict(list)
    skill_detection_stats = defaultdict(int)
    session_types = defaultdict(int)
    
    for workflow_path in workflows:
        data = extract_workflow_data(workflow_path)
        session_types[data['session_type']] += 1
        
        # Detect existing skills
        detected = detect_existing_skills(data)
        for skill in detected:
            skill_detection_stats[skill['skill']] += 1
        
        # Find gaps
        gaps = analyze_skill_gaps(data, detected)
        for gap in gaps:
            all_gaps[gap].append(data['file'])
    
    print("\n📈 Existing Skill Detection Frequency:")
    print("-" * 40)
    for skill, count in sorted(skill_detection_stats.items(), key=lambda x: -x[1]):
        pct = count / len(workflows) * 100
        print(f"   {skill:20} {count:3} workflows ({pct:.1f}%)")
    
    print("\n📊 Session Types:")
    print("-" * 40)
    for stype, count in sorted(session_types.items(), key=lambda x: -x[1]):
        pct = count / len(workflows) * 100
        print(f"   {stype:15} {count:3} ({pct:.1f}%)")
    
    print("\n🔍 Pattern Gaps (potential NEW skills):")
    print("-" * 40)
    
    # Filter gaps that appear in at least 5 workflows
    significant_gaps = {k: v for k, v in all_gaps.items() if len(v) >= 3}
    
    if significant_gaps:
        for gap, examples in sorted(significant_gaps.items(), key=lambda x: -len(x[1])):
            print(f"\n   {gap}: {len(examples)} workflows")
            for ex in examples[:3]:
                print(f"      - {ex}")
    else:
        print("   ✅ No significant gaps found - existing skills cover patterns well!")
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)
    print(f"   Workflows analyzed: {len(workflows)}")
    print(f"   Existing skills detected: {len(skill_detection_stats)}")
    print(f"   Potential new skills needed: {len(significant_gaps)}")
    
    if significant_gaps:
        print(f"\n   🎯 Top NEW skill candidates:")
        for gap in sorted(significant_gaps.keys(), key=lambda x: -len(significant_gaps[x]))[:3]:
            count = len(significant_gaps[gap])
            pct = count / len(workflows) * 100
            print(f"      - {gap}: would help {count} workflows ({pct:.1f}%)")
    
    return significant_gaps


if __name__ == '__main__':
    gaps = main()
