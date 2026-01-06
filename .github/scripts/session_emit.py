#!/usr/bin/env python3
"""
Session Emit - Context Refresh & Agent Grounding

PURPOSE: Reload rules, requirements, skills, instructions, and knowledge
         Formalize and precisely structure current session status
         Detect and rectify AKIS compliance violations
         
USAGE: Run at phase transitions, every 3-5 todos, or when drift detected

OUTPUTS:
1. AKIS Rules & Requirements (reload instructions)
2. Knowledge Map & Available Domains (reload context)
3. Skills Library (reload solutions)
4. Compliance Check (detect violations + rectifications)
5. Current Session State (formalize status)
6. Terse Summary (for agent consumption)
"""
import json
import sys
from pathlib import Path
from datetime import datetime

def get_session_info():
    """Get current session number and tracking info"""
    tracker_file = Path(".github/.session-tracker.json")
    if tracker_file.exists():
        with open(tracker_file) as f:
            data = json.load(f)
            return data.get("session_number", "N/A"), data.get("last_session", "Unknown")
    return "N/A", "Unknown"

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

def read_knowledge_map():
    """Backward compatible - returns just the map"""
    kn_map, _ = read_knowledge(50)
    return kn_map

def get_active_skills():
    """List available skills from INDEX.md"""
    skills_dir = Path(".github/skills")
    if not skills_dir.exists():
        return []
    
    skills = []
    for f in skills_dir.glob("*.md"):
        if f.stem != "INDEX":
            skills.append(f.stem)
    return skills

def get_structure_rules():
    """Load and parse key structure rules from structure.md"""
    structure_file = Path(".github/instructions/structure.md")
    if not structure_file.exists():
        return None
    
    rules = {
        "file_limits": "Files <500 lines, functions <50 lines",
        "root_allowed": "README.md, CHANGELOG.md, docker-compose.yml, .env, deploy.sh, project_knowledge.json",
        "script_location": "All .py/.sh scripts → scripts/",
        "test_location": "test_* files → scripts/",
        "doc_location": "*.md files → docs/ (by category)",
        "type_requirements": "Type hints/annotations required"
    }
    return rules

def get_akis_rules():
    """Extract AKIS rules from copilot-instructions.md Quick Facts table"""
    akis_file = Path(".github/copilot-instructions.md")
    if not akis_file.exists():
        return None
    
    rules = {}
    try:
        with open(akis_file) as f:
            content = f.read()
        # Parse Quick Facts table
        if "Quick Facts" in content:
            for line in content.split('\n'):
                if line.startswith('| F') and '|' in line:
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 4:
                        rule_id = parts[1]  # F1, F2, etc.
                        rule_name = parts[2]
                        rule_value = parts[3]
                        rules[rule_id] = {"name": rule_name, "value": rule_value}
    except Exception:
        pass
    
    # Fallback if parsing fails
    if not rules:
        rules = {
            "F1": {"name": "Max file lines", "value": "500"},
            "F3": {"name": "Total phases", "value": "5"},
            "F5": {"name": "User approval phase", "value": "REVIEW (phase 4)"}
        }
    return rules

def get_skills_index():
    """Parse skills INDEX.md for available problem→solution mappings"""
    index_file = Path(".github/skills/INDEX.md")
    if not index_file.exists():
        return {}
    
    skills_map = {}
    try:
        with open(index_file) as f:
            content = f.read()
            # Extract skills by problem type (simplified parsing)
            if "Build & Runtime Errors" in content:
                skills_map["Build/Runtime"] = "debugging.md"
            if "Knowledge System" in content:
                skills_map["Knowledge"] = "knowledge.md"
            if "Documentation" in content:
                skills_map["Documentation"] = "documentation.md"
            if "Backend Development" in content:
                skills_map["Backend/API"] = "backend-api.md"
            if "Frontend Development" in content:
                skills_map["Frontend/React"] = "frontend-react.md"
            if "DevOps" in content:
                skills_map["Docker/DevOps"] = "docker.md"
    except Exception:
        pass
    
    return skills_map

def get_recent_work():
    """Get recent commits and current changes to understand session progress"""
    import subprocess
    
    # Get last 3 commits
    result = subprocess.run(
        ["git", "log", "-3", "--oneline", "--no-decorate"],
        capture_output=True,
        text=True
    )
    recent_commits = [line.strip() for line in result.stdout.strip().split('\n') if line] if result.stdout else []
    
    # Get staged changes
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-status"],
        capture_output=True,
        text=True
    )
    staged = [line.split('\t')[1] for line in result.stdout.strip().split('\n') if line] if result.stdout else []
    
    # Get unstaged changes
    result = subprocess.run(
        ["git", "diff", "--name-status"],
        capture_output=True,
        text=True
    )
    unstaged = [line.split('\t')[1] for line in result.stdout.strip().split('\n') if line] if result.stdout else []
    
    return recent_commits, staged, unstaged

def detect_phase_from_context():
    """Infer current phase from session state"""
    import subprocess
    
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True
    )
    
    has_changes = bool(result.stdout.strip())
    
    if not has_changes:
        return "CONTEXT or PLAN"
    else:
        return "EXECUTION or REVIEW"

def generate_context_quiz():
    """Generate context verification questions that REQUIRE reading actual files.
    
    Questions test if agent has actually loaded context, not just read output.
    Covers: KNOWLEDGE, SKILLS, STRUCTURE, PHASES, CURRENT_WORK
    """
    import random
    
    quiz = []
    
    # ===== KNOWLEDGE QUESTIONS (require reading project_knowledge.json) =====
    kn_map = read_knowledge_map()
    if kn_map and kn_map.get("type") == "map":
        quicknav = kn_map.get("quickNav", {})
        
        if quicknav:
            nav_key = random.choice(list(quicknav.keys()))
            nav_value = quicknav[nav_key]
            first_entity = nav_value.split(',')[0].split('(')[0].strip() if nav_value else "Unknown"
            quiz.append({
                "category": "KNOWLEDGE",
                "question": f"What entity is listed under '{nav_key}' in quickNav?",
                "hint": "Check project_knowledge.json line 1, quickNav section"
            })
    
    # ===== SKILLS QUESTIONS (require reading actual skill files) =====
    skills_dir = Path(".github/skills")
    skill_files = list(skills_dir.glob("*.md")) if skills_dir.exists() else []
    skill_files = [f for f in skill_files if f.stem != "INDEX"]
    
    if skill_files:
        skill_file = random.choice(skill_files)
        quiz.append({
            "category": "SKILLS",
            "question": f"What is the main purpose of {skill_file.name}? (read first 5 lines)",
            "hint": f"Read .github/skills/{skill_file.name}"
        })
    
    # ===== STRUCTURE QUESTIONS (require reading structure.md + understanding) =====
    recent_commits, staged, unstaged = get_recent_work()
    all_changed = staged + unstaged
    
    # Find a changed file and ask where it should be
    structure_questions = []
    for changed_file in all_changed[:5]:
        if changed_file.endswith('.py') and not changed_file.startswith('backend/') and not changed_file.startswith('frontend/'):
            if 'test_' in changed_file or changed_file.startswith('test'):
                structure_questions.append({
                    "category": "STRUCTURE",
                    "question": f"Where should '{changed_file}' be located per structure.md?",
                    "hint": "Read .github/instructions/structure.md - test files section",
                    "expected_location": "scripts/"
                })
            elif changed_file.endswith('.py') and '/' not in changed_file:
                structure_questions.append({
                    "category": "STRUCTURE",
                    "question": f"Is '{changed_file}' allowed in project root?",
                    "hint": "Read .github/instructions/structure.md - root files section"
                })
        elif changed_file.endswith('.md') and not changed_file.startswith('docs/') and not changed_file.startswith('.github/'):
            if changed_file not in ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md']:
                structure_questions.append({
                    "category": "STRUCTURE",
                    "question": f"Where should '{changed_file}' be located?",
                    "hint": "Read .github/instructions/structure.md - docs go in docs/"
                })
    
    if structure_questions:
        quiz.extend(random.sample(structure_questions, min(2, len(structure_questions))))
    else:
        # Generic structure question
        quiz.append({
            "category": "STRUCTURE",
            "question": "What is the max allowed file size in lines?",
            "hint": "Read .github/instructions/structure.md or copilot-instructions.md"
        })
    
    # ===== PHASE QUESTIONS (require understanding current state) =====
    phase = detect_phase_from_context()
    total_changes = len(staged) + len(unstaged)
    
    # Intelligent phase detection questions based on current state
    if total_changes == 0:
        quiz.append({
            "category": "PHASE",
            "question": "No changes detected - what phase should you be in?",
            "hint": "CONTEXT or PLAN phase - need to load context and create todos"
        })
    elif total_changes > 0 and len(staged) == 0:
        quiz.append({
            "category": "PHASE",
            "question": "You have unstaged changes but nothing staged - what's missing?",
            "hint": "Should stage changes incrementally, prepare for REVIEW"
        })
    elif len(staged) > 0:
        quiz.append({
            "category": "PHASE",
            "question": "Changes are staged - what phase should you be in?",
            "hint": "REVIEW phase - verify quality, get user approval before commit"
        })
    
    # Phase transition question
    quiz.append({
        "category": "PHASE",
        "question": "What must happen before moving to SESSION END?",
        "hint": "Read copilot-instructions.md - REVIEW phase requires user approval"
    })
    
    # ===== CURRENT WORK QUESTIONS (require understanding what was done) =====
    if recent_commits:
        latest_msg = recent_commits[0].split(' ', 1)[1] if len(recent_commits[0].split(' ', 1)) > 1 else ""
        if latest_msg:
            quiz.append({
                "category": "CURRENT_WORK",
                "question": "What feature/fix was the last commit about?",
                "hint": f"Review git log - relates to: {latest_msg[:30]}..."
            })
    
    if all_changed:
        # Pick a random changed file and ask about it
        sample_file = random.choice(all_changed[:5])
        quiz.append({
            "category": "CURRENT_WORK",
            "question": f"Why was '{sample_file}' modified in this session?",
            "hint": "Review your session work - understand what you changed and why"
        })
    
    # ===== INSTRUCTIONS QUESTIONS (from Quick Facts table) =====
    akis_rules = get_akis_rules()
    if akis_rules:
        # Pick random facts to quiz on
        fact_questions = [
            {"id": "F1", "q": "What is the max file lines limit?", "hint": "Quick Facts F1"},
            {"id": "F2", "q": "What is the max function lines limit?", "hint": "Quick Facts F2"},
            {"id": "F3", "q": "How many mandatory phases are there?", "hint": "Quick Facts F3"},
            {"id": "F5", "q": "Which phase requires user approval?", "hint": "Quick Facts F5"},
            {"id": "F7", "q": "What are the 3 checkpoint triggers?", "hint": "Quick Facts F7"},
            {"id": "F9", "q": "Which .py file is allowed in root?", "hint": "Quick Facts F9"},
        ]
        selected = random.choice(fact_questions)
        quiz.append({
            "category": "INSTRUCTIONS",
            "question": selected["q"],
            "hint": f"Read copilot-instructions.md - {selected['hint']}"
        })
    
    return quiz

def check_akis_compliance():
    """Check AKIS compliance and return violations + rectifications"""
    import subprocess
    
    violations = []
    rectifications = []
    
    # Check 1: Knowledge map exists and is valid
    kn_map = read_knowledge_map()
    if not kn_map or kn_map.get("type") != "map":
        violations.append("❌ Knowledge map not loaded/used")
        rectifications.append("RECTIFY: Read project_knowledge.json line 1 for domain overview")
    
    # Check 2: Skills available
    skills_index = get_skills_index()
    if not skills_index or len(skills_index) == 0:
        violations.append("❌ Skills library not loaded")
        rectifications.append("RECTIFY: Load .github/skills/INDEX.md for problem→solution lookup")
    
    # Check 3: Structure compliance - misplaced files in root
    root = Path(".")
    misplaced = []
    allowed_root = {
        "README.md", "CHANGELOG.md", "CONTRIBUTING.md", "LICENSE.md",
        "docker-compose.yml", ".env", ".env.example", ".gitignore",
        "deploy.sh", "project_knowledge.json", "agent.py", "agent_new.py"
    }
    
    for item in root.iterdir():
        if item.is_file() and not item.name.startswith('.'):
            if item.name not in allowed_root:
                if item.suffix in ['.py', '.sh'] and not item.name.startswith('agent'):
                    misplaced.append(item.name)
                elif item.suffix == '.md' and item.name not in allowed_root:
                    misplaced.append(item.name)
    
    if misplaced:
        violations.append(f"❌ Structure violation: {len(misplaced)} misplaced files in root")
        rectifications.append(f"RECTIFY: Move files to proper locations: {', '.join(misplaced[:3])}")
    
    # Check 4: AKIS instructions file exists
    akis_rules = get_akis_rules()
    if not akis_rules:
        violations.append("❌ AKIS instructions not loaded")
        rectifications.append("RECTIFY: Load .github/copilot-instructions.md for workflow rules")
    
    # ===== DRIFT DETECTION HEURISTICS =====
    
    # Check 5: Too many uncommitted changes (scope creep indicator)
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True
    )
    changed_files = [l for l in result.stdout.strip().split('\n') if l]
    if len(changed_files) > 15:
        violations.append(f"⚠️  Drift: {len(changed_files)} uncommitted files (scope creep?)")
        rectifications.append("RECTIFY: Consider committing changes or focusing scope")
    
    # Check 6: Large files being created (>500 lines rule)
    for item in root.rglob("*.py"):
        if item.is_file() and not any(p in str(item) for p in ['node_modules', '__pycache__', '.git', 'venv']):
            try:
                with open(item) as f:
                    lines = sum(1 for _ in f)
                if lines > 500:
                    violations.append(f"⚠️  Drift: {item.name} has {lines} lines (>500 limit)")
                    rectifications.append(f"RECTIFY: Split {item.name} into smaller modules")
                    break  # Only report first one to avoid spam
            except Exception:
                pass
    
    # Check 7: Work without recent commits (execution without review pattern)
    recent_commits, staged, unstaged = get_recent_work()
    if len(unstaged) > 10 and len(staged) == 0:
        violations.append("⚠️  Drift: Many unstaged changes, nothing staged for commit")
        rectifications.append("RECTIFY: Stage changes incrementally, prepare for REVIEW phase")
    
    # Check 8: Session tracker not updated (missed session_end)
    tracker_file = Path(".github/.session-tracker.json")
    if tracker_file.exists():
        try:
            with open(tracker_file) as f:
                tracker = json.load(f)
            last_session = tracker.get("last_session", "")
            if last_session:
                from datetime import datetime
                try:
                    last_dt = datetime.fromisoformat(last_session.replace("Z", "+00:00"))
                    days_old = (datetime.now() - last_dt.replace(tzinfo=None)).days
                    if days_old > 7:
                        violations.append(f"⚠️  Drift: Session tracker {days_old} days old")
                        rectifications.append("RECTIFY: Run session_end.py to update session tracking")
                except Exception:
                    pass
        except Exception:
            pass
    
    return violations, rectifications

def generate_terse_summary():
    """Generate terse summary for agent chat output"""
    session_num, _ = get_session_info()
    phase = detect_phase_from_context()
    recent_commits, staged, unstaged = get_recent_work()
    kn_map = read_knowledge_map()
    skills = get_active_skills()
    
    # Build summary
    summary_parts = []
    
    # Session & phase
    summary_parts.append(f"**Session #{session_num}** • Phase: {phase}")
    
    # Recent work
    if recent_commits:
        latest = recent_commits[0][:60] if recent_commits[0] else "No commits"
        summary_parts.append(f"Latest: {latest}")
    
    # Current changes
    changes = []
    if staged:
        changes.append(f"{len(staged)} staged")
    if unstaged:
        changes.append(f"{len(unstaged)} unstaged")
    if changes:
        summary_parts.append(f"Changes: {', '.join(changes)}")
        # Show first few changed files
        all_files = (staged + unstaged)[:3]
        if all_files:
            summary_parts.append(f"Files: {', '.join(all_files)}")
    
    # Context status
    domain_count = len(kn_map.get("domains", {})) if kn_map else 0
    summary_parts.append(f"Context: {domain_count} domains, {len(skills)} skills")
    
    return " • ".join(summary_parts)

def emit_status():
    """Main emit function - structured context reload + session status"""
    
    # Generate terse summary first
    terse = generate_terse_summary()
    
    print("\n" + "="*70)
    print("  🔄 SESSION EMIT - Context Refresh & Agent Grounding")
    print("="*70)
    
    # ===== SECTION 1: AKIS RULES & REQUIREMENTS =====
    print("\n📋 AKIS RULES (Quick Facts)")
    print("─"*70)
    akis_rules = get_akis_rules()
    if akis_rules:
        for rule_id, rule_data in list(akis_rules.items())[:8]:
            if isinstance(rule_data, dict):
                print(f"  • {rule_id}: {rule_data['name']} = {rule_data['value']}")
            else:
                print(f"  • {rule_id}: {rule_data}")
    else:
        print("  ⚠ copilot-instructions.md not found")
    
    # ===== SECTION 2: STRUCTURE REQUIREMENTS =====
    print("\n🏗️  STRUCTURE REQUIREMENTS (Reloaded)")
    print("─"*70)
    structure_rules = get_structure_rules()
    if structure_rules:
        for key, value in structure_rules.items():
            print(f"  • {key.replace('_', ' ').title()}: {value}")
    else:
        print("  ⚠ structure.md not found")
    
    # ===== SECTION 3: KNOWLEDGE CONTEXT =====
    print("\n📚 KNOWLEDGE MAP (Reloaded)")
    print("─"*70)
    kn_map = read_knowledge_map()
    if kn_map and kn_map.get("type") == "map":
        domains = kn_map.get("domains", {})
        quicknav = kn_map.get("quickNav", {})
        print(f"  Domains ({len(domains)}): {', '.join(domains.keys())}")
        print(f"  QuickNav ({len(quicknav)}): {', '.join(quicknav.keys())}")
        print(f"  Updated: {kn_map.get('upd', 'Unknown')}")
        print(f"  📍 Read line 1 first, query specific lines on-demand")
    else:
        print("  ⚠ No knowledge map - run session_end to generate")
    
    # ===== SECTION 4: SKILLS LIBRARY =====
    print("\n🔧 SKILLS LIBRARY (Reloaded)")
    print("─"*70)
    skills_index = get_skills_index()
    if skills_index:
        print(f"  Available Solutions ({len(skills_index)}):")
        for problem, skill_file in skills_index.items():
            print(f"    • {problem} → {skill_file}")
    else:
        print("  ⚠ Skills INDEX not found")
    
    # ===== SECTION 5: COMPLIANCE CHECK =====
    print("\n⚠️  AKIS COMPLIANCE CHECK")
    print("─"*70)
    violations, rectifications = check_akis_compliance()
    
    if not violations:
        print("  ✅ All AKIS requirements satisfied")
    else:
        print(f"  Found {len(violations)} compliance issue(s):\n")
        for v in violations:
            print(f"  {v}")
        print(f"\n  📋 REQUIRED RECTIFICATIONS:")
        for i, r in enumerate(rectifications, 1):
            print(f"  {i}. {r}")
    
    # ===== SECTION 6: CURRENT SESSION STATE =====
    print("\n📊 CURRENT SESSION STATE (Formalized)")
    print("="*70)
    
    session_num, last_session = get_session_info()
    recent_commits, staged, unstaged = get_recent_work()
    phase = detect_phase_from_context()
    
    print(f"  Session: #{session_num}")
    print(f"  Phase: {phase}")
    print(f"  Last Updated: {last_session}")
    print(f"  Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Recent work
    if recent_commits:
        print(f"\n  Recent Work (Last 3 commits):")
        for commit in recent_commits:
            print(f"    • {commit}")
    
    # Current changes
    total_changes = len(staged) + len(unstaged)
    if total_changes > 0:
        print(f"\n  Changes In Progress ({total_changes} files):")
        if staged:
            print(f"    Staged ({len(staged)}): {', '.join(staged[:3])}")
        if unstaged:
            print(f"    Unstaged ({len(unstaged)}): {', '.join(unstaged[:3])}")
    else:
        print(f"\n  Changes: None (clean working tree)")
    
    # ===== SECTION 7: CONTEXT VERIFICATION QUIZ =====
    print("\n🧠 CONTEXT VERIFICATION (You must know these - no peeking!)")
    print("─"*70)
    quiz = generate_context_quiz()
    
    # Select random questions for verification
    import random
    sample_quiz = random.sample(quiz, min(4, len(quiz))) if quiz else []
    
    for i, q in enumerate(sample_quiz, 1):
        print(f"\n  Q{i} [{q['category']}]: {q['question']}")
        print(f"      → If unknown, RELOAD: {q['hint']}")
    
    if not sample_quiz:
        print("  ⚠ Could not generate quiz - AKIS context files missing!")
    
    print("\n  ⚠️  DRIFT CHECK: Can you answer ALL questions above?")
    print("     If NO → You have context drift. Run the RELOAD actions.")
    
    # ===== SECTION 8: NEXT ACTIONS =====
    print("\n⏭️  NEXT ACTIONS (Phase-Appropriate)")
    print("─"*70)
    
    # If there are violations, prioritize rectification
    if violations:
        print("  ⚠️  PRIORITY: Address compliance violations first")
        for i, r in enumerate(rectifications, 1):
            print(f"  {i}. {r}")
        print()
    
    # Then show phase-appropriate actions
    if phase == "CONTEXT or PLAN":
        print("  Then continue with CONTEXT/PLAN:")
        print("  • Load project_knowledge.json lines 1-50")
        print("  • Create todos with manage_todo_list using <PHASE> prefix")
        print("  • Break work into <50 line chunks")
        print("  • Identify needed skills from INDEX.md")
        print("  • Run session_emit before starting EXECUTION")
    else:
        print("  Then continue with EXECUTION/REVIEW:")
        print("  • Execute todos sequentially")
        print("  • Mark each todo in-progress → completed individually")
        print("  • Run session_emit every 3-5 completed todos")
        print("  • Verify structure compliance (file size, locations)")
        print("  • STOP for user approval before SESSION END")
    
    print("\n" + "="*70)
    print(f"  TERSE SUMMARY")
    print("="*70)
    print(f"  {terse}")
    print("="*70)
    print("  ✅ Context reloaded - Agent grounded - Continue work")
    print("="*70 + "\n")
    
    return {
        "session": session_num,
        "phase": phase,
        "knowledge_loaded": kn_map is not None,
        "skills_count": len(skills_index) if skills_index else 0,
        "timestamp": datetime.now().isoformat(),
        "terse_summary": terse,
        "recent_work": recent_commits[:1] if recent_commits else [],
        "changed_files": total_changes,
        "akis_rules_loaded": akis_rules is not None,
        "structure_rules_loaded": structure_rules is not None,
        "compliance_violations": len(violations),
        "rectifications_needed": rectifications
    }

def main():
    """CLI entry point"""
    result = emit_status()
    
    # Return JSON for programmatic use
    if "--json" in sys.argv:
        print(json.dumps(result, indent=2))
    
    # Print terse summary for easy agent consumption
    if "--terse" in sys.argv:
        print(result["terse_summary"])
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
