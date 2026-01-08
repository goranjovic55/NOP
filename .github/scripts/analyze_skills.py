#!/usr/bin/env python3
"""
AKIS Skills Analyzer

Analyzes skill usage patterns, detects emergent skills, and measures effectiveness.
Simulates 100k sessions to validate skill improvements.

Usage:
    python .github/scripts/analyze_skills.py --full           # Complete analysis
    python .github/scripts/analyze_skills.py --parse-logs     # Parse workflow logs
    python .github/scripts/analyze_skills.py --simulate       # Run simulation
    python .github/scripts/analyze_skills.py --detect-emergent # Find missing skills
    python .github/scripts/analyze_skills.py --propose        # Propose new skills
    python .github/scripts/analyze_skills.py --apply          # Apply and remeasure
"""

import argparse
import json
import random
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# ============================================================================
# Configuration
# ============================================================================

LOG_DIR = Path("log/workflow")
SKILLS_DIR = Path(".github/skills")
ANALYSIS_DIR = Path("docs/analysis")
TEMPLATES_DIR = Path(".github/templates")

DEFAULT_SIMULATION_COUNT = 100000

# Current skills from INDEX.md (Agent Skills Standard format)
CURRENT_SKILLS = {
    "frontend-react/SKILL.md": {
        "triggers": [".tsx", ".jsx", "components/", "pages/"],
        "patterns": ["React", "JSX", "useState", "useEffect", "usePOV", "POV"],
        "errors_prevented": ["jsx_comment", "prop_drilling", "missing_key", "docker_compose_wrong"],
        "resolution_speedup": 1.4,  # 40% faster with skill
    },
    "backend-api/SKILL.md": {
        "triggers": [".py", "backend/", "endpoints/", "api/"],
        "patterns": ["FastAPI", "endpoint", "CRUD", "service", "WebSocket"],
        "errors_prevented": ["missing_import", "wrong_decorator", "async_error"],
        "resolution_speedup": 1.3,
    },
    "docker/SKILL.md": {
        "triggers": ["Dockerfile", "docker-compose", ".yml"],
        "patterns": ["Docker", "container", "compose", "volume", "network"],
        "errors_prevented": ["cache_issue", "port_conflict", "volume_mount"],
        "resolution_speedup": 1.5,
    },
    "debugging/SKILL.md": {
        "triggers": ["error", "exception", "failed", "traceback"],
        "patterns": ["Error", "Exception", "debug", "fix", "issue"],
        "errors_prevented": ["missed_root_cause", "wrong_fix", "regression"],
        "resolution_speedup": 1.6,
    },
    "documentation/SKILL.md": {
        "triggers": ["docs/", "README", ".md"],
        "patterns": ["document", "README", "guide", "tutorial"],
        "errors_prevented": ["wrong_location", "missing_link", "outdated_ref"],
        "resolution_speedup": 1.2,
    },
    "testing/SKILL.md": {
        "triggers": ["test_", "_test.py", ".test.", "pytest", "jest"],
        "patterns": ["test", "assert", "mock", "fixture"],
        "errors_prevented": ["flaky_test", "wrong_assertion", "missing_mock"],
        "resolution_speedup": 1.3,
    },
    "knowledge/SKILL.md": {
        "triggers": ["project_knowledge", "knowledge.json"],
        "patterns": ["knowledge", "project_knowledge", "context"],
        "errors_prevented": ["stale_context", "wrong_assumption"],
        "resolution_speedup": 1.2,
    },
}

# Session types distribution (from workflow log analysis)
SESSION_TYPES = {
    "frontend_only": 0.15,
    "backend_only": 0.08,
    "fullstack": 0.25,
    "docker_heavy": 0.08,
    "framework": 0.06,
    "docs_only": 0.04,
    # Emergent session types (detected from logs)
    "agent_dev": 0.12,      # 73 occurrences
    "testing": 0.08,        # 34 occurrences
    "pov_work": 0.05,       # 21 occurrences
    "deployment": 0.04,     # 19 occurrences
    "websocket": 0.03,      # 16 occurrences
    "socks_proxy": 0.02,    # 12 occurrences
}

# File types per session type
SESSION_FILES = {
    "frontend_only": [".tsx", ".tsx", ".jsx", ".css"],
    "backend_only": [".py", ".py", ".py"],
    "fullstack": [".tsx", ".py", ".tsx", ".py"],
    "docker_heavy": ["Dockerfile", "docker-compose.yml", ".py"],
    "framework": [".md", ".md", ".py"],
    "docs_only": [".md", ".md"],
    # Emergent session file patterns
    "agent_dev": ["agent.py", "agent.go", "test_agent.py", ".py"],
    "testing": ["test_.py", "test_.py", ".py", "pytest.ini"],
    "pov_work": ["POVContext.tsx", ".tsx", ".py", "pov_.py"],
    "deployment": ["deploy.sh", "Dockerfile", "docker-compose.yml"],
    "websocket": ["ws.py", "websocket.py", ".tsx", ".py"],
    "socks_proxy": ["socks.py", "proxy.py", ".py", "test_socks.py"],
}

# Error types that can occur
ERROR_TYPES = {
    ".tsx": ["jsx_comment", "prop_drilling", "missing_key", "wrong_import"],
    ".jsx": ["jsx_comment", "prop_drilling", "missing_key"],
    ".py": ["missing_import", "wrong_decorator", "async_error", "type_error"],
    "Dockerfile": ["cache_issue", "wrong_base", "missing_cmd"],
    "docker-compose.yml": ["port_conflict", "volume_mount", "network_error"],
    ".md": ["wrong_location", "missing_link", "outdated_ref"],
    # Emergent session error types
    "agent.py": ["agent_config_error", "agent_protocol_error", "agent_connection"],
    "agent.go": ["agent_build_error", "agent_protocol_error", "go_syntax"],
    "test_agent.py": ["test_setup_error", "assertion_error", "fixture_error"],
    "test_.py": ["test_setup_error", "assertion_error", "fixture_error"],
    "pytest.ini": ["config_error"],
    "POVContext.tsx": ["pov_context_error", "pov_hook_error", "jsx_comment"],
    "pov_.py": ["pov_filter_error", "pov_header_error"],
    "deploy.sh": ["deploy_script_error", "permission_error"],
    "ws.py": ["websocket_connect_error", "websocket_protocol_error"],
    "websocket.py": ["websocket_connect_error", "websocket_protocol_error"],
    "socks.py": ["socks_proxy_error", "socks_routing_error"],
    "proxy.py": ["socks_proxy_error", "proxy_config_error"],
    "test_socks.py": ["socks_test_error", "connection_error"],
}

# Skill loading probabilities (current agent behavior)
SKILL_PROBS = {
    "trigger_recognized": 0.90,
    "skill_loaded": 0.85,
    "skill_applied": 0.80,
    "error_prevented": 0.75,
}

# Per-skill compliance rates (based on workflow log analysis)
# These represent how often the agent actually loads a skill when triggered
SKILL_COMPLIANCE = {
    "frontend-react/SKILL.md": 0.72,    # Often skipped for "quick" UI fixes
    "backend-api/SKILL.md": 0.68,       # Frequently bypassed for simple endpoints
    "docker/SKILL.md": 0.85,            # Usually loaded (errors are visible)
    "debugging/SKILL.md": 0.45,         # Often forgotten during error handling
    "documentation/SKILL.md": 0.40,     # Rarely loaded for doc edits
    "testing/SKILL.md": 0.55,           # Moderate adoption
    "knowledge/SKILL.md": 0.78,         # Loaded at session start usually
}

# Enforcement levels for skills
ENFORCEMENT_LEVELS = {
    "mandatory": 0.95,    # Must load - critical for domain
    "recommended": 0.80,  # Should load - helpful patterns
    "optional": 0.60,     # Can load - nice to have
}

# ============================================================================
# Workflow Log Parser
# ============================================================================

@dataclass
class SkillAnalysis:
    total_logs: int = 0
    skill_mentions: Dict[str, int] = field(default_factory=dict)
    file_patterns: Dict[str, int] = field(default_factory=dict)
    missed_triggers: Dict[str, int] = field(default_factory=dict)
    error_patterns: Dict[str, int] = field(default_factory=dict)
    emergent_patterns: Dict[str, int] = field(default_factory=dict)
    cross_domain: Dict[str, int] = field(default_factory=dict)


def parse_workflow_logs() -> SkillAnalysis:
    """Parse workflow logs for skill patterns."""
    analysis = SkillAnalysis()
    
    logs = list(LOG_DIR.glob("*.md"))
    logs = [l for l in logs if l.name != "README.md"]
    analysis.total_logs = len(logs)
    
    if analysis.total_logs == 0:
        print("⚠️  No workflow logs found in log/workflow/")
        return analysis
    
    for log_path in logs:
        try:
            content = log_path.read_text()
        except Exception:
            continue
        
        # Track skills mentioned
        for skill in CURRENT_SKILLS:
            skill_name = skill.replace(".md", "")
            if re.search(rf'{skill_name}|{skill}', content, re.I):
                analysis.skill_mentions[skill] = analysis.skill_mentions.get(skill, 0) + 1
        
        # Extract file patterns
        file_matches = re.findall(r'`([^`]+\.(tsx|py|md|yml|json|ts|jsx|css))`', content)
        for _, ext in file_matches:
            analysis.file_patterns[f".{ext}"] = analysis.file_patterns.get(f".{ext}", 0) + 1
        
        # Find missed skill triggers (edited file but no skill mention)
        for skill, config in CURRENT_SKILLS.items():
            for trigger in config["triggers"]:
                if re.search(re.escape(trigger), content) and skill not in content:
                    key = f"{trigger} → {skill}"
                    analysis.missed_triggers[key] = analysis.missed_triggers.get(key, 0) + 1
        
        # Error patterns
        error_keywords = [
            ("jsx", "jsx_comment"), ("import", "import_error"),
            ("docker", "docker_error"), ("cache", "cache_issue"),
            ("type", "type_error"), ("async", "async_error"),
        ]
        for keyword, error_type in error_keywords:
            if re.search(rf'{keyword}.*error|error.*{keyword}', content, re.I):
                analysis.error_patterns[error_type] = analysis.error_patterns.get(error_type, 0) + 1
        
        # Emergent patterns (things that appear often but have no skill)
        emergent_keywords = [
            ("websocket", "WebSocket handling"),
            ("auth", "Authentication"),
            ("test", "Testing patterns"),
            ("migration", "Database migrations"),
            ("deploy", "Deployment"),
            ("agent", "Agent development"),
            ("socks", "SOCKS proxy"),
            ("pov", "POV filtering"),
        ]
        for keyword, pattern_name in emergent_keywords:
            if re.search(rf'\b{keyword}\b', content, re.I):
                analysis.emergent_patterns[pattern_name] = analysis.emergent_patterns.get(pattern_name, 0) + 1
        
        # Cross-domain patterns
        domains_in_log = []
        if re.search(r'\.tsx|\.jsx|react|component', content, re.I):
            domains_in_log.append("frontend")
        if re.search(r'\.py|backend|api|endpoint', content, re.I):
            domains_in_log.append("backend")
        if re.search(r'docker|container|compose', content, re.I):
            domains_in_log.append("docker")
        
        if len(domains_in_log) >= 2:
            combo = "+".join(sorted(domains_in_log))
            analysis.cross_domain[combo] = analysis.cross_domain.get(combo, 0) + 1
    
    return analysis


def print_log_analysis(analysis: SkillAnalysis):
    """Print skill analysis from logs."""
    print("\n" + "=" * 70)
    print("SKILL USAGE ANALYSIS FROM WORKFLOW LOGS")
    print("=" * 70)
    
    print(f"\n📁 Analyzed {analysis.total_logs} workflow logs")
    
    print(f"\n📚 Skill Mentions:")
    for skill, count in sorted(analysis.skill_mentions.items(), key=lambda x: -x[1]):
        pct = count / analysis.total_logs * 100
        print(f"   {skill:25} {count:3} ({pct:.0f}%)")
    
    print(f"\n📂 File Pattern Frequency:")
    for ext, count in sorted(analysis.file_patterns.items(), key=lambda x: -x[1]):
        print(f"   {ext:8} {count:3}x")
    
    if analysis.missed_triggers:
        print(f"\n⚠️  Missed Skill Triggers:")
        for trigger, count in sorted(analysis.missed_triggers.items(), key=lambda x: -x[1])[:10]:
            print(f"   {trigger:40} {count}x")
    
    print(f"\n🔴 Error Patterns:")
    for error, count in sorted(analysis.error_patterns.items(), key=lambda x: -x[1]):
        print(f"   {error:20} {count}")
    
    print(f"\n🌱 Emergent Patterns (potential skills):")
    for pattern, count in sorted(analysis.emergent_patterns.items(), key=lambda x: -x[1]):
        status = "📍" if count >= 10 else "👀" if count >= 5 else "  "
        print(f"   {status} {pattern:25} {count:3}x")
    
    print(f"\n🔗 Cross-Domain Work:")
    for combo, count in sorted(analysis.cross_domain.items(), key=lambda x: -x[1]):
        print(f"   {combo:30} {count}")


# ============================================================================
# Session Simulator
# ============================================================================

@dataclass
class SessionResult:
    files_edited: List[str] = field(default_factory=list)
    skills_triggered: List[str] = field(default_factory=list)
    skills_loaded: List[str] = field(default_factory=list)
    skills_applied: List[str] = field(default_factory=list)
    skills_skipped: List[str] = field(default_factory=list)  # Triggered but not loaded
    errors_possible: List[str] = field(default_factory=list)
    errors_prevented: List[str] = field(default_factory=list)
    errors_occurred: List[str] = field(default_factory=list)
    errors_from_skipped_skill: List[str] = field(default_factory=list)  # Errors that skill would have prevented
    resolution_time: float = 0.0
    resolution_time_no_skill: float = 0.0
    compliance_violations: List[str] = field(default_factory=list)


class SkillSimulator:
    def __init__(self, skills: Dict, probs: Dict, compliance: Dict = None, seed: int = 42):
        random.seed(seed)
        self.skills = skills
        self.probs = probs
        self.compliance = compliance or SKILL_COMPLIANCE
        self.result = SessionResult()
    
    def _occurs(self, key: str) -> bool:
        return random.random() < self.probs.get(key, 0.5)
    
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def _get_matching_skill(self, file_ext: str) -> Optional[str]:
        """Find skill that matches file extension."""
        for skill, config in self.skills.items():
            for trigger in config["triggers"]:
                if trigger in file_ext or file_ext in trigger:
                    return skill
        return None
    
    def simulate(self) -> SessionResult:
        session_type = self._choose(SESSION_TYPES)
        files = SESSION_FILES.get(session_type, [".py"])
        
        base_time = 10.0  # Base resolution time in arbitrary units
        
        for file_ext in files:
            self.result.files_edited.append(file_ext)
            
            # Check skill trigger
            matching_skill = self._get_matching_skill(file_ext)
            
            if matching_skill:
                self.result.skills_triggered.append(matching_skill)
                
                # Use per-skill compliance rate instead of generic probability
                skill_compliance_rate = self.compliance.get(matching_skill, 0.70)
                
                if self._occurs("trigger_recognized"):
                    # Agent decides whether to load skill based on compliance behavior
                    if random.random() < skill_compliance_rate:
                        self.result.skills_loaded.append(matching_skill)
                        
                        if self._occurs("skill_applied"):
                            self.result.skills_applied.append(matching_skill)
                    else:
                        # Skill was triggered but agent skipped it
                        self.result.skills_skipped.append(matching_skill)
                        self.result.compliance_violations.append(
                            f"Skipped {matching_skill} for {file_ext}"
                        )
            
            # Generate possible errors
            possible_errors = ERROR_TYPES.get(file_ext, [])
            for error in possible_errors:
                if random.random() < 0.3:  # 30% chance each error type
                    self.result.errors_possible.append(error)
                    
                    # Check if skill prevents error
                    skill_loaded = matching_skill in self.result.skills_loaded
                    skill_skipped = matching_skill in self.result.skills_skipped
                    skill_prevents = matching_skill and error in self.skills.get(matching_skill, {}).get("errors_prevented", [])
                    
                    if skill_loaded and skill_prevents and self._occurs("error_prevented"):
                        self.result.errors_prevented.append(error)
                    else:
                        self.result.errors_occurred.append(error)
                        # Track errors that would have been prevented if skill was loaded
                        if skill_skipped and skill_prevents:
                            self.result.errors_from_skipped_skill.append(error)
            
            # Calculate resolution time
            speedup = 1.0
            if matching_skill and matching_skill in self.result.skills_applied:
                speedup = self.skills.get(matching_skill, {}).get("resolution_speedup", 1.0)
            
            task_time = base_time * (1 + random.random())  # Some variance
            self.result.resolution_time += task_time / speedup
            self.result.resolution_time_no_skill += task_time
        
        return self.result


def run_simulation(skills: Dict, probs: Dict, count: int = 100000, seed: int = 42) -> Dict:
    """Run batch skill simulation."""
    random.seed(seed)
    
    results = {
        "total": count,
        "coverage": {"triggered": 0, "loaded": 0, "applied": 0},
        "errors": {"possible": 0, "prevented": 0, "occurred": 0},
        "timing": {"with_skill": 0.0, "without_skill": 0.0},
        "skill_usage": defaultdict(int),
        "error_types": defaultdict(int),
        # Compliance tracking
        "compliance": {
            "skills_skipped": defaultdict(int),  # Per-skill skip count
            "errors_from_skipped": defaultdict(int),  # Errors caused by skipping
            "total_skipped": 0,
            "total_errors_from_skipped": 0,
        },
    }
    
    for i in range(count):
        sim = SkillSimulator(skills, probs, SKILL_COMPLIANCE, seed + i)
        r = sim.simulate()
        
        results["coverage"]["triggered"] += len(r.skills_triggered)
        results["coverage"]["loaded"] += len(r.skills_loaded)
        results["coverage"]["applied"] += len(r.skills_applied)
        
        results["errors"]["possible"] += len(r.errors_possible)
        results["errors"]["prevented"] += len(r.errors_prevented)
        results["errors"]["occurred"] += len(r.errors_occurred)
        
        results["timing"]["with_skill"] += r.resolution_time
        results["timing"]["without_skill"] += r.resolution_time_no_skill
        
        for skill in r.skills_loaded:
            results["skill_usage"][skill] += 1
        
        for error in r.errors_occurred:
            results["error_types"][error] += 1
        
        # Track compliance violations
        for skill in r.skills_skipped:
            results["compliance"]["skills_skipped"][skill] += 1
            results["compliance"]["total_skipped"] += 1
        
        for error in r.errors_from_skipped_skill:
            # Extract skill name from error if present
            parts = error.split(":")
            if len(parts) >= 2:
                skill = parts[0].strip()
                results["compliance"]["errors_from_skipped"][skill] += 1
            results["compliance"]["total_errors_from_skipped"] += 1
    
    # Calculate metrics
    if results["coverage"]["triggered"] > 0:
        results["load_rate"] = results["coverage"]["loaded"] / results["coverage"]["triggered"] * 100
        results["apply_rate"] = results["coverage"]["applied"] / results["coverage"]["triggered"] * 100
    else:
        results["load_rate"] = 0
        results["apply_rate"] = 0
    
    if results["errors"]["possible"] > 0:
        results["prevention_rate"] = results["errors"]["prevented"] / results["errors"]["possible"] * 100
    else:
        results["prevention_rate"] = 0
    
    if results["timing"]["without_skill"] > 0:
        results["speedup"] = results["timing"]["without_skill"] / results["timing"]["with_skill"]
    else:
        results["speedup"] = 1.0
    
    # Calculate compliance rates per skill
    results["compliance"]["rates"] = {}
    for skill in SKILL_COMPLIANCE.keys():
        loaded = results["skill_usage"].get(skill, 0)
        skipped = results["compliance"]["skills_skipped"].get(skill, 0)
        total_triggered = loaded + skipped
        if total_triggered > 0:
            results["compliance"]["rates"][skill] = loaded / total_triggered * 100
        else:
            results["compliance"]["rates"][skill] = 100.0  # No triggers = perfect
    
    return results


def print_simulation_results(results: Dict, label: str = ""):
    """Print simulation results."""
    print("\n" + "=" * 70)
    print(f"SKILL SIMULATION RESULTS {label}")
    print("=" * 70)
    
    print(f"\n📊 Overview ({results['total']:,} sessions):")
    print(f"   Skills triggered: {results['coverage']['triggered']:,}")
    print(f"   Skills loaded: {results['coverage']['loaded']:,} ({results['load_rate']:.1f}%)")
    print(f"   Skills applied: {results['coverage']['applied']:,} ({results['apply_rate']:.1f}%)")
    
    print(f"\n🛡️ Error Prevention:")
    print(f"   Possible errors: {results['errors']['possible']:,}")
    print(f"   Errors prevented: {results['errors']['prevented']:,} ({results['prevention_rate']:.1f}%)")
    print(f"   Errors occurred: {results['errors']['occurred']:,}")
    
    # NEW: Compliance section
    compliance = results.get("compliance", {})
    if compliance:
        print(f"\n⚠️ Skill Compliance:")
        print(f"   Total skills skipped: {compliance.get('total_skipped', 0):,}")
        print(f"   Errors from skipped: {compliance.get('total_errors_from_skipped', 0):,}")
        
        rates = compliance.get("rates", {})
        if rates:
            print(f"\n📋 Per-Skill Compliance Rates:")
            # Sort by compliance rate (lowest first - these need attention)
            for skill, rate in sorted(rates.items(), key=lambda x: x[1]):
                loaded = results["skill_usage"].get(skill, 0)
                skipped = compliance["skills_skipped"].get(skill, 0)
                errors_caused = compliance["errors_from_skipped"].get(skill, 0)
                
                # Determine status indicator
                if rate >= 80:
                    status = "✅"
                elif rate >= 60:
                    status = "🟡"
                else:
                    status = "🔴"
                
                target = ENFORCEMENT_LEVELS.get(
                    "mandatory" if skill in ["debugging.md", "docker.md"] else "recommended",
                    0.80
                ) * 100
                gap = target - rate
                
                print(f"   {status} {skill:25} {rate:5.1f}% (target: {target:.0f}%, gap: {gap:+.1f}%)")
                if errors_caused > 0:
                    print(f"      └─ ⚡ {errors_caused:,} errors caused by skipping")
        
        # Enforcement recommendations
        print(f"\n💡 Enforcement Recommendations:")
        for skill, rate in sorted(rates.items(), key=lambda x: x[1]):
            target = ENFORCEMENT_LEVELS.get("recommended", 0.80) * 100
            gap = target - rate
            errors_caused = compliance["errors_from_skipped"].get(skill, 0)
            
            if gap > 20 and errors_caused > 100:
                print(f"   🔴 {skill}: Add MANDATORY trigger (gap: {gap:.0f}%, {errors_caused:,} errors)")
            elif gap > 15:
                print(f"   🟡 {skill}: Strengthen trigger wording (gap: {gap:.0f}%)")
            elif gap > 10:
                print(f"   👀 {skill}: Monitor compliance (gap: {gap:.0f}%)")
    
    print(f"\n⏱️ Resolution Speed:")
    print(f"   Speedup factor: {results['speedup']:.2f}x ({(results['speedup']-1)*100:.0f}% faster)")
    
    print(f"\n📚 Skill Usage:")
    for skill, count in sorted(results["skill_usage"].items(), key=lambda x: -x[1]):
        print(f"   {skill:25} {count:,}x")
    
    print(f"\n🔴 Remaining Errors:")
    for error, count in sorted(results["error_types"].items(), key=lambda x: -x[1])[:8]:
        print(f"   {error:20} {count:,}")


# ============================================================================
# Emergent Pattern Detection
# ============================================================================

@dataclass
class EmergentSkill:
    name: str
    triggers: List[str]
    patterns: List[str]
    occurrences: int
    proposed_errors: List[str]


def detect_emergent_patterns(log_analysis: SkillAnalysis) -> List[EmergentSkill]:
    """Detect patterns that need new skills."""
    emergent = []
    
    # Patterns with high occurrence
    for pattern, count in log_analysis.emergent_patterns.items():
        if count >= 5:  # Threshold for consideration
            skill = EmergentSkill(
                name=pattern.lower().replace(" ", "-") + ".md",
                triggers=[pattern.lower()],
                patterns=[pattern],
                occurrences=count,
                proposed_errors=[f"{pattern.lower()}_error"],
            )
            
            # Check if we already have a skill for this
            has_skill = any(
                pattern.lower() in " ".join(config["patterns"]).lower()
                for config in CURRENT_SKILLS.values()
            )
            
            if not has_skill:
                emergent.append(skill)
    
    # Cross-domain patterns
    for combo, count in log_analysis.cross_domain.items():
        if count >= 5 and "+" in combo:
            domains = combo.split("+")
            skill = EmergentSkill(
                name=f"{'-'.join(domains)}-integration.md",
                triggers=domains,
                patterns=[f"{d} + {d2}" for d, d2 in zip(domains, domains[1:])],
                occurrences=count,
                proposed_errors=[f"{combo.replace('+', '_')}_mismatch"],
            )
            emergent.append(skill)
    
    return emergent


def print_emergent_patterns(emergent: List[EmergentSkill]):
    """Print emergent skill patterns."""
    print("\n" + "=" * 70)
    print("EMERGENT SKILL PATTERNS")
    print("=" * 70)
    
    if not emergent:
        print("\n✅ No emergent patterns detected")
        return
    
    print(f"\n🌱 {len(emergent)} potential new skills detected:\n")
    
    for skill in sorted(emergent, key=lambda x: -x.occurrences):
        status = "🔴 CREATE" if skill.occurrences >= 10 else "🟡 CONSIDER" if skill.occurrences >= 5 else "👀 MONITOR"
        print(f"   {status} {skill.name}")
        print(f"      Occurrences: {skill.occurrences}")
        print(f"      Triggers: {', '.join(skill.triggers)}")
        print()


# ============================================================================
# Skill Proposal & Measurement
# ============================================================================

def measure_skill_impact(emergent: EmergentSkill, count: int = 100000) -> Tuple[Dict, Dict]:
    """Measure impact of adding a proposed skill."""
    
    # Map emergent patterns to specific file triggers and errors
    EMERGENT_CONFIGS = {
        "agent-development.md": {
            "triggers": ["agent.py", "agent.go", "test_agent.py"],
            "errors_prevented": ["agent_config_error", "agent_protocol_error", "agent_connection", "agent_build_error"],
            "resolution_speedup": 1.5,
        },
        "testing-patterns.md": {
            "triggers": ["test_.py", "pytest.ini"],
            "errors_prevented": ["test_setup_error", "assertion_error", "fixture_error"],
            "resolution_speedup": 1.4,
        },
        "pov-filtering.md": {
            "triggers": ["POVContext.tsx", "pov_.py"],
            "errors_prevented": ["pov_context_error", "pov_hook_error", "pov_filter_error", "pov_header_error"],
            "resolution_speedup": 1.6,
        },
        "deployment.md": {
            "triggers": ["deploy.sh", "Dockerfile"],
            "errors_prevented": ["deploy_script_error", "permission_error"],
            "resolution_speedup": 1.3,
        },
        "websocket-handling.md": {
            "triggers": ["ws.py", "websocket.py"],
            "errors_prevented": ["websocket_connect_error", "websocket_protocol_error"],
            "resolution_speedup": 1.5,
        },
        "socks-proxy.md": {
            "triggers": ["socks.py", "proxy.py", "test_socks.py"],
            "errors_prevented": ["socks_proxy_error", "socks_routing_error", "socks_test_error", "proxy_config_error"],
            "resolution_speedup": 1.4,
        },
    }
    
    # Without proposed skill
    baseline = run_simulation(CURRENT_SKILLS, SKILL_PROBS, count)
    
    # With proposed skill - use proper config if available
    enhanced_skills = CURRENT_SKILLS.copy()
    
    if emergent.name in EMERGENT_CONFIGS:
        config = EMERGENT_CONFIGS[emergent.name]
        enhanced_skills[emergent.name] = {
            "triggers": config["triggers"],
            "patterns": emergent.patterns,
            "errors_prevented": config["errors_prevented"],
            "resolution_speedup": config["resolution_speedup"],
        }
    else:
        enhanced_skills[emergent.name] = {
            "triggers": emergent.triggers,
            "patterns": emergent.patterns,
            "errors_prevented": emergent.proposed_errors,
            "resolution_speedup": 1.3,
        }
    
    with_skill = run_simulation(enhanced_skills, SKILL_PROBS, count)
    
    return baseline, with_skill


def print_skill_proposal(emergent: EmergentSkill, baseline: Dict, with_skill: Dict):
    """Print skill proposal with before/after comparison."""
    print(f"\n📋 Proposed Skill: {emergent.name}")
    print("-" * 50)
    
    prevention_delta = with_skill["prevention_rate"] - baseline["prevention_rate"]
    speedup_delta = with_skill["speedup"] - baseline["speedup"]
    errors_delta = baseline["errors"]["occurred"] - with_skill["errors"]["occurred"]
    
    print(f"""
┌─────────────────────────┬──────────┬──────────┬──────────┐
│ Metric                  │ Without  │ With     │ Change   │
├─────────────────────────┼──────────┼──────────┼──────────┤
│ Error Prevention        │ {baseline['prevention_rate']:>5.1f}%   │ {with_skill['prevention_rate']:>5.1f}%   │ {prevention_delta:>+5.1f}%  │
│ Resolution Speedup      │ {baseline['speedup']:>5.2f}x   │ {with_skill['speedup']:>5.2f}x   │ {speedup_delta:>+5.2f}x  │
│ Errors Occurred         │ {baseline['errors']['occurred']:>6,}  │ {with_skill['errors']['occurred']:>6,}  │ {errors_delta:>+6,}  │
└─────────────────────────┴──────────┴──────────┴──────────┘
""")
    
    if prevention_delta > 1.0 or errors_delta > 100:
        print(f"   ✅ RECOMMENDED: Measurable improvement detected")
    else:
        print(f"   ⚠️  MARGINAL: Limited improvement - monitor pattern")


def generate_skill_template(emergent: EmergentSkill) -> str:
    """Generate skill file template."""
    return f"""# {emergent.name.replace('.md', '').replace('-', ' ').title()}

## Critical Rules
- TODO: Add domain-specific rules

## Avoid
- ❌ Bad pattern → ✅ Good pattern

## Patterns

### Basic Pattern
```
# TODO: Add code example
```

---
*Auto-generated from {emergent.occurrences} workflow log occurrences*
"""


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='AKIS Skills Analyzer')
    parser.add_argument('--parse-logs', action='store_true', help='Parse workflow logs')
    parser.add_argument('--simulate', action='store_true', help='Run simulation')
    parser.add_argument('--detect-emergent', action='store_true', help='Detect emergent patterns')
    parser.add_argument('--propose', action='store_true', help='Propose new skills')
    parser.add_argument('--apply', action='store_true', help='Apply and remeasure')
    parser.add_argument('--full', action='store_true', help='Full analysis')
    parser.add_argument('--count', type=int, default=DEFAULT_SIMULATION_COUNT, help='Simulation count')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    args = parser.parse_args()
    
    if args.full:
        args.parse_logs = True
        args.simulate = True
        args.detect_emergent = True
        args.propose = True
    
    if not any([args.parse_logs, args.simulate, args.detect_emergent, args.propose, args.apply]):
        args.full = True
        args.parse_logs = True
        args.simulate = True
        args.detect_emergent = True
        args.propose = True
    
    print("=" * 70)
    print("AKIS SKILLS ANALYZER")
    print("=" * 70)
    print(f"\n📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"🔢 Simulation Count: {args.count:,}")
    print(f"📚 Current Skills: {len(CURRENT_SKILLS)}")
    
    log_analysis = None
    emergent = []
    
    # Step 1: Parse logs
    if args.parse_logs:
        log_analysis = parse_workflow_logs()
        print_log_analysis(log_analysis)
    
    # Step 2: Simulate current skills
    if args.simulate:
        print(f"\n🎲 Running {args.count:,} session simulations...")
        sim_results = run_simulation(CURRENT_SKILLS, SKILL_PROBS, args.count)
        print_simulation_results(sim_results, "(Current Skills)")
    
    # Step 3: Detect emergent patterns
    if args.detect_emergent:
        if log_analysis is None:
            log_analysis = parse_workflow_logs()
        emergent = detect_emergent_patterns(log_analysis)
        print_emergent_patterns(emergent)
    
    # Step 4: Propose new skills with measurement
    if args.propose and emergent:
        print("\n" + "=" * 70)
        print("SKILL PROPOSALS WITH IMPACT MEASUREMENT")
        print("=" * 70)
        
        # Only measure top 3 emergent patterns
        top_emergent = sorted(emergent, key=lambda x: -x.occurrences)[:3]
        
        for skill in top_emergent:
            if skill.occurrences >= 5:
                print(f"\n🔬 Measuring impact of: {skill.name}")
                baseline, with_skill = measure_skill_impact(skill, min(args.count, 10000))
                print_skill_proposal(skill, baseline, with_skill)
                
                print("\n📝 Generated Template:")
                print("-" * 40)
                template = generate_skill_template(skill)
                print(template[:500] + "...")
    
    # Step 5: Apply (save templates)
    if args.apply and emergent:
        print("\n" + "=" * 70)
        print("APPLYING SKILL IMPROVEMENTS")
        print("=" * 70)
        
        created = []
        for skill in emergent:
            if skill.occurrences >= 10:
                template = generate_skill_template(skill)
                skill_path = SKILLS_DIR / skill.name
                
                if not skill_path.exists():
                    skill_path.write_text(template)
                    created.append(skill.name)
                    print(f"   ✅ Created: {skill.name}")
        
        if created:
            print(f"\n📁 Created {len(created)} new skill files")
            print("   Remember to update INDEX.md!")
        else:
            print("\n✅ No new skills needed")
    
    # Output JSON if requested
    if args.json:
        ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
        output_file = ANALYSIS_DIR / f"skills-analysis-{datetime.now().strftime('%Y-%m-%d')}.json"
        
        json_data = {
            "date": datetime.now().isoformat(),
            "current_skills": list(CURRENT_SKILLS.keys()),
            "emergent_patterns": [
                {"name": e.name, "occurrences": e.occurrences, "triggers": e.triggers}
                for e in emergent
            ] if emergent else [],
        }
        
        with open(output_file, 'w') as f:
            json.dump(json_data, f, indent=2)
        print(f"\n📄 Results saved to: {output_file}")
    
    print("\n" + "=" * 70)
    print("ANALYSIS COMPLETE")
    print("=" * 70)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
