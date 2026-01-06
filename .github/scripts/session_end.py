#!/usr/bin/env python3
"""
AKIS v4 Session End - Complete session workflow

1. Clean repository → Move misplaced files per structure.md
2. Generate codemap → Update project_knowledge.json
3. Suggest skills → Detailed suggestions for review
4. Create workflow log → AUTO-FILLED with session data
5. Show summary → Ready for commit

Usage:
    python session_end.py                    # Auto-detect from branch
    python session_end.py "session name"    # Custom session name
"""
import json
import os
import sys
import subprocess
import shutil
from pathlib import Path
from datetime import datetime


def read_knowledge(lines: int = 50):
    """Read first N lines of project_knowledge.json for map + entities"""
    kn_file = Path("project_knowledge.json")
    if not kn_file.exists():
        return None, []
    
    entities = []
    kn_map = None
    
    with open(kn_file) as f:
        for i, line in enumerate(f):
            if i >= lines:
                break
            try:
                data = json.loads(line.strip())
                if data.get("type") == "map":
                    kn_map = data
                elif data.get("type") == "entity":
                    entities.append(data)
            except json.JSONDecodeError:
                continue
    
    return kn_map, entities


def generate_workflow_log(task_name: str, session_number: str, skills: list, skill_details: list = None) -> str:
    """Generate auto-filled workflow log from session data.
    
    Args:
        task_name: Name of the task/branch
        session_number: Session counter number
        skills: List of skill titles (for backward compatibility)
        skill_details: Full skill suggestion objects with description, evidence, etc.
    """
    
    # Get ALL changes using git status (captures staged, unstaged, and untracked)
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True
    )
    
    # Parse changes from git status
    changes_list = []
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        status = line[:2].strip()
        filepath = line[3:].strip()
        
        # Skip workflow logs we're about to create
        if filepath.startswith('log/workflow/'):
            continue
            
        if status in ['A', '??']:
            changes_list.append(f"- Created: `{filepath}`")
        elif status == 'M':
            changes_list.append(f"- Modified: `{filepath}`")
        elif status == 'D':
            changes_list.append(f"- Deleted: `{filepath}`")
        elif status == 'R':
            changes_list.append(f"- Renamed: `{filepath}`")
        else:
            changes_list.append(f"- Changed: `{filepath}`")
    
    changes_section = '\n'.join(changes_list[:20]) if changes_list else "- No file changes detected"
    if len(changes_list) > 20:
        changes_section += f"\n- ... and {len(changes_list) - 20} more files"
    
    # Get commits made TODAY (session work) - not old commits
    today = datetime.now().strftime("%Y-%m-%d")
    result = subprocess.run(
        ["git", "log", "--since=midnight", "--pretty=format:%s"],
        capture_output=True,
        text=True
    )
    today_commits = [msg.strip() for msg in result.stdout.strip().split('\n') if msg.strip()]
    
    # If no commits today, check for recent commits on this branch vs main
    if not today_commits:
        result = subprocess.run(
            ["git", "log", "main..HEAD", "--pretty=format:%s"],
            capture_output=True,
            text=True
        )
        branch_commits = [msg.strip() for msg in result.stdout.strip().split('\n') if msg.strip()]
        today_commits = branch_commits[:10] if branch_commits else []
    
    # Build summary from session commits + uncommitted work
    summary_items = []
    
    # Add commits made in session
    if today_commits:
        summary_items.append("**Commits:**")
        for msg in today_commits[:5]:
            summary_items.append(f"- {msg}")
    
    # Add description of uncommitted work
    if changes_list:
        summary_items.append(f"\n**Uncommitted Work ({len(changes_list)} files):**")
        # Group by directory
        dirs = {}
        for change in changes_list[:10]:
            filepath = change.split('`')[1] if '`' in change else change
            dir_name = filepath.split('/')[0] if '/' in filepath else 'root'
            dirs[dir_name] = dirs.get(dir_name, 0) + 1
        for dir_name, count in sorted(dirs.items(), key=lambda x: -x[1])[:5]:
            summary_items.append(f"- {dir_name}/: {count} file(s)")
    
    if not summary_items:
        summary_items.append(f"Session focused on {task_name.replace('-', ' ')}.")
    
    summary = '\n'.join(summary_items)
    
    # Skills section - detailed listing
    if skill_details:
        skills_lines = []
        for skill in skill_details:
            skill_name = skill.get('name', 'unnamed')
            skill_title = skill.get('title', skill_name)
            description = skill.get('description', 'No description')
            confidence = skill.get('confidence', 'medium')
            evidence = skill.get('evidence', [])
            
            skills_lines.append(f"### {skill_title}")
            skills_lines.append(f"**Confidence**: {confidence}")
            skills_lines.append(f"\n{description}")
            
            if evidence:
                skills_lines.append("\n**Evidence:**")
                for e in evidence[:3]:
                    skills_lines.append(f"- {e}")
            
            # Add when_to_use if available
            when_to_use = skill.get('when_to_use', [])
            if when_to_use:
                skills_lines.append("\n**When to use:**")
                for w in when_to_use[:3]:
                    skills_lines.append(f"- {w}")
            
            skills_lines.append("")  # Empty line between skills
        
        skills_text = '\n'.join(skills_lines) if skills_lines else "None suggested"
    elif skills:
        # Fallback to simple list
        skills_text = "**Suggested skills:**\n" + '\n'.join(f"- {s}" for s in skills)
    else:
        skills_text = "None suggested"
    
    # Session number fallback
    session_display = session_number if session_number and session_number != "None" else "N/A"
    
    # Auto-generate notes based on session context
    notes_items = []
    
    # Analyze what was worked on
    if changes_list:
        # Categorize changes by area
        areas = set()
        for change in changes_list:
            filepath = change.split('`')[1] if '`' in change else change
            if 'frontend' in filepath or 'components' in filepath or '.tsx' in filepath:
                areas.add('frontend')
            elif 'backend' in filepath or 'app/' in filepath:
                areas.add('backend')
            elif 'docker' in filepath.lower():
                areas.add('infrastructure')
            elif 'test' in filepath.lower():
                areas.add('testing')
            elif 'docs' in filepath or '.md' in filepath:
                areas.add('documentation')
        
        if areas:
            notes_items.append(f"**Areas touched:** {', '.join(sorted(areas))}")
    
    # Add context from commits
    if today_commits:
        # Look for patterns in commit messages
        feat_commits = [c for c in today_commits if c.startswith('feat')]
        fix_commits = [c for c in today_commits if c.startswith('fix')]
        if feat_commits:
            notes_items.append(f"**Features added:** {len(feat_commits)}")
        if fix_commits:
            notes_items.append(f"**Bugs fixed:** {len(fix_commits)}")
    
    # Suggest future work based on skill suggestions
    if skill_details:
        related = set()
        for skill in skill_details:
            related.update(skill.get('related_skills', []))
        if related:
            notes_items.append(f"**Related skills to review:** {', '.join(list(related)[:3])}")
    
    notes_section = '\n'.join(notes_items) if notes_items else "*Session completed successfully. Add manual notes if needed.*"
    
    # Generate log content
    log_content = f"""# {task_name.replace('-', ' ').title()}

**Date**: {datetime.now().strftime("%Y-%m-%d %H:%M")}
**Session**: #{session_display}
**Files Changed**: {len(changes_list)}

## Summary
{summary}

## Changes
{changes_section}

## Skill Suggestions
{skills_text}

## Verification
- [ ] Code changes reviewed
- [ ] Knowledge map updated
- [ ] Session committed

## Notes
{notes_section}
"""
    
    return log_content

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
    # Parse CLI args for session name
    session_name = None
    if len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
        session_name = sys.argv[1]
    
    print("\n" + "="*60)
    print("  AKIS v4 - Session End")
    print("="*60)
    
    # Load knowledge context (50 lines)
    print("\n▶️  Loading context...")
    kn_map, entities = read_knowledge(50)
    if kn_map:
        domains = kn_map.get("domains", {})
        print(f"   ✅ {len(domains)} domains, {len(entities)} entities")
    else:
        print("   ⚠️  No knowledge map")
    
    # Track summary data
    summary = {
        "cleaned": [],
        "knowledge_updated": False,
        "skills": [],
        "skill_details": [],  # Full skill objects for detailed logging
        "session": None,
        "maintenance_due": False,
        "workflow_log": None,
        "has_changes": False,
        "session_name": session_name
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
                    summary["skill_details"] = skill_suggestions  # Store full details
                    print("\n   📝 Skill Suggestions:")
                    for s in skill_suggestions:
                        skill_name = s.get('name', 'unnamed')
                        skill_title = s.get('title', skill_name)
                        confidence = s.get('confidence', 'medium')
                        description = s.get('description', '')
                        print(f"      - {skill_title} [{confidence}]")
                        if description:
                            print(f"        {description[:80]}...")
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
    
    # Step 4: Workflow log (auto-create and fill if changes detected)
    summary["has_changes"] = check_git_changes()
    if summary["has_changes"]:
        # Get branch name for context
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True
        )
        branch_name = result.stdout.strip()
        
        # Extract branch task (e.g., "copilot/create-agent-page" -> "create-agent-page")
        if '/' in branch_name:
            branch_task = branch_name.split('/', 1)[1]
        else:
            branch_task = branch_name if branch_name != 'main' else 'session'
        
        # Build task name: combine session name (from CLI) with branch
        if session_name:
            # User provided session name: "session-name_branch-task"
            task_name = f"{session_name.replace(' ', '-').lower()}_{branch_task}"
        else:
            task_name = branch_task
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        log_file = Path(f"log/workflow/{timestamp}_{task_name}.md")
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Auto-fill workflow log with session data
        log_file.write_text(generate_workflow_log(
            task_name=task_name,
            session_number=summary.get("session", "N"),
            skills=summary.get("skills", []),
            skill_details=summary.get("skill_details", [])
        ))
        
        print(f"\n▶️  Created workflow log: {log_file}")
        print(f"   📝 Auto-filled with session data - review and edit if needed")
        summary["workflow_log"] = str(log_file)
    
    # Final Summary
    print("\n" + "="*60)
    print("  SESSION SUMMARY")
    print("="*60)
    
    if summary["cleaned"]:
        print(f"\n🧹 Cleaned: {len(summary['cleaned'])} files moved")
    
    if summary["knowledge_updated"]:
        print(f"📚 Knowledge: Updated")
    
    if summary["skill_details"]:
        print(f"\n🎯 Skills Suggested ({len(summary['skill_details'])}):")
        for skill in summary["skill_details"]:
            skill_title = skill.get('title', skill.get('name', 'unnamed'))
            confidence = skill.get('confidence', 'medium')
            print(f"   • {skill_title} [{confidence}]")
    
    if summary["workflow_log"]:
        print(f"\n📝 Log: {summary['workflow_log']}")
    
    print(f"\n📦 Commit: git add -A && git commit -m 'message'")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()
