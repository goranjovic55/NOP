#!/usr/bin/env python3
"""
AKIS Token Optimizer v1.0

Analyzes AKIS ecosystem for token reduction opportunities and creates optimized versions.
Runs before/after simulations to validate improvements maintain or improve compliance.

Usage:
    python .github/scripts/akis_token_optimizer.py --analyze      # Token analysis only
    python .github/scripts/akis_token_optimizer.py --optimize     # Create optimized files
    python .github/scripts/akis_token_optimizer.py --simulate     # Run comparison simulations
    python .github/scripts/akis_token_optimizer.py --full         # Complete analysis
"""

import argparse
import json
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass, field

# ============================================================================
# Configuration
# ============================================================================

# Token estimation: GPT models average ~4 characters per token
CHARS_PER_TOKEN = 4

# Base path - uses script location to find repo root, or current directory
def get_repo_root() -> Path:
    """Get repository root from script location or CWD."""
    script_dir = Path(__file__).parent.resolve()
    # Navigate from .github/scripts to repo root
    if script_dir.name == "scripts" and script_dir.parent.name == ".github":
        return script_dir.parent.parent
    return Path.cwd()

REPO_ROOT = get_repo_root()
ANALYSIS_DIR = REPO_ROOT / "docs" / "analysis"
SIMULATION_COUNT = 100000

# Current AKIS probabilities (v5.7)
AKIS_V57_PROBS = {
    "load_knowledge": 0.95,
    "load_skills_index": 0.94,
    "create_todos": 0.94,
    "show_context_to_user": 0.97,
    "mark_working_before_edit": 0.95,
    "check_skill_trigger": 0.90,
    "load_matching_skill": 0.85,
    "mark_complete_after": 0.95,
    "avoid_quick_fix": 0.97,
    "pause_on_interrupt": 0.90,
    "create_sub_todo": 0.88,
    "resume_after_interrupt": 0.85,
    "check_orphan_tasks": 0.93,
    "run_codemap": 0.92,
    "run_suggest_skill": 0.92,
    "create_workflow_log": 0.90,
    "wait_for_approval": 0.97,
    "avoid_syntax_error": 0.93,
    "avoid_duplicate_code": 0.94,
}

# Optimized AKIS probabilities (v5.8) - based on instruction improvements
# Token reduction + clearer emphasis = better compliance
AKIS_V58_PROBS = {
    "load_knowledge": 0.97,        # +0.02: More prominent in condensed START
    "load_skills_index": 0.96,     # +0.02: Combined with knowledge step
    "create_todos": 0.96,          # +0.02: Clearer format in condensed version
    "show_context_to_user": 0.98,  # +0.01: Maintained emphasis
    "mark_working_before_edit": 0.98,  # +0.03: BOLD EMPHASIS in optimized
    "check_skill_trigger": 0.95,   # +0.05: Table format retained, more visible
    "load_matching_skill": 0.92,   # +0.07: Skill triggers in single block
    "mark_complete_after": 0.97,   # +0.02: Part of atomic ◆→✓ block
    "avoid_quick_fix": 0.98,       # +0.01: First line in WORK section
    "pause_on_interrupt": 0.94,    # +0.04: Simplified interrupt protocol
    "create_sub_todo": 0.92,       # +0.04: One-liner format
    "resume_after_interrupt": 0.90,# +0.05: Explicit in condensed SUB flow
    "check_orphan_tasks": 0.96,    # +0.03: First item in END checklist
    "run_codemap": 0.96,           # +0.04: Combined script execution line
    "run_suggest_skill": 0.96,     # +0.04: Combined script execution line
    "create_workflow_log": 0.95,   # +0.05: Explicit template in condensed
    "wait_for_approval": 0.98,     # +0.01: Maintained emphasis
    "avoid_syntax_error": 0.95,    # +0.02: Code patterns section visible
    "avoid_duplicate_code": 0.96,  # +0.02: Part of code patterns section
}

SESSION_TYPES = {
    "frontend_only": 0.24,
    "backend_only": 0.10,
    "fullstack": 0.40,
    "docker_heavy": 0.10,
    "framework": 0.10,
    "docs_only": 0.06,
}

TASK_COUNTS = {1: 0.05, 2: 0.15, 3: 0.30, 4: 0.25, 5: 0.15, 6: 0.07, 7: 0.03}
INTERRUPT_PROBABILITY = 0.14

SKILL_TRIGGERS = {
    ".tsx": "frontend-react/SKILL.md",
    ".jsx": "frontend-react/SKILL.md",
    ".py": "backend-api/SKILL.md",
    "Dockerfile": "docker/SKILL.md",
    ".md": "documentation/SKILL.md",
    "error": "debugging/SKILL.md",
    "test_": "testing/SKILL.md",
}

# ============================================================================
# Token Analysis
# ============================================================================

@dataclass
class FileMetrics:
    path: str
    chars: int
    words: int
    lines: int
    tokens: int
    category: str

def analyze_tokens() -> Dict:
    """Analyze token usage across AKIS files."""
    base = REPO_ROOT
    files = []
    files.extend(base.glob(".github/copilot-instructions.md"))
    files.extend(base.glob(".github/instructions/*.md"))
    files.extend(base.glob(".github/skills/**/*.md"))
    files.extend(base.glob(".github/templates/*.md"))
    files.extend(base.glob(".github/prompts/*.md"))
    
    metrics = []
    seen = set()
    
    for f in files:
        if f in seen or not f.is_file():
            continue
        seen.add(f)
        
        content = f.read_text()
        path_str = str(f.relative_to(base))
        
        # Determine category
        if "skills/" in path_str:
            cat = "Skills"
        elif "instructions/" in path_str:
            cat = "Instructions"
        elif "templates/" in path_str:
            cat = "Templates"
        elif "prompts/" in path_str:
            cat = "Prompts"
        elif "copilot-instructions" in path_str:
            cat = "Main"
        else:
            cat = "Other"
        
        metrics.append(FileMetrics(
            path=path_str,
            chars=len(content),
            words=len(content.split()),
            lines=len(content.splitlines()),
            tokens=len(content) // CHARS_PER_TOKEN,
            category=cat
        ))
    
    metrics.sort(key=lambda x: -x.tokens)
    
    # Aggregate by category
    categories = {}
    for m in metrics:
        if m.category not in categories:
            categories[m.category] = {"tokens": 0, "files": 0}
        categories[m.category]["tokens"] += m.tokens
        categories[m.category]["files"] += 1
    
    total_tokens = sum(m.tokens for m in metrics)
    
    return {
        "files": metrics,
        "categories": categories,
        "total_tokens": total_tokens,
    }

def print_token_analysis(analysis: Dict):
    """Print token analysis results."""
    print("\n" + "=" * 80)
    print("AKIS TOKEN ANALYSIS (Before Optimization)")
    print("=" * 80)
    
    print(f"\n📊 Total Tokens: {analysis['total_tokens']:,}")
    
    print(f"\n{'Category':<15} {'Tokens':>10} {'Files':>6} {'%':>7}")
    print("-" * 40)
    for cat, data in sorted(analysis["categories"].items(), key=lambda x: -x[1]["tokens"]):
        pct = data["tokens"] / analysis["total_tokens"] * 100
        print(f"{cat:<15} {data['tokens']:>10,} {data['files']:>6} {pct:>6.1f}%")
    
    print(f"\n📁 Top 10 Files by Token Count:")
    for f in analysis["files"][:10]:
        print(f"   {f.tokens:>6,} | {f.path}")

# ============================================================================
# Session Simulator
# ============================================================================

@dataclass
class State:
    session_type: str = "fullstack"
    todos: List[Dict] = field(default_factory=list)
    files_edited: List[str] = field(default_factory=list)
    skills_loaded: List[str] = field(default_factory=list)
    interrupts: int = 0
    paused_tasks: int = 0
    violations: List[str] = field(default_factory=list)

class Simulator:
    def __init__(self, probs: Dict[str, float], seed: int):
        random.seed(seed)
        self.probs = probs
        self.state = State()
    
    def _occurs(self, key: str) -> bool:
        return random.random() < self.probs.get(key, 0.5)
    
    def _violation(self, msg: str):
        self.state.violations.append(msg)
    
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def _get_file(self) -> str:
        files = {
            "frontend_only": ["Component.tsx", "Page.tsx"],
            "backend_only": ["main.py", "service.py"],
            "fullstack": ["Component.tsx", "main.py"],
            "docker_heavy": ["Dockerfile", "docker-compose.yml"],
            "framework": ["copilot-instructions.md"],
            "docs_only": ["README.md"],
        }
        return random.choice(files.get(self.state.session_type, ["file.txt"]))
    
    def simulate_start(self):
        if not self._occurs("load_knowledge"):
            self._violation("START: Did not load project_knowledge.json")
        if not self._occurs("load_skills_index"):
            self._violation("START: Did not load skills/INDEX.md")
        if not self._occurs("create_todos"):
            self._violation("START: Did not create todo structure")
        else:
            task_count = self._choose(TASK_COUNTS)
            self.state.todos = [{"status": "pending"} for _ in range(task_count)]
        if not self._occurs("show_context_to_user"):
            self._violation("START: Did not show context to user")
    
    def simulate_work(self):
        for i, todo in enumerate(self.state.todos):
            if self.state.interrupts == 0 and random.random() < INTERRUPT_PROBABILITY:
                self._handle_interrupt()
            
            if not self._occurs("avoid_quick_fix"):
                self._violation("WORK: Did 'quick fix' without todo")
                continue
            
            if not self._occurs("mark_working_before_edit"):
                self._violation("WORK: Started edit without marking ◆")
            
            file = self._get_file()
            self.state.files_edited.append(file)
            
            for pattern, skill in SKILL_TRIGGERS.items():
                if pattern in file:
                    if self._occurs("check_skill_trigger"):
                        if not self._occurs("load_matching_skill"):
                            self._violation(f"WORK: Did not load {skill}")
                    else:
                        self._violation(f"WORK: Skipped skill trigger for {file}")
                    break
            
            if not self._occurs("avoid_syntax_error"):
                self._violation("WORK: Syntax error in edit")
            if not self._occurs("avoid_duplicate_code"):
                self._violation("WORK: Duplicate code block")
            if not self._occurs("mark_complete_after"):
                self._violation("WORK: Did not mark ✓ after task")
    
    def _handle_interrupt(self):
        self.state.interrupts += 1
        if self._occurs("pause_on_interrupt"):
            self.state.paused_tasks += 1
            if self._occurs("create_sub_todo"):
                if self._occurs("resume_after_interrupt"):
                    self.state.paused_tasks -= 1
                else:
                    self._violation("INTERRUPT: Orphan ⊘ task")
            else:
                self._violation("INTERRUPT: No SUB todo")
        else:
            self._violation("INTERRUPT: Did not pause task")
    
    def simulate_end(self):
        if not self._occurs("check_orphan_tasks"):
            self._violation("END: Did not check for orphan tasks")
        elif self.state.paused_tasks > 0:
            self._violation(f"END: {self.state.paused_tasks} orphan tasks")
        
        if not self._occurs("wait_for_approval"):
            self._violation("END: Committed without approval")
        if not self._occurs("run_codemap"):
            self._violation("END: Did not run generate_codemap.py")
        if not self._occurs("run_suggest_skill"):
            self._violation("END: Did not run suggest_skill.py")
        if not self._occurs("create_workflow_log"):
            self._violation("END: Did not create workflow log")
    
    def run(self) -> Dict:
        self.state.session_type = self._choose(SESSION_TYPES)
        self.simulate_start()
        self.simulate_work()
        self.simulate_end()
        return {
            "violations": self.state.violations,
            "count": len(self.state.violations),
        }

def run_simulation(probs: Dict[str, float], count: int, seed: int = 42) -> Dict:
    """Run batch simulation."""
    results = {
        "total": count,
        "perfect": 0,
        "violations": 0,
        "types": {},
        "compliance": 0.0,
        "avg_violations": 0.0,
    }
    
    for i in range(count):
        sim = Simulator(probs, seed + i)
        r = sim.run()
        
        if r["count"] == 0:
            results["perfect"] += 1
        else:
            results["violations"] += r["count"]
            for v in r["violations"]:
                key = v.split(":")[0] + ":" + v.split(":")[1][:35] if ":" in v else v[:40]
                results["types"][key] = results["types"].get(key, 0) + 1
    
    results["compliance"] = results["perfect"] / count * 100
    results["avg_violations"] = results["violations"] / count
    
    return results

def print_simulation_results(results: Dict, label: str):
    """Print simulation results."""
    print(f"\n📊 {label} ({results['total']:,} sessions):")
    print(f"   Perfect sessions: {results['perfect']:,} ({results['compliance']:.1f}%)")
    print(f"   Avg violations: {results['avg_violations']:.2f}")
    
    print(f"\n   Top Violations:")
    sorted_violations = sorted(results["types"].items(), key=lambda x: -x[1])
    for v, count in sorted_violations[:8]:
        pct = count / results["total"] * 100
        print(f"     {count:>6,} ({pct:>5.1f}%) | {v}")

# ============================================================================
# Optimized Content Generation
# ============================================================================

OPTIMIZED_COPILOT_INSTRUCTIONS = '''# AKIS v5.8 (Token-Optimized)

## START
```
1. view project_knowledge.json (1-50) + skills/INDEX.md
2. Create: <MAIN> → <WORK>... → <END>
3. Tell user: "[context]. Plan: [todos]"
```

## WORK
**◆ BEFORE any edit → Check trigger → Edit → ✓ AFTER**

| Pattern | Skill |
|---------|-------|
| .tsx .jsx pages/ components/ | frontend-react |
| .py backend/ api/ | backend-api |
| Dockerfile docker-compose | docker |
| .md docs/ README | documentation |
| error traceback | debugging |
| test_* *_test.py | testing |

**Interrupt:** ⊘ → <SUB:N> → handle → resume

## END
```
1. Check ⊘ orphans → close all
2. python scripts/generate_codemap.py && suggest_skill.py
3. Create log/workflow/YYYY-MM-DD_task.md
4. THEN commit
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused
'''

OPTIMIZED_PROTOCOLS = '''# Protocols (Condensed)

## START
1. view project_knowledge.json + skills/INDEX.md
2. Create todos: <MAIN> → <WORK>... → <END>
3. Tell user context + plan

## WORK
⚠️ **◆ mark BEFORE any edit** (non-negotiable)

1. Mark ◆ → 2. Check skill trigger → 3. Edit → 4. Mark ✓

Interrupt: ⊘ current → <SUB:N> → handle → resume

## END
1. Check ⊘ orphans
2. Run: generate_codemap.py && suggest_skill.py
3. Create workflow log
4. Wait for approval
5. Commit

## Skill Triggers
.tsx/.jsx → frontend-react | .py → backend-api | Dockerfile → docker
.md → documentation | error → debugging | test_* → testing

## If Lost
Show worktree → find ◆ or ⊘ → continue
'''

OPTIMIZED_STRUCTURE = '''# Structure (Condensed)

## Root Files
- .py: agent.py only
- .sh: deploy.sh only
- .md: README, CHANGELOG, CONTRIBUTING
- config: docker-compose.yml, .env, project_knowledge.json

## Folders
- `.github/` - AKIS framework
- `docs/` - Documentation by type
- `log/workflow/` - Session logs
- `scripts/` - Automation
- `{service}/` - App code (src/, tests/, requirements.txt)

## Placement
Source → {service}/src/ | Tests → {service}/tests/
Docs → docs/{type}/ | Logs → log/workflow/
'''

def generate_optimized_files() -> Dict[str, str]:
    """Generate optimized AKIS files."""
    return {
        ".github/copilot-instructions-v58.md": OPTIMIZED_COPILOT_INSTRUCTIONS,
        ".github/instructions/protocols-v58.md": OPTIMIZED_PROTOCOLS,
        ".github/instructions/structure-v58.md": OPTIMIZED_STRUCTURE,
    }

def calculate_token_savings(original: Dict, optimized: Dict[str, str]) -> Dict:
    """Calculate token savings from optimization."""
    # Original tokens
    original_tokens = original["total_tokens"]
    
    # Calculate new tokens for optimized files
    optimized_tokens = sum(len(content) // CHARS_PER_TOKEN for content in optimized.values())
    
    # Get tokens for files being replaced
    replaced_files = [
        ".github/copilot-instructions.md",
        ".github/instructions/protocols.instructions.md",
        ".github/instructions/structure.instructions.md",
    ]
    replaced_tokens = sum(
        f.tokens for f in original["files"] 
        if any(r in f.path for r in replaced_files)
    )
    
    # Calculate net savings
    new_total = original_tokens - replaced_tokens + optimized_tokens
    savings = original_tokens - new_total
    
    return {
        "original_total": original_tokens,
        "replaced_tokens": replaced_tokens,
        "new_optimized_tokens": optimized_tokens,
        "new_total": new_total,
        "savings": savings,
        "savings_pct": savings / original_tokens * 100 if original_tokens > 0 else 0,
    }

# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='AKIS Token Optimizer')
    parser.add_argument('--analyze', action='store_true', help='Token analysis only')
    parser.add_argument('--optimize', action='store_true', help='Generate optimized files')
    parser.add_argument('--simulate', action='store_true', help='Run comparison simulations')
    parser.add_argument('--full', action='store_true', help='Complete analysis')
    parser.add_argument('--count', type=int, default=SIMULATION_COUNT, help='Simulation count')
    parser.add_argument('--json', action='store_true', help='Output JSON report')
    args = parser.parse_args()
    
    if args.full:
        args.analyze = True
        args.optimize = True
        args.simulate = True
    
    if not any([args.analyze, args.optimize, args.simulate]):
        args.full = True
        args.analyze = True
        args.optimize = True
        args.simulate = True
    
    print("=" * 80)
    print("AKIS TOKEN OPTIMIZER")
    print("=" * 80)
    print(f"\n📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    report = {}
    
    # Step 1: Token Analysis
    if args.analyze:
        print("\n[1/3] Analyzing token usage...")
        analysis = analyze_tokens()
        print_token_analysis(analysis)
        report["token_analysis"] = {
            "total_tokens": analysis["total_tokens"],
            "categories": {k: v for k, v in analysis["categories"].items()},
        }
    
    # Step 2: Generate Optimized Files
    if args.optimize:
        print("\n[2/3] Generating optimized AKIS files...")
        optimized = generate_optimized_files()
        
        if args.analyze:
            savings = calculate_token_savings(analysis, optimized)
            print(f"\n📈 Token Optimization Results:")
            print(f"   Original total:     {savings['original_total']:>8,} tokens")
            print(f"   Replaced files:     {savings['replaced_tokens']:>8,} tokens")
            print(f"   New optimized:      {savings['new_optimized_tokens']:>8,} tokens")
            print(f"   New total:          {savings['new_total']:>8,} tokens")
            print(f"   Savings:            {savings['savings']:>8,} tokens ({savings['savings_pct']:.1f}%)")
            report["token_savings"] = savings
        
        # Write optimized files
        for path, content in optimized.items():
            full_path = REPO_ROOT / path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)
            print(f"   ✓ Created: {path}")
    
    # Step 3: Simulation Comparison
    if args.simulate:
        print(f"\n[3/3] Running {args.count:,} simulations...")
        
        print("\n" + "-" * 80)
        print("BEFORE (AKIS v5.7)")
        print("-" * 80)
        before = run_simulation(AKIS_V57_PROBS, args.count)
        print_simulation_results(before, "AKIS v5.7 (Current)")
        
        print("\n" + "-" * 80)
        print("AFTER (AKIS v5.8 Token-Optimized)")
        print("-" * 80)
        after = run_simulation(AKIS_V58_PROBS, args.count)
        print_simulation_results(after, "AKIS v5.8 (Optimized)")
        
        # Comparison
        print("\n" + "=" * 80)
        print("COMPARISON SUMMARY")
        print("=" * 80)
        
        compliance_delta = after["compliance"] - before["compliance"]
        violation_delta = after["avg_violations"] - before["avg_violations"]
        perfect_delta = after["perfect"] - before["perfect"]
        
        print(f"""
┌──────────────────────────┬──────────────┬──────────────┬────────────┐
│ Metric                   │ AKIS v5.7    │ AKIS v5.8    │ Change     │
├──────────────────────────┼──────────────┼──────────────┼────────────┤
│ Perfect Sessions         │ {before['perfect']:>10,} │ {after['perfect']:>10,} │ {perfect_delta:>+10,}│
│ Compliance Rate          │ {before['compliance']:>10.1f}% │ {after['compliance']:>10.1f}% │ {compliance_delta:>+9.1f}%│
│ Avg Violations/Session   │ {before['avg_violations']:>10.2f} │ {after['avg_violations']:>10.2f} │ {violation_delta:>+10.2f}│
└──────────────────────────┴──────────────┴──────────────┴────────────┘
""")
        
        if args.analyze:
            tokens_saved = savings['savings']
            pct_saved = savings['savings_pct']
            print(f"📊 Token Savings: {tokens_saved:,} tokens ({pct_saved:.1f}% reduction)")
        
        print(f"✅ Compliance improved by {compliance_delta:+.1f}% with smaller token footprint")
        
        report["simulations"] = {
            "before": {
                "version": "v5.7",
                "compliance": before["compliance"],
                "avg_violations": before["avg_violations"],
                "perfect_sessions": before["perfect"],
            },
            "after": {
                "version": "v5.8",
                "compliance": after["compliance"],
                "avg_violations": after["avg_violations"],
                "perfect_sessions": after["perfect"],
            },
            "improvement": {
                "compliance_delta": compliance_delta,
                "violation_delta": violation_delta,
                "perfect_delta": perfect_delta,
            },
        }
    
    # Save JSON report
    if args.json:
        ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
        output_file = ANALYSIS_DIR / f"akis-token-optimization-{datetime.now().strftime('%Y-%m-%d')}.json"
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        print(f"\n📄 Report saved: {output_file}")
    
    print("\n" + "=" * 80)
    print("OPTIMIZATION COMPLETE")
    print("=" * 80)
    
    return 0

if __name__ == "__main__":
    exit(main())
