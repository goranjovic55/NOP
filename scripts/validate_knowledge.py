#!/usr/bin/env python3
"""
Knowledge integrity validator for project_knowledge.json and global_knowledge.json

Usage:
    python scripts/validate_knowledge.py project_knowledge.json
    python scripts/validate_knowledge.py .github/global_knowledge.json
"""
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set

class KnowledgeValidator:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.entities: Dict[str, dict] = {}
        self.codegraph: Dict[str, dict] = {}
        self.relations: List[dict] = []
        
    def validate(self) -> bool:
        """Run all validations. Returns True if no errors."""
        if not self.filepath.exists():
            self.errors.append(f"File not found: {self.filepath}")
            return False
            
        # Backup current file
        self._backup()
        
        # Parse and validate JSONL
        if not self._parse_jsonl():
            return False
            
        # Run integrity checks
        self._check_duplicates()
        self._check_relations()
        self._check_codegraph()
        self._check_naming()
        self._check_observations()
        self._check_freshness()
        self._check_size()
        
        return len(self.errors) == 0
        
    def _backup(self):
        """Create timestamped backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.filepath.parent / f"{self.filepath.stem}_backup_{timestamp}.json"
        try:
            backup_path.write_text(self.filepath.read_text())
            print(f"✓ Backup created: {backup_path}")
        except Exception as e:
            self.warnings.append(f"Backup failed: {e}")
        
    def _parse_jsonl(self) -> bool:
        """Parse JSONL format"""
        try:
            content = self.filepath.read_text().strip()
            if not content:
                self.errors.append("File is empty")
                return False
                
            lines = content.split('\n')
            duplicates = {}
            
            for i, line in enumerate(lines, 1):
                if not line.strip():
                    continue
                    
                try:
                    obj = json.loads(line)
                    obj_type = obj.get('type')
                    
                    if obj_type == 'entity':
                        name = obj.get('name')
                        if not name:
                            self.errors.append(f"Line {i}: Entity missing 'name'")
                            continue
                            
                        if name in self.entities:
                            # Track duplicates
                            duplicates[name] = duplicates.get(name, 1) + 1
                            self.warnings.append(f"Line {i}: Duplicate entity '{name}' (occurrence #{duplicates[name]})")
                        
                        # Last write wins
                        self.entities[name] = obj
                        
                    elif obj_type == 'codegraph':
                        name = obj.get('name')
                        if not name:
                            self.errors.append(f"Line {i}: Codegraph missing 'name'")
                            continue
                            
                        if name in self.codegraph:
                            duplicates[name] = duplicates.get(name, 1) + 1
                            self.warnings.append(f"Line {i}: Duplicate codegraph '{name}' (occurrence #{duplicates[name]})")
                            
                        self.codegraph[name] = obj
                        
                    elif obj_type == 'relation':
                        if not obj.get('from') or not obj.get('to'):
                            self.errors.append(f"Line {i}: Relation missing 'from' or 'to'")
                            continue
                        self.relations.append(obj)
                        
                    else:
                        self.warnings.append(f"Line {i}: Unknown type '{obj_type}'")
                        
                except json.JSONDecodeError as e:
                    self.errors.append(f"Line {i}: Invalid JSON - {e}")
                    
            print(f"✓ Parsed {len(self.entities)} entities, {len(self.codegraph)} codegraph nodes, {len(self.relations)} relations")
            return True
            
        except Exception as e:
            self.errors.append(f"Failed to read file: {e}")
            return False
            
    def _check_duplicates(self):
        """Check for duplicate entities (already handled in parsing with warnings)"""
        pass
        
    def _check_relations(self):
        """Validate relations reference existing entities"""
        all_names = set(self.entities.keys()) | set(self.codegraph.keys())
        
        for rel in self.relations:
            from_name = rel.get('from')
            to_name = rel.get('to')
            rel_type = rel.get('relationType')
            
            if not rel_type:
                self.warnings.append(f"Relation '{from_name}→{to_name}' missing relationType")
            
            if from_name not in all_names:
                self.warnings.append(f"Relation references unknown 'from': {from_name}")
            if to_name not in all_names:
                self.warnings.append(f"Relation references unknown 'to': {to_name}")
                
            # Check for circular relations (A→A)
            if from_name == to_name:
                self.warnings.append(f"Self-referencing relation: {from_name}→{to_name}")
                
    def _check_codegraph(self):
        """Validate codegraph dependencies"""
        for name, node in self.codegraph.items():
            deps = node.get('dependencies', [])
            for dep in deps:
                if dep not in self.codegraph:
                    # Dependency might be external (e.g., "React", "FastAPI")
                    # Only warn if it looks like an internal component
                    if '.' in dep or dep[0].isupper() and len(dep) > 3:
                        self.warnings.append(f"Codegraph '{name}' depends on unknown '{dep}'")
                        
            # Check for circular dependencies
            if name in deps:
                self.errors.append(f"Circular dependency: {name} depends on itself")
                
    def _check_naming(self):
        """Check naming conventions"""
        for name in self.entities.keys():
            parts = name.split('.')
            if len(parts) < 2:
                self.warnings.append(f"Entity name too short (should be Scope.Domain.Name): {name}")
            elif len(parts) > 5:
                self.warnings.append(f"Entity name too deep (max 5 levels): {name}")
                
    def _check_observations(self):
        """Check observation format and updates"""
        for name, entity in self.entities.items():
            obs = entity.get('observations', [])
            if not obs:
                self.warnings.append(f"Entity '{name}' has no observations")
                continue
                
            has_update = False
            for o in obs:
                if not o.strip():
                    self.warnings.append(f"Entity '{name}' has empty observation")
                elif o.startswith('upd:'):
                    has_update = True
                    # Validate date format
                    try:
                        date_str = o.split(',')[0].replace('upd:', '')
                        datetime.strptime(date_str, '%Y-%m-%d')
                    except ValueError:
                        self.warnings.append(f"Entity '{name}' has invalid date format: {o}")
                        
            if not has_update:
                self.warnings.append(f"Entity '{name}' missing update timestamp")
                
    def _check_size(self):
        """Check file size"""
        size_kb = self.filepath.stat().st_size / 1024
        if size_kb > 100:
            self.warnings.append(f"File size {size_kb:.1f}KB exceeds 100KB target")
        
        entity_count = len(self.entities)
        if entity_count > 500:
            self.warnings.append(f"Entity count {entity_count} exceeds 500 recommended max")
    
    def _check_freshness(self):
        """Check for stale entities (>30 days old)"""
        now = datetime.now()
        stale = []
        
        for name, entity in self.entities.items():
            obs = entity.get('observations', [])
            if not obs:
                continue
            
            obs_str = obs[0] if isinstance(obs, list) else obs
            if 'upd:' in obs_str:
                try:
                    date_str = obs_str.split('upd:')[1].split(',')[0].strip()
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    age_days = (now - date).days
                    
                    if age_days > 30:
                        stale.append((name, age_days, date_str))
                except (ValueError, IndexError):
                    pass
        
        if stale:
            self.warnings.append(f"{len(stale)} entities >30 days old (consider refresh)")
            # Show oldest 3
            stale.sort(key=lambda x: x[1], reverse=True)
            for name, age, date in stale[:3]:
                self.warnings.append(f"  • {name}: {age} days old (last: {date})")
            if len(stale) > 3:
                self.warnings.append(f"  • ...and {len(stale)-3} more")
            
    def print_report(self):
        """Print validation report"""
        print("\n" + "="*60)
        print(f"KNOWLEDGE VALIDATION: {self.filepath.name}")
        print("="*60)
        
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for err in self.errors:
                print(f"  - {err}")
        else:
            print("\n✓ No errors")
            
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warn in self.warnings:
                print(f"  - {warn}")
        else:
            print("\n✓ No warnings")
            
        # Summary statistics
        print("\n" + "-"*60)
        print("STATISTICS:")
        print(f"  Entities:       {len(self.entities)}")
        print(f"  Codegraph:      {len(self.codegraph)}")
        print(f"  Relations:      {len(self.relations)}")
        print(f"  File size:      {self.filepath.stat().st_size / 1024:.1f} KB")
        if len(self.entities) > 0:
            ratio = len(self.entities) / max(1, len(self.codegraph) + 1)
            print(f"  Entity ratio:   {ratio:.1f}:1")
        print("="*60 + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_knowledge.py <path_to_knowledge.json>")
        print("\nExamples:")
        print("  python scripts/validate_knowledge.py project_knowledge.json")
        print("  python scripts/validate_knowledge.py .github/global_knowledge.json")
        sys.exit(1)
        
    validator = KnowledgeValidator(sys.argv[1])
    is_valid = validator.validate()
    validator.print_report()
    
    sys.exit(0 if is_valid else 1)
