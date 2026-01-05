#!/usr/bin/env python3
"""
Session Context - Store and retrieve user prompt/goal for the session
"""
import json
from pathlib import Path
from datetime import datetime

SESSION_FILE = Path(".github/.session_context.json")

def save_prompt(prompt):
    """Save user prompt for the current session"""
    data = {
        "prompt": prompt,
        "timestamp": datetime.now().isoformat(),
        "updated": datetime.now().isoformat()
    }
    SESSION_FILE.write_text(json.dumps(data, indent=2))
    print(f"✅ Session prompt saved")

def update_prompt(additional_context):
    """Update session prompt with additional context"""
    if SESSION_FILE.exists():
        data = json.loads(SESSION_FILE.read_text())
        data["prompt"] = f"{data['prompt']} | {additional_context}"
        data["updated"] = datetime.now().isoformat()
        SESSION_FILE.write_text(json.dumps(data, indent=2))
    else:
        save_prompt(additional_context)

def get_prompt():
    """Get the stored user prompt"""
    if SESSION_FILE.exists():
        data = json.loads(SESSION_FILE.read_text())
        return data.get("prompt", "")
    return ""

def clear_prompt():
    """Clear the session prompt (after session end)"""
    if SESSION_FILE.exists():
        SESSION_FILE.unlink()

def prompt_to_filename(prompt, max_length=40):
    """Convert user prompt to a clean filename"""
    # Remove common words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
                  'can', 'could', 'should', 'would', 'will', 'please', 'i', 'you',
                  'we', 'they', 'he', 'she', 'it'}
    
    # Clean and tokenize
    words = prompt.lower().strip().split()
    
    # Keep meaningful words
    meaningful = []
    for word in words:
        # Remove punctuation
        clean_word = ''.join(c for c in word if c.isalnum() or c == '-')
        if clean_word and clean_word not in stop_words and len(clean_word) > 2:
            meaningful.append(clean_word)
    
    # Take first 4-5 meaningful words
    result = '-'.join(meaningful[:5])
    
    # Limit length
    if len(result) > max_length:
        result = result[:max_length].rsplit('-', 1)[0]  # Cut at word boundary
    
    return result if result else "session-work"

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python session_context.py save 'user prompt here'")
        print("  python session_context.py update 'additional context'")
        print("  python session_context.py get")
        print("  python session_context.py clear")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "save" and len(sys.argv) > 2:
        save_prompt(sys.argv[2])
    elif command == "update" and len(sys.argv) > 2:
        update_prompt(sys.argv[2])
    elif command == "get":
        print(get_prompt())
    elif command == "clear":
        clear_prompt()
        print("✅ Session context cleared")
    else:
        print("❌ Invalid command or missing prompt")
        sys.exit(1)
