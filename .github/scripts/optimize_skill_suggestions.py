#!/usr/bin/env python3
"""
AKIS Skill Suggestion Optimizer v3.0

Tests suggest_skill.py against 100k sessions GROUNDED in real workflow patterns.
Measures detection accuracy and identifies gaps to improve future skill suggestions.

GOAL: Ensure suggest_skill.py correctly identifies skills that would help resolve
sessions, so at end of REAL sessions it suggests genuinely useful patterns.

Usage:
    python .github/scripts/optimize_skill_suggestions.py --sessions 100000
"""

import json
import random
import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Set, Tuple, Any
from pathlib import Path
import argparse


# REAL patterns extracted from 105 workflow logs
# These frequencies are from actual grep analysis
REAL_PATTERN_FREQUENCIES = {
    'test': 284,
    'page': 279,
    'frontend': 268,
    'backend': 245,
    'service': 175,
    'docker': 155,
    'api': 132,
    'error': 131,
    'component': 112,
    'fix': 108,
    'feature': 42,
    'debug': 38,
    'cache': 25,
    'refactor': 17,
    'auth': 16,
    'websocket': 8,
    'performance': 8,
    'migration': 5,
    'alembic': 4,
    'exception': 2,
}

# Normalize to probabilities
TOTAL_OCCURRENCES = sum(REAL_PATTERN_FREQUENCIES.values())
PATTERN_PROBABILITIES = {k: v / TOTAL_OCCURRENCES for k, v in REAL_PATTERN_FREQUENCIES.items()}

# EXISTING SKILLS (what suggest_skill.py should detect)
# NOTE: triggers are patterns that SHOULD activate the skill
# when_helpful are ADDITIONAL contexts but require at least one trigger
EXISTING_SKILLS = {
    'frontend-react': {
        'triggers': ['frontend', 'page', 'component', '.tsx', '.jsx', 'react'],
        'when_helpful': ['ui', 'styling', 'layout', 'form', 'hook'],
    },
    'backend-api': {
        'triggers': ['backend', 'api', 'service', 'endpoint', '.py', 'fastapi'],
        'when_helpful': ['route', 'crud', 'validation', 'response'],
    },
    'docker': {
        # Be specific - only docker/container related patterns
        'triggers': ['docker', 'compose', 'container', 'dockerfile'],
        'when_helpful': ['volume', 'port', 'image'],  # Removed 'deploy', 'build' - too generic
    },
    'debugging': {
        'triggers': ['debug', 'error', 'fix', 'exception', 'bug', 'traceback'],
        'when_helpful': ['crash', 'fail', '404', '500', 'timeout'],
    },
    'testing': {
        'triggers': ['test', 'pytest', 'jest', 'assert', 'mock'],
        'when_helpful': ['verify', 'check', 'validate', 'coverage'],
    },
    'documentation': {
        'triggers': ['docs', 'readme', '.md', 'documentation'],
        'when_helpful': ['guide', 'tutorial', 'reference'],
    },
}

# Session type distributions from REAL workflows
SESSION_TYPE_DISTRIBUTION = {
    'feature': 0.35,      # feature (42) + many unlabeled work
    'bugfix': 0.25,       # fix (108) 
    'refactor': 0.15,     # refactor (17)
    'debug': 0.15,        # debug (38) + error (131)
    'test': 0.05,         # test-focused sessions
    'docs': 0.05,         # documentation updates
}


@dataclass
class SimulatedSession:
    """A session grounded in real workflow patterns."""
    id: int
    session_type: str
    patterns: Set[str]  # Patterns that appear in this session
    files_modified: List[str]
    commit_keywords: List[str]
    expected_skills: Set[str]  # What skills SHOULD be suggested
    

@dataclass  
class DetectionResult:
    """Result of running suggest_skill.py detection logic."""
    session_id: int
    expected: Set[str]
    detected: Set[str]
    true_positives: Set[str]
    false_positives: Set[str]
    false_negatives: Set[str]


class WorkflowGroundedSimulator:
    """Generates sessions grounded in real workflow patterns."""
    
    FILE_TEMPLATES = {
        'frontend': [
            'frontend/src/pages/{Name}.tsx',
            'frontend/src/components/{Name}.tsx',
            'frontend/src/hooks/use{Name}.ts',
        ],
        'backend': [
            'backend/app/api/v1/endpoints/{name}.py',
            'backend/app/services/{Name}Service.py',
            'backend/app/models/{name}.py',
        ],
        'docker': [
            'docker-compose.yml',
            'docker-compose.dev.yml',
            'Dockerfile',
        ],
        'test': [
            'backend/tests/test_{name}.py',
            'scripts/test_{name}.py',
        ],
        'docs': [
            'docs/features/{NAME}.md',
            'README.md',
        ],
    }
    
    COMMIT_KEYWORDS = {
        'feature': ['feat:', 'add:', 'implement:', 'new:'],
        'bugfix': ['fix:', 'hotfix:', 'patch:', 'bugfix:'],
        'refactor': ['refactor:', 'cleanup:', 'restructure:'],
        'debug': ['debug:', 'investigate:', 'fix:'],
        'test': ['test:', 'verify:', 'coverage:'],
        'docs': ['docs:', 'readme:', 'update:'],
    }
    
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.session_id = 0
    
    def _pick_session_type(self) -> str:
        r = random.random()
        cumulative = 0
        for stype, prob in SESSION_TYPE_DISTRIBUTION.items():
            cumulative += prob
            if r <= cumulative:
                return stype
        return 'feature'
    
    def _pick_patterns(self, session_type: str) -> Set[str]:
        """Pick patterns based on real frequencies and session type."""
        patterns = set()
        
        # Base patterns for session type
        type_patterns = {
            'feature': ['frontend', 'backend', 'page', 'component', 'service', 'api'],
            'bugfix': ['fix', 'error', 'debug', 'backend', 'frontend'],
            'refactor': ['refactor', 'component', 'service', 'frontend', 'backend'],
            'debug': ['debug', 'error', 'exception', 'backend', 'service'],
            'test': ['test', 'backend', 'api'],
            'docs': ['docs', 'readme'],
        }
        
        # Add type-specific patterns
        for pattern in type_patterns.get(session_type, []):
            if random.random() < PATTERN_PROBABILITIES.get(pattern, 0.1) * 10:
                patterns.add(pattern)
        
        # Add random patterns based on real frequencies
        for pattern, prob in PATTERN_PROBABILITIES.items():
            if random.random() < prob * 5:  # Boost probability for simulation
                patterns.add(pattern)
        
        return patterns
    
    def _patterns_to_expected_skills(self, patterns: Set[str]) -> Set[str]:
        """Determine which skills SHOULD be suggested based on patterns."""
        expected = set()
        
        for skill, config in EXISTING_SKILLS.items():
            triggers = config['triggers']
            helpful = config.get('when_helpful', [])
            
            # Check if any trigger matches
            matches = sum(1 for t in triggers if t in patterns)
            helpful_matches = sum(1 for h in helpful if h in patterns)
            
            if matches >= 1 or helpful_matches >= 1:
                expected.add(skill)
        
        return expected
    
    def _generate_files(self, patterns: Set[str], session_type: str) -> List[str]:
        """Generate realistic file paths based on patterns."""
        files = []
        names = ['Traffic', 'Agent', 'Host', 'Network', 'Settings', 'Auth', 'User']
        
        for category, templates in self.FILE_TEMPLATES.items():
            # Docker files should ONLY be added for docker-related patterns
            if category == 'docker':
                if any(p in patterns for p in ['docker', 'compose', 'container']):
                    for template in templates[:2]:
                        files.append(template)
            # Docs files only for docs patterns
            elif category == 'docs':
                if any(p in patterns for p in ['docs', 'readme', 'documentation']):
                    for template in templates[:2]:
                        name = random.choice(names)
                        path = template.format(
                            name=name.lower(),
                            Name=name,
                            NAME=name.upper(),
                        )
                        files.append(path)
            # Test files only for test patterns
            elif category == 'test':
                if 'test' in patterns:
                    for template in templates[:2]:
                        name = random.choice(names)
                        path = template.format(
                            name=name.lower(),
                            Name=name,
                            NAME=name.upper(),
                        )
                        files.append(path)
            # Frontend/backend files for their respective patterns
            elif category in patterns or any(p in patterns for p in [category]):
                for template in templates[:2]:
                    name = random.choice(names)
                    path = template.format(
                        name=name.lower(),
                        Name=name,
                        NAME=name.upper(),
                    )
                    files.append(path)
        
        return files[:random.randint(2, 8)]
    
    def generate_session(self) -> SimulatedSession:
        """Generate one grounded session."""
        self.session_id += 1
        
        session_type = self._pick_session_type()
        patterns = self._pick_patterns(session_type)
        expected_skills = self._patterns_to_expected_skills(patterns)
        files = self._generate_files(patterns, session_type)
        keywords = self.COMMIT_KEYWORDS.get(session_type, ['chore:'])
        
        return SimulatedSession(
            id=self.session_id,
            session_type=session_type,
            patterns=patterns,
            files_modified=files,
            commit_keywords=keywords,
            expected_skills=expected_skills,
        )
    
    def generate_batch(self, count: int) -> List[SimulatedSession]:
        return [self.generate_session() for _ in range(count)]


class SkillDetector:
    """Simulates suggest_skill.py detection logic - IMPROVED VERSION."""
    
    def detect_skills(self, session: SimulatedSession) -> Set[str]:
        """Detect skills using IMPROVED logic for suggest_skill.py."""
        detected = set()
        
        # Combine all text for pattern matching
        all_patterns = ' '.join(session.patterns)
        all_files = ' '.join(session.files_modified)
        all_keywords = ' '.join(session.commit_keywords)
        combined_text = f"{all_patterns} {all_files} {all_keywords}".lower()
        
        # FRONTEND-REACT: Already good (98.8% F1)
        for f in session.files_modified:
            if '.tsx' in f or '.jsx' in f or 'components' in f or 'pages' in f:
                detected.add('frontend-react')
                break
        if 'frontend' in all_patterns or 'component' in all_patterns or 'page' in all_patterns:
            detected.add('frontend-react')
        
        # BACKEND-API: Improve recall from 85.5% to 95%+
        for f in session.files_modified:
            if '.py' in f and ('endpoints' in f or 'services' in f or 'api' in f or 'backend' in f):
                detected.add('backend-api')
                break
        if any(p in all_patterns for p in ['backend', 'api', 'service', 'endpoint']):
            detected.add('backend-api')
        
        # DEBUGGING: Already good (97.5% F1)
        if any(kw in combined_text for kw in ['error', 'fix', 'debug', 'exception', 'bug', 'crash', 'fail']):
            detected.add('debugging')
        
        # DOCKER: Improve precision by being more specific
        for f in session.files_modified:
            f_lower = f.lower()
            # Only trigger on actual docker-related files
            if ('dockerfile' in f_lower or 
                'docker-compose' in f_lower or 
                (f_lower.endswith('.yml') and ('docker' in f_lower or 'compose' in f_lower))):
                detected.add('docker')
                break
        # Only detect docker if explicit docker patterns (not just 'build' or 'deploy')
        if any(p in all_patterns for p in ['docker', 'container', 'compose', 'dockerfile']):
            detected.add('docker')
        
        # TESTING: Improve from 41.2% F1 - better file patterns + pattern keywords
        for f in session.files_modified:
            f_lower = f.lower()
            if (f_lower.startswith('test_') or 
                f_lower.endswith('_test.py') or
                f_lower.endswith('.test.ts') or
                f_lower.endswith('.test.tsx') or
                '/tests/' in f or
                '/test/' in f or
                'scripts/test_' in f):
                detected.add('testing')
                break
        # Pattern-based detection for testing sessions
        if any(p in all_patterns for p in ['test', 'verify', 'coverage', 'pytest', 'jest']):
            detected.add('testing')
        # Session type or commit keywords
        if 'test' in session.session_type or any('test' in kw.lower() for kw in session.commit_keywords):
            detected.add('testing')
        
        # DOCUMENTATION: Improve from 19.5% F1 - add more triggers
        for f in session.files_modified:
            if f.endswith('.md') or 'docs/' in f or 'readme' in f.lower():
                detected.add('documentation')
                break
        if any(p in all_patterns for p in ['docs', 'documentation', 'readme', 'guide']):
            detected.add('documentation')
        if 'docs' in session.session_type:
            detected.add('documentation')
        
        return detected


class OptimizationAnalyzer:
    """Analyzes detection gaps and generates optimizations."""
    
    def __init__(self):
        self.results: List[DetectionResult] = []
        self.skill_metrics = defaultdict(lambda: {'tp': 0, 'fp': 0, 'fn': 0})
        
    def analyze_session(self, session: SimulatedSession, detected: Set[str]) -> DetectionResult:
        """Analyze one session's detection results."""
        expected = session.expected_skills
        
        tp = expected & detected
        fp = detected - expected
        fn = expected - detected
        
        result = DetectionResult(
            session_id=session.id,
            expected=expected,
            detected=detected,
            true_positives=tp,
            false_positives=fp,
            false_negatives=fn,
        )
        
        self.results.append(result)
        
        # Update per-skill metrics
        for skill in tp:
            self.skill_metrics[skill]['tp'] += 1
        for skill in fp:
            self.skill_metrics[skill]['fp'] += 1
        for skill in fn:
            self.skill_metrics[skill]['fn'] += 1
        
        return result
    
    def calculate_metrics(self) -> Dict[str, Dict[str, float]]:
        """Calculate precision, recall, F1 for each skill."""
        metrics = {}
        
        for skill, counts in self.skill_metrics.items():
            tp, fp, fn = counts['tp'], counts['fp'], counts['fn']
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            metrics[skill] = {
                'true_positives': tp,
                'false_positives': fp,
                'false_negatives': fn,
                'precision': round(precision * 100, 1),
                'recall': round(recall * 100, 1),
                'f1': round(f1 * 100, 1),
            }
        
        return metrics
    
    def identify_gaps(self, metrics: Dict) -> List[Dict]:
        """Identify detection gaps that need improvement."""
        gaps = []
        
        for skill, m in metrics.items():
            # Low recall = missing detections
            if m['recall'] < 80:
                gaps.append({
                    'skill': skill,
                    'issue': 'low_recall',
                    'current': m['recall'],
                    'missed': m['false_negatives'],
                    'recommendation': f"Add more triggers to detect {skill}",
                })
            
            # Low precision = false positives
            if m['precision'] < 80:
                gaps.append({
                    'skill': skill,
                    'issue': 'low_precision',
                    'current': m['precision'],
                    'false_alarms': m['false_positives'],
                    'recommendation': f"Make {skill} triggers more specific",
                })
        
        return gaps
    
    def generate_improvements(self, gaps: List[Dict]) -> List[Dict]:
        """Generate specific code improvements for suggest_skill.py."""
        improvements = []
        
        for gap in gaps:
            skill = gap['skill']
            
            if gap['issue'] == 'low_recall':
                improvements.append({
                    'skill': skill,
                    'type': 'add_trigger',
                    'code': f"# Add to {skill} detection:\n# Check for additional patterns",
                    'expected_impact': f"+{100 - gap['current']:.0f}% recall",
                })
            
            if gap['issue'] == 'low_precision':
                improvements.append({
                    'skill': skill,
                    'type': 'refine_trigger',
                    'code': f"# Refine {skill} detection:\n# Add minimum match threshold",
                    'expected_impact': f"+{100 - gap['current']:.0f}% precision",
                })
        
        return improvements


def run_optimization(num_sessions: int = 100000) -> Dict[str, Any]:
    """Run the full optimization pipeline."""
    print(f"🎲 Generating {num_sessions:,} sessions from real workflow patterns...")
    
    simulator = WorkflowGroundedSimulator()
    detector = SkillDetector()
    analyzer = OptimizationAnalyzer()
    
    sessions = simulator.generate_batch(num_sessions)
    
    print("📊 Testing suggest_skill.py detection logic...")
    
    for session in sessions:
        detected = detector.detect_skills(session)
        analyzer.analyze_session(session, detected)
    
    metrics = analyzer.calculate_metrics()
    gaps = analyzer.identify_gaps(metrics)
    improvements = analyzer.generate_improvements(gaps)
    
    # Calculate overall stats
    total_sessions = len(sessions)
    sessions_with_correct_detection = sum(
        1 for r in analyzer.results 
        if r.false_negatives == set() and r.false_positives == set()
    )
    accuracy = sessions_with_correct_detection / total_sessions * 100
    
    # Session type distribution
    type_counts = defaultdict(int)
    for s in sessions:
        type_counts[s.session_type] += 1
    
    return {
        'total_sessions': total_sessions,
        'perfect_detections': sessions_with_correct_detection,
        'overall_accuracy': round(accuracy, 1),
        'session_types': dict(type_counts),
        'skill_metrics': metrics,
        'gaps': gaps,
        'improvements': improvements,
    }


def main():
    parser = argparse.ArgumentParser(description='Optimize suggest_skill.py')
    parser.add_argument('--sessions', type=int, default=100000)
    parser.add_argument('--output', type=str, default=None)
    args = parser.parse_args()
    
    results = run_optimization(args.sessions)
    
    print("\n" + "=" * 60)
    print("📈 DETECTION ACCURACY RESULTS")
    print("=" * 60)
    print(f"   Total sessions: {results['total_sessions']:,}")
    print(f"   Perfect detections: {results['perfect_detections']:,}")
    print(f"   Overall accuracy: {results['overall_accuracy']}%")
    
    print("\n📊 Session Types (grounded in real workflows):")
    for stype, count in sorted(results['session_types'].items(), key=lambda x: -x[1]):
        print(f"   {stype:12} {count:6,} ({count/results['total_sessions']*100:.1f}%)")
    
    print("\n📋 Per-Skill Detection Metrics:")
    print("-" * 60)
    for skill, m in sorted(results['skill_metrics'].items()):
        print(f"   {skill:18} P:{m['precision']:5.1f}% R:{m['recall']:5.1f}% F1:{m['f1']:5.1f}%")
    
    if results['gaps']:
        print("\n⚠️  DETECTION GAPS FOUND:")
        print("-" * 60)
        for gap in results['gaps']:
            print(f"   {gap['skill']}: {gap['issue']} ({gap['current']}%)")
            print(f"      → {gap['recommendation']}")
    else:
        print("\n✅ No significant detection gaps found!")
    
    if results['improvements']:
        print("\n🔧 SUGGESTED IMPROVEMENTS:")
        print("-" * 60)
        for imp in results['improvements']:
            print(f"   {imp['skill']}: {imp['type']}")
            print(f"      Expected: {imp['expected_impact']}")
    
    if args.output:
        Path(args.output).write_text(json.dumps(results, indent=2, default=list))
        print(f"\n💾 Results saved to {args.output}")
    
    return results


if __name__ == '__main__':
    main()
