#!/usr/bin/env python3
"""
Protocol linter - checks workflow logs for compliance with agent framework protocols

Usage:
    python scripts/lint_protocol.py log/workflow/2025-12-30_123456_task-name.md
    python scripts/lint_protocol.py log/workflow/*.md
"""
import re
import sys
from pathlib import Path
from typing import List, Dict, Set

class ProtocolLinter:
    def __init__(self, log_path: str):
        self.log_path = Path(log_path)
        self.content = ""
        self.issues: List[str] = []
        self.warnings: List[str] = []
        self.stats: Dict[str, int] = {}
        
    def lint(self) -> bool:
        """Run all linting checks. Returns True if no issues."""
        if not self.log_path.exists():
            self.issues.append(f"Log file not found: {self.log_path}")
            return False
            
        self.content = self.log_path.read_text()
        
        # Run all checks
        self._check_session_emission()
        self._check_phase_tracking()
        self._check_delegation_integrity()
        self._check_completion()
        self._check_emission_count()
        self._check_knowledge_updates()
        self._check_quality_gates()
        self._collect_stats()
        
        return len(self.issues) == 0
        
    def _check_session_emission(self):
        """Verify SESSION emitted at start"""
        session = re.search(r'\[SESSION:\s*role=(\w+)\s*\|\s*task=(.+?)\s*\|\s*phase=(\w+)', self.content)
        if not session:
            self.issues.append("Missing [SESSION: role=... | task=... | phase=...] emission at start")
        else:
            role, task, phase = session.groups()
            if phase != 'CONTEXT':
                self.issues.append(f"SESSION should start with phase=CONTEXT, got phase={phase}")
            self.stats['role'] = role
            
    def _check_phase_tracking(self):
        """Verify PHASE emissions"""
        phases = re.findall(r'\[PHASE:\s*(\w+)', self.content)
        
        if not phases:
            self.warnings.append("No [PHASE:] emissions found")
            return
            
        # Check first phase
        if phases[0] != 'CONTEXT':
            self.issues.append(f"First phase should be CONTEXT, got {phases[0]}")
            
        # Check for valid phase names
        valid_phases = {'CONTEXT', 'PLAN', 'COORDINATE', 'INTEGRATE', 'VERIFY', 'LEARN', 'COMPLETE'}
        for phase in phases:
            if phase not in valid_phases:
                self.warnings.append(f"Non-standard phase name: {phase}")
                
        # Check phase progression has COMPLETE at end
        if phases and phases[-1] != 'COMPLETE':
            self.warnings.append(f"Last phase should be COMPLETE, got {phases[-1]}")
            
        self.stats['phase_count'] = len(phases)
        self.stats['phases'] = ' → '.join(phases)
        
    def _check_delegation_integrity(self):
        """Check DELEGATE/INTEGRATE pairing"""
        delegates = re.findall(r'\[DELEGATE:\s*agent=(\w+)', self.content)
        integrates = re.findall(r'\[INTEGRATE:\s*from=(\w+)', self.content)
        
        # Convert to sets for comparison
        delegate_set = set(delegates)
        integrate_set = set(integrates)
        
        # Check for orphaned delegations
        orphaned = delegate_set - integrate_set
        if orphaned:
            for agent in orphaned:
                self.issues.append(f"Orphaned delegation to {agent} (no matching INTEGRATE)")
                
        # Check for unexpected integrations
        unexpected = integrate_set - delegate_set
        if unexpected:
            for agent in unexpected:
                self.warnings.append(f"INTEGRATE from {agent} without prior DELEGATE")
                
        self.stats['delegations'] = len(delegates)
        self.stats['integrations'] = len(integrates)
        
    def _check_completion(self):
        """Verify COMPLETE emission"""
        complete = re.search(r'\[COMPLETE:\s*task=(.+?)\s*\|\s*result=(.+?)(\s*\|\s*learnings=(\d+))?', self.content)
        if not complete:
            self.warnings.append("No [COMPLETE:] emission (session incomplete?)")
        else:
            task, result, _, learnings = complete.groups()
            if learnings:
                self.stats['learnings'] = int(learnings)
                
    def _check_emission_count(self):
        """Count and validate total emissions"""
        # Match any emission pattern [WORD: ...]
        emissions = re.findall(r'\[[\w_]+:', self.content)
        count = len(emissions)
        
        self.stats['total_emissions'] = count
        
        if count > 30:
            self.issues.append(f"Emission count ({count}) exceeds critical threshold of 30")
        elif count > 20:
            self.warnings.append(f"Emission count ({count}) exceeds warning threshold of 20")
            
    def _check_knowledge_updates(self):
        """Check for knowledge update emissions"""
        knowledge = re.search(r'\[KNOWLEDGE:\s*added=(\d+)\s*\|\s*updated=(\d+)', self.content)
        if knowledge:
            added, updated = knowledge.groups()
            self.stats['knowledge_added'] = int(added)
            self.stats['knowledge_updated'] = int(updated)
        else:
            # Check if this was a significant task
            if self.stats.get('phase_count', 0) >= 5:
                self.warnings.append("No [KNOWLEDGE:] update for multi-phase task")
                
    def _check_quality_gates(self):
        """Check for quality gate verification"""
        # Look for mentions of testing, building, linting
        has_tests = bool(re.search(r'(test|Test|TEST).*pass', self.content, re.IGNORECASE))
        has_build = bool(re.search(r'(build|Build|BUILD).*success', self.content, re.IGNORECASE))
        has_lint = bool(re.search(r'(lint|Lint|LINT).*pass', self.content, re.IGNORECASE))
        
        # Check for VERIFY phase
        verify_phase = bool(re.search(r'\[PHASE:\s*VERIFY', self.content))
        
        if verify_phase and not (has_tests or has_build or has_lint):
            self.warnings.append("VERIFY phase present but no test/build/lint confirmation found")
            
    def _collect_stats(self):
        """Collect additional statistics"""
        # Check for decision emissions
        decisions = len(re.findall(r'\[DECISION:', self.content))
        self.stats['decisions'] = decisions
        
        # Check for attempt emissions
        attempts = len(re.findall(r'\[ATTEMPT', self.content))
        self.stats['attempts'] = attempts
        
        # Count lines
        self.stats['lines'] = len(self.content.splitlines())
        
    def print_report(self):
        """Print linting report"""
        print(f"\n{'='*70}")
        print(f"PROTOCOL LINT: {self.log_path.name}")
        print('='*70)
        
        # Issues
        if self.issues:
            print(f"\n❌ ISSUES ({len(self.issues)}):")
            for issue in self.issues:
                print(f"  - {issue}")
        else:
            print("\n✓ No issues")
            
        # Warnings
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warn in self.warnings:
                print(f"  - {warn}")
        else:
            print("\n✓ No warnings")
            
        # Statistics
        print(f"\n{'-'*70}")
        print("STATISTICS:")
        print(f"  Agent role:         {self.stats.get('role', 'N/A')}")
        print(f"  Phase flow:         {self.stats.get('phases', 'N/A')}")
        print(f"  Phase count:        {self.stats.get('phase_count', 0)}")
        print(f"  Delegations:        {self.stats.get('delegations', 0)}")
        print(f"  Integrations:       {self.stats.get('integrations', 0)}")
        print(f"  Total emissions:    {self.stats.get('total_emissions', 0)}")
        print(f"  Decisions:          {self.stats.get('decisions', 0)}")
        print(f"  Attempts:           {self.stats.get('attempts', 0)}")
        print(f"  Knowledge added:    {self.stats.get('knowledge_added', 0)}")
        print(f"  Knowledge updated:  {self.stats.get('knowledge_updated', 0)}")
        print(f"  Learnings:          {self.stats.get('learnings', 0)}")
        print(f"  Log length:         {self.stats.get('lines', 0)} lines")
        print('='*70 + "\n")
        
    def get_grade(self) -> str:
        """Return letter grade based on issues and warnings"""
        if len(self.issues) == 0 and len(self.warnings) == 0:
            return "A+ (Perfect)"
        elif len(self.issues) == 0 and len(self.warnings) <= 2:
            return "A (Excellent)"
        elif len(self.issues) == 0:
            return "B (Good)"
        elif len(self.issues) <= 2:
            return "C (Needs improvement)"
        else:
            return "F (Non-compliant)"

def lint_multiple_files(pattern: str):
    """Lint multiple workflow log files"""
    from glob import glob
    
    files = glob(pattern)
    if not files:
        print(f"No files found matching: {pattern}")
        return 1
        
    results = []
    for filepath in files:
        linter = ProtocolLinter(filepath)
        is_clean = linter.lint()
        linter.print_report()
        results.append((filepath, is_clean, linter.get_grade()))
        
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    for filepath, is_clean, grade in results:
        status = "✓" if is_clean else "✗"
        print(f"{status} {grade:15} {Path(filepath).name}")
    print("="*70 + "\n")
    
    return 0 if all(r[1] for r in results) else 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: lint_protocol.py <workflow_log.md> [<pattern>]")
        print("\nExamples:")
        print("  python scripts/lint_protocol.py log/workflow/2025-12-30_task.md")
        print("  python scripts/lint_protocol.py 'log/workflow/*.md'")
        sys.exit(1)
        
    path_or_pattern = sys.argv[1]
    
    # Check if it's a glob pattern
    if '*' in path_or_pattern:
        sys.exit(lint_multiple_files(path_or_pattern))
    else:
        linter = ProtocolLinter(path_or_pattern)
        is_clean = linter.lint()
        linter.print_report()
        print(f"Grade: {linter.get_grade()}\n")
        sys.exit(0 if is_clean else 1)
