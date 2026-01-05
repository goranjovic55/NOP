#!/usr/bin/env python3
"""
Quick Session Prompt - Interactive prompt setter
Run this at the start of a session to set the user's goal
"""
from pathlib import Path
import sys

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent))
from session_context import save_prompt

def main():
    print("\n" + "="*70)
    print("  Set Session Goal")
    print("="*70)
    print("\nWhat are you working on? (one line description)")
    print("Examples:")
    print("  - 'create agent monitoring dashboard'")
    print("  - 'fix CVE scanning performance issues'")
    print("  - 'add Docker container management features'")
    print()
    
    prompt = input("Goal: ").strip()
    
    if prompt:
        save_prompt(prompt)
        print(f"\n✅ Session goal set: {prompt}")
        print("This will be used to name your workflow log at session end.\n")
    else:
        print("\n⚠️  No goal set. Will use branch/commit for log naming.\n")

if __name__ == "__main__":
    main()
