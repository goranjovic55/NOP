#!/usr/bin/env python3
"""
Session Start - Display AKIS context banner
Shows available knowledge, docs, skills, and prompts at session start
"""
import json
import os
from pathlib import Path

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

def list_prompts():
    """List available workflow prompts"""
    prompts_dir = Path(".github/prompts")
    if not prompts_dir.exists():
        return []
    
    return [f.stem for f in prompts_dir.glob("*.md") if f.stem != "README"]

def main():
    print("\n" + "="*70)
    print("  AKIS v3 - Session Start")
    print("="*70)
    
    # Knowledge Map + Entities
    print("\n📚 Knowledge (First 50 lines):")
    kn_map, entities = read_knowledge(50)
    if kn_map and kn_map.get("type") == "map":
        domains = kn_map.get("domains", {})
        quick_nav = kn_map.get("quickNav", {})
        
        if domains:
            print(f"   Domains: {', '.join(domains.keys())}")
        if quick_nav:
            print(f"   QuickNav: {', '.join(quick_nav.keys())}")
        if entities:
            # Group entities by domain
            by_domain = {}
            for e in entities:
                name = e.get("name", "")
                domain = name.split(".")[0] if "." in name else "Other"
                by_domain[domain] = by_domain.get(domain, 0) + 1
            print(f"   Entities: {len(entities)} loaded ({', '.join(f'{k}:{v}' for k,v in by_domain.items())})")
    else:
        print("   (No knowledge map found - will be generated at session end)")
    
    # Documentation
    print("\n📖 Documentation:")
    docs = list_docs()
    if docs:
        print(f"   Categories: {', '.join(docs)}")
        print("   See docs/INDEX.md for full structure")
    else:
        print("   (No docs/ directory found)")
    
    # Skills
    print("\n🔧 Skills:")
    skills = list_skills()
    if skills:
        print(f"   Available: {', '.join(skills)}")
        print("   See .github/skills/INDEX.md for problem→solution lookup")
    else:
        print("   (No skills found yet)")
    
    # Workflow Prompts
    print("\n📋 Workflow Prompts:")
    prompts = list_prompts()
    if prompts:
        print(f"   Available: {', '.join(prompts)}")
        print("   Use for multi-step specialized workflows")
    else:
        print("   (No workflow prompts found)")
    
    print("\n" + "="*70)
    print("  SESSION START SUMMARY")
    print("="*70)
    
    # Summary statistics
    domain_count = len(kn_map.get("domains", {})) if kn_map else 0
    quicknav_count = len(kn_map.get("quickNav", {})) if kn_map else 0
    doc_count = len(docs)
    skill_count = len(skills)
    prompt_count = len(prompts)
    
    print(f"\n   Knowledge: {domain_count} domains, {quicknav_count} quick nav entries")
    print(f"   Documentation: {doc_count} categories available")
    print(f"   Skills: {skill_count} solutions ready")
    print(f"   Prompts: {prompt_count} workflows available")
    
    print(f"\n   🎯 Context loaded - ready for MANDATORY 5 PHASES workflow")
    print(f"   📋 Use manage_todo_list to plan work with <PHASE> prefixes")
    
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    main()
