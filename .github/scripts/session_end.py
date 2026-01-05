#!/usr/bin/env python3
"""
Session End - Complete session workflow
1. Clean repository → Move misplaced files
2. Generate codemap → Update project_knowledge.json
3. Suggest skills → Propose new/update/remove
4. Increment session counter → Check maintenance due
5. Create workflow log (if complex)
6. Commit changes
"""
import json
import os
import sys
import subprocess
import shutil
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

def clean_repository():
    """Clean repository by moving misplaced files based on structure.md rules"""
    root = Path("/workspaces/NOP")
    
    # Files that should stay in root
    keep_in_root = {
        "README.md", "CHANGELOG.md", "CONTRIBUTING.md", "LICENSE.md",
        "docker-compose.yml", ".env", ".env.example", ".gitignore",
        "deploy.sh", "project_knowledge.json"
    }
    
    moved_files = []
    
    # Scan root directory for misplaced files
    for item in root.iterdir():
        # Only process files (not directories)
        if not item.is_file():
            continue
        
        # Skip files that belong in root
        if item.name in keep_in_root:
            continue
        
        # Skip hidden files
        if item.name.startswith('.'):
            continue
        
        target_dir = None
        
        # Documentation files → docs/ (organize by type)
        if item.suffix == '.md':
            # Categorize by content type
            name_upper = item.name.upper()
            if any(keyword in name_upper for keyword in ['ANALYSIS', 'SUMMARY', 'GAP', 'BUG']):
                target_dir = root / "docs" / "analysis"
            elif any(keyword in name_upper for keyword in ['ARCHITECTURE', 'DESIGN', 'ADR']):
                target_dir = root / "docs" / "architecture"
            elif any(keyword in name_upper for keyword in ['IMPLEMENTATION', 'GUIDE', 'HOWTO']):
                target_dir = root / "docs" / "guides"
            elif any(keyword in name_upper for keyword in ['FEATURE', 'SPEC']):
                target_dir = root / "docs" / "features"
            else:
                # Default to analysis for other docs
                target_dir = root / "docs" / "analysis"
        
        # Test scripts → scripts/
        elif (item.name.startswith('test_') or item.name.startswith('test-')) and item.suffix in ['.py', '.sh']:
            target_dir = root / "scripts"
        
        # Other scripts → scripts/
        elif item.suffix in ['.py', '.sh'] and item.name not in ['agent.py']:
            target_dir = root / "scripts"
        
        # Docker compose variants → docker/
        elif item.name.startswith('docker-compose.') and item.suffix in ['.yml', '.yaml']:
            target_dir = root / "docker"
        
        # Move file if target determined
        if target_dir:
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / item.name
            
            # Handle duplicates by appending timestamp
            if target_file.exists():
                stem = item.stem
                suffix = item.suffix
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                target_file = target_dir / f"{stem}_{timestamp}{suffix}"
            
            try:
                shutil.move(str(item), str(target_file))
                moved_files.append((item.name, target_dir.relative_to(root)))
            except Exception as e:
                print(f"   ⚠️  Failed to move {item.name}: {e}")
    
    return moved_files

def main():
    print("\n" + "="*70)
    print("  AKIS v3 - Session End")
    print("="*70)
    
    # Track summary data
    summary = {
        "cleaned": [],
        "knowledge_updated": False,
        "skills": [],
        "session": None,
        "maintenance_due": False,
        "workflow_log": None,
        "has_changes": False
    }
    
    # Step 0: Clean repository
    print("\n▶️  Cleaning repository...")
    moved_files = clean_repository()
    if moved_files:
        print(f"   ✅ Moved {len(moved_files)} file(s):")
        for filename, target in moved_files:
            print(f"      • {filename} → {target}/")
            summary["cleaned"].append(f"{filename} → {target}/")
    else:
        print("   ✅ Repository is clean")
    
    # Step 1: Generate codemap
    result = run_script("generate_codemap.py", "Generating codemap")
    if result and result.returncode == 0:
        print("   ✅ Knowledge map updated")
        summary["knowledge_updated"] = True
    else:
        print("   ⚠️  Codemap generation had issues (check output)")
    
    # Step 2: Suggest skills
    result = run_script("suggest_skill.py", "Analyzing session for skills")
    skill_suggestions = []
    if result and result.returncode == 0:
        print("   ✅ Skill suggestions complete")
        if result.stdout:
            try:
                suggestions = json.loads(result.stdout)
                if suggestions.get("suggestions"):
                    skill_suggestions = suggestions["suggestions"]
                    print("\n   📝 Skill Suggestions:")
                    for s in skill_suggestions:
                        skill_name = s.get('name', 'unnamed')
                        skill_title = s.get('title', skill_name)
                        print(f"      - {skill_title}")
                        summary["skills"].append(skill_title)
                    print(f"\n   💡 {len(skill_suggestions)} skill(s) suggested - review and create manually if useful")
            except json.JSONDecodeError:
                pass
    
    # Step 3: Session counter and maintenance check
    result = run_script("session_tracker.py", "Checking session counter")
    if result and result.stdout:
        # Extract session number
        import re
        match = re.search(r'Session (\d+)', result.stdout)
        if match:
            summary["session"] = match.group(1)
        
        if "Maintenance due" in result.stdout:
            print("\n   🔔 MAINTENANCE DUE (every 10 sessions)")
            print("   Consider running: .github/prompts/akis-workflow-analyzer.md")
            summary["maintenance_due"] = True
    
    # Step 4: Workflow log (auto-create if changes detected)
    summary["has_changes"] = check_git_changes()
    if summary["has_changes"]:
        # Auto-detect task name from branch
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True
        )
        branch_name = result.stdout.strip()
        
        # Extract task name from branch (e.g., "copilot/create-agent-page" -> "create-agent-page")
        if '/' in branch_name:
            task_name = branch_name.split('/', 1)[1]
        else:
            task_name = branch_name if branch_name != 'main' else 'session'
        
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
            print(f"\n▶️  Created workflow log: {log_file}")
            print(f"   📝 Fill in details before committing")
            summary["workflow_log"] = str(log_file)
        else:
            print("\n   ⚠️  Template not found, skipping log creation")
    
    # Final Summary
    print("\n" + "="*70)
    print("  SESSION END SUMMARY")
    print("="*70)
    
    if summary["session"]:
        print(f"\n  📊 Session: #{summary['session']}")
    
    if summary["cleaned"]:
        print(f"\n  🧹 Repository Cleaned:")
        for item in summary["cleaned"]:
            print(f"     • {item}")
    
    if summary["knowledge_updated"]:
        print(f"\n  📚 Knowledge: Updated (project_knowledge.json)")
    
    if summary["skills"]:
        print(f"\n  🎯 Skill Suggestions:")
        for skill in summary["skills"]:
            print(f"     • {skill}")
    
    if summary["maintenance_due"]:
        print(f"\n  ⚠️  Maintenance: DUE (run akis-workflow-analyzer.md)")
    
    if summary["workflow_log"]:
        print(f"\n  📝 Workflow Log: {summary['workflow_log']}")
    
    if summary["has_changes"]:
        print(f"\n  📦 Next Steps:")
        print(f"     1. Review: git status")
        print(f"     2. Fill workflow log with details")
        print(f"     3. Commit: git add -A && git commit -m 'your message'")
    else:
        print(f"\n  ✅ No uncommitted changes")
    
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    main()
