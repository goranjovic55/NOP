#!/usr/bin/env python3
"""
Session End - Complete session workflow with enforcement

1. Verify work complete → Check all TODO items addressed
2. Structure enforcement → Validate file placements
3. Generate codemap → Update project_knowledge.json
4. Suggest skills → Propose new/update/remove
5. Increment session counter → Check maintenance due
6. Create workflow log → Document if >15min task
7. Final checklist → Commit reminder

Usage:
    python .github/scripts/session_end.py [--task "task name"] [--duration N]
"""
import json
import os
import sys
import subprocess
import shutil
from pathlib import Path
from datetime import datetime


def run_script(script_name, description, args=None):
    """Run a script and return output"""
    script_path = Path(f".github/scripts/{script_name}")
    if not script_path.exists():
        print(f"⚠️  {description} - Script not found: {script_name}")
        return None
    
    print(f"\n▶️  {description}...")
    try:
        cmd = ["python", str(script_path)]
        if args:
            cmd.extend(args)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False
        )
        return result
    except Exception as e:
        print(f"❌ Error running {script_name}: {e}")
        return None


def check_git_changes():
    """Check if there are uncommitted changes"""
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True
    )
    return bool(result.stdout.strip())


def get_changed_files():
    """Get list of changed files"""
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True
    )
    files = []
    for line in result.stdout.strip().split('\n'):
        if line.strip():
            # Status is first 2 chars, then space, then filename
            files.append(line[3:].strip())
    return files


def check_structure_violations():
    """Check for files that may be in wrong locations"""
    root = Path(".")
    
    # Files that should NOT be in root
    suspicious_patterns = [
        ('*.md', ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 'PRODUCTION_READY.md', 'BUG_FIX_SUMMARY.md']),
        ('test_*.py', []),
        ('*_test.py', []),
    ]
    
    violations = []
    
    for pattern, exceptions in suspicious_patterns:
        for f in root.glob(pattern):
            if f.name not in exceptions and f.is_file():
                # Determine where it should be
                name_upper = f.name.upper()
                if 'TEST' in name_upper:
                    violations.append((f.name, 'scripts/ or tests/'))
                elif f.suffix == '.md' and f.name not in exceptions:
                    if 'ANALYSIS' in name_upper or 'BUG' in name_upper or 'SUMMARY' in name_upper:
                        violations.append((f.name, 'docs/analysis/'))
                    else:
                        violations.append((f.name, 'docs/ (appropriate category)'))
    
    return violations


def get_session_number():
    """Get current session number"""
    tracker_file = Path('.github/.session-tracker.json')
    if not tracker_file.exists():
        return 0
    try:
        with open(tracker_file) as f:
            data = json.load(f)
            return data.get('current_session', 0)
    except (json.JSONDecodeError, IOError):
        return 0


def main():
    # Parse arguments
    task_name = None
    duration = None
    
    for i, arg in enumerate(sys.argv):
        if arg == '--task' and i + 1 < len(sys.argv):
            task_name = sys.argv[i + 1]
        elif arg == '--duration' and i + 1 < len(sys.argv):
            duration = int(sys.argv[i + 1])
    
    print("\n" + "="*70)
    print("  AKIS v3 - Session End | Blocking Gate: COMPLETE")
    print("="*70)
    
    session_num = get_session_number()
    print(f"\n📊 Session: #{session_num}")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    # Step 1: Check structure violations
    print("\n" + "-"*70)
    print("  Step 1: Structure Enforcement")
    print("-"*70)
    
    violations = check_structure_violations()
    if violations:
        print("   ⚠️  Potential structure violations found:")
        for filename, correct_loc in violations:
            print(f"      • {filename} → should be in {correct_loc}")
        print("\n   Action: Move files to correct locations per structure.md")
    else:
        print("   ✅ No structure violations detected")
    
    # Step 2: Generate codemap
    print("\n" + "-"*70)
    print("  Step 2: Knowledge Update")
    print("-"*70)
    
    changed_files = get_changed_files()
    code_files = [f for f in changed_files if f.endswith(('.py', '.ts', '.tsx', '.js', '.jsx'))]
    
    if code_files:
        print(f"   Code files changed: {len(code_files)}")
        result = run_script("generate_codemap.py", "Generating codemap")
        if result and result.returncode == 0:
            print("   ✅ Knowledge map updated")
        else:
            print("   ⚠️  Codemap generation had issues")
    else:
        print("   ℹ️  No code files changed, skipping codemap")
    
    # Step 3: Suggest skills
    print("\n" + "-"*70)
    print("  Step 3: Skill Analysis")
    print("-"*70)
    
    result = run_script("suggest_skill.py", "Analyzing for skill patterns")
    if result and result.returncode == 0:
        print("   ✅ Skill analysis complete")
        if result.stdout:
            try:
                suggestions = json.loads(result.stdout)
                if suggestions.get("suggestions"):
                    print("\n   📝 Skill Suggestions:")
                    for s in suggestions["suggestions"]:
                        print(f"      - {s.get('action', 'suggest')}: {s.get('name', 'unknown')}")
            except json.JSONDecodeError:
                pass
    else:
        print("   ℹ️  No skill suggestions")
    
    # Step 4: Session counter
    print("\n" + "-"*70)
    print("  Step 4: Session Tracking")
    print("-"*70)
    
    result = run_script("session_tracker.py", "Incrementing session", ["increment"])
    maintenance_due = False
    if result:
        if "Maintenance due" in result.stdout:
            maintenance_due = True
            print("   🔔 MAINTENANCE DUE")
            print("   Consider running: .github/prompts/akis-workflow-analyzer.md")
        else:
            print(f"   Session #{session_num + 1} recorded")
    
    # Step 5: Workflow log prompt
    print("\n" + "-"*70)
    print("  Step 5: Workflow Log")
    print("-"*70)
    
    should_create_log = duration and duration > 15
    
    if should_create_log or check_git_changes():
        if should_create_log:
            print(f"   ⚠️  Task duration ({duration}min) > 15min - Workflow log REQUIRED")
        else:
            print("   Changes detected - consider creating workflow log")
        
        if task_name:
            timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
            log_file = Path(f"log/workflow/{timestamp}_{task_name.replace(' ', '-')}.md")
            log_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Use template
            template = Path(".github/templates/workflow-log.md")
            if template.exists():
                content = template.read_text()
                content = content.replace("{TASK_NAME}", task_name)
                content = content.replace("{YYYY-MM-DD HH:MM}", datetime.now().strftime("%Y-%m-%d %H:%M"))
                content = content.replace("{SESSION_NUMBER}", str(session_num + 1))
                if duration:
                    content = content.replace("{N}", str(duration))
                log_file.write_text(content)
                print(f"   ✅ Created: {log_file}")
                print("   📝 Fill in Summary, Changes, Decisions sections")
            else:
                print("   ⚠️  Template not found: .github/templates/workflow-log.md")
        else:
            print("   ℹ️  Use --task 'name' to auto-create workflow log")
    else:
        print("   ℹ️  Short task, workflow log optional")
    
    # Final checklist
    print("\n" + "="*70)
    print("  BLOCKING GATE CHECKLIST (Must complete before closing)")
    print("="*70)
    print("""
  [ ] 1. All TODO items addressed (complete or documented as deferred)
  [ ] 2. Code compiles/lints successfully
  [ ] 3. Tests pass (if applicable)
  [ ] 4. Files in correct locations per structure.md
  [ ] 5. Workflow log created (if >15min task)
  [ ] 6. Changes committed via report_progress

  GATE PASSED when all items checked.
""")
    
    if check_git_changes():
        print("  📦 Uncommitted changes detected!")
        print("  Use: report_progress to commit and push")
    else:
        print("  ✅ No uncommitted changes")
    
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()
