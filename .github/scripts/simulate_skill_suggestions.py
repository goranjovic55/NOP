#!/usr/bin/env python3
"""
AKIS Skill Suggestion Simulator v1.0

Simulates 100k development scenarios to optimize skill suggestion patterns.
Measures precision, recall, and F1 score for different strategies.

Scenarios cover:
- Different problem types (bugs, features, refactoring, debugging)
- Technology stacks (React, FastAPI, Docker, SQLAlchemy, WebSockets)
- Session complexities (simple, medium, complex)
- Edge cases (mixed technologies, no clear pattern, multiple skills needed)

Usage:
    python .github/scripts/simulate_skill_suggestions.py --sessions 100000 [--output FILE]
"""

import json
import random
import re
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Set, Optional, Tuple
from pathlib import Path
from datetime import datetime
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed


@dataclass
class SimulatedFile:
    """A file modified in a simulated session."""
    path: str
    extension: str
    directory: str
    content_type: str  # endpoint, component, service, model, config, test, doc
    technologies: Set[str] = field(default_factory=set)
    has_websocket: bool = False
    has_async: bool = False
    has_sqlalchemy: bool = False
    has_docker: bool = False
    has_tests: bool = False
    has_error: bool = False


@dataclass
class SimulatedScenario:
    """A simulated development scenario."""
    id: int
    scenario_type: str  # feature, bugfix, refactor, debug, config, docs
    complexity: str  # simple, medium, complex
    files: List[SimulatedFile] = field(default_factory=list)
    technologies: Set[str] = field(default_factory=set)
    has_workflow_log: bool = True
    has_gotchas: bool = False
    commit_keywords: List[str] = field(default_factory=list)
    expected_skills: Set[str] = field(default_factory=set)
    optimal_skills: Set[str] = field(default_factory=set)  # Ground truth


@dataclass  
class SkillSuggestion:
    """A skill suggestion with confidence."""
    name: str
    confidence: float
    trigger: str  # What triggered this suggestion
    

# Ground truth skill mappings based on AKIS patterns
SKILL_TRIGGERS = {
    'frontend-react': {
        'file_patterns': [r'\.tsx$', r'\.jsx$', r'components/', r'pages/'],
        'technologies': {'react', 'typescript', 'tailwind'},
        'content_types': {'component', 'page'},
    },
    'backend-api': {
        'file_patterns': [r'\.py$', r'backend/', r'api/', r'endpoints/', r'routes/'],
        'technologies': {'fastapi', 'python', 'asyncio', 'sqlalchemy'},
        'content_types': {'endpoint', 'service', 'model'},
    },
    'docker': {
        'file_patterns': [r'Dockerfile', r'docker-compose', r'\.yml$'],
        'technologies': {'docker', 'docker-compose', 'kubernetes'},
        'content_types': {'config'},
    },
    'debugging': {
        'file_patterns': [],  # Triggered by content, not files
        'technologies': set(),
        'content_types': set(),
        'indicators': {'error', 'exception', 'traceback', 'failed', 'fix', 'bug'},
    },
    'testing': {
        'file_patterns': [r'test_', r'\.test\.', r'_test\.py$', r'tests/'],
        'technologies': {'pytest', 'jest', 'unittest'},
        'content_types': {'test'},
    },
    'documentation': {
        'file_patterns': [r'\.md$', r'docs/', r'README'],
        'technologies': set(),
        'content_types': {'doc'},
    },
    'akis-development': {
        'file_patterns': [r'\.github/copilot', r'\.github/skills', r'\.github/instructions'],
        'technologies': set(),
        'content_types': {'akis'},
    },
}

# Problem-solution pattern triggers
PATTERN_TRIGGERS = {
    'websocket-lifecycle': {
        'indicators': {'websocket', 'accept', 'finally', 'cleanup'},
        'skill': 'backend-api',
        'sub_skill': 'websocket-lifecycle-management',
    },
    'sqlalchemy-json': {
        'indicators': {'flag_modified', 'json', 'jsonb', 'metadata'},
        'skill': 'backend-api',
        'sub_skill': 'sqlalchemy-json-persistence',
    },
    'docker-network': {
        'indicators': {'subnet', 'network', 'docker-compose', '172.'},
        'skill': 'docker',
        'sub_skill': 'docker-network-isolation',
    },
    'proxychains-routing': {
        'indicators': {'proxychains', 'socks', 'proxy'},
        'skill': 'backend-api',
        'sub_skill': 'proxychains-dynamic-config',
    },
}


class ScenarioGenerator:
    """Generates realistic development scenarios."""
    
    # File path templates per technology
    FILE_TEMPLATES = {
        'react': [
            'frontend/src/pages/{Name}.tsx',
            'frontend/src/components/{Name}/{Name}.tsx',
            'frontend/src/components/{Name}/index.tsx',
            'frontend/src/hooks/use{Name}.ts',
            'frontend/src/services/{name}Service.ts',
        ],
        'fastapi': [
            'backend/app/api/v1/endpoints/{name}.py',
            'backend/app/services/{Name}Service.py',
            'backend/app/models/{name}.py',
            'backend/app/schemas/{name}.py',
            'backend/app/crud/{name}.py',
        ],
        'docker': [
            'docker-compose.yml',
            'docker-compose.dev.yml',
            'docker/Dockerfile',
            'backend/Dockerfile',
            'frontend/Dockerfile',
        ],
        'testing': [
            'backend/tests/test_{name}.py',
            'scripts/test_{name}.py',
            'frontend/src/__tests__/{name}.test.tsx',
        ],
        'docs': [
            'docs/features/{NAME}.md',
            'docs/technical/{NAME}.md',
            'README.md',
        ],
        'akis': [
            '.github/copilot-instructions.md',
            '.github/skills/{name}/SKILL.md',
            '.github/instructions/{name}.md',
        ],
    }
    
    # Common scenario types with their characteristics
    SCENARIO_TYPES = {
        'feature': {
            'weight': 0.35,
            'tech_combos': [
                {'react', 'fastapi'},
                {'react'},
                {'fastapi', 'sqlalchemy'},
                {'docker'},
                {'fastapi', 'websocket'},
            ],
            'commit_keywords': ['feat:', 'add:', 'implement:', 'new'],
            'complexity_dist': {'simple': 0.3, 'medium': 0.5, 'complex': 0.2},
        },
        'bugfix': {
            'weight': 0.25,
            'tech_combos': [
                {'react'},
                {'fastapi'},
                {'docker'},
                {'sqlalchemy'},
            ],
            'commit_keywords': ['fix:', 'bugfix:', 'hotfix:', 'patch:'],
            'complexity_dist': {'simple': 0.6, 'medium': 0.3, 'complex': 0.1},
        },
        'refactor': {
            'weight': 0.15,
            'tech_combos': [
                {'react'},
                {'fastapi'},
                {'react', 'fastapi'},
            ],
            'commit_keywords': ['refactor:', 'cleanup:', 'restructure:'],
            'complexity_dist': {'simple': 0.2, 'medium': 0.5, 'complex': 0.3},
        },
        'debug': {
            'weight': 0.15,
            'tech_combos': [
                {'fastapi', 'sqlalchemy'},
                {'docker'},
                {'websocket'},
                {'react'},
            ],
            'commit_keywords': ['fix:', 'debug:', 'investigate:'],
            'complexity_dist': {'simple': 0.4, 'medium': 0.4, 'complex': 0.2},
            'has_error': True,
        },
        'config': {
            'weight': 0.05,
            'tech_combos': [
                {'docker'},
                {'docker', 'fastapi'},
            ],
            'commit_keywords': ['config:', 'chore:', 'ci:'],
            'complexity_dist': {'simple': 0.7, 'medium': 0.3, 'complex': 0.0},
        },
        'docs': {
            'weight': 0.05,
            'tech_combos': [set()],
            'commit_keywords': ['docs:', 'readme:', 'update:'],
            'complexity_dist': {'simple': 0.8, 'medium': 0.2, 'complex': 0.0},
        },
    }
    
    # Edge case scenarios for comprehensive testing
    EDGE_CASES = [
        # Mixed technologies requiring multiple skills
        {
            'name': 'fullstack-feature',
            'technologies': {'react', 'fastapi', 'sqlalchemy', 'docker'},
            'expected_skills': {'frontend-react', 'backend-api', 'docker'},
            'files': ['frontend/src/pages/Feature.tsx', 'backend/app/api/v1/endpoints/feature.py', 'docker-compose.yml'],
        },
        # WebSocket + SQLAlchemy issue
        {
            'name': 'websocket-db-persistence',
            'technologies': {'fastapi', 'websocket', 'sqlalchemy'},
            'expected_skills': {'backend-api', 'debugging'},
            'indicators': {'websocket', 'flag_modified', 'error'},
        },
        # Docker network conflicts
        {
            'name': 'docker-subnet-conflict',
            'technologies': {'docker'},
            'expected_skills': {'docker', 'debugging'},
            'indicators': {'subnet', 'network', 'error'},
        },
        # AKIS skill development
        {
            'name': 'akis-skill-update',
            'technologies': set(),
            'expected_skills': {'akis-development'},
            'files': ['.github/skills/new-skill/SKILL.md'],
        },
        # Test-driven development
        {
            'name': 'tdd-workflow',
            'technologies': {'pytest', 'fastapi'},
            'expected_skills': {'testing', 'backend-api'},
            'files': ['backend/tests/test_feature.py', 'backend/app/api/v1/endpoints/feature.py'],
        },
        # Documentation only
        {
            'name': 'docs-update',
            'technologies': set(),
            'expected_skills': {'documentation'},
            'files': ['docs/features/NEW_FEATURE.md', 'README.md'],
        },
        # Debugging session with traceback
        {
            'name': 'traceback-investigation',
            'technologies': {'fastapi'},
            'expected_skills': {'debugging', 'backend-api'},
            'indicators': {'traceback', 'exception', 'error'},
        },
        # No clear skill match (edge case)
        {
            'name': 'ambiguous-changes',
            'technologies': set(),
            'expected_skills': set(),  # Should suggest nothing
            'files': ['random/file.txt'],
        },
    ]

    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.scenario_id = 0
    
    def generate_file(self, technology: str, name: str = None) -> SimulatedFile:
        """Generate a realistic file for a given technology."""
        if name is None:
            name = random.choice(['Traffic', 'Agent', 'Sniffer', 'Host', 'Network', 
                                  'Dashboard', 'Topology', 'Settings', 'Auth', 'User'])
        
        templates = self.FILE_TEMPLATES.get(technology, [])
        if not templates:
            return None
            
        template = random.choice(templates)
        path = template.format(
            name=name.lower(),
            Name=name.capitalize(),
            NAME=name.upper()
        )
        
        # Determine extension and directory
        ext = Path(path).suffix
        directory = str(Path(path).parent)
        
        # Determine content type
        content_type = 'unknown'
        if 'endpoints' in path or 'routes' in path:
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
        elif '.github/skills' in path:
            content_type = 'akis'
        
        return SimulatedFile(
            path=path,
            extension=ext,
            directory=directory,
            content_type=content_type,
            technologies={technology},
            has_websocket='websocket' in technology.lower(),
            has_async='fastapi' in technology or 'asyncio' in technology,
            has_sqlalchemy='sqlalchemy' in technology,
            has_docker='docker' in technology,
            has_tests='test' in path.lower(),
        )
    
    def generate_scenario(self, scenario_type: str = None, edge_case: Dict = None) -> SimulatedScenario:
        """Generate a complete simulated scenario."""
        self.scenario_id += 1
        
        # Handle edge cases
        if edge_case:
            files = []
            for file_path in edge_case.get('files', []):
                ext = Path(file_path).suffix
                directory = str(Path(file_path).parent)
                content_type = 'unknown'
                if 'endpoints' in file_path:
                    content_type = 'endpoint'
                elif 'pages' in file_path:
                    content_type = 'page'
                elif 'components' in file_path:
                    content_type = 'component'
                elif 'tests' in file_path or 'test_' in file_path:
                    content_type = 'test'
                elif file_path.endswith('.yml'):
                    content_type = 'config'
                elif file_path.endswith('.md'):
                    content_type = 'doc'
                elif '.github/skills' in file_path:
                    content_type = 'akis'
                    
                files.append(SimulatedFile(
                    path=file_path,
                    extension=ext,
                    directory=directory,
                    content_type=content_type,
                    technologies=edge_case.get('technologies', set()),
                    has_error='error' in edge_case.get('indicators', set()),
                ))
            
            return SimulatedScenario(
                id=self.scenario_id,
                scenario_type='edge_case',
                complexity='medium',
                files=files,
                technologies=edge_case.get('technologies', set()),
                has_workflow_log=True,
                has_gotchas='error' in edge_case.get('indicators', set()),
                commit_keywords=['fix:'] if 'error' in edge_case.get('indicators', set()) else ['feat:'],
                expected_skills=set(),  # Will be filled by ground truth
                optimal_skills=edge_case.get('expected_skills', set()),
            )
        
        # Regular scenario generation
        if scenario_type is None:
            # Weighted random selection
            types = list(self.SCENARIO_TYPES.keys())
            weights = [self.SCENARIO_TYPES[t]['weight'] for t in types]
            scenario_type = random.choices(types, weights=weights)[0]
        
        config = self.SCENARIO_TYPES[scenario_type]
        
        # Select complexity
        complexities = list(config['complexity_dist'].keys())
        weights = list(config['complexity_dist'].values())
        complexity = random.choices(complexities, weights=weights)[0]
        
        # Select technology combo
        tech_combo = random.choice(config['tech_combos'])
        
        # Determine number of files based on complexity
        file_counts = {'simple': (1, 3), 'medium': (3, 6), 'complex': (6, 12)}
        min_files, max_files = file_counts[complexity]
        num_files = random.randint(min_files, max_files)
        
        # Generate files
        files = []
        for tech in tech_combo:
            # Map technology to template category
            template_tech = tech
            if tech in {'sqlalchemy', 'asyncio', 'websocket'}:
                template_tech = 'fastapi'
            elif tech in {'typescript', 'tailwind'}:
                template_tech = 'react'
            
            # Generate 1-3 files per technology
            for _ in range(random.randint(1, min(3, num_files))):
                f = self.generate_file(template_tech)
                if f:
                    f.technologies = {tech}
                    if tech == 'websocket':
                        f.has_websocket = True
                    if tech == 'sqlalchemy':
                        f.has_sqlalchemy = True
                    files.append(f)
        
        # Add testing files for some scenarios
        if random.random() < 0.3:
            test_file = self.generate_file('testing')
            if test_file:
                files.append(test_file)
                tech_combo = tech_combo | {'pytest'}
        
        # Determine optimal skills (ground truth)
        optimal_skills = set()
        for tech in tech_combo:
            if tech in {'react', 'typescript', 'tailwind'}:
                optimal_skills.add('frontend-react')
            elif tech in {'fastapi', 'python', 'asyncio', 'sqlalchemy', 'websocket'}:
                optimal_skills.add('backend-api')
            elif tech in {'docker', 'docker-compose', 'kubernetes'}:
                optimal_skills.add('docker')
            elif tech in {'pytest', 'jest', 'unittest'}:
                optimal_skills.add('testing')
        
        # Add debugging skill for debug scenarios
        if scenario_type == 'debug' or config.get('has_error'):
            optimal_skills.add('debugging')
            for f in files:
                f.has_error = True
        
        # Documentation skill for docs scenarios
        if scenario_type == 'docs':
            optimal_skills.add('documentation')
        
        return SimulatedScenario(
            id=self.scenario_id,
            scenario_type=scenario_type,
            complexity=complexity,
            files=files,
            technologies=tech_combo,
            has_workflow_log=random.random() < 0.9,  # 90% have workflow logs
            has_gotchas=random.random() < 0.2,  # 20% have gotchas
            commit_keywords=config['commit_keywords'],
            expected_skills=set(),  # Will be filled by suggestion algorithm
            optimal_skills=optimal_skills,
        )
    
    def generate_batch(self, count: int = 100000) -> List[SimulatedScenario]:
        """Generate a batch of scenarios including edge cases."""
        scenarios = []
        
        # First, include all edge cases (repeated proportionally)
        edge_case_count = min(count // 100, len(self.EDGE_CASES) * 10)  # ~1% edge cases
        for i in range(edge_case_count):
            edge_case = self.EDGE_CASES[i % len(self.EDGE_CASES)]
            scenarios.append(self.generate_scenario(edge_case=edge_case))
        
        # Generate regular scenarios
        for _ in range(count - edge_case_count):
            scenarios.append(self.generate_scenario())
        
        return scenarios


class SkillSuggester:
    """Suggests skills based on scenario patterns."""
    
    def __init__(self, strategy: str = 'pattern_based'):
        self.strategy = strategy
    
    def suggest_naive(self, scenario: SimulatedScenario) -> Set[str]:
        """Naive strategy: suggest based on file extensions only."""
        skills = set()
        
        for f in scenario.files:
            if f.extension in {'.tsx', '.jsx'}:
                skills.add('frontend-react')
            elif f.extension == '.py':
                skills.add('backend-api')
            elif 'docker' in f.path.lower() or f.extension in {'.yml', '.yaml'}:
                skills.add('docker')
            elif 'test' in f.path.lower():
                skills.add('testing')
            elif f.extension == '.md':
                skills.add('documentation')
        
        return skills
    
    def suggest_smart(self, scenario: SimulatedScenario) -> Set[str]:
        """Smart strategy: only high-confidence matches."""
        skills = set()
        
        # Only suggest if strong indicators present
        has_react = any(f.extension in {'.tsx', '.jsx'} and 'pages' in f.path or 'components' in f.path 
                       for f in scenario.files)
        has_backend = any(f.extension == '.py' and ('endpoints' in f.path or 'services' in f.path)
                         for f in scenario.files)
        has_docker = any('Dockerfile' in f.path or 'docker-compose' in f.path 
                        for f in scenario.files)
        has_tests = any('test_' in f.path or f.content_type == 'test' 
                       for f in scenario.files)
        has_docs = any(f.path.startswith('docs/') or f.path == 'README.md'
                      for f in scenario.files)
        has_error = scenario.has_gotchas or any(f.has_error for f in scenario.files)
        has_akis = any('.github/skills' in f.path or '.github/copilot' in f.path
                      for f in scenario.files)
        
        if has_react:
            skills.add('frontend-react')
        if has_backend:
            skills.add('backend-api')
        if has_docker:
            skills.add('docker')
        if has_tests:
            skills.add('testing')
        if has_docs:
            skills.add('documentation')
        if has_error:
            skills.add('debugging')
        if has_akis:
            skills.add('akis-development')
        
        return skills
    
    def suggest_pattern_based(self, scenario: SimulatedScenario) -> Set[str]:
        """Pattern-based strategy: uses AKIS skill triggers."""
        skills = set()
        
        for skill_name, triggers in SKILL_TRIGGERS.items():
            score = 0
            max_score = 0
            
            # Check file patterns
            for pattern in triggers.get('file_patterns', []):
                max_score += 1
                for f in scenario.files:
                    if re.search(pattern, f.path):
                        score += 1
                        break
            
            # Check technologies
            for tech in triggers.get('technologies', set()):
                max_score += 1
                if tech in scenario.technologies:
                    score += 1
            
            # Check content types
            for content_type in triggers.get('content_types', set()):
                max_score += 1
                if any(f.content_type == content_type for f in scenario.files):
                    score += 1
            
            # Check indicators (for debugging)
            indicators = triggers.get('indicators', set())
            if indicators:
                max_score += len(indicators)
                # Check commit keywords and gotchas
                for indicator in indicators:
                    if scenario.has_gotchas and indicator in {'error', 'bug', 'fix'}:
                        score += 1
                    if any(indicator in kw.lower() for kw in scenario.commit_keywords):
                        score += 1
            
            # Suggest if confidence threshold met
            if max_score > 0 and score / max_score >= 0.4:
                skills.add(skill_name)
        
        return skills
    
    def suggest_enhanced(self, scenario: SimulatedScenario) -> Set[str]:
        """Enhanced strategy: combines patterns with context awareness."""
        skills = self.suggest_pattern_based(scenario)
        
        # Additional context-aware rules
        
        # Fullstack detection
        has_frontend = 'frontend-react' in skills
        has_backend = 'backend-api' in skills
        
        # If complex session with both, definitely suggest both
        if scenario.complexity == 'complex':
            if any(f.extension in {'.tsx', '.jsx'} for f in scenario.files):
                skills.add('frontend-react')
            if any(f.extension == '.py' and 'backend' in f.path for f in scenario.files):
                skills.add('backend-api')
        
        # WebSocket sessions need backend-api
        if any(f.has_websocket for f in scenario.files):
            skills.add('backend-api')
        
        # SQLAlchemy sessions need backend-api
        if any(f.has_sqlalchemy for f in scenario.files):
            skills.add('backend-api')
        
        # Debug scenarios with specific technologies
        if scenario.scenario_type == 'debug':
            if has_frontend:
                skills.add('debugging')
            if has_backend:
                skills.add('debugging')
        
        # AKIS files always need akis-development
        if any('.github/skills' in f.path or '.github/copilot' in f.path for f in scenario.files):
            skills.add('akis-development')
        
        # Documentation skill for docs changes (low compliance area)
        if any(f.extension == '.md' and ('docs/' in f.path or f.path == 'README.md') 
               for f in scenario.files):
            skills.add('documentation')
        
        return skills
    
    def suggest(self, scenario: SimulatedScenario) -> Set[str]:
        """Suggest skills based on configured strategy."""
        if self.strategy == 'naive':
            return self.suggest_naive(scenario)
        elif self.strategy == 'smart':
            return self.suggest_smart(scenario)
        elif self.strategy == 'pattern_based':
            return self.suggest_pattern_based(scenario)
        elif self.strategy == 'enhanced':
            return self.suggest_enhanced(scenario)
        else:
            return self.suggest_pattern_based(scenario)


class Evaluator:
    """Evaluates skill suggestion performance."""
    
    @staticmethod
    def calculate_metrics(scenarios: List[SimulatedScenario]) -> Dict[str, Any]:
        """Calculate precision, recall, F1 for suggestions vs optimal."""
        true_positives = 0
        false_positives = 0
        false_negatives = 0
        
        skill_stats = {}
        scenario_type_stats = {}
        
        for scenario in scenarios:
            suggested = scenario.expected_skills
            optimal = scenario.optimal_skills
            
            tp = len(suggested & optimal)
            fp = len(suggested - optimal)
            fn = len(optimal - suggested)
            
            true_positives += tp
            false_positives += fp
            false_negatives += fn
            
            # Per-skill stats
            for skill in optimal | suggested:
                if skill not in skill_stats:
                    skill_stats[skill] = {'tp': 0, 'fp': 0, 'fn': 0}
                if skill in optimal and skill in suggested:
                    skill_stats[skill]['tp'] += 1
                elif skill in suggested:
                    skill_stats[skill]['fp'] += 1
                else:
                    skill_stats[skill]['fn'] += 1
            
            # Per-scenario-type stats
            st = scenario.scenario_type
            if st not in scenario_type_stats:
                scenario_type_stats[st] = {'tp': 0, 'fp': 0, 'fn': 0}
            scenario_type_stats[st]['tp'] += tp
            scenario_type_stats[st]['fp'] += fp
            scenario_type_stats[st]['fn'] += fn
        
        # Calculate overall metrics
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        # Per-skill F1 scores
        skill_f1 = {}
        for skill, stats in skill_stats.items():
            p = stats['tp'] / (stats['tp'] + stats['fp']) if (stats['tp'] + stats['fp']) > 0 else 0
            r = stats['tp'] / (stats['tp'] + stats['fn']) if (stats['tp'] + stats['fn']) > 0 else 0
            skill_f1[skill] = 2 * p * r / (p + r) if (p + r) > 0 else 0
        
        return {
            'true_positives': true_positives,
            'false_positives': false_positives,
            'false_negatives': false_negatives,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'per_skill_f1': skill_f1,
            'per_type_stats': scenario_type_stats,
        }


def run_simulation(num_sessions: int = 100000, output_file: str = None) -> Dict[str, Any]:
    """Run the complete simulation."""
    print(f"🎲 Generating {num_sessions:,} simulated scenarios...")
    
    generator = ScenarioGenerator()
    scenarios = generator.generate_batch(num_sessions)
    
    print(f"📊 Testing skill suggestion strategies...")
    
    strategies = ['naive', 'smart', 'pattern_based', 'enhanced']
    results = {}
    
    for strategy in strategies:
        suggester = SkillSuggester(strategy=strategy)
        
        # Apply suggestions to all scenarios
        for scenario in scenarios:
            scenario.expected_skills = suggester.suggest(scenario)
        
        # Evaluate
        metrics = Evaluator.calculate_metrics(scenarios)
        results[strategy] = metrics
        
        print(f"\n   {strategy}:")
        print(f"      Precision: {metrics['precision']*100:.1f}%")
        print(f"      Recall: {metrics['recall']*100:.1f}%")
        print(f"      F1 Score: {metrics['f1_score']*100:.1f}%")
    
    # Find best strategy
    best_strategy = max(results.keys(), key=lambda s: results[s]['f1_score'])
    best_f1 = results[best_strategy]['f1_score']
    
    print(f"\n🏆 Best strategy: {best_strategy} (F1: {best_f1*100:.1f}%)")
    
    # Analyze patterns for improvement
    print(f"\n📈 Per-skill F1 scores ({best_strategy}):")
    for skill, f1 in sorted(results[best_strategy]['per_skill_f1'].items(), key=lambda x: x[1]):
        status = "⚠️ " if f1 < 0.7 else "✅ "
        print(f"   {status}{skill}: {f1*100:.1f}%")
    
    # Generate recommendations
    recommendations = []
    
    # Find low-performing skills
    low_performing = [skill for skill, f1 in results[best_strategy]['per_skill_f1'].items() if f1 < 0.7]
    if low_performing:
        recommendations.append(f"Improve detection for: {', '.join(low_performing)}")
    
    # Compare strategies
    if results['enhanced']['f1_score'] > results['pattern_based']['f1_score']:
        recommendations.append("Enhanced strategy shows improvement - implement context-aware rules")
    
    # Scenario type analysis
    print(f"\n📁 Performance by scenario type ({best_strategy}):")
    for st, stats in results[best_strategy]['per_type_stats'].items():
        total = stats['tp'] + stats['fn']
        if total > 0:
            recall = stats['tp'] / total
            status = "⚠️ " if recall < 0.7 else "✅ "
            print(f"   {status}{st}: {recall*100:.1f}% recall")
    
    # Build output
    output = {
        'num_sessions': num_sessions,
        'strategy_results': {s: {
            'precision': r['precision'],
            'recall': r['recall'],
            'f1_score': r['f1_score'],
            'per_skill_f1': r['per_skill_f1'],
        } for s, r in results.items()},
        'best_strategy': best_strategy,
        'best_f1': best_f1,
        'recommendations': recommendations,
        'improvement_targets': low_performing,
    }
    
    if output_file:
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"\n💾 Results saved to {output_file}")
    
    print(f"\n{'='*60}")
    print(f"📝 RECOMMENDATIONS FOR suggest_skill.py:")
    print(f"{'='*60}")
    for i, rec in enumerate(recommendations, 1):
        print(f"   {i}. {rec}")
    
    return output


def main():
    parser = argparse.ArgumentParser(description='AKIS Skill Suggestion Simulator')
    parser.add_argument('--sessions', type=int, default=100000, help='Number of sessions to simulate')
    parser.add_argument('--output', type=str, default=None, help='Output JSON file path')
    
    args = parser.parse_args()
    
    run_simulation(args.sessions, args.output)


if __name__ == '__main__':
    main()
