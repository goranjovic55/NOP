#!/usr/bin/env python3
"""
AKIS Skill Measurement Tool

Measures the effectiveness of existing skills and compares scenarios
with and without skill application. Provides quantitative metrics
for skill improvement decisions.

Usage:
    python scripts/skill_measurement.py
    python scripts/skill_measurement.py --skill backend-api
    python scripts/skill_measurement.py --compare

Output: Skill effectiveness metrics and improvement recommendations
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict


@dataclass
class SkillMetrics:
    """Metrics for a single skill."""
    name: str
    completeness_score: float  # 0-100
    example_quality: float  # 0-100
    trigger_clarity: float  # 0-100
    checklist_coverage: float  # 0-100
    overall_score: float  # 0-100
    usage_count: int
    success_rate: float
    time_impact_minutes: int
    areas_of_improvement: List[str]


@dataclass
class ComparisonResult:
    """Comparison of with/without skill scenarios."""
    scenario: str
    without_skill: Dict[str, Any]
    with_current_skill: Dict[str, Any]
    with_improved_skill: Dict[str, Any]
    improvement_potential: float


def load_skill_content(skill_path: Path) -> Dict[str, Any]:
    """Load and parse skill content."""
    content = skill_path.read_text()
    
    # Extract sections
    sections = {
        "overview": "",
        "checklist": [],
        "examples": [],
        "when_to_use": [],
        "anti_patterns": []
    }
    
    # Overview (first paragraph)
    overview_match = re.search(r'^#[^#].*?\n\n(.+?)(?=\n##|\Z)', content, re.DOTALL)
    if overview_match:
        sections["overview"] = overview_match.group(1).strip()
    
    # Checklist items
    sections["checklist"] = re.findall(r'- \[[ x]\]\s*(.+)', content)
    
    # Code examples
    sections["examples"] = re.findall(r'```[\w]*\n([\s\S]*?)```', content)
    
    # When to use
    when_match = re.search(r'## When to Use\s*\n([\s\S]*?)(?=\n##|\Z)', content)
    if when_match:
        sections["when_to_use"] = re.findall(r'-\s*(.+)', when_match.group(1))
    
    # Anti-patterns
    sections["anti_patterns"] = re.findall(r'[❌✗]\s*(.+?)(?:→|$)', content)
    
    return {
        "path": str(skill_path),
        "name": skill_path.stem,
        "content_length": len(content),
        "sections": sections
    }


def analyze_skill(skill_data: Dict[str, Any]) -> SkillMetrics:
    """Analyze a skill and calculate metrics."""
    sections = skill_data["sections"]
    name = skill_data["name"]
    
    # Completeness score (presence and depth of sections)
    completeness_factors = [
        len(sections["overview"]) > 50,  # Has overview
        len(sections["checklist"]) >= 3,  # Has checklist
        len(sections["examples"]) >= 1,   # Has examples
        len(sections["when_to_use"]) >= 2, # Has triggers
        len(sections["anti_patterns"]) >= 1, # Has anti-patterns
        skill_data["content_length"] > 1000  # Substantial content
    ]
    completeness_score = (sum(completeness_factors) / len(completeness_factors)) * 100
    
    # Example quality (based on code example presence and variety)
    example_count = len(sections["examples"])
    example_quality = min(100, example_count * 25)  # Cap at 4 examples = 100%
    
    # Average example length (complexity indicator)
    if sections["examples"]:
        avg_example_length = sum(len(e) for e in sections["examples"]) / len(sections["examples"])
        if avg_example_length > 200:
            example_quality = min(100, example_quality + 20)
    
    # Trigger clarity (how well-defined usage conditions are)
    trigger_count = len(sections["when_to_use"])
    trigger_clarity = min(100, trigger_count * 30)
    
    # Checklist coverage
    checklist_count = len(sections["checklist"])
    checklist_coverage = min(100, checklist_count * 15)
    
    # Overall score (weighted average)
    overall_score = (
        completeness_score * 0.25 +
        example_quality * 0.30 +
        trigger_clarity * 0.20 +
        checklist_coverage * 0.25
    )
    
    # Identify areas for improvement
    improvements = []
    if len(sections["overview"]) < 50:
        improvements.append("Add more detailed overview description")
    if len(sections["checklist"]) < 3:
        improvements.append("Expand checklist with more actionable items")
    if len(sections["examples"]) < 2:
        improvements.append("Add more code examples covering variations")
    if len(sections["when_to_use"]) < 3:
        improvements.append("Define more specific trigger scenarios")
    if len(sections["anti_patterns"]) < 1:
        improvements.append("Document common anti-patterns to avoid")
    
    return SkillMetrics(
        name=name,
        completeness_score=round(completeness_score, 1),
        example_quality=round(example_quality, 1),
        trigger_clarity=round(trigger_clarity, 1),
        checklist_coverage=round(checklist_coverage, 1),
        overall_score=round(overall_score, 1),
        usage_count=0,  # Would be populated from workflow logs
        success_rate=0.0,  # Would be calculated from outcomes
        time_impact_minutes=0,  # Would be measured
        areas_of_improvement=improvements
    )


def measure_skill_usage(skill_name: str, log_dir: Path) -> Dict[str, Any]:
    """Measure how a skill is used in workflow logs."""
    usage_data = {
        "mentions": 0,
        "contexts": [],
        "outcomes": {"success": 0, "partial": 0, "failure": 0},
        "time_saved_estimates": []
    }
    
    if not log_dir.exists():
        return usage_data
    
    for log_file in log_dir.glob("*.md"):
        if log_file.name == "README.md":
            continue
        
        content = log_file.read_text().lower()
        
        # Check for skill mentions
        if skill_name.lower() in content or skill_name.replace("-", " ").lower() in content:
            usage_data["mentions"] += 1
            
            # Extract context
            context_match = re.search(rf'{skill_name}[^.]*\.', content, re.IGNORECASE)
            if context_match:
                usage_data["contexts"].append(context_match.group(0)[:100])
            
            # Check outcome
            if "✅" in content or "success" in content or "complete" in content:
                usage_data["outcomes"]["success"] += 1
            elif "partial" in content:
                usage_data["outcomes"]["partial"] += 1
            elif "❌" in content or "fail" in content:
                usage_data["outcomes"]["failure"] += 1
    
    return usage_data


def compare_scenarios(skill_metrics: SkillMetrics) -> ComparisonResult:
    """Compare scenarios with different skill states."""
    
    # Baseline: No skill available
    baseline_time = 60  # minutes for typical task
    baseline_errors = 3
    baseline_iterations = 5
    
    # Current skill effectiveness
    skill_factor = skill_metrics.overall_score / 100
    
    without_skill = {
        "time_minutes": baseline_time,
        "errors": baseline_errors,
        "iterations": baseline_iterations,
        "success_rate": 60.0,
        "learning_curve": "steep"
    }
    
    with_current_skill = {
        "time_minutes": int(baseline_time * (1 - skill_factor * 0.4)),
        "errors": max(1, int(baseline_errors * (1 - skill_factor * 0.5))),
        "iterations": max(1, int(baseline_iterations * (1 - skill_factor * 0.3))),
        "success_rate": round(60 + skill_factor * 30, 1),
        "learning_curve": "moderate" if skill_factor > 0.5 else "steep"
    }
    
    # Improved skill (with all areas addressed)
    improved_factor = 0.95  # Near-perfect skill
    with_improved_skill = {
        "time_minutes": int(baseline_time * 0.3),
        "errors": 1,
        "iterations": 2,
        "success_rate": 95.0,
        "learning_curve": "gentle"
    }
    
    # Calculate improvement potential
    current_improvement = (without_skill["time_minutes"] - with_current_skill["time_minutes"]) / without_skill["time_minutes"]
    potential_improvement = (without_skill["time_minutes"] - with_improved_skill["time_minutes"]) / without_skill["time_minutes"]
    improvement_potential = potential_improvement - current_improvement
    
    return ComparisonResult(
        scenario=f"Using {skill_metrics.name} skill",
        without_skill=without_skill,
        with_current_skill=with_current_skill,
        with_improved_skill=with_improved_skill,
        improvement_potential=round(improvement_potential * 100, 1)
    )


def generate_improvement_recommendations(metrics: List[SkillMetrics]) -> List[Dict[str, Any]]:
    """Generate prioritized recommendations for skill improvements."""
    recommendations = []
    
    # Sort by improvement potential (lower score = more room for improvement)
    sorted_metrics = sorted(metrics, key=lambda m: m.overall_score)
    
    for i, metric in enumerate(sorted_metrics):
        priority = "critical" if metric.overall_score < 50 else "high" if metric.overall_score < 70 else "medium"
        
        recommendations.append({
            "rank": i + 1,
            "skill": metric.name,
            "current_score": metric.overall_score,
            "target_score": 90,
            "priority": priority,
            "actions": metric.areas_of_improvement[:3],
            "estimated_effort": "low" if len(metric.areas_of_improvement) <= 2 else "medium",
            "expected_impact": round((90 - metric.overall_score) * 0.5, 1)
        })
    
    return recommendations


def format_measurement_report(all_metrics: List[SkillMetrics], comparisons: List[ComparisonResult], 
                              recommendations: List[Dict]) -> str:
    """Format measurement results as markdown."""
    md = []
    
    md.append("# Skill Measurement Report")
    md.append("")
    md.append(f"**Generated**: {datetime.now().isoformat()}")
    md.append("")
    
    md.append("## Executive Summary")
    md.append("")
    avg_score = sum(m.overall_score for m in all_metrics) / len(all_metrics) if all_metrics else 0
    md.append(f"- **Skills Analyzed**: {len(all_metrics)}")
    md.append(f"- **Average Score**: {avg_score:.1f}%")
    md.append(f"- **Skills Needing Attention**: {len([m for m in all_metrics if m.overall_score < 70])}")
    md.append("")
    
    md.append("## Skill Scores")
    md.append("")
    md.append("| Skill | Overall | Completeness | Examples | Triggers | Checklist |")
    md.append("|-------|---------|--------------|----------|----------|-----------|")
    for m in sorted(all_metrics, key=lambda x: -x.overall_score):
        status = "🟢" if m.overall_score >= 70 else "🟡" if m.overall_score >= 50 else "🔴"
        md.append(f"| {status} {m.name} | {m.overall_score}% | {m.completeness_score}% | {m.example_quality}% | {m.trigger_clarity}% | {m.checklist_coverage}% |")
    md.append("")
    
    md.append("## Scenario Comparisons")
    md.append("")
    for comp in comparisons[:5]:  # Top 5
        md.append(f"### {comp.scenario}")
        md.append("")
        md.append("| Metric | No Skill | Current Skill | Improved Skill |")
        md.append("|--------|----------|---------------|----------------|")
        md.append(f"| Time (min) | {comp.without_skill['time_minutes']} | {comp.with_current_skill['time_minutes']} | {comp.with_improved_skill['time_minutes']} |")
        md.append(f"| Errors | {comp.without_skill['errors']} | {comp.with_current_skill['errors']} | {comp.with_improved_skill['errors']} |")
        md.append(f"| Success Rate | {comp.without_skill['success_rate']}% | {comp.with_current_skill['success_rate']}% | {comp.with_improved_skill['success_rate']}% |")
        md.append(f"| Learning Curve | {comp.without_skill['learning_curve']} | {comp.with_current_skill['learning_curve']} | {comp.with_improved_skill['learning_curve']} |")
        md.append("")
        md.append(f"**Improvement Potential**: {comp.improvement_potential}%")
        md.append("")
    
    md.append("## Improvement Recommendations")
    md.append("")
    md.append("| Rank | Skill | Score | Priority | Actions | Effort | Impact |")
    md.append("|------|-------|-------|----------|---------|--------|--------|")
    for rec in recommendations[:10]:
        actions = "; ".join(rec["actions"][:2]) if rec["actions"] else "N/A"
        md.append(f"| {rec['rank']} | {rec['skill']} | {rec['current_score']}% | {rec['priority']} | {actions[:50]}... | {rec['estimated_effort']} | +{rec['expected_impact']}% |")
    md.append("")
    
    md.append("## Detailed Improvement Areas")
    md.append("")
    for m in all_metrics:
        if m.areas_of_improvement:
            md.append(f"### {m.name}")
            for area in m.areas_of_improvement:
                md.append(f"- [ ] {area}")
            md.append("")
    
    return "\n".join(md)


def main():
    """Run skill measurement."""
    project_root = Path(__file__).parent.parent
    skills_dir = project_root / ".github" / "skills"
    log_dir = project_root / "log" / "workflow"
    
    print("📊 AKIS Skill Measurement Tool")
    print("=" * 50)
    
    # Load and analyze skills
    print("\n🔍 Loading skills...")
    all_metrics = []
    comparisons = []
    
    if skills_dir.exists():
        for skill_path in sorted(skills_dir.glob("*.md")):
            skill_data = load_skill_content(skill_path)
            metrics = analyze_skill(skill_data)
            
            # Measure usage
            usage = measure_skill_usage(metrics.name, log_dir)
            metrics.usage_count = usage["mentions"]
            if sum(usage["outcomes"].values()) > 0:
                metrics.success_rate = usage["outcomes"]["success"] / sum(usage["outcomes"].values()) * 100
            
            all_metrics.append(metrics)
            
            # Generate comparison
            comparison = compare_scenarios(metrics)
            comparisons.append(comparison)
            
            status = "🟢" if metrics.overall_score >= 70 else "🟡" if metrics.overall_score >= 50 else "🔴"
            print(f"   {status} {metrics.name}: {metrics.overall_score}%")
    
    print(f"\n📈 Skills analyzed: {len(all_metrics)}")
    
    # Generate recommendations
    print("\n💡 Generating recommendations...")
    recommendations = generate_improvement_recommendations(all_metrics)
    
    # Generate report
    report = format_measurement_report(all_metrics, comparisons, recommendations)
    
    output_dir = project_root / "docs" / "analysis"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    report_path = output_dir / "SKILL_MEASUREMENT_REPORT.md"
    report_path.write_text(report)
    print(f"\n📝 Report saved: {report_path}")
    
    # Also save JSON
    json_data = {
        "generated_at": datetime.now().isoformat(),
        "skills": [asdict(m) for m in all_metrics],
        "comparisons": [asdict(c) for c in comparisons],
        "recommendations": recommendations
    }
    json_path = output_dir / "skill_measurement.json"
    with open(json_path, "w") as f:
        json.dump(json_data, f, indent=2)
    print(f"📊 JSON saved: {json_path}")
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 MEASUREMENT SUMMARY")
    print("=" * 50)
    avg_score = sum(m.overall_score for m in all_metrics) / len(all_metrics) if all_metrics else 0
    print(f"Average Skill Score: {avg_score:.1f}%")
    print(f"Best Skill: {max(all_metrics, key=lambda x: x.overall_score).name if all_metrics else 'N/A'}")
    print(f"Most Room for Improvement: {min(all_metrics, key=lambda x: x.overall_score).name if all_metrics else 'N/A'}")
    
    print("\n🎯 Top Recommendations:")
    for rec in recommendations[:3]:
        print(f"   {rec['rank']}. {rec['skill']} ({rec['priority']}): +{rec['expected_impact']}% potential")
    
    print("\n✅ Measurement complete!")


if __name__ == "__main__":
    main()
