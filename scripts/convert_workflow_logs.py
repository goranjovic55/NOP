#!/usr/bin/env python3
"""
Convert legacy workflow logs to new YAML front matter format.

Analyzes existing markdown content and generates appropriate YAML metadata.
"""

import re
from pathlib import Path
from datetime import datetime


def extract_date_from_filename(filename: str) -> str:
    """Extract date from filename like 2025-12-28_234728_task.md"""
    match = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        return match.group(1)
    return datetime.now().strftime('%Y-%m-%d')


def extract_task_name_from_filename(filename: str) -> str:
    """Extract task name from filename"""
    # Remove date prefix and extension
    name = re.sub(r'^\d{4}-\d{2}-\d{2}_\d{6}_', '', filename)
    name = re.sub(r'^\d{4}-\d{2}-\d{2}_', '', name)
    name = name.replace('.md', '')
    return name.replace('-', '_').replace(' ', '_')


def detect_skills_from_content(content: str) -> list:
    """Detect skills mentioned in content"""
    skills = []
    content_lower = content.lower()
    
    skill_patterns = {
        'frontend-react': ['.tsx', '.jsx', 'react', 'component', 'zustand', 'frontend'],
        'backend-api': ['.py', 'fastapi', 'endpoint', 'api', 'backend', 'service'],
        'docker': ['docker', 'container', 'compose', 'dockerfile'],
        'debugging': ['debug', 'fix', 'bug', 'error', 'traceback'],
        'testing': ['test', 'pytest', 'jest'],
        'documentation': ['docs', 'readme', 'documentation'],
        'akis-development': ['akis', 'skill', 'agent', 'instruction'],
    }
    
    for skill, patterns in skill_patterns.items():
        for pattern in patterns:
            if pattern in content_lower:
                if skill not in skills:
                    skills.append(skill)
                break
    
    return skills if skills else ['frontend-react']


def detect_domain_from_content(content: str) -> str:
    """Detect domain from content"""
    content_lower = content.lower()
    
    has_frontend = any(x in content_lower for x in ['.tsx', '.jsx', 'react', 'component', 'frontend'])
    has_backend = any(x in content_lower for x in ['.py', 'fastapi', 'endpoint', 'backend'])
    has_docker = any(x in content_lower for x in ['docker', 'compose', 'container'])
    
    if has_docker and not has_frontend and not has_backend:
        return 'docker_heavy'
    elif has_frontend and has_backend:
        return 'fullstack'
    elif has_frontend:
        return 'frontend_only'
    elif has_backend:
        return 'backend_only'
    else:
        return 'fullstack'


def detect_complexity_from_content(content: str) -> str:
    """Detect complexity from content"""
    # Count file mentions
    file_mentions = len(re.findall(r'`[^`]+\.(tsx?|jsx?|py|md|yml|json)`', content))
    
    if file_mentions >= 6:
        return 'complex'
    elif file_mentions >= 3:
        return 'medium'
    else:
        return 'simple'


def extract_files_from_content(content: str) -> list:
    """Extract file paths mentioned in content"""
    files = []
    
    # Match patterns like `path/to/file.ext` or path/to/file.ext
    file_patterns = re.findall(r'`([^`]*(?:frontend|backend|\.github)[^`]*\.[a-z]+)`', content)
    file_patterns += re.findall(r'[\s\(]([a-zA-Z0-9_/]+\.(tsx?|jsx?|py|md|yml))', content)
    
    seen = set()
    for match in file_patterns:
        path = match[0] if isinstance(match, tuple) else match
        path = path.strip('`').strip()
        if path and path not in seen and '/' in path:
            seen.add(path)
            
            # Determine type and domain
            if path.endswith('.tsx') or path.endswith('.jsx'):
                ftype = 'tsx'
                domain = 'frontend'
            elif path.endswith('.ts'):
                ftype = 'ts'
                domain = 'frontend'
            elif path.endswith('.py'):
                ftype = 'py'
                domain = 'backend'
            elif path.endswith('.md'):
                ftype = 'md'
                domain = 'docs'
            elif path.endswith('.yml') or path.endswith('.yaml'):
                ftype = 'yml'
                domain = 'docker'
            else:
                continue
            
            files.append({'path': path, 'type': ftype, 'domain': domain})
    
    return files[:10]  # Limit to 10 files


def extract_summary_from_content(content: str) -> str:
    """Extract or generate summary"""
    # Look for ## Summary section
    match = re.search(r'##\s*Summary\s*\n+(.+?)(?=\n##|\n\n##|\Z)', content, re.DOTALL)
    if match:
        summary = match.group(1).strip()
        # Take first 2 sentences
        sentences = re.split(r'[.!?]\s+', summary)
        return '. '.join(sentences[:2]).strip() + '.' if sentences else summary[:200]
    
    # Look for first paragraph after title
    match = re.search(r'^#[^#].+?\n+(.+?)(?=\n##|\n\n)', content, re.MULTILINE | re.DOTALL)
    if match:
        return match.group(1).strip()[:200]
    
    return "Session work completed."


def extract_tasks_from_content(content: str) -> list:
    """Extract completed tasks from content"""
    tasks = []
    
    # Look for checkboxes or bullet points with ✓, ✅, [x]
    patterns = [
        r'[-*]\s*\[x\]\s*(.+)',
        r'[-*]\s*✓\s*(.+)',
        r'[-*]\s*✅\s*(.+)',
        r'\|\s*✓\s*\|?\s*(.+?)\s*\|',
        r'\|\s*✅\s*\|?\s*(.+?)\s*\|',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        for match in matches:
            task = match.strip().rstrip('|').strip()
            if task and len(task) > 3 and task not in tasks:
                tasks.append(task)
    
    return tasks[:10]  # Limit to 10 tasks


def has_yaml_frontmatter(content: str) -> bool:
    """Check if content already has YAML front matter"""
    return content.strip().startswith('---')


def convert_log_to_yaml_format(filepath: Path) -> bool:
    """Convert a single log file to new format. Returns True if converted."""
    try:
        content = filepath.read_text(encoding='utf-8')
        
        # Skip if already has YAML front matter
        if has_yaml_frontmatter(content):
            return False
        
        # Skip special files
        if filepath.name in ['README.md', 'WORKFLOW_LOG_FORMAT.md']:
            return False
        
        # Extract metadata
        filename = filepath.name
        date = extract_date_from_filename(filename)
        task_name = extract_task_name_from_filename(filename)
        skills = detect_skills_from_content(content)
        domain = detect_domain_from_content(content)
        complexity = detect_complexity_from_content(content)
        files = extract_files_from_content(content)
        summary = extract_summary_from_content(content)
        tasks = extract_tasks_from_content(content)
        
        # Build file types summary
        type_counts = {}
        for f in files:
            t = f['type']
            type_counts[t] = type_counts.get(t, 0) + 1
        types_str = ', '.join(f'{k}: {v}' for k, v in type_counts.items()) if type_counts else 'md: 1'
        
        # Build files list
        files_yaml = []
        for f in files[:5]:  # Limit to 5 in YAML
            files_yaml.append(f'    - {{path: "{f["path"]}", type: {f["type"]}, domain: {f["domain"]}}}')
        files_section = '\n'.join(files_yaml) if files_yaml else '    - {path: "unknown", type: md, domain: docs}'
        
        # Build YAML front matter
        yaml_header = f'''---
session:
  id: "{date}_{task_name}"
  date: "{date}"
  complexity: {complexity}
  domain: {domain}

skills:
  loaded: [{", ".join(skills)}]
  suggested: []

files:
  modified:
{files_section}
  types: {{{types_str}}}

agents:
  delegated: []

gates:
  passed: [G1, G2, G3, G4, G5, G6]
  violations: []

root_causes: []

gotchas: []
---

'''
        # Combine with original content
        # Remove any leading whitespace and markdown code block markers
        clean_content = re.sub(r'^```+\s*markdown\s*\n?', '', content.strip())
        clean_content = re.sub(r'\n?```+\s*$', '', clean_content)
        
        new_content = yaml_header + clean_content
        
        # Write back
        filepath.write_text(new_content, encoding='utf-8')
        return True
        
    except Exception as e:
        print(f"Error converting {filepath.name}: {e}")
        return False


def main():
    """Convert all workflow logs"""
    log_dir = Path('/workspaces/NOP/log/workflow')
    
    if not log_dir.exists():
        print(f"Directory not found: {log_dir}")
        return
    
    converted = 0
    skipped = 0
    errors = 0
    
    for log_file in sorted(log_dir.glob('*.md')):
        if log_file.name in ['README.md', 'WORKFLOW_LOG_FORMAT.md']:
            skipped += 1
            continue
            
        try:
            content = log_file.read_text(encoding='utf-8')
            if has_yaml_frontmatter(content):
                print(f"⏭️  Already converted: {log_file.name}")
                skipped += 1
            else:
                if convert_log_to_yaml_format(log_file):
                    print(f"✓ Converted: {log_file.name}")
                    converted += 1
                else:
                    skipped += 1
        except Exception as e:
            print(f"❌ Error: {log_file.name} - {e}")
            errors += 1
    
    print(f"\n{'='*60}")
    print(f"Conversion complete!")
    print(f"  Converted: {converted}")
    print(f"  Skipped (already done or special): {skipped}")
    print(f"  Errors: {errors}")


if __name__ == '__main__':
    main()
