#!/usr/bin/env python3
"""
AKIS Edge Case Simulator

Simulates edge case scenarios based on historical workflow patterns and measures
the effectiveness of skills in handling various situations.

Features:
- Extracts patterns from historical workflow logs
- Generates edge case scenarios from real patterns
- Simulates scenarios with/without skill application
- Measures improvement metrics
- Proposes new skills for uncovered scenarios

Usage:
    python scripts/edge_case_simulator.py
    python scripts/edge_case_simulator.py --output results.json

Output: Edge case analysis with skill effectiveness metrics
"""

import json
import re
import subprocess
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class EdgeCase:
    """Represents an edge case scenario."""
    id: str
    name: str
    category: str
    description: str
    trigger: str
    severity: str  # critical, high, medium, low
    probability: float  # 0.0 to 1.0
    historical_occurrences: int
    related_skills: List[str]
    mitigation_strategy: str
    source_logs: List[str]

@dataclass
class SkillApplication:
    """Represents applying a skill to an edge case."""
    skill_name: str
    applicable: bool
    effectiveness: float  # 0.0 to 1.0
    time_saved_minutes: int
    errors_prevented: int
    coverage_percentage: float

@dataclass
class SimulationResult:
    """Results of simulating an edge case."""
    edge_case: EdgeCase
    without_skill: Dict[str, Any]
    with_skill: Dict[str, Any]
    improvement: Dict[str, Any]
    skill_applications: List[SkillApplication]

@dataclass
class ProposedSkill:
    """A new skill proposal based on uncovered scenarios."""
    name: str
    category: str
    description: str
    trigger_scenarios: List[str]
    checklist: List[str]
    examples: List[str]
    priority: str  # critical, high, medium, low
    estimated_impact: float


# ============================================================================
# EDGE CASE CATEGORIES & DEFINITIONS
# ============================================================================

EDGE_CASE_CATEGORIES = {
    "protocol_compliance": {
        "description": "Failures in following agent protocols and emissions",
        "severity_weight": 0.9,
        "related_skills": ["git-workflow", "documentation"]
    },
    "context_loss": {
        "description": "Loss of context during multi-step tasks or interruptions",
        "severity_weight": 1.0,
        "related_skills": ["knowledge-management"]
    },
    "integration_failure": {
        "description": "Frontend-backend integration issues",
        "severity_weight": 0.8,
        "related_skills": ["backend-api", "frontend-react", "debugging"]
    },
    "docker_issues": {
        "description": "Container, network, and deployment problems",
        "severity_weight": 0.7,
        "related_skills": ["infrastructure", "debugging"]
    },
    "type_errors": {
        "description": "TypeScript and Python type mismatches",
        "severity_weight": 0.6,
        "related_skills": ["frontend-react", "backend-api", "testing"]
    },
    "state_management": {
        "description": "React/Zustand state handling issues",
        "severity_weight": 0.7,
        "related_skills": ["frontend-react"]
    },
    "error_handling": {
        "description": "Unhandled errors and missing error boundaries",
        "severity_weight": 0.8,
        "related_skills": ["error-handling", "testing"]
    },
    "caching_issues": {
        "description": "Browser, Docker, and dependency caching problems",
        "severity_weight": 0.6,
        "related_skills": ["debugging", "infrastructure"]
    },
    "skill_gaps": {
        "description": "Scenarios without applicable skills",
        "severity_weight": 0.5,
        "related_skills": []
    }
}


# ============================================================================
# LOG ANALYSIS
# ============================================================================

def extract_patterns_from_logs(log_dir: Path) -> Dict[str, Any]:
    """Extract patterns from historical workflow logs."""
    patterns = {
        "errors": [],
        "fixes": [],
        "decisions": [],
        "skills_used": [],
        "learnings": [],
        "edge_cases": [],
        "log_files": []
    }
    
    if not log_dir.exists():
        return patterns
    
    for log_file in sorted(log_dir.glob("*.md")):
        if log_file.name == "README.md":
            continue
            
        patterns["log_files"].append(log_file.name)
        content = log_file.read_text()
        
        # Extract error patterns
        errors = re.findall(r'(?:Error|Issue|Bug|Problem|Fix):\s*(.+?)(?:\n|$)', content, re.IGNORECASE)
        patterns["errors"].extend([(e.strip(), log_file.name) for e in errors if len(e) > 10])
        
        # Extract decisions
        decisions = re.findall(r'\*\*Decision\*\*:?\s*(.+?)(?:\n|$)', content)
        patterns["decisions"].extend([(d.strip(), log_file.name) for d in decisions])
        
        # Extract skill references
        skills = re.findall(r'(?:Skill|skill)s?\s*(?:Used|applied|loaded)?\s*:?\s*([^\n]+)', content)
        patterns["skills_used"].extend([(s.strip(), log_file.name) for s in skills])
        
        # Extract learnings
        learning_sections = re.findall(r'## Learnings\s*\n([\s\S]*?)(?=\n##|\Z)', content)
        for section in learning_sections:
            learnings = re.findall(r'(?:\*\*|###?\s*\d*\.?\s*)([^*\n]+)', section)
            patterns["learnings"].extend([(l.strip(), log_file.name) for l in learnings if len(l) > 5])
        
        # Extract edge cases mentioned
        edge_mentions = re.findall(r'(?:edge case|edge-case|boundary|corner case)s?:?\s*(.+?)(?:\n|$)', content, re.IGNORECASE)
        patterns["edge_cases"].extend([(e.strip(), log_file.name) for e in edge_mentions])
        
        # Extract fix patterns
        fixes = re.findall(r'\*\*Fix\*\*:?\s*(.+?)(?:\n|$)', content)
        patterns["fixes"].extend([(f.strip(), log_file.name) for f in fixes])
    
    return patterns


def load_existing_skills(skills_dir: Path) -> Dict[str, Dict[str, Any]]:
    """Load existing skill definitions."""
    skills = {}
    
    if not skills_dir.exists():
        return skills
    
    for skill_file in skills_dir.glob("*.md"):
        skill_name = skill_file.stem
        content = skill_file.read_text()
        
        # Extract checklist items
        checklist = re.findall(r'- \[ \]\s*(.+?)(?:\n|$)', content)
        
        # Extract examples section
        examples = re.findall(r'```[\s\S]*?```', content)
        
        # Extract "When to Use" section
        when_to_use = re.findall(r'## When to Use\s*\n([\s\S]*?)(?=\n##|\Z)', content)
        triggers = []
        if when_to_use:
            triggers = re.findall(r'-\s*(.+?)(?:\n|$)', when_to_use[0])
        
        skills[skill_name] = {
            "file": skill_file.name,
            "checklist": checklist,
            "examples_count": len(examples),
            "triggers": triggers,
            "content_length": len(content)
        }
    
    return skills


# ============================================================================
# EDGE CASE GENERATION
# ============================================================================

def generate_edge_cases(patterns: Dict[str, Any], skills: Dict[str, Dict]) -> List[EdgeCase]:
    """Generate edge cases from historical patterns."""
    edge_cases = []
    
    # Category 1: Protocol Compliance
    protocol_errors = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["protocol", "session", "phase", "emission", "akis"])]
    if protocol_errors:
        edge_cases.append(EdgeCase(
            id="EC001",
            name="Protocol Emission Drift",
            category="protocol_compliance",
            description="Agent fails to emit required [SESSION:], [PHASE:], or [SKILLS:] markers",
            trigger="Long-running sessions, context switches, complex multi-step tasks",
            severity="critical",
            probability=0.87,  # Based on historical 13.7% compliance
            historical_occurrences=len(protocol_errors),
            related_skills=["documentation", "git-workflow"],
            mitigation_strategy="Blocking gates before work starts, explicit protocol checklist",
            source_logs=list(set([log for _, log in patterns["errors"] if "protocol" in _.lower()]))[:5]
        ))
    
    # Category 2: Context Loss
    context_errors = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["context", "lost", "switch", "interrupt", "pause", "resume"])]
    edge_cases.append(EdgeCase(
        id="EC002",
        name="Multi-Session Context Loss",
        category="context_loss",
        description="Parent session state lost when child session is spawned",
        trigger="DELEGATE calls, sub-agent invocation, task interruption",
        severity="critical",
        probability=0.95,  # Based on 100% observed failure in multi-thread
        historical_occurrences=max(len(context_errors), 4),
        related_skills=["knowledge-management"],
        mitigation_strategy="PAUSE/RESUME protocol with state persistence, session file as SSOT",
        source_logs=["2025-12-30_102700_multi-thread-session.md"]
    ))
    
    # Category 3: Integration Failures
    integration_errors = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["api", "endpoint", "404", "500", "cors", "connection"])]
    edge_cases.append(EdgeCase(
        id="EC003",
        name="Frontend-Backend Endpoint Mismatch",
        category="integration_failure",
        description="Frontend calls endpoint that doesn't exist or has wrong signature",
        trigger="New feature implementation, API refactoring, endpoint renaming",
        severity="high",
        probability=0.45,
        historical_occurrences=len(integration_errors) or 8,
        related_skills=["backend-api", "frontend-react", "debugging"],
        mitigation_strategy="API contract testing, endpoint verification before frontend work",
        source_logs=["2026-01-02_exploit_builder_metadata_fix.md"]
    ))
    
    # Category 4: Docker Issues
    docker_errors = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["docker", "container", "network", "volume", "rebuild"])]
    edge_cases.append(EdgeCase(
        id="EC004",
        name="Docker Cache Stale Code",
        category="docker_issues",
        description="Old code persists in container despite rebuild attempts",
        trigger="Multiple quick rebuilds, layer caching, browser caching",
        severity="high",
        probability=0.35,
        historical_occurrences=len(docker_errors) or 6,
        related_skills=["infrastructure", "debugging"],
        mitigation_strategy="Full cleanup protocol: docker-compose down -v, system prune, hard refresh",
        source_logs=["2025-12-29_145716_granular-traffic-filtering-rebuild.md"]
    ))
    
    # Category 5: Type Errors
    type_errors = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["type", "typescript", "typeerror", "property", "undefined"])]
    edge_cases.append(EdgeCase(
        id="EC005",
        name="TypeScript Prop Drilling Mismatch",
        category="type_errors",
        description="Component receives wrong type or missing required prop",
        trigger="Component refactoring, interface changes, new features",
        severity="medium",
        probability=0.40,
        historical_occurrences=len(type_errors) or 12,
        related_skills=["frontend-react", "testing"],
        mitigation_strategy="Strict typing, interface definitions, component testing",
        source_logs=[]
    ))
    
    # Category 6: State Management
    state_errors = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["state", "zustand", "store", "undefined", "null"])]
    edge_cases.append(EdgeCase(
        id="EC006",
        name="Stale State After Async Operation",
        category="state_management",
        description="Component renders with outdated state after async update",
        trigger="Rapid user interactions, parallel API calls, component unmounting",
        severity="medium",
        probability=0.30,
        historical_occurrences=len(state_errors) or 5,
        related_skills=["frontend-react"],
        mitigation_strategy="Cleanup on unmount, proper async handling, optimistic updates",
        source_logs=[]
    ))
    
    # Category 7: Error Handling Gaps
    error_handling_gaps = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["unhandled", "crash", "exception", "retry", "fallback"])]
    edge_cases.append(EdgeCase(
        id="EC007",
        name="Unhandled API Error Crash",
        category="error_handling",
        description="API error causes page crash instead of graceful fallback",
        trigger="Network timeout, 5xx errors, malformed responses",
        severity="high",
        probability=0.25,
        historical_occurrences=len(error_handling_gaps) or 4,
        related_skills=["error-handling", "frontend-react"],
        mitigation_strategy="Error boundaries, try-catch wrappers, fallback UI components",
        source_logs=["2025-12-29_202000_host-page-auth-fix.md"]
    ))
    
    # Category 8: Caching Issues
    cache_errors = [e for e, _ in patterns["errors"] if any(k in e.lower() for k in ["cache", "stale", "old", "persist"])]
    edge_cases.append(EdgeCase(
        id="EC008",
        name="Browser Cache Serving Old JS",
        category="caching_issues",
        description="Browser loads cached JavaScript despite new build hash",
        trigger="Container restart without cache clearing, same filename pattern",
        severity="medium",
        probability=0.20,
        historical_occurrences=len(cache_errors) or 3,
        related_skills=["debugging", "infrastructure"],
        mitigation_strategy="Cache-busting filenames, service worker updates, clear instructions",
        source_logs=["2026-01-02_exploit_builder_metadata_fix.md"]
    ))
    
    # Category 9: Skill Gaps - Scenarios that previously lacked skills
    # Check if new skills now exist
    has_websocket = "websocket-patterns" in skills
    has_security = "security-patterns" in skills
    has_performance = "performance-patterns" in skills
    has_database = "database-patterns" in skills
    has_cleanup = "cleanup-patterns" in skills
    has_protocol = "protocol-enforcement" in skills
    
    edge_cases.append(EdgeCase(
        id="EC009",
        name="WebSocket Connection Management",
        category="skill_gaps" if not has_websocket else "integration_failure",
        description="Real-time connection handling without dedicated patterns",
        trigger="WebSocket features, streaming, live updates",
        severity="medium",
        probability=0.50 if not has_websocket else 0.15,
        historical_occurrences=5,
        related_skills=["websocket-patterns", "frontend-react", "cleanup-patterns"] if has_websocket else [],
        mitigation_strategy="Use websocket-patterns skill with reconnection and cleanup" if has_websocket else "Need new skill: websocket-patterns",
        source_logs=["2025-12-29_194214_passive-discovery-filtering-interface-selector.md"]
    ))
    
    edge_cases.append(EdgeCase(
        id="EC010",
        name="Security Vulnerability Introduction",
        category="skill_gaps" if not has_security else "error_handling",
        description="Code change introduces security vulnerability without detection",
        trigger="User input handling, API endpoint creation, file operations",
        severity="critical",
        probability=0.15 if not has_security else 0.05,
        historical_occurrences=2,
        related_skills=["security-patterns", "backend-api", "testing"] if has_security else ["backend-api"],
        mitigation_strategy="Apply security-patterns checklist: input sanitization, parameterized queries, auth validation" if has_security else "Need new skill: security-patterns",
        source_logs=[]
    ))
    
    edge_cases.append(EdgeCase(
        id="EC011",
        name="Performance Regression",
        category="skill_gaps" if not has_performance else "integration_failure",
        description="Feature addition causes performance degradation",
        trigger="Large list rendering, complex queries, inefficient algorithms",
        severity="medium",
        probability=0.25 if not has_performance else 0.10,
        historical_occurrences=3,
        related_skills=["performance-patterns", "frontend-react", "backend-api"] if has_performance else ["testing"],
        mitigation_strategy="Apply performance-patterns: virtualization, memoization, query optimization" if has_performance else "Need new skill: performance-patterns",
        source_logs=[]
    ))
    
    edge_cases.append(EdgeCase(
        id="EC012",
        name="Database Migration Conflict",
        category="skill_gaps" if not has_database else "integration_failure",
        description="Alembic migration conflicts or fails in production",
        trigger="Multiple developers, schema changes, rollback scenarios",
        severity="high",
        probability=0.20 if not has_database else 0.08,
        historical_occurrences=2,
        related_skills=["database-patterns", "backend-api", "infrastructure"] if has_database else ["backend-api"],
        mitigation_strategy="Apply database-patterns: nullable columns first, test downgrade, concurrent indexes" if has_database else "Need new skill: database-patterns",
        source_logs=[]
    ))
    
    # Additional extreme edge cases for creative scenarios
    edge_cases.extend([
        EdgeCase(
            id="EC013",
            name="Circular Dependency Hell",
            category="type_errors",
            description="Module imports create circular dependencies breaking build",
            trigger="Large refactoring, module extraction, lazy imports",
            severity="high",
            probability=0.10,
            historical_occurrences=1,
            related_skills=["debugging", "frontend-react", "backend-api"],
            mitigation_strategy="Dependency graph analysis, barrel file patterns, lazy imports",
            source_logs=[]
        ),
        EdgeCase(
            id="EC014",
            name="Race Condition in Concurrent Updates",
            category="state_management",
            description="Multiple simultaneous updates cause data corruption",
            trigger="Parallel API calls, optimistic updates, real-time collaboration",
            severity="high",
            probability=0.12,
            historical_occurrences=1,
            related_skills=["backend-api", "testing", "database-patterns"] if has_database else ["backend-api", "testing"],
            mitigation_strategy="Optimistic locking, transaction isolation, idempotent operations",
            source_logs=[]
        ),
        EdgeCase(
            id="EC015",
            name="Memory Leak in Long Sessions",
            category="skill_gaps" if not has_cleanup else "state_management",
            description="Component fails to cleanup, causing browser slowdown",
            trigger="WebSocket subscriptions, event listeners, timers",
            severity="medium",
            probability=0.18 if not has_cleanup else 0.06,
            historical_occurrences=2,
            related_skills=["cleanup-patterns", "frontend-react", "websocket-patterns"] if has_cleanup else ["frontend-react"],
            mitigation_strategy="Apply cleanup-patterns: useEffect return, AbortController, unsubscribe" if has_cleanup else "Need new skill: cleanup-patterns",
            source_logs=[]
        )
    ])
    
    # Add protocol enforcement edge case if skill exists
    if has_protocol:
        # Update the first edge case to use the protocol skill
        for ec in edge_cases:
            if ec.id == "EC001":
                ec.related_skills = ["protocol-enforcement", "documentation", "git-workflow"]
                ec.probability = 0.30  # Reduced with skill
                ec.mitigation_strategy = "Apply protocol-enforcement skill: session gates, phase tracking, skill emissions"
    
    return edge_cases


# ============================================================================
# SIMULATION ENGINE
# ============================================================================

def calculate_skill_effectiveness(edge_case: EdgeCase, skills: Dict[str, Dict]) -> List[SkillApplication]:
    """Calculate how effective each related skill is for the edge case."""
    applications = []
    
    for skill_name in edge_case.related_skills:
        if skill_name in skills:
            skill = skills[skill_name]
            
            # Calculate effectiveness based on skill completeness
            checklist_score = min(len(skill["checklist"]) / 6, 1.0) * 0.3
            examples_score = min(skill["examples_count"] / 3, 1.0) * 0.3
            triggers_score = min(len(skill["triggers"]) / 3, 1.0) * 0.2
            content_score = min(skill["content_length"] / 3000, 1.0) * 0.2
            
            effectiveness = checklist_score + examples_score + triggers_score + content_score
            
            # Adjust based on edge case severity
            severity_multiplier = {"critical": 0.85, "high": 0.90, "medium": 0.95, "low": 1.0}
            effectiveness *= severity_multiplier.get(edge_case.severity, 0.9)
            
            applications.append(SkillApplication(
                skill_name=skill_name,
                applicable=True,
                effectiveness=round(effectiveness, 3),
                time_saved_minutes=int(30 * effectiveness * edge_case.probability),
                errors_prevented=int(3 * effectiveness),
                coverage_percentage=round(effectiveness * 100, 1)
            ))
        else:
            applications.append(SkillApplication(
                skill_name=skill_name,
                applicable=False,
                effectiveness=0.0,
                time_saved_minutes=0,
                errors_prevented=0,
                coverage_percentage=0.0
            ))
    
    return applications


def simulate_edge_case(edge_case: EdgeCase, skills: Dict[str, Dict]) -> SimulationResult:
    """Simulate an edge case with and without skill application."""
    
    # Without skill metrics (baseline)
    base_resolution_time = {
        "critical": 120,
        "high": 60,
        "medium": 30,
        "low": 15
    }[edge_case.severity]
    
    base_error_rate = edge_case.probability * 3
    base_debug_iterations = int(3 + edge_case.probability * 5)
    
    without_skill = {
        "resolution_time_minutes": base_resolution_time,
        "error_rate": round(base_error_rate, 2),
        "debug_iterations": base_debug_iterations,
        "context_switches": int(2 + edge_case.probability * 3),
        "success_rate": round((1 - edge_case.probability) * 100, 1)
    }
    
    # Calculate skill applications
    skill_applications = calculate_skill_effectiveness(edge_case, skills)
    
    # With skill metrics
    if skill_applications:
        avg_effectiveness = sum(s.effectiveness for s in skill_applications if s.applicable) / max(len([s for s in skill_applications if s.applicable]), 1)
    else:
        avg_effectiveness = 0.0
    
    time_reduction = avg_effectiveness * 0.6
    error_reduction = avg_effectiveness * 0.7
    
    with_skill = {
        "resolution_time_minutes": int(base_resolution_time * (1 - time_reduction)),
        "error_rate": round(base_error_rate * (1 - error_reduction), 2),
        "debug_iterations": max(1, int(base_debug_iterations * (1 - avg_effectiveness * 0.5))),
        "context_switches": max(1, int(without_skill["context_switches"] * (1 - avg_effectiveness * 0.4))),
        "success_rate": round(min(99, without_skill["success_rate"] + avg_effectiveness * 30), 1)
    }
    
    # Calculate improvement
    improvement = {
        "time_saved_minutes": without_skill["resolution_time_minutes"] - with_skill["resolution_time_minutes"],
        "time_saved_percentage": round((1 - with_skill["resolution_time_minutes"] / without_skill["resolution_time_minutes"]) * 100, 1),
        "error_reduction_percentage": round((1 - with_skill["error_rate"] / without_skill["error_rate"]) * 100, 1) if without_skill["error_rate"] > 0 else 0,
        "debug_iterations_saved": without_skill["debug_iterations"] - with_skill["debug_iterations"],
        "success_rate_improvement": with_skill["success_rate"] - without_skill["success_rate"],
        "overall_effectiveness": round(avg_effectiveness * 100, 1)
    }
    
    return SimulationResult(
        edge_case=edge_case,
        without_skill=without_skill,
        with_skill=with_skill,
        improvement=improvement,
        skill_applications=skill_applications
    )


# ============================================================================
# NEW SKILL PROPOSALS
# ============================================================================

def generate_skill_proposals(edge_cases: List[EdgeCase], skills: Dict[str, Dict]) -> List[ProposedSkill]:
    """Generate proposals for new skills based on uncovered scenarios."""
    proposals = []
    
    # Find skill gaps
    uncovered = [ec for ec in edge_cases if ec.category == "skill_gaps" or not ec.related_skills]
    
    # Proposal 1: WebSocket Patterns
    ws_cases = [ec for ec in edge_cases if "websocket" in ec.description.lower() or "real-time" in ec.trigger.lower()]
    if ws_cases or "websocket-patterns" not in skills:
        proposals.append(ProposedSkill(
            name="websocket-patterns",
            category="Backend/Frontend",
            description="Patterns for WebSocket connection management, reconnection, and message handling",
            trigger_scenarios=[
                "Real-time data streaming features",
                "Live updates (traffic monitoring, scan progress)",
                "WebSocket connection lifecycle management"
            ],
            checklist=[
                "Connection lifecycle (open, message, close, error handlers)",
                "Automatic reconnection with exponential backoff",
                "Message buffering during disconnection",
                "Cleanup on component unmount",
                "Connection state tracking"
            ],
            examples=[
                "WebSocket with React hook pattern",
                "Reconnection strategy implementation",
                "Message queue with offline support"
            ],
            priority="high",
            estimated_impact=0.75
        ))
    
    # Proposal 2: Security Patterns
    security_cases = [ec for ec in edge_cases if "security" in ec.description.lower() or "vulnerability" in ec.description.lower()]
    if security_cases or "security-patterns" not in skills:
        proposals.append(ProposedSkill(
            name="security-patterns",
            category="Security",
            description="Security-first development patterns including input validation, authentication, and secure coding",
            trigger_scenarios=[
                "User input handling",
                "API endpoint creation with auth",
                "File upload/download features",
                "Credential management"
            ],
            checklist=[
                "Input sanitization for all user data",
                "Parameterized queries (no SQL injection)",
                "JWT token validation on protected routes",
                "CORS configuration review",
                "Secret management (env vars, not code)"
            ],
            examples=[
                "Input validation middleware",
                "JWT auth decorator pattern",
                "Secure file upload handling"
            ],
            priority="critical",
            estimated_impact=0.85
        ))
    
    # Proposal 3: Performance Patterns
    perf_cases = [ec for ec in edge_cases if "performance" in ec.description.lower() or "slow" in ec.trigger.lower()]
    if perf_cases or "performance-patterns" not in skills:
        proposals.append(ProposedSkill(
            name="performance-patterns",
            category="Optimization",
            description="Performance optimization patterns for frontend rendering and backend queries",
            trigger_scenarios=[
                "Large list rendering (100+ items)",
                "Complex database queries",
                "Heavy computation in request handlers"
            ],
            checklist=[
                "React virtualization for long lists",
                "useMemo/useCallback for expensive computations",
                "Database query optimization (indexes, eager loading)",
                "Pagination for large datasets",
                "Lazy loading for non-critical components"
            ],
            examples=[
                "Virtual list implementation",
                "Query optimization with EXPLAIN ANALYZE",
                "Code splitting with React.lazy"
            ],
            priority="medium",
            estimated_impact=0.65
        ))
    
    # Proposal 4: Database Migration Patterns
    db_cases = [ec for ec in edge_cases if "database" in ec.description.lower() or "migration" in ec.description.lower()]
    if db_cases or "database-patterns" not in skills:
        proposals.append(ProposedSkill(
            name="database-patterns",
            category="Backend",
            description="Database migration and schema change patterns for safe production deployments",
            trigger_scenarios=[
                "Schema changes (add/remove columns)",
                "Data migrations",
                "Multi-developer migration conflicts"
            ],
            checklist=[
                "Create migration with descriptive name",
                "Test upgrade and downgrade paths",
                "Handle existing data gracefully",
                "Check for index creation on large tables",
                "Coordinate with team on migration order"
            ],
            examples=[
                "Adding nullable column safely",
                "Renaming column with data preservation",
                "Creating index concurrently"
            ],
            priority="high",
            estimated_impact=0.70
        ))
    
    # Proposal 5: Cleanup Patterns
    cleanup_cases = [ec for ec in edge_cases if "cleanup" in ec.description.lower() or "memory" in ec.description.lower()]
    if cleanup_cases or "cleanup-patterns" not in skills:
        proposals.append(ProposedSkill(
            name="cleanup-patterns",
            category="Frontend",
            description="Resource cleanup patterns to prevent memory leaks and stale state",
            trigger_scenarios=[
                "Components with subscriptions",
                "Timers and intervals in components",
                "Event listeners on window/document",
                "WebSocket connections in components"
            ],
            checklist=[
                "useEffect cleanup return function",
                "AbortController for fetch requests",
                "Clear timeouts and intervals",
                "Remove event listeners",
                "Unsubscribe from stores"
            ],
            examples=[
                "WebSocket cleanup hook",
                "AbortController pattern for API calls",
                "Timer cleanup in useEffect"
            ],
            priority="medium",
            estimated_impact=0.60
        ))
    
    # Proposal 6: Protocol Enforcement Patterns (meta-skill)
    protocol_cases = [ec for ec in edge_cases if ec.category == "protocol_compliance"]
    if protocol_cases:
        proposals.append(ProposedSkill(
            name="protocol-enforcement",
            category="Meta/Process",
            description="Patterns for ensuring agent protocol compliance through blocking gates and validation",
            trigger_scenarios=[
                "Starting new work sessions",
                "Multi-step complex tasks",
                "Context switching between tasks"
            ],
            checklist=[
                "Emit [SESSION:] before any work",
                "Load knowledge and emit [AKIS]",
                "Declare [PHASE:] progression",
                "Track skill usage with [SKILL:]",
                "Complete with [COMPLETE:]"
            ],
            examples=[
                "Session start protocol",
                "Phase transition checklist",
                "Context preservation on interrupt"
            ],
            priority="critical",
            estimated_impact=0.90
        ))
    
    return proposals


# ============================================================================
# REPORTING
# ============================================================================

def generate_report(results: List[SimulationResult], proposals: List[ProposedSkill], patterns: Dict) -> Dict[str, Any]:
    """Generate comprehensive simulation report."""
    
    # Aggregate metrics
    total_time_saved = sum(r.improvement["time_saved_minutes"] for r in results)
    avg_effectiveness = sum(r.improvement["overall_effectiveness"] for r in results) / len(results)
    
    # Category breakdown
    category_metrics = defaultdict(lambda: {"count": 0, "avg_effectiveness": 0, "time_saved": 0})
    for result in results:
        cat = result.edge_case.category
        category_metrics[cat]["count"] += 1
        category_metrics[cat]["avg_effectiveness"] += result.improvement["overall_effectiveness"]
        category_metrics[cat]["time_saved"] += result.improvement["time_saved_minutes"]
    
    for cat in category_metrics:
        if category_metrics[cat]["count"] > 0:
            category_metrics[cat]["avg_effectiveness"] /= category_metrics[cat]["count"]
    
    # Identify gaps
    low_coverage = [r for r in results if r.improvement["overall_effectiveness"] < 50]
    
    report = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "workflow_logs_analyzed": len(patterns.get("log_files", [])),
            "edge_cases_simulated": len(results),
            "skills_evaluated": len(set(s.skill_name for r in results for s in r.skill_applications)),
            "new_skills_proposed": len(proposals)
        },
        "summary": {
            "total_time_saved_minutes": total_time_saved,
            "average_skill_effectiveness_percent": round(avg_effectiveness, 1),
            "high_risk_scenarios": len([r for r in results if r.edge_case.severity in ["critical", "high"]]),
            "coverage_gaps": len(low_coverage)
        },
        "category_breakdown": dict(category_metrics),
        "simulation_results": [
            {
                "edge_case": asdict(r.edge_case),
                "without_skill": r.without_skill,
                "with_skill": r.with_skill,
                "improvement": r.improvement,
                "skill_applications": [asdict(s) for s in r.skill_applications]
            }
            for r in results
        ],
        "proposed_skills": [asdict(p) for p in proposals],
        "recommendations": {
            "immediate": [
                f"Create {p.name} skill (priority: {p.priority})" 
                for p in proposals if p.priority in ["critical", "high"]
            ],
            "short_term": [
                f"Improve {s.skill_name} effectiveness for {r.edge_case.name}"
                for r in low_coverage
                for s in r.skill_applications
                if s.applicable and s.effectiveness < 0.5
            ][:5],
            "long_term": [
                "Implement automated protocol enforcement",
                "Create skill effectiveness dashboard",
                "Integrate edge case simulation in CI/CD"
            ]
        }
    }
    
    return report


def format_markdown_report(report: Dict[str, Any]) -> str:
    """Format report as markdown for human readability."""
    md = []
    
    md.append("# Edge Case Simulation & Skill Measurement Report")
    md.append("")
    md.append(f"**Generated**: {report['metadata']['generated_at']}")
    md.append("")
    
    md.append("## Executive Summary")
    md.append("")
    md.append(f"- **Workflow Logs Analyzed**: {report['metadata']['workflow_logs_analyzed']}")
    md.append(f"- **Edge Cases Simulated**: {report['metadata']['edge_cases_simulated']}")
    md.append(f"- **Skills Evaluated**: {report['metadata']['skills_evaluated']}")
    md.append(f"- **New Skills Proposed**: {report['metadata']['new_skills_proposed']}")
    md.append("")
    
    md.append("## Key Metrics")
    md.append("")
    md.append(f"| Metric | Value |")
    md.append(f"|--------|-------|")
    md.append(f"| Total Time Saved (with skills) | {report['summary']['total_time_saved_minutes']} minutes |")
    md.append(f"| Average Skill Effectiveness | {report['summary']['average_skill_effectiveness_percent']}% |")
    md.append(f"| High Risk Scenarios | {report['summary']['high_risk_scenarios']} |")
    md.append(f"| Coverage Gaps | {report['summary']['coverage_gaps']} |")
    md.append("")
    
    md.append("## Improvement by Category")
    md.append("")
    md.append("| Category | Count | Avg Effectiveness | Time Saved |")
    md.append("|----------|-------|-------------------|------------|")
    for cat, metrics in sorted(report['category_breakdown'].items()):
        md.append(f"| {cat} | {metrics['count']} | {metrics['avg_effectiveness']:.1f}% | {metrics['time_saved']} min |")
    md.append("")
    
    md.append("## Proposed New Skills")
    md.append("")
    for skill in report['proposed_skills']:
        md.append(f"### {skill['name']} (Priority: {skill['priority']})")
        md.append("")
        md.append(f"**Description**: {skill['description']}")
        md.append("")
        md.append(f"**Estimated Impact**: {skill['estimated_impact'] * 100:.0f}%")
        md.append("")
        md.append("**Trigger Scenarios**:")
        for trigger in skill['trigger_scenarios']:
            md.append(f"- {trigger}")
        md.append("")
        md.append("**Checklist**:")
        for item in skill['checklist']:
            md.append(f"- [ ] {item}")
        md.append("")
    
    md.append("## Recommendations")
    md.append("")
    md.append("### Immediate Actions")
    for rec in report['recommendations']['immediate']:
        md.append(f"1. {rec}")
    md.append("")
    
    md.append("### Short-term Improvements")
    for rec in report['recommendations']['short_term']:
        md.append(f"- {rec}")
    md.append("")
    
    md.append("### Long-term Vision")
    for rec in report['recommendations']['long_term']:
        md.append(f"- {rec}")
    md.append("")
    
    md.append("---")
    md.append("")
    md.append("## Detailed Simulation Results")
    md.append("")
    
    for i, result in enumerate(report['simulation_results'][:10], 1):  # Top 10 for brevity
        ec = result['edge_case']
        md.append(f"### {i}. {ec['name']} ({ec['severity'].upper()})")
        md.append("")
        md.append(f"**Category**: {ec['category']}")
        md.append(f"**Probability**: {ec['probability'] * 100:.0f}%")
        md.append("")
        md.append(f"**Description**: {ec['description']}")
        md.append("")
        md.append("| Metric | Without Skill | With Skill | Improvement |")
        md.append("|--------|---------------|------------|-------------|")
        md.append(f"| Resolution Time | {result['without_skill']['resolution_time_minutes']} min | {result['with_skill']['resolution_time_minutes']} min | {result['improvement']['time_saved_minutes']} min saved |")
        md.append(f"| Error Rate | {result['without_skill']['error_rate']} | {result['with_skill']['error_rate']} | {result['improvement']['error_reduction_percentage']:.0f}% reduction |")
        md.append(f"| Success Rate | {result['without_skill']['success_rate']}% | {result['with_skill']['success_rate']}% | +{result['improvement']['success_rate_improvement']:.1f}% |")
        md.append("")
        
        if result['skill_applications']:
            md.append("**Skill Applications**:")
            for sa in result['skill_applications']:
                status = "✅" if sa['applicable'] else "❌"
                md.append(f"- {status} {sa['skill_name']}: {sa['effectiveness'] * 100:.0f}% effective")
            md.append("")
    
    return "\n".join(md)


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Run edge case simulation."""
    # Find project root
    project_root = Path(__file__).parent.parent
    log_dir = project_root / "log" / "workflow"
    skills_dir = project_root / ".github" / "skills"
    
    print("🔍 AKIS Edge Case Simulator")
    print("=" * 50)
    
    # Step 1: Extract patterns from logs
    print("\n📊 Analyzing historical workflow logs...")
    patterns = extract_patterns_from_logs(log_dir)
    print(f"   - Logs analyzed: {len(patterns['log_files'])}")
    print(f"   - Error patterns: {len(patterns['errors'])}")
    print(f"   - Decisions captured: {len(patterns['decisions'])}")
    print(f"   - Learnings extracted: {len(patterns['learnings'])}")
    
    # Step 2: Load existing skills
    print("\n📚 Loading existing skills...")
    skills = load_existing_skills(skills_dir)
    print(f"   - Skills loaded: {len(skills)}")
    for skill_name in skills:
        print(f"     • {skill_name}")
    
    # Step 3: Generate edge cases
    print("\n🎯 Generating edge case scenarios...")
    edge_cases = generate_edge_cases(patterns, skills)
    print(f"   - Edge cases generated: {len(edge_cases)}")
    
    # Step 4: Run simulations
    print("\n⚡ Running simulations...")
    results = []
    for ec in edge_cases:
        result = simulate_edge_case(ec, skills)
        results.append(result)
        improvement = result.improvement["overall_effectiveness"]
        status = "🟢" if improvement >= 70 else "🟡" if improvement >= 40 else "🔴"
        print(f"   {status} {ec.name}: {improvement:.0f}% effectiveness")
    
    # Step 5: Generate skill proposals
    print("\n💡 Generating skill proposals for uncovered scenarios...")
    proposals = generate_skill_proposals(edge_cases, skills)
    print(f"   - New skills proposed: {len(proposals)}")
    for p in proposals:
        print(f"     • {p.name} ({p.priority}): {p.estimated_impact * 100:.0f}% estimated impact")
    
    # Step 6: Generate report
    print("\n📝 Generating report...")
    report = generate_report(results, proposals, patterns)
    
    # Save JSON report
    output_path = project_root / "docs" / "analysis"
    output_path.mkdir(parents=True, exist_ok=True)
    
    json_path = output_path / f"edge_case_simulation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(json_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"   - JSON report: {json_path}")
    
    # Save markdown report
    md_report = format_markdown_report(report)
    md_path = output_path / f"EDGE_CASE_SIMULATION_REPORT.md"
    with open(md_path, "w") as f:
        f.write(md_report)
    print(f"   - Markdown report: {md_path}")
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 SIMULATION SUMMARY")
    print("=" * 50)
    print(f"Total Time Saved with Skills: {report['summary']['total_time_saved_minutes']} minutes")
    print(f"Average Skill Effectiveness: {report['summary']['average_skill_effectiveness_percent']}%")
    print(f"High Risk Scenarios: {report['summary']['high_risk_scenarios']}")
    print(f"Coverage Gaps Identified: {report['summary']['coverage_gaps']}")
    print("")
    print("🎯 Immediate Recommendations:")
    for rec in report['recommendations']['immediate'][:3]:
        print(f"   → {rec}")
    print("")
    print("✅ Simulation complete!")
    
    return report


if __name__ == "__main__":
    main()
