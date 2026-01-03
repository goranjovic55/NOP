#!/usr/bin/env python3
"""
Analyze workflow logs to suggest skills for each workflow and identify universal skills.
"""

import os
import re
from pathlib import Path
from collections import Counter, defaultdict
from typing import Dict, List, Set, Tuple

WORKFLOW_DIR = Path("log/workflow")

# Workflow categories
CATEGORIES = {
    "frontend": ["ui", "frontend", "react", "component", "styling", "page"],
    "backend": ["backend", "api", "service", "endpoint", "fastapi"],
    "infrastructure": ["docker", "compose", "deployment", "resource", "network", "configuration"],
    "testing": ["test", "testing", "verification", "validation"],
    "framework": ["akis", "agent", "workflow", "ecosystem", "protocol", "skill"],
    "security": ["auth", "vulnerability", "cve", "security", "exploit"],
    "data": ["database", "model", "migration", "storage"],
}

# Skill patterns to look for
SKILL_PATTERNS = {
    "ui_optimization": ["space optimization", "ui improvement", "layout", "responsive", "styling"],
    "state_management": ["zustand", "store", "state", "persistence", "localstorage"],
    "api_integration": ["endpoint", "api call", "rest", "websocket", "streaming"],
    "error_handling": ["error", "exception", "validation", "retry", "fallback"],
    "docker_orchestration": ["docker-compose", "container", "volume", "network", "image"],
    "testing_strategy": ["test", "verify", "validation", "qa", "quality gate"],
    "git_workflow": ["commit", "branch", "merge", "pull request", "git"],
    "security_hardening": ["authentication", "authorization", "jwt", "encryption", "sanitization"],
    "performance_optimization": ["performance", "optimization", "cache", "async", "parallel"],
    "framework_design": ["protocol", "emission", "phase", "delegation", "pattern"],
    "knowledge_management": ["knowledge", "entity", "relation", "project_knowledge.json"],
    "code_review": ["review", "feedback", "refactor", "improvement"],
    "documentation": ["document", "readme", "guide", "instruction"],
    "debugging": ["debug", "fix", "bug", "issue", "problem"],
}


def read_workflow(file_path: Path) -> Dict:
    """Read and parse a workflow log file."""
    if not file_path.exists() or file_path.name in ["README.md"]:
        return None
    
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Extract title
        title_match = re.search(r'^#\s+(?:Workflow Log:\s*)?(.+?)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else file_path.stem
        
        # Extract summary
        summary_match = re.search(r'##\s+Summary\s*\n+(.+?)(?:\n##|\Z)', content, re.DOTALL)
        summary = summary_match.group(1).strip() if summary_match else ""
        
        # Extract files modified/created
        files_section = re.search(r'##\s+(?:Files?\s+(?:Modified|Created|Changed)|Changes).*?\n(.+?)(?:\n##|\Z)', content, re.DOTALL | re.IGNORECASE)
        files_modified = []
        if files_section:
            # Look for file paths
            file_matches = re.findall(r'[`\-]\s*([^\s`]+\.(?:tsx?|jsx?|py|md|ya?ml|json|sh|Dockerfile))', files_section.group(1))
            files_modified = list(set(file_matches))
        
        # Extract skills mentioned
        skills_mentioned = []
        skills_section = re.search(r'##\s+Skills.*?\n(.+?)(?:\n##|\Z)', content, re.DOTALL | re.IGNORECASE)
        if skills_section:
            skill_matches = re.findall(r'[#-]\s*(\d+)?\s*[:\-]?\s*([A-Za-z\s\-]+)', skills_section.group(1))
            skills_mentioned = [s[1].strip() for s in skill_matches if s[1].strip()]
        
        # Extract decisions
        decisions = []
        decision_matches = re.findall(r'\[DECISION[:\s]+([^\]]+)\]', content)
        decisions = [d.strip() for d in decision_matches]
        
        # Categorize workflow
        category = categorize_workflow(title.lower() + " " + summary.lower())
        
        # Detect skill patterns
        detected_skills = detect_skills(content.lower())
        
        return {
            "file": file_path.name,
            "title": title,
            "summary": summary[:200] + "..." if len(summary) > 200 else summary,
            "category": category,
            "files_modified": files_modified,
            "skills_mentioned": skills_mentioned,
            "detected_skills": detected_skills,
            "decisions": decisions[:3],  # First 3 decisions
            "word_count": len(content.split()),
        }
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None


def categorize_workflow(text: str) -> List[str]:
    """Categorize a workflow based on its content."""
    categories = []
    for category, keywords in CATEGORIES.items():
        if any(keyword in text for keyword in keywords):
            categories.append(category)
    return categories if categories else ["general"]


def detect_skills(text: str) -> List[str]:
    """Detect skill patterns in workflow content."""
    detected = []
    for skill, keywords in SKILL_PATTERNS.items():
        if any(keyword in text for keyword in keywords):
            detected.append(skill)
    return detected


def analyze_workflows() -> Tuple[List[Dict], Dict]:
    """Analyze all workflows and return results."""
    workflows = []
    
    for file_path in sorted(WORKFLOW_DIR.glob("*.md")):
        workflow = read_workflow(file_path)
        if workflow:
            workflows.append(workflow)
    
    # Calculate statistics
    stats = {
        "total_workflows": len(workflows),
        "by_category": Counter(),
        "skill_frequency": Counter(),
        "file_types": Counter(),
    }
    
    for wf in workflows:
        for cat in wf["category"]:
            stats["by_category"][cat] += 1
        for skill in wf["detected_skills"]:
            stats["skill_frequency"][skill] += 1
        for file in wf["files_modified"]:
            ext = Path(file).suffix
            stats["file_types"][ext] += 1
    
    return workflows, stats


def suggest_workflow_skills(workflow: Dict) -> List[str]:
    """Suggest specific skills for a workflow."""
    suggestions = []
    
    # Based on category
    category_skills = {
        "frontend": ["frontend-react", "ui-components", "state-management"],
        "backend": ["backend-api", "error-handling", "testing"],
        "infrastructure": ["infrastructure", "docker-orchestration"],
        "framework": ["framework-design", "knowledge-management", "documentation"],
        "security": ["security", "error-handling"],
    }
    
    for cat in workflow["category"]:
        if cat in category_skills:
            suggestions.extend(category_skills[cat])
    
    # Based on detected patterns
    pattern_skills = {
        "ui_optimization": "frontend-react",
        "state_management": "frontend-react",
        "api_integration": "backend-api",
        "docker_orchestration": "infrastructure",
        "framework_design": "git-workflow",
        "knowledge_management": "git-workflow",
        "error_handling": "error-handling",
        "testing_strategy": "testing",
    }
    
    for pattern in workflow["detected_skills"]:
        if pattern in pattern_skills:
            suggestions.append(pattern_skills[pattern])
    
    # Based on files modified
    for file in workflow["files_modified"]:
        if file.endswith(('.tsx', '.jsx')):
            suggestions.append("frontend-react")
        elif file.endswith('.py'):
            suggestions.append("backend-api")
        elif 'docker' in file.lower():
            suggestions.append("infrastructure")
        elif file.endswith('.md'):
            suggestions.append("git-workflow")
    
    return list(set(suggestions))  # Remove duplicates


def generate_report(workflows: List[Dict], stats: Dict) -> str:
    """Generate a comprehensive markdown report."""
    
    report = []
    report.append("# Workflow Analysis Report")
    report.append(f"\n**Date**: {Path().absolute()}")
    report.append(f"**Total Workflows Analyzed**: {stats['total_workflows']}")
    report.append("\n---\n")
    
    # Executive Summary
    report.append("## Executive Summary\n")
    report.append(f"Analyzed {stats['total_workflows']} workflow logs from the NOP project. ")
    report.append("Identified patterns across frontend, backend, infrastructure, and framework development.\n")
    
    # Category Breakdown
    report.append("\n## Workflows by Category\n")
    for cat, count in stats["by_category"].most_common():
        pct = (count / stats["total_workflows"]) * 100
        report.append(f"- **{cat.title()}**: {count} workflows ({pct:.1f}%)")
    
    # Top Skills Detected
    report.append("\n## Top Skill Patterns Detected\n")
    for skill, count in stats["skill_frequency"].most_common(10):
        pct = (count / stats["total_workflows"]) * 100
        report.append(f"- **{skill.replace('_', ' ').title()}**: {count} workflows ({pct:.1f}%)")
    
    # Universal Skills Summary
    report.append("\n## Universal Skills (Recommended for All Workflows)\n")
    universal_threshold = stats["total_workflows"] * 0.40  # 40% threshold
    universal_skills = []
    
    for skill, count in stats["skill_frequency"].most_common():
        if count >= universal_threshold:
            universal_skills.append(f"- **{skill.replace('_', ' ').title()}**: Used in {count}/{stats['total_workflows']} workflows ({(count/stats['total_workflows']*100):.1f}%)")
    
    if universal_skills:
        report.extend(universal_skills)
        report.append("\n**Recommendation**: These skills appear in 40%+ of workflows and should be available as universal skills.")
    else:
        report.append("\n*No skills met the 40% threshold for universal classification.*")
    
    # Individual Workflow Analysis
    report.append("\n---\n")
    report.append("## Individual Workflow Skill Suggestions\n")
    
    for wf in workflows:
        suggested = suggest_workflow_skills(wf)
        report.append(f"\n### {wf['title']}")
        report.append(f"**File**: `{wf['file']}`")
        report.append(f"**Category**: {', '.join(wf['category'])}")
        
        if wf['summary']:
            report.append(f"**Summary**: {wf['summary']}")
        
        if suggested:
            report.append(f"**Suggested Skills**: {', '.join(sorted(set(suggested)))}")
        else:
            report.append("**Suggested Skills**: git-workflow (general)")
        
        if wf['detected_skills']:
            report.append(f"**Patterns Detected**: {', '.join(wf['detected_skills'][:5])}")
    
    # Recommendations
    report.append("\n---\n")
    report.append("## Skill Development Recommendations\n")
    report.append("\n### High Priority (Create/Enhance)")
    
    high_priority = [skill for skill, count in stats["skill_frequency"].most_common(5)]
    for skill in high_priority:
        report.append(f"- **{skill.replace('_', ' ').title()}**: High usage pattern detected")
    
    report.append("\n### Existing Skills Alignment")
    existing_skills = ["backend-api", "error-handling", "frontend-react", "git-workflow", "infrastructure", "testing", "multiarch-cicd"]
    report.append(f"\nCurrently existing skills: {', '.join(existing_skills)}")
    report.append("\n**Note**: Many detected patterns align well with existing skills. ")
    report.append("Focus on documenting usage patterns within these skill files.")
    
    return "\n".join(report)


def main():
    """Main execution."""
    print("Analyzing workflows...")
    workflows, stats = analyze_workflows()
    
    print(f"\nAnalyzed {stats['total_workflows']} workflows")
    print(f"Categories: {dict(stats['by_category'])}")
    print(f"\nTop 5 skills: {stats['skill_frequency'].most_common(5)}")
    
    # Generate report
    report = generate_report(workflows, stats)
    
    # Save report
    output_file = Path("workflow_analysis_report.md")
    output_file.write_text(report)
    print(f"\nReport saved to: {output_file}")
    
    return 0


if __name__ == "__main__":
    exit(main())
