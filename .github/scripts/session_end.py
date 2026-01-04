#!/usr/bin/env python3
"""
Session End - Complete session workflow
1. Generate codemap → Update project_knowledge.json
2. Suggest skills → Propose new/update/remove
3. Increment session counter → Check maintenance due
4. Create workflow log (if complex)
5. Commit changes
"""
import json
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

def run_script(script_name, description):
    """Run a script and return output"""
    script_path = Path(f".github/scripts/{script_name}")
    if not script_path.exists():
        print(f"⚠️  {description} - Script not found: {script_name}")
        return None
    
    print(f"\n▶️  {description}...")
    try:
        result = subprocess.run(
            ["python", str(script_path)],
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

def main():
    print("\n" + "="*70)
    print("  AKIS v3 - Session End")
    print("="*70)
    
    # Step 1: Generate codemap
    result = run_script("generate_codemap.py", "Generating codemap")
    if result and result.returncode == 0:
        print("   ✅ Knowledge map updated")
    else:
        print("   ⚠️  Codemap generation had issues (check output)")
    
    # Step 2: Suggest skills
    result = run_script("suggest_skill.py", "Analyzing session for skills")
    if result and result.returncode == 0:
        print("   ✅ Skill suggestions complete")
        if result.stdout:
            try:
                suggestions = json.loads(result.stdout)
                if suggestions.get("suggestions"):
                    print("\n   📝 Skill Suggestions:")
                    for s in suggestions["suggestions"]:
                        print(f"      - {s['action']}: {s['name']}")
                    print("\n   ⏸  Review suggestions and approve/modify before continuing")
                    input("\n   Press Enter when ready to continue...")
            except json.JSONDecodeError:
                pass
    
    # Step 3: Session counter and maintenance check
    result = run_script("session_tracker.py", "Checking session counter")
    if result and "Maintenance due" in result.stdout:
        print("\n   🔔 MAINTENANCE DUE (every 10 sessions)")
        print("   Consider running: .github/prompts/akis-workflow-analyzer.md")
    
    # Step 4: Workflow log
    if check_git_changes():
        print("\n▶️  Changes detected")
        response = input("   Create workflow log? (y/n, default=n): ").strip().lower()
        
        if response == 'y':
            task_name = input("   Task name: ").strip()
            if task_name:
                timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
                log_file = Path(f"log/workflow/{timestamp}_{task_name}.md")
                log_file.parent.mkdir(parents=True, exist_ok=True)
                
                # Use template
                template = Path(".github/templates/workflow-log.md")
                if template.exists():
                    content = template.read_text()
                    content = content.replace("{TASK_NAME}", task_name)
                    content = content.replace("{YYYY-MM-DD HH:MM}", datetime.now().strftime("%Y-%m-%d %H:%M"))
                    log_file.write_text(content)
                    print(f"   ✅ Created workflow log: {log_file}")
                    print(f"   📝 Fill in details before committing")
                else:
                    print("   ⚠️  Template not found, skipping log creation")
    
    # Step 5: Commit prompt
    print("\n" + "="*70)
    if check_git_changes():
        print("  📦 Uncommitted changes detected")
        print("  Review changes with: git status")
        print("  Commit with: git add -A && git commit -m 'your message'")
    else:
        print("  ✅ No uncommitted changes")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
