#!/usr/bin/env python3
"""
AKIS Skill Extractor

Creates a new skill template from the current session's work pattern.
Skills capture reusable solutions that can be applied to similar problems.

Usage:
    python .github/scripts/extract_skill.py "skill-name" "Brief description"
    
Example:
    python .github/scripts/extract_skill.py "api-pagination" "Patterns for paginated API endpoints"
"""

import os
import sys
import re
from pathlib import Path
from datetime import datetime


SKILL_TEMPLATE = '''# {title}

{description}

---

## When to Use

- {use_case_1}
- {use_case_2}
- {use_case_3}

## Pattern

{pattern_description}

## Checklist

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3
- [ ] Verify result

## Examples

### Example 1: {example_name}

```{lang}
# TODO: Add code example from your implementation
```

### Common Variations

| Variation | When | Key Difference |
|-----------|------|----------------|
| Basic | Simple cases | Minimal setup |
| Advanced | Complex cases | Full features |

## Anti-Patterns

❌ **Don't**: {anti_pattern}

✅ **Do**: {correct_pattern}

## Related Skills

- `related-skill-1`
- `related-skill-2`

---

*Created: {date}*
'''


def slugify(name: str) -> str:
    """Convert name to valid filename."""
    return re.sub(r'[^a-z0-9-]', '-', name.lower()).strip('-')


def titleize(name: str) -> str:
    """Convert slug to title case."""
    return ' '.join(word.capitalize() for word in name.replace('-', ' ').split())


def main():
    if len(sys.argv) < 3:
        print("Usage: python extract_skill.py \"skill-name\" \"Brief description\"")
        print("\nExample:")
        print("  python extract_skill.py \"api-pagination\" \"Patterns for paginated API endpoints\"")
        sys.exit(1)
    
    skill_name = slugify(sys.argv[1])
    description = sys.argv[2]
    
    # Find .github/skills directory
    github_dir = Path(__file__).parent.parent
    skills_dir = github_dir / 'skills'
    skills_dir.mkdir(exist_ok=True)
    
    skill_path = skills_dir / f'{skill_name}.md'
    
    if skill_path.exists():
        print(f"⚠️  Skill already exists: {skill_path}")
        response = input("Overwrite? [y/N]: ").strip().lower()
        if response != 'y':
            print("Aborted.")
            sys.exit(0)
    
    # Detect language from project
    project_root = github_dir.parent
    has_python = list(project_root.glob('**/*.py'))[:1]
    has_ts = list(project_root.glob('**/*.ts'))[:1] or list(project_root.glob('**/*.tsx'))[:1]
    lang = 'python' if has_python else 'typescript' if has_ts else 'text'
    
    # Generate skill file
    content = SKILL_TEMPLATE.format(
        title=titleize(skill_name),
        description=description,
        use_case_1='TODO: When does this pattern apply?',
        use_case_2='TODO: What problem does it solve?',
        use_case_3='TODO: What triggers using this skill?',
        pattern_description='TODO: Describe the core pattern in 1-2 sentences',
        example_name='Basic Usage',
        lang=lang,
        anti_pattern='TODO: What to avoid',
        correct_pattern='TODO: What to do instead',
        date=datetime.now().strftime('%Y-%m-%d')
    )
    
    skill_path.write_text(content)
    
    print(f"✅ Created skill: {skill_path}")
    print(f"\n📝 Next steps:")
    print(f"   1. Open {skill_path}")
    print(f"   2. Fill in TODOs with patterns from your work")
    print(f"   3. Add real code examples")
    print(f"   4. Commit the skill for future use")


if __name__ == '__main__':
    main()
