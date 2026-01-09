#!/usr/bin/env python3
"""
AKIS Grounded Skill Discovery v2.0

Simulates 100k scenarios GROUNDED in real workflow logs from the project.
Extracts actual patterns from workflow logs and generates variations.

Key principles:
1. Patterns come FROM workflow logs, not synthetic
2. Skills should be PROJECT-AGNOSTIC (reusable across any project)
3. Prefer merging into existing skills over creating new
4. New skills must merge 3+ detected patterns into 1
5. Maximum 1 new skill per analysis

Usage:
    python .github/scripts/simulate_grounded_skills.py --sessions 100000
"""

import json
import random
import re
from collections import defaultdict, Counter
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Set, Optional, Tuple
from pathlib import Path
from datetime import datetime
import argparse


@dataclass
class WorkflowPattern:
    """A pattern extracted from a real workflow log."""
    workflow_file: str
    session_type: str  # feature, bugfix, refactor, debug, config, docs
    technologies: Set[str]
    file_types: Set[str]  # .py, .tsx, .yml, .md
    skills_used: Set[str]
    problems_encountered: List[str]
    gotchas: List[str]
    complexity: str  # simple, medium, complex
    task_count: int
    duration_minutes: int
    changes_summary: str


@dataclass
class SimulatedScenario:
    """A scenario generated from workflow patterns with variations."""
    id: int
    base_pattern: str  # Source workflow
    scenario_type: str
    technologies: Set[str]
    file_types: Set[str]
    skills_expected: Set[str]  # Ground truth from actual usage
    problems: Set[str]
    complexity: str
    has_debugging: bool
    has_docker: bool
    has_frontend: bool
    has_backend: bool


class WorkflowAnalyzer:
    """Analyzes real workflow logs to extract patterns."""
    
    def __init__(self, workflow_dir: str = "log/workflow"):
        self.workflow_dir = Path(workflow_dir)
        self.patterns: List[WorkflowPattern] = []
        self.tech_frequency = Counter()
        self.skill_frequency = Counter()
        self.problem_frequency = Counter()
        self.session_types = Counter()
        
    def analyze_all_workflows(self) -> List[WorkflowPattern]:
        """Read and analyze all workflow logs."""
        if not self.workflow_dir.exists():
            print(f"❌ Workflow directory not found: {self.workflow_dir}")
            return []
        
        workflow_files = list(self.workflow_dir.glob("*.md"))
        print(f"📂 Found {len(workflow_files)} workflow logs")
        
        for wf in workflow_files:
            try:
                pattern = self._analyze_workflow(wf)
                if pattern:
                    self.patterns.append(pattern)
                    
                    # Track frequencies
                    for tech in pattern.technologies:
                        self.tech_frequency[tech] += 1
                    for skill in pattern.skills_used:
                        self.skill_frequency[skill] += 1
                    for problem in pattern.problems_encountered:
                        self.problem_frequency[problem] += 1
                    self.session_types[pattern.session_type] += 1
            except Exception as e:
                print(f"  ⚠️ Error parsing {wf.name}: {e}")
        
        print(f"✅ Extracted {len(self.patterns)} patterns from workflow logs")
        return self.patterns
    
    def _analyze_workflow(self, wf_path: Path) -> Optional[WorkflowPattern]:
        """Analyze a single workflow log."""
        content = wf_path.read_text()
        
        # Extract session type from filename or content
        session_type = self._detect_session_type(wf_path.name, content)
        
        # Extract technologies mentioned
        technologies = self._extract_technologies(content)
        
        # Extract file types from "Files Modified" section
        file_types = self._extract_file_types(content)
        
        # Extract skills used
        skills = self._extract_skills(content)
        
        # Extract problems/gotchas
        problems = self._extract_problems(content)
        gotchas = self._extract_gotchas(content)
        
        # Extract complexity and task count
        complexity, task_count = self._extract_complexity(content)
        
        # Extract duration
        duration = self._extract_duration(content)
        
        # Extract summary
        summary_match = re.search(r'## Summary\s*\n+(.+?)(?=\n##|\Z)', content, re.DOTALL)
        summary = summary_match.group(1).strip()[:200] if summary_match else ""
        
        if not technologies and not skills:
            return None  # Skip empty/malformed logs
        
        return WorkflowPattern(
            workflow_file=wf_path.name,
            session_type=session_type,
            technologies=technologies,
            file_types=file_types,
            skills_used=skills,
            problems_encountered=problems,
            gotchas=gotchas,
            complexity=complexity,
            task_count=task_count,
            duration_minutes=duration,
            changes_summary=summary
        )
    
    def _detect_session_type(self, filename: str, content: str) -> str:
        """Detect session type from filename and content."""
        filename_lower = filename.lower()
        content_lower = content.lower()
        
        if any(kw in filename_lower for kw in ['fix', 'bug', 'hotfix', 'patch']):
            return 'bugfix'
        if any(kw in filename_lower for kw in ['refactor', 'cleanup', 'optimization']):
            return 'refactor'
        if any(kw in filename_lower for kw in ['doc', 'readme', 'guide']):
            return 'docs'
        if any(kw in filename_lower for kw in ['config', 'deploy', 'docker']):
            return 'config'
        if any(kw in filename_lower for kw in ['test', 'verify', 'validation']):
            return 'testing'
        if 'debug' in content_lower or 'traceback' in content_lower:
            return 'debug'
        return 'feature'  # Default
    
    def _extract_technologies(self, content: str) -> Set[str]:
        """Extract technologies mentioned in workflow."""
        techs = set()
        content_lower = content.lower()
        
        # Common technology patterns
        tech_patterns = {
            'react': ['react', 'tsx', 'jsx', 'component'],
            'typescript': ['typescript', '.ts', 'tsx'],
            'fastapi': ['fastapi', 'endpoint', 'router'],
            'python': ['python', '.py', 'pytest'],
            'docker': ['docker', 'container', 'dockerfile'],
            'docker-compose': ['docker-compose', 'compose.yml'],
            'sqlalchemy': ['sqlalchemy', 'orm', 'alembic'],
            'websocket': ['websocket', 'ws_', 'real-time'],
            'postgresql': ['postgresql', 'postgres', 'pg_'],
            'tailwind': ['tailwind', 'tw-'],
            'git': ['git', 'commit', 'branch'],
        }
        
        for tech, patterns in tech_patterns.items():
            if any(p in content_lower for p in patterns):
                techs.add(tech)
        
        return techs
    
    def _extract_file_types(self, content: str) -> Set[str]:
        """Extract file types from workflow."""
        file_types = set()
        
        # Find file extensions mentioned
        extensions = re.findall(r'\.(py|tsx|jsx|ts|yml|yaml|md|json|sh|sql)\b', content)
        file_types.update(f'.{ext}' for ext in extensions)
        
        return file_types
    
    def _extract_skills(self, content: str) -> Set[str]:
        """Extract skills mentioned in workflow."""
        skills = set()
        
        # Look for "Skills Used" section
        skills_match = re.search(r'## Skills Used\s*\n+(.+?)(?=\n##|\Z)', content, re.DOTALL)
        if skills_match:
            skills_text = skills_match.group(1)
            # Extract skill names
            skill_patterns = re.findall(r'(\w+[-\w]*)/SKILL\.md', skills_text)
            skills.update(skill_patterns)
            
            # Also catch "skills/xxx" patterns
            skill_patterns2 = re.findall(r'skills/(\w+[-\w]*)', skills_text)
            skills.update(skill_patterns2)
        
        return skills
    
    def _extract_problems(self, content: str) -> List[str]:
        """Extract problems encountered."""
        problems = []
        
        # Look for "Problems", "Issues", "Gotchas" sections
        for section in ['Problems', 'Issues', 'Errors', 'Problems Encountered']:
            match = re.search(rf'##\s*{section}\s*\n+(.+?)(?=\n##|\Z)', content, re.DOTALL | re.IGNORECASE)
            if match:
                text = match.group(1)
                # Extract problem summaries
                problem_lines = re.findall(r'\*\*Problem\*\*:?\s*(.+)', text)
                problems.extend(problem_lines[:3])
                
                # Also get "- Problem:" patterns
                problem_lines2 = re.findall(r'- Problem:\s*(.+)', text)
                problems.extend(problem_lines2[:3])
        
        return problems[:5]
    
    def _extract_gotchas(self, content: str) -> List[str]:
        """Extract gotchas from workflow."""
        gotchas = []
        
        match = re.search(r'## Gotchas\s*\n+(.+?)(?=\n##|\Z)', content, re.DOTALL)
        if match:
            text = match.group(1)
            gotcha_lines = re.findall(r'[-•]\s*(.+)', text)
            gotchas.extend(gotcha_lines[:5])
        
        return gotchas
    
    def _extract_complexity(self, content: str) -> Tuple[str, int]:
        """Extract complexity and task count."""
        # Look for task count in workflow tree
        task_matches = re.findall(r'<WORK>.*?✓', content)
        task_count = len(task_matches)
        
        if task_count <= 3:
            complexity = 'simple'
        elif task_count <= 6:
            complexity = 'medium'
        else:
            complexity = 'complex'
        
        # Also check explicit complexity mention
        if 'Complexity: Simple' in content:
            complexity = 'simple'
        elif 'Complexity: Complex' in content:
            complexity = 'complex'
        elif 'Complexity: Medium' in content:
            complexity = 'medium'
        
        return complexity, max(task_count, 1)
    
    def _extract_duration(self, content: str) -> int:
        """Extract session duration in minutes."""
        # Look for duration patterns
        duration_match = re.search(r'Duration[:|]\s*~?(\d+)\s*min', content)
        if duration_match:
            return int(duration_match.group(1))
        
        # Check for hour-based duration
        hour_match = re.search(r'(\d+)\s*hour', content)
        if hour_match:
            return int(hour_match.group(1)) * 60
        
        return 30  # Default


class GroundedSimulator:
    """Generates 100k scenarios grounded in real workflow patterns."""
    
    def __init__(self, patterns: List[WorkflowPattern], seed: int = 42):
        self.patterns = patterns
        self.scenario_id = 0
        random.seed(seed)
        
        # Build weighted distribution from actual patterns
        self.session_type_weights = Counter()
        self.tech_combos = []
        self.skill_combos = []
        
        for p in patterns:
            self.session_type_weights[p.session_type] += 1
            self.tech_combos.append(p.technologies)
            self.skill_combos.append(p.skills_used)
    
    def generate_scenario(self) -> SimulatedScenario:
        """Generate a scenario based on real patterns with variation."""
        self.scenario_id += 1
        
        # Pick a base pattern weighted by frequency
        base = random.choice(self.patterns)
        
        # Add variations (10-30% deviation)
        technologies = set(base.technologies)
        if random.random() < 0.3:
            # Add a related technology
            related = self._get_related_tech(technologies)
            if related:
                technologies.add(related)
        
        if random.random() < 0.1:
            # Remove one technology
            if len(technologies) > 1:
                technologies.discard(random.choice(list(technologies)))
        
        # Determine expected skills based on pattern
        skills_expected = set(base.skills_used)
        
        # Add implicit skills based on technologies
        if 'react' in technologies or 'typescript' in technologies:
            skills_expected.add('frontend-react')
        if 'fastapi' in technologies or 'python' in technologies:
            skills_expected.add('backend-api')
        if 'docker' in technologies or 'docker-compose' in technologies:
            skills_expected.add('docker')
        if base.problems_encountered or 'debug' in base.session_type:
            skills_expected.add('debugging')
        if any('.md' in ft for ft in base.file_types):
            skills_expected.add('documentation')
        if 'test' in base.session_type or any('test' in ft for ft in base.file_types):
            skills_expected.add('testing')
        
        # Determine characteristics
        has_debugging = bool(base.problems_encountered) or base.session_type == 'debug'
        has_docker = 'docker' in technologies or 'docker-compose' in technologies
        has_frontend = 'react' in technologies or 'typescript' in technologies
        has_backend = 'fastapi' in technologies or 'python' in technologies
        
        return SimulatedScenario(
            id=self.scenario_id,
            base_pattern=base.workflow_file,
            scenario_type=base.session_type,
            technologies=technologies,
            file_types=base.file_types,
            skills_expected=skills_expected,
            problems=set(base.problems_encountered),
            complexity=base.complexity,
            has_debugging=has_debugging,
            has_docker=has_docker,
            has_frontend=has_frontend,
            has_backend=has_backend,
        )
    
    def _get_related_tech(self, current: Set[str]) -> Optional[str]:
        """Get a related technology based on patterns."""
        related_map = {
            'react': ['typescript', 'tailwind'],
            'fastapi': ['sqlalchemy', 'python', 'websocket'],
            'docker': ['docker-compose', 'postgresql'],
            'python': ['pytest', 'sqlalchemy'],
            'typescript': ['react', 'tailwind'],
        }
        
        for tech in current:
            if tech in related_map:
                candidates = [t for t in related_map[tech] if t not in current]
                if candidates:
                    return random.choice(candidates)
        return None
    
    def generate_batch(self, count: int) -> List[SimulatedScenario]:
        """Generate a batch of scenarios."""
        return [self.generate_scenario() for _ in range(count)]


class SkillGapAnalyzer:
    """Analyzes skill gaps and suggests merges."""
    
    # Existing skills in the project
    EXISTING_SKILLS = {
        'frontend-react', 'backend-api', 'docker', 'debugging',
        'documentation', 'testing', 'knowledge', 'akis-development'
    }
    
    def __init__(self, scenarios: List[SimulatedScenario]):
        self.scenarios = scenarios
        self.skill_cooccurrence = defaultdict(lambda: defaultdict(int))
        self.unmet_patterns = defaultdict(int)
        
    def analyze(self) -> Dict[str, Any]:
        """Analyze skill gaps and co-occurrence patterns."""
        
        # Track skill co-occurrences
        for scenario in self.scenarios:
            skills = list(scenario.skills_expected)
            for i, s1 in enumerate(skills):
                for s2 in skills[i+1:]:
                    self.skill_cooccurrence[s1][s2] += 1
                    self.skill_cooccurrence[s2][s1] += 1
        
        # Find gaps - patterns that don't map to existing skills
        for scenario in self.scenarios:
            for skill in scenario.skills_expected:
                if skill not in self.EXISTING_SKILLS:
                    self.unmet_patterns[skill] += 1
        
        return {
            'cooccurrence': dict(self.skill_cooccurrence),
            'unmet_patterns': dict(self.unmet_patterns),
        }
    
    def suggest_skill_merges(self) -> List[Dict[str, Any]]:
        """Suggest skills that should be merged based on co-occurrence."""
        suggestions = []
        
        # Find strongly co-occurring skills (appear together >70% of time)
        for s1, cooccur in self.skill_cooccurrence.items():
            s1_total = sum(1 for s in self.scenarios if s1 in s.skills_expected)
            if s1_total < 100:
                continue
            
            for s2, count in cooccur.items():
                if s2 <= s1:  # Avoid duplicates
                    continue
                s2_total = sum(1 for s in self.scenarios if s2 in s.skills_expected)
                if s2_total < 100:
                    continue
                
                # Calculate Jaccard similarity
                overlap = count
                union = s1_total + s2_total - count
                similarity = overlap / union if union > 0 else 0
                
                if similarity > 0.5:  # >50% overlap
                    suggestions.append({
                        'skills': [s1, s2],
                        'cooccurrence': count,
                        'similarity': round(similarity, 2),
                        'recommendation': f"Consider merging {s1} and {s2} or creating shared patterns"
                    })
        
        return sorted(suggestions, key=lambda x: -x['similarity'])[:5]
    
    def suggest_new_skill(self) -> Optional[Dict[str, Any]]:
        """
        Suggest ONE new skill based on unmet patterns.
        Must merge 3+ patterns and be project-agnostic.
        """
        
        # Group unmet patterns by category
        pattern_categories = defaultdict(list)
        
        for pattern, count in self.unmet_patterns.items():
            if count < 50:  # Ignore rare patterns
                continue
            
            # Categorize
            if any(kw in pattern.lower() for kw in ['api', 'endpoint', 'rest', 'route']):
                pattern_categories['api-design'].append((pattern, count))
            elif any(kw in pattern.lower() for kw in ['websocket', 'realtime', 'socket']):
                pattern_categories['realtime-comms'].append((pattern, count))
            elif any(kw in pattern.lower() for kw in ['state', 'store', 'redux', 'zustand']):
                pattern_categories['state-management'].append((pattern, count))
            elif any(kw in pattern.lower() for kw in ['error', 'exception', 'handle']):
                pattern_categories['error-handling'].append((pattern, count))
            elif any(kw in pattern.lower() for kw in ['deploy', 'ci', 'cd', 'pipeline']):
                pattern_categories['devops'].append((pattern, count))
            elif any(kw in pattern.lower() for kw in ['migrate', 'alembic', 'schema']):
                pattern_categories['database-ops'].append((pattern, count))
        
        # Find category with 3+ patterns
        for category, patterns in pattern_categories.items():
            if len(patterns) >= 3:
                total_freq = sum(p[1] for p in patterns)
                
                return {
                    'suggested_name': category,
                    'merged_patterns': [p[0] for p in patterns[:5]],
                    'total_frequency': total_freq,
                    'description': f"Merges {len(patterns)} related patterns into one skill",
                    'project_agnostic': True,
                    'applicability': self._get_applicability(category),
                }
        
        return None  # No new skill needed
    
    def _get_applicability(self, category: str) -> List[str]:
        """Get what types of projects this skill applies to."""
        mapping = {
            'api-design': ['REST APIs', 'GraphQL', 'Backend services'],
            'realtime-comms': ['Chat apps', 'Dashboards', 'Streaming'],
            'state-management': ['SPAs', 'Complex UIs', 'React apps'],
            'error-handling': ['Any production app', 'APIs', 'Services'],
            'devops': ['Containerized apps', 'CI/CD pipelines'],
            'database-ops': ['SQL databases', 'ORMs', 'Migrations'],
        }
        return mapping.get(category, ['General software development'])


def main():
    parser = argparse.ArgumentParser(description='Grounded Skill Discovery Simulator')
    parser.add_argument('--sessions', type=int, default=100000, help='Number of sessions to simulate')
    parser.add_argument('--output', type=str, default=None, help='Output file for results')
    args = parser.parse_args()
    
    print("=" * 60)
    print("AKIS Grounded Skill Discovery v2.0")
    print("=" * 60)
    print("✓ Patterns extracted from REAL workflow logs")
    print("✓ Variations based on actual session data")
    print("✓ Skills must be PROJECT-AGNOSTIC")
    print("✓ New skills must merge 3+ patterns")
    print("=" * 60)
    
    # Step 1: Analyze real workflow logs
    print("\n📊 Step 1: Analyzing workflow logs...")
    analyzer = WorkflowAnalyzer()
    patterns = analyzer.analyze_all_workflows()
    
    if not patterns:
        print("❌ No workflow patterns found. Cannot continue.")
        return 1
    
    print(f"\n📈 Workflow Analysis Summary:")
    print(f"   Total patterns: {len(patterns)}")
    print(f"   Session types: {dict(analyzer.session_types.most_common(5))}")
    print(f"   Top technologies: {dict(analyzer.tech_frequency.most_common(5))}")
    print(f"   Top skills used: {dict(analyzer.skill_frequency.most_common(5))}")
    
    # Step 2: Generate grounded scenarios
    print(f"\n🎲 Step 2: Generating {args.sessions:,} scenarios from patterns...")
    simulator = GroundedSimulator(patterns)
    scenarios = simulator.generate_batch(args.sessions)
    print(f"   Generated {len(scenarios):,} scenarios")
    
    # Step 3: Analyze skill gaps
    print("\n🔍 Step 3: Analyzing skill gaps...")
    gap_analyzer = SkillGapAnalyzer(scenarios)
    analysis = gap_analyzer.analyze()
    
    # Step 4: Suggest merges
    print("\n🔗 Step 4: Skill merge suggestions (high co-occurrence):")
    merges = gap_analyzer.suggest_skill_merges()
    for m in merges[:3]:
        print(f"   {m['skills'][0]} + {m['skills'][1]}: {m['similarity']*100:.0f}% overlap")
    
    # Step 5: Suggest NEW skill (max 1)
    print("\n💡 Step 5: New skill suggestion (max 1):")
    new_skill = gap_analyzer.suggest_new_skill()
    
    if new_skill:
        print(f"   ✓ Suggested: {new_skill['suggested_name']}")
        print(f"     Merges: {', '.join(new_skill['merged_patterns'][:3])}")
        print(f"     Frequency: {new_skill['total_frequency']:,} occurrences")
        print(f"     Applicability: {', '.join(new_skill['applicability'][:3])}")
    else:
        print("   ✓ No new skill needed - existing skills cover all patterns")
    
    # Step 6: Generate report
    print("\n" + "=" * 60)
    print("📋 FINAL RECOMMENDATIONS")
    print("=" * 60)
    
    # Count skill coverage
    skill_coverage = defaultdict(int)
    for s in scenarios:
        for skill in s.skills_expected:
            if skill in SkillGapAnalyzer.EXISTING_SKILLS:
                skill_coverage[skill] += 1
    
    print("\n📊 Existing Skill Coverage (from 100k scenarios):")
    for skill, count in sorted(skill_coverage.items(), key=lambda x: -x[1]):
        pct = count / len(scenarios) * 100
        print(f"   {skill:20} {count:6,} ({pct:5.1f}%)")
    
    if merges:
        print("\n🔗 Consider Merging:")
        for m in merges[:2]:
            print(f"   • {m['skills'][0]} ↔ {m['skills'][1]} ({m['similarity']*100:.0f}% overlap)")
    
    if new_skill:
        print(f"\n💡 Create New Skill: {new_skill['suggested_name']}")
        print(f"   Merges {len(new_skill['merged_patterns'])} patterns")
        print(f"   Project-agnostic: {new_skill['project_agnostic']}")
    else:
        print("\n💡 No new skill recommended - existing skills are sufficient")
    
    # Save results
    if args.output:
        results = {
            'patterns_analyzed': len(patterns),
            'scenarios_generated': len(scenarios),
            'skill_coverage': dict(skill_coverage),
            'merge_suggestions': merges,
            'new_skill_suggestion': new_skill,
            'workflow_summary': {
                'session_types': dict(analyzer.session_types),
                'top_technologies': dict(analyzer.tech_frequency.most_common(10)),
                'top_skills': dict(analyzer.skill_frequency.most_common(10)),
            }
        }
        
        # Convert sets to lists for JSON
        def convert(obj):
            if isinstance(obj, set):
                return list(obj)
            elif isinstance(obj, dict):
                return {k: convert(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert(i) for i in obj]
            return obj
        
        Path(args.output).write_text(json.dumps(convert(results), indent=2))
        print(f"\n💾 Results saved to {args.output}")
    
    return 0


if __name__ == '__main__':
    exit(main())
