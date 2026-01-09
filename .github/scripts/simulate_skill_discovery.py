#!/usr/bin/env python3
"""
AKIS Skill Discovery Simulator v2.0

Simulates 100k development scenarios to:
1. Test existing skill detection accuracy
2. Discover patterns that DON'T match existing skills
3. Suggest NEW skills based on pattern clustering
4. Generate recommendations to improve suggest_skill.py

Usage:
    python .github/scripts/simulate_skill_discovery.py --sessions 100000 [--output FILE]
"""

import json
import random
import re
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Set, Optional, Tuple
from pathlib import Path
from datetime import datetime
import argparse


@dataclass
class SimulatedFile:
    """A file modified in a simulated session."""
    path: str
    extension: str
    directory: str
    content_type: str
    technologies: Set[str] = field(default_factory=set)
    has_websocket: bool = False
    has_async: bool = False
    has_sqlalchemy: bool = False
    has_error: bool = False
    has_test: bool = False
    code_patterns: Set[str] = field(default_factory=set)


@dataclass
class SimulatedScenario:
    """A simulated development scenario."""
    id: int
    scenario_type: str
    complexity: str
    files: List[SimulatedFile] = field(default_factory=list)
    technologies: Set[str] = field(default_factory=set)
    has_workflow_log: bool = True
    has_gotchas: bool = False
    commit_keywords: List[str] = field(default_factory=list)
    expected_skills: Set[str] = field(default_factory=set)
    code_patterns: Set[str] = field(default_factory=set)
    error_patterns: Set[str] = field(default_factory=set)


@dataclass
class DiscoveredPattern:
    """A pattern discovered from scenarios that needs a new skill."""
    pattern_id: str
    description: str
    frequency: int
    technologies: Set[str]
    file_patterns: List[str]
    code_indicators: Set[str]
    error_indicators: Set[str]
    example_scenarios: List[int]
    suggested_skill_name: str
    suggested_skill_description: str
    confidence: float


# Existing AKIS skills for reference
EXISTING_SKILLS = {
    'frontend-react': {
        'file_patterns': [r'\.tsx$', r'\.jsx$', r'components/', r'pages/'],
        'technologies': {'react', 'typescript', 'tailwind'},
        'content_types': {'component', 'page'},
    },
    'backend-api': {
        'file_patterns': [r'\.py$', r'backend/', r'api/', r'endpoints/'],
        'technologies': {'fastapi', 'python', 'asyncio', 'sqlalchemy'},
        'content_types': {'endpoint', 'service', 'model'},
    },
    'docker': {
        'file_patterns': [r'Dockerfile', r'docker-compose', r'\.yml$'],
        'technologies': {'docker', 'docker-compose'},
        'content_types': {'config'},
    },
    'debugging': {
        'indicators': {'error', 'exception', 'traceback', 'failed', 'fix', 'bug'},
    },
    'testing': {
        'file_patterns': [r'test_', r'\.test\.', r'_test\.py$', r'tests/'],
        'technologies': {'pytest', 'jest'},
        'content_types': {'test'},
    },
    'documentation': {
        'file_patterns': [r'\.md$', r'docs/', r'README'],
        'content_types': {'doc'},
    },
    'akis-development': {
        'file_patterns': [r'\.github/copilot', r'\.github/skills', r'\.github/instructions'],
        'content_types': {'akis'},
    },
    'knowledge': {
        'file_patterns': [r'project_knowledge\.json'],
        'content_types': {'knowledge'},
    },
}

# Extended scenario types with more granular patterns
EXTENDED_SCENARIO_TYPES = {
    # Core scenarios
    'feature-fullstack': {
        'weight': 0.12,
        'tech_combos': [{'react', 'fastapi', 'sqlalchemy'}],
        'expected_skills': {'frontend-react', 'backend-api'},
        'complexity': 'complex',
    },
    'feature-frontend': {
        'weight': 0.10,
        'tech_combos': [{'react', 'typescript'}],
        'expected_skills': {'frontend-react'},
        'complexity': 'medium',
    },
    'feature-backend': {
        'weight': 0.10,
        'tech_combos': [{'fastapi', 'sqlalchemy', 'asyncio'}],
        'expected_skills': {'backend-api'},
        'complexity': 'medium',
    },
    'bugfix-frontend': {
        'weight': 0.08,
        'tech_combos': [{'react'}],
        'expected_skills': {'frontend-react', 'debugging'},
        'has_error': True,
    },
    'bugfix-backend': {
        'weight': 0.08,
        'tech_combos': [{'fastapi', 'sqlalchemy'}],
        'expected_skills': {'backend-api', 'debugging'},
        'has_error': True,
    },
    'docker-config': {
        'weight': 0.05,
        'tech_combos': [{'docker', 'docker-compose'}],
        'expected_skills': {'docker'},
    },
    'testing-backend': {
        'weight': 0.04,
        'tech_combos': [{'pytest', 'fastapi'}],
        'expected_skills': {'testing', 'backend-api'},
    },
    'docs-update': {
        'weight': 0.03,
        'tech_combos': [set()],
        'expected_skills': {'documentation'},
    },
    
    # NEW PATTERNS - These need new skills
    'websocket-realtime': {
        'weight': 0.06,
        'tech_combos': [{'fastapi', 'websocket', 'asyncio'}],
        'expected_skills': {'backend-api'},  # Current - but needs websocket-specific
        'code_patterns': {'websocket', 'accept', 'send_text', 'receive_text', 'broadcast'},
        'suggested_skill': 'websocket-patterns',
    },
    'database-migration': {
        'weight': 0.04,
        'tech_combos': [{'alembic', 'sqlalchemy'}],
        'expected_skills': {'backend-api'},  # Current - but needs migration-specific
        'code_patterns': {'alembic', 'revision', 'upgrade', 'downgrade', 'migration'},
        'suggested_skill': 'database-migration',
    },
    'authentication': {
        'weight': 0.05,
        'tech_combos': [{'fastapi', 'jwt', 'oauth'}],
        'expected_skills': {'backend-api'},
        'code_patterns': {'jwt', 'oauth', 'bearer', 'token', 'authenticate', 'authorize'},
        'suggested_skill': 'authentication-patterns',
    },
    'state-management': {
        'weight': 0.04,
        'tech_combos': [{'react', 'zustand', 'redux'}],
        'expected_skills': {'frontend-react'},
        'code_patterns': {'zustand', 'redux', 'useStore', 'dispatch', 'state', 'create'},
        'suggested_skill': 'state-management',
    },
    'network-capture': {
        'weight': 0.04,
        'tech_combos': [{'scapy', 'pcap', 'asyncio'}],
        'expected_skills': {'backend-api'},
        'code_patterns': {'scapy', 'sniff', 'packet', 'AsyncSniffer', 'pcap'},
        'suggested_skill': 'network-analysis',
    },
    'performance-optimization': {
        'weight': 0.03,
        'tech_combos': [{'react', 'memoization'}, {'fastapi', 'caching'}],
        'expected_skills': set(),
        'code_patterns': {'useMemo', 'useCallback', 'cache', 'lazy', 'Suspense', 'async'},
        'suggested_skill': 'performance-patterns',
    },
    'error-handling': {
        'weight': 0.04,
        'tech_combos': [{'fastapi', 'exception'}, {'react', 'error-boundary'}],
        'expected_skills': {'debugging'},
        'code_patterns': {'try', 'except', 'ErrorBoundary', 'catch', 'finally', 'raise'},
        'suggested_skill': 'error-handling-patterns',
    },
    'api-versioning': {
        'weight': 0.02,
        'tech_combos': [{'fastapi'}],
        'expected_skills': {'backend-api'},
        'code_patterns': {'v1', 'v2', 'APIRouter', 'prefix', 'versioning'},
        'suggested_skill': 'api-design-patterns',
    },
    'ci-cd': {
        'weight': 0.03,
        'tech_combos': [{'github-actions', 'docker'}],
        'expected_skills': {'docker'},
        'code_patterns': {'workflow', 'actions', 'deploy', 'build', 'test'},
        'file_patterns': ['.github/workflows/'],
        'suggested_skill': 'ci-cd-patterns',
    },
    'logging-monitoring': {
        'weight': 0.02,
        'tech_combos': [{'python', 'logging'}],
        'expected_skills': set(),
        'code_patterns': {'logger', 'logging', 'debug', 'info', 'warning', 'error'},
        'suggested_skill': 'logging-patterns',
    },
}

# File templates for each technology
FILE_TEMPLATES = {
    'react': [
        'frontend/src/pages/{Name}.tsx',
        'frontend/src/components/{Name}/{Name}.tsx',
        'frontend/src/hooks/use{Name}.ts',
        'frontend/src/services/{name}Service.ts',
    ],
    'fastapi': [
        'backend/app/api/v1/endpoints/{name}.py',
        'backend/app/services/{Name}Service.py',
        'backend/app/models/{name}.py',
    ],
    'websocket': [
        'backend/app/api/v1/endpoints/ws_{name}.py',
        'frontend/src/hooks/useWebSocket.ts',
    ],
    'alembic': [
        'backend/alembic/versions/{hash}_{name}.py',
    ],
    'docker': [
        'docker-compose.yml',
        'docker-compose.dev.yml',
        'Dockerfile',
    ],
    'pytest': [
        'backend/tests/test_{name}.py',
        'scripts/test_{name}.py',
    ],
    'docs': [
        'docs/features/{NAME}.md',
        'docs/technical/{NAME}.md',
        'README.md',
    ],
    'github-actions': [
        '.github/workflows/{name}.yml',
    ],
    'scapy': [
        'backend/app/services/{Name}Sniffer.py',
        'scripts/capture_{name}.py',
    ],
}


class ScenarioGenerator:
    """Generates realistic development scenarios."""
    
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.scenario_id = 0
        
    def _pick_complexity(self, dist: Dict[str, float] = None) -> str:
        if dist is None:
            dist = {'simple': 0.4, 'medium': 0.4, 'complex': 0.2}
        r = random.random()
        cumulative = 0
        for complexity, prob in dist.items():
            cumulative += prob
            if r <= cumulative:
                return complexity
        return 'medium'
    
    def _generate_files(self, technologies: Set[str], complexity: str) -> List[SimulatedFile]:
        """Generate realistic file changes based on technologies."""
        files = []
        
        # Determine file count based on complexity
        file_counts = {'simple': (1, 3), 'medium': (3, 6), 'complex': (6, 12)}
        min_files, max_files = file_counts.get(complexity, (2, 5))
        num_files = random.randint(min_files, max_files)
        
        names = ['Traffic', 'Agent', 'Sniffer', 'Host', 'Network', 'Dashboard', 
                 'Topology', 'Settings', 'Auth', 'User', 'Connection', 'Session']
        
        for _ in range(num_files):
            tech = random.choice(list(technologies)) if technologies else 'docs'
            templates = FILE_TEMPLATES.get(tech, FILE_TEMPLATES.get('docs', []))
            
            if not templates:
                continue
                
            template = random.choice(templates)
            name = random.choice(names)
            
            path = template.format(
                name=name.lower(),
                Name=name,
                NAME=name.upper(),
                hash=f'{random.randint(100000, 999999):06d}'
            )
            
            ext = Path(path).suffix
            directory = str(Path(path).parent)
            
            # Determine content type
            content_type = 'unknown'
            if 'endpoints' in path:
                content_type = 'endpoint'
            elif 'components' in path or 'pages' in path:
                content_type = 'component' if 'components' in path else 'page'
            elif 'services' in path:
                content_type = 'service'
            elif 'models' in path:
                content_type = 'model'
            elif 'test' in path.lower():
                content_type = 'test'
            elif 'docker' in path.lower() or path.endswith('.yml'):
                content_type = 'config'
            elif path.endswith('.md'):
                content_type = 'doc'
            elif '.github' in path:
                content_type = 'ci'
            elif 'alembic' in path:
                content_type = 'migration'
            
            files.append(SimulatedFile(
                path=path,
                extension=ext,
                directory=directory,
                content_type=content_type,
                technologies={tech},
                has_websocket='websocket' in tech or 'ws_' in path,
                has_async='async' in tech or ext == '.py',
                has_sqlalchemy='sqlalchemy' in tech or 'alembic' in tech,
            ))
        
        return files
    
    def generate_scenario(self, scenario_type: str = None) -> SimulatedScenario:
        """Generate a single development scenario."""
        self.scenario_id += 1
        
        if scenario_type is None:
            # Weighted random selection
            types = list(EXTENDED_SCENARIO_TYPES.keys())
            weights = [EXTENDED_SCENARIO_TYPES[t]['weight'] for t in types]
            scenario_type = random.choices(types, weights=weights, k=1)[0]
        
        config = EXTENDED_SCENARIO_TYPES[scenario_type]
        
        tech_combo = random.choice(config['tech_combos'])
        complexity = config.get('complexity', self._pick_complexity())
        
        files = self._generate_files(tech_combo, complexity)
        
        code_patterns = config.get('code_patterns', set())
        has_error = config.get('has_error', False)
        
        return SimulatedScenario(
            id=self.scenario_id,
            scenario_type=scenario_type,
            complexity=complexity,
            files=files,
            technologies=tech_combo,
            has_gotchas=has_error,
            expected_skills=config.get('expected_skills', set()),
            code_patterns=code_patterns,
            error_patterns={'error', 'exception', 'failed'} if has_error else set(),
        )
    
    def generate_batch(self, count: int) -> List[SimulatedScenario]:
        """Generate a batch of scenarios."""
        return [self.generate_scenario() for _ in range(count)]


class SkillMatcher:
    """Matches scenarios to existing skills and identifies gaps."""
    
    def match_existing_skills(self, scenario: SimulatedScenario) -> Set[str]:
        """Match scenario to existing skills."""
        matched = set()
        
        for skill_name, triggers in EXISTING_SKILLS.items():
            score = 0
            
            # Check file patterns
            for pattern in triggers.get('file_patterns', []):
                for f in scenario.files:
                    if re.search(pattern, f.path):
                        score += 1
                        break
            
            # Check technologies
            for tech in triggers.get('technologies', set()):
                if tech in scenario.technologies:
                    score += 1
            
            # Check content types
            for ctype in triggers.get('content_types', set()):
                if any(f.content_type == ctype for f in scenario.files):
                    score += 1
            
            # Check indicators (debugging)
            for indicator in triggers.get('indicators', set()):
                if indicator in scenario.code_patterns or \
                   indicator in scenario.error_patterns or \
                   any(indicator in kw for kw in scenario.commit_keywords):
                    score += 1
            
            if score >= 1:
                matched.add(skill_name)
        
        return matched


class PatternDiscovery:
    """Discovers patterns that need new skills."""
    
    def __init__(self):
        self.pattern_counts = defaultdict(int)
        self.pattern_examples = defaultdict(list)
        self.pattern_technologies = defaultdict(set)
        self.pattern_code_indicators = defaultdict(set)
        self.unmatched_scenarios = []
    
    def analyze_gap(self, scenario: SimulatedScenario, matched_skills: Set[str]):
        """Analyze gap between expected and matched skills."""
        
        # Check if this scenario has patterns not covered by matched skills
        has_special_patterns = bool(scenario.code_patterns)
        
        # Find suggested skill from scenario type
        config = EXTENDED_SCENARIO_TYPES.get(scenario.scenario_type, {})
        suggested = config.get('suggested_skill')
        
        if suggested and suggested not in matched_skills:
            # This scenario needs a skill that doesn't exist
            pattern_key = suggested
            self.pattern_counts[pattern_key] += 1
            self.pattern_examples[pattern_key].append(scenario.id)
            self.pattern_technologies[pattern_key].update(scenario.technologies)
            self.pattern_code_indicators[pattern_key].update(scenario.code_patterns)
    
    def get_discovered_patterns(self, min_frequency: int = 100) -> List[DiscoveredPattern]:
        """Get patterns that appear frequently enough to warrant new skills."""
        discovered = []
        
        skill_descriptions = {
            'websocket-patterns': 'Real-time WebSocket connection management, message handling, broadcasting, and cleanup patterns',
            'database-migration': 'Alembic migration patterns, revision management, upgrade/downgrade procedures',
            'authentication-patterns': 'JWT, OAuth, bearer tokens, authentication flows, authorization patterns',
            'state-management': 'React state management with Zustand/Redux, stores, actions, selectors',
            'network-analysis': 'Scapy packet capture, network protocol analysis, async sniffing',
            'performance-patterns': 'React memoization, lazy loading, caching strategies, async optimization',
            'error-handling-patterns': 'Exception handling, error boundaries, graceful degradation, logging',
            'api-design-patterns': 'API versioning, router organization, endpoint design, OpenAPI',
            'ci-cd-patterns': 'GitHub Actions workflows, automated testing, deployment pipelines',
            'logging-patterns': 'Structured logging, log levels, monitoring integration',
        }
        
        for pattern_key, count in sorted(self.pattern_counts.items(), key=lambda x: -x[1]):
            if count >= min_frequency:
                discovered.append(DiscoveredPattern(
                    pattern_id=pattern_key,
                    description=skill_descriptions.get(pattern_key, f'Patterns for {pattern_key}'),
                    frequency=count,
                    technologies=self.pattern_technologies[pattern_key],
                    file_patterns=self._infer_file_patterns(pattern_key),
                    code_indicators=self.pattern_code_indicators[pattern_key],
                    error_indicators=set(),
                    example_scenarios=self.pattern_examples[pattern_key][:5],
                    suggested_skill_name=pattern_key,
                    suggested_skill_description=skill_descriptions.get(pattern_key, ''),
                    confidence=min(1.0, count / 1000),
                ))
        
        return discovered
    
    def _infer_file_patterns(self, pattern_key: str) -> List[str]:
        """Infer file patterns from pattern key."""
        patterns_map = {
            'websocket-patterns': [r'ws_\w+\.py$', r'useWebSocket\.ts$', r'websocket'],
            'database-migration': [r'alembic/', r'migrations/', r'_revision\.py$'],
            'authentication-patterns': [r'auth\.py$', r'jwt', r'oauth', r'login'],
            'state-management': [r'store\.ts$', r'useStore', r'redux', r'zustand'],
            'network-analysis': [r'sniffer', r'capture', r'packet', r'scapy'],
            'performance-patterns': [r'useMemo', r'useCallback', r'lazy', r'cache'],
            'error-handling-patterns': [r'error', r'exception', r'handler'],
            'api-design-patterns': [r'api/v\d+/', r'router', r'endpoints/'],
            'ci-cd-patterns': [r'\.github/workflows/', r'\.yml$'],
            'logging-patterns': [r'logger', r'logging\.py$'],
        }
        return patterns_map.get(pattern_key, [])


class SimulationRunner:
    """Runs the full simulation and generates recommendations."""
    
    def __init__(self, num_sessions: int = 100000):
        self.num_sessions = num_sessions
        self.generator = ScenarioGenerator()
        self.matcher = SkillMatcher()
        self.discovery = PatternDiscovery()
    
    def run(self) -> Dict[str, Any]:
        """Run the full simulation."""
        print(f"🎲 Generating {self.num_sessions:,} simulated scenarios...")
        
        # Generate scenarios
        scenarios = self.generator.generate_batch(self.num_sessions)
        
        # Analyze each scenario
        results = {
            'total_scenarios': len(scenarios),
            'matched': defaultdict(int),
            'expected': defaultdict(int),
            'true_positives': defaultdict(int),
            'false_positives': defaultdict(int),
            'false_negatives': defaultdict(int),
        }
        
        print("📊 Analyzing scenarios and discovering patterns...")
        
        for scenario in scenarios:
            matched = self.matcher.match_existing_skills(scenario)
            expected = scenario.expected_skills
            
            # Track metrics per skill
            for skill in matched:
                results['matched'][skill] += 1
                if skill in expected:
                    results['true_positives'][skill] += 1
                else:
                    results['false_positives'][skill] += 1
            
            for skill in expected:
                results['expected'][skill] += 1
                if skill not in matched:
                    results['false_negatives'][skill] += 1
            
            # Discover patterns needing new skills
            self.discovery.analyze_gap(scenario, matched)
        
        # Calculate metrics per skill
        print("\n📈 Skill Detection Metrics:")
        print("-" * 60)
        
        skill_metrics = {}
        for skill in set(results['matched'].keys()) | set(results['expected'].keys()):
            tp = results['true_positives'].get(skill, 0)
            fp = results['false_positives'].get(skill, 0)
            fn = results['false_negatives'].get(skill, 0)
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            skill_metrics[skill] = {
                'matched': results['matched'].get(skill, 0),
                'expected': results['expected'].get(skill, 0),
                'precision': round(precision * 100, 1),
                'recall': round(recall * 100, 1),
                'f1': round(f1 * 100, 1),
            }
            
            print(f"   {skill:25} P:{precision*100:5.1f}% R:{recall*100:5.1f}% F1:{f1*100:5.1f}%")
        
        # Get discovered patterns
        discovered = self.discovery.get_discovered_patterns(min_frequency=50)
        
        print(f"\n🔍 Discovered {len(discovered)} patterns needing new skills:")
        print("-" * 60)
        
        for pattern in discovered:
            print(f"   {pattern.suggested_skill_name:25} freq={pattern.frequency:5} conf={pattern.confidence:.2f}")
            print(f"      Technologies: {', '.join(pattern.technologies) or 'N/A'}")
            print(f"      Indicators: {', '.join(list(pattern.code_indicators)[:5]) or 'N/A'}")
        
        return {
            'total_scenarios': len(scenarios),
            'skill_metrics': skill_metrics,
            'discovered_patterns': [asdict(p) for p in discovered],
            'recommendations': self._generate_recommendations(skill_metrics, discovered),
        }
    
    def _generate_recommendations(self, metrics: Dict, discovered: List[DiscoveredPattern]) -> List[Dict]:
        """Generate actionable recommendations."""
        recommendations = []
        
        # Low-performing existing skills
        for skill, m in metrics.items():
            if m['f1'] < 70:
                recommendations.append({
                    'type': 'improve_detection',
                    'skill': skill,
                    'current_f1': m['f1'],
                    'issue': 'Low F1 score - detection patterns may be too narrow or too broad',
                    'action': f"Review {skill} triggers in suggest_skill.py",
                })
        
        # New skills to add
        for pattern in discovered:
            if pattern.frequency >= 500:
                recommendations.append({
                    'type': 'add_skill',
                    'skill': pattern.suggested_skill_name,
                    'frequency': pattern.frequency,
                    'confidence': pattern.confidence,
                    'description': pattern.suggested_skill_description,
                    'technologies': list(pattern.technologies),
                    'file_patterns': pattern.file_patterns,
                    'code_indicators': list(pattern.code_indicators),
                    'action': f"Create .github/skills/{pattern.suggested_skill_name}/SKILL.md",
                })
        
        return recommendations


def generate_skill_detection_code(discovered: List[Dict]) -> str:
    """Generate Python code for detecting new skills."""
    code_lines = [
        "# NEW SKILL DETECTION PATTERNS",
        "# Generated from 100k simulation analysis",
        "",
        "NEW_SKILL_TRIGGERS = {",
    ]
    
    for pattern in discovered:
        if pattern.get('frequency', 0) >= 500:
            name = pattern['suggested_skill_name']
            code_lines.append(f"    '{name}': {{")
            code_lines.append(f"        'description': '{pattern.get('description', '')[:80]}',")
            code_lines.append(f"        'file_patterns': {pattern.get('file_patterns', [])},")
            code_lines.append(f"        'technologies': {set(pattern.get('technologies', []))},")
            code_lines.append(f"        'code_indicators': {set(pattern.get('code_indicators', []))},")
            code_lines.append(f"        'confidence_threshold': 0.7,")
            code_lines.append(f"    }},")
    
    code_lines.append("}")
    code_lines.append("")
    code_lines.append("")
    code_lines.append("def detect_new_skills(files: List[str], code_patterns: Set[str], technologies: Set[str]) -> List[str]:")
    code_lines.append('    """Detect new skills based on simulation-discovered patterns."""')
    code_lines.append("    detected = []")
    code_lines.append("    ")
    code_lines.append("    for skill_name, triggers in NEW_SKILL_TRIGGERS.items():")
    code_lines.append("        score = 0")
    code_lines.append("        max_score = 0")
    code_lines.append("        ")
    code_lines.append("        # Check file patterns")
    code_lines.append("        for pattern in triggers.get('file_patterns', []):")
    code_lines.append("            max_score += 1")
    code_lines.append("            for f in files:")
    code_lines.append("                if re.search(pattern, f):")
    code_lines.append("                    score += 1")
    code_lines.append("                    break")
    code_lines.append("        ")
    code_lines.append("        # Check technologies")
    code_lines.append("        for tech in triggers.get('technologies', set()):")
    code_lines.append("            max_score += 1")
    code_lines.append("            if tech in technologies:")
    code_lines.append("                score += 1")
    code_lines.append("        ")
    code_lines.append("        # Check code indicators")
    code_lines.append("        for indicator in triggers.get('code_indicators', set()):")
    code_lines.append("            max_score += 1")
    code_lines.append("            if indicator in code_patterns:")
    code_lines.append("                score += 1")
    code_lines.append("        ")
    code_lines.append("        if max_score > 0 and score / max_score >= triggers.get('confidence_threshold', 0.7):")
    code_lines.append("            detected.append(skill_name)")
    code_lines.append("    ")
    code_lines.append("    return detected")
    
    return '\n'.join(code_lines)


def main():
    parser = argparse.ArgumentParser(description='AKIS Skill Discovery Simulator')
    parser.add_argument('--sessions', type=int, default=100000, help='Number of sessions to simulate')
    parser.add_argument('--output', type=str, default=None, help='Output file for results')
    args = parser.parse_args()
    
    runner = SimulationRunner(args.sessions)
    results = runner.run()
    
    # Generate code for new skill detection
    if results['discovered_patterns']:
        print("\n" + "=" * 60)
        print("📝 GENERATED SKILL DETECTION CODE")
        print("=" * 60)
        code = generate_skill_detection_code(results['discovered_patterns'])
        print(code)
        results['generated_code'] = code
    
    # Print recommendations
    print("\n" + "=" * 60)
    print("📋 RECOMMENDATIONS")
    print("=" * 60)
    
    for i, rec in enumerate(results['recommendations'], 1):
        print(f"\n{i}. [{rec['type'].upper()}] {rec.get('skill', 'N/A')}")
        if 'current_f1' in rec:
            print(f"   Current F1: {rec['current_f1']}%")
        if 'frequency' in rec:
            print(f"   Frequency: {rec['frequency']:,} scenarios")
        if 'description' in rec:
            print(f"   Description: {rec['description'][:60]}...")
        print(f"   Action: {rec['action']}")
    
    # Save results
    if args.output:
        output_path = Path(args.output)
        # Convert sets to lists for JSON serialization
        def convert_sets(obj):
            if isinstance(obj, set):
                return list(obj)
            elif isinstance(obj, dict):
                return {k: convert_sets(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_sets(i) for i in obj]
            return obj
        
        results = convert_sets(results)
        output_path.write_text(json.dumps(results, indent=2))
        print(f"\n💾 Results saved to {args.output}")
    
    return 0


if __name__ == '__main__':
    exit(main())
