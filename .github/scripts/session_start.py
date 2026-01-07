#!/usr/bin/env python3
"""
Session Start - AKIS Context Loading Helper

Displays available knowledge, docs, skills, and provides enforcement checklist.
Run at the start of each session to ensure proper context loading.

Usage:
    python .github/scripts/session_start.py [--task "task description"]
"""
import json
import os
import sys
from pathlib import Path
from datetime import datetime


def read_knowledge_map():
    """Read line 1 of project_knowledge.json for domain overview"""
    kn_file = Path("project_knowledge.json")
    if not kn_file.exists():
        return None
    
    with open(kn_file) as f:
        first_line = f.readline()
        try:
            return json.loads(first_line)
        except json.JSONDecodeError:
            return None


def count_knowledge_entities():
    """Count entities in knowledge file"""
    kn_file = Path("project_knowledge.json")
    if not kn_file.exists():
        return 0
    
    count = 0
    with open(kn_file) as f:
        for line in f:
            try:
                entry = json.loads(line.strip())
                if entry.get('type') == 'entity':
                    count += 1
            except json.JSONDecodeError:
                continue
    return count


def list_docs():
    """List documentation categories"""
    docs_dir = Path("docs")
    if not docs_dir.exists():
        return []
    
    return [d.name for d in docs_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]


def list_skills():
    """List available skills"""
    skills_dir = Path(".github/skills")
    if not skills_dir.exists():
        return []
    
    return [f.stem for f in skills_dir.glob("*.md") if f.stem != "INDEX"]


def list_instructions():
    """List instruction files"""
    inst_dir = Path(".github/instructions")
    if not inst_dir.exists():
        return []
    
    return [f.stem for f in inst_dir.glob("*.md")]


def get_session_number():
    """Get current session number from tracker"""
    tracker_file = Path(".github/.session-tracker.json")
    if not tracker_file.exists():
        return 0
    
    try:
        with open(tracker_file) as f:
            data = json.load(f)
            return data.get('current_session', 0)
    except (json.JSONDecodeError, IOError):
        return 0


def main():
    # Parse task from arguments
    task = None
    for i, arg in enumerate(sys.argv):
        if arg == '--task' and i + 1 < len(sys.argv):
            task = sys.argv[i + 1]
    
    print("\n" + "="*70)
    print("  AKIS v3 - Session Start | Blocking Gate: CONTEXT")
    print("="*70)
    
    # Session info
    session_num = get_session_number()
    print(f"\n📊 Session: #{session_num + 1}")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    if task:
        print(f"\n🎯 Task: {task}")
    
    # Knowledge Map
    print("\n📚 Knowledge Map (REQUIRED to load):")
    kn_map = read_knowledge_map()
    entity_count = count_knowledge_entities()
    
    if kn_map and kn_map.get("type") == "map":
        domains = kn_map.get("domains", {})
        quick_nav = kn_map.get("quickNav", {})
        
        print(f"   Entities: {entity_count}")
        if domains:
            print(f"   Domains: {', '.join(domains.keys())}")
        if quick_nav:
            print(f"   QuickNav: {', '.join(quick_nav.keys())}")
    else:
        print("   ⚠️  No knowledge map found!")
        print("   Run: python .github/scripts/generate_codemap.py")
    
    # Skills
    print("\n🔧 Skills (REQUIRED to review):")
    skills = list_skills()
    if skills:
        print(f"   Available: {', '.join(skills)}")
        print("   Index: .github/skills/INDEX.md")
    else:
        print("   (No skills found)")
    
    # Instructions
    print("\n📋 Instructions:")
    instructions = list_instructions()
    if instructions:
        print(f"   Available: {', '.join(instructions)}")
    
    # Documentation
    print("\n📖 Documentation:")
    docs = list_docs()
    if docs:
        print(f"   Categories: {', '.join(docs)}")
    else:
        print("   (No docs/ directory)")
    
    # Enforcement checklist
    print("\n" + "-"*70)
    print("  BLOCKING GATE CHECKLIST (Must complete before proceeding)")
    print("-"*70)
    print("""
  [ ] 1. Loaded knowledge map (line 1 of project_knowledge.json)
  [ ] 2. Queried task-relevant entities
  [ ] 3. Reviewed applicable skills
  [ ] 4. Checked structure.md for file placement
  
  GATE PASSED when you can state:
  - What entities are involved in this task?
  - What skills apply to this work?
  - Where should new files be placed?
""")
    
    print("="*70)
    print("  Next: Create TODO list in PLAN phase")
    print("  End: Run 'python .github/scripts/session_end.py'")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
