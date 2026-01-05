#!/usr/bin/env python3
"""
AKIS Knowledge Generator - Hierarchical Format

Output Structure:
- Line 1: Navigation map with domain line pointers
- Lines 2-50: Domain summaries (what, tech, entities, line ranges)
- Lines 51+: Detailed entities (loaded on-demand)

Usage: python scripts/generate_knowledge.py
"""
import os
import json
import re
import ast
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_FILE = PROJECT_ROOT / "project_knowledge.json"
BACKUP_FILE = PROJECT_ROOT / f"project_knowledge_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

# Knowledge Graph Storage
entities = []
relations = []
codegraph = []
domains = defaultdict(list)  # domain_name -> [entities]

def add_entity(name, entity_type, observations=None, tech=None):
    """Add entity and categorize into domain."""
    if observations is None:
        observations = []
    if tech is None:
        tech = []
    
    # Check if exists
    for e in entities:
        if e["name"] == name and e["type"] == "entity":
            return
    
    entity = {
        "type": "entity",
        "name": name,
        "entityType": entity_type,
        "observations": observations,
        "tech": list(set(tech)),  # Deduplicate
        "updated": datetime.now().strftime('%Y-%m-%d')
    }
    
    entities.append(entity)
    
    # Categorize into domain
    domain = name.split('.')[0]
    domains[domain].append(name)

def add_relation(source, target, relation_type):
    # Check if exists
    for r in relations:
        if r["from"] == source and r["to"] == target and r["relationType"] == relation_type:
            return

    relations.append({
        "type": "relation",
        "from": source,
        "to": target,
        "relationType": relation_type
    })

def add_codegraph(filename, node_type, dependencies, dependents=None):
    if dependents is None:
        dependents = []
        
    codegraph.append({
        "type": "codegraph",
        "name": filename,
        "nodeType": node_type,
        "dependencies": list(set(dependencies)),
        "dependents": list(set(dependents))
    })

def scan_python_backend():
    """Scans FastAPI backend for Services, Models, and Routes"""
    backend_dir = PROJECT_ROOT / "backend"
    if not backend_dir.exists():
        return

    print(f"Scanning Backend: {backend_dir}")

    for py_file in backend_dir.rglob("*.py"):
        if "tests" in str(py_file) or "alembic" in str(py_file):
            continue

        rel_path = py_file.relative_to(PROJECT_ROOT)
        module_name = str(rel_path).replace("/", ".").replace(".py", "")
        
        try:
            with open(py_file, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read())
                
            file_deps = []
            
            # Analyze Imports and extract tech
            file_deps = []
            tech_stack = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        file_deps.append(alias.name)
                        tech_stack.add(alias.name.split('.')[0])
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        file_deps.append(node.module)
                        tech_stack.add(node.module.split('.')[0])

            # Analyze Classes (Services/Models)
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    class_name = node.name
                    full_name = f"{module_name}.{class_name}"
                    
                    # Determine type
                    entity_type = "Class"
                    if "Service" in class_name:
                        entity_type = "Service"
                    elif "Model" in class_name or "Schema" in class_name:
                        entity_type = "Model"
                    elif "Controller" in class_name or "Router" in class_name:
                        entity_type = "Controller"
                        
                    add_entity(full_name, entity_type, [f"Defined in {rel_path}"], list(tech_stack))
                    
                    # Link file to class
                    add_relation(str(rel_path), full_name, "DEFINES")

            add_codegraph(str(rel_path), "python_module", file_deps)

        except Exception as e:
            print(f"Error parsing {py_file}: {e}")

def scan_react_frontend():
    """Scans React frontend for Components and Hooks"""
    frontend_dir = PROJECT_ROOT / "frontend/src"
    if not frontend_dir.exists():
        return

    print(f"Scanning Frontend: {frontend_dir}")

    # Regex for imports: import X from 'Y' or import { X } from 'Y'
    import_pattern = re.compile(r"import\s+.*?from\s+['\"](.*?)['\"]")
    
    for ts_file in frontend_dir.rglob("*.{ts,tsx}"):
        if "test" in str(ts_file):
            continue
            
        rel_path = ts_file.relative_to(PROJECT_ROOT)
        filename = ts_file.name
        
        try:
            with open(ts_file, "r", encoding="utf-8") as f:
                content = f.read()
                
            deps = import_pattern.findall(content)
            clean_deps = []
            tech_stack = set()
            
            for dep in deps:
                # Resolve relative paths roughly
                if dep.startswith("."):
                    clean_deps.append(dep)
                else:
                    clean_deps.append(dep) # NPM package or alias
                    # Add to tech stack if it's a known library
                    if not dep.startswith('.'):
                        tech_stack.add(dep.split('/')[0])

            # Heuristic for Component vs Hook
            node_type = "file"
            if filename.endswith(".tsx"):
                node_type = "component"
                component_name = filename.replace(".tsx", "")
                add_entity(f"Frontend.Component.{component_name}", "Component", [f"Defined in {rel_path}"], list(tech_stack))
            elif filename.startswith("use"):
                node_type = "hook"
                hook_name = filename.replace(".ts", "")
                add_entity(f"Frontend.Hook.{hook_name}", "Hook", [f"Defined in {rel_path}"], list(tech_stack))
            
            add_codegraph(str(rel_path), node_type, clean_deps)

        except Exception as e:
            print(f"Error parsing {ts_file}: {e}")

def scan_docker_infrastructure():
    """Scans docker-compose for Services"""
    compose_file = PROJECT_ROOT / "docker-compose.yml"
    if not compose_file.exists():
        return

    print(f"Scanning Infrastructure: {compose_file}")
    
    try:
        # Simple parsing to avoid pyyaml dependency if not installed
        with open(compose_file, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Find service names (lines starting with 2 spaces and ending with colon, under 'services:')
        in_services = False
        for line in content.splitlines():
            if line.strip() == "services:":
                in_services = True
                continue
            
            if in_services:
                if line.startswith("  ") and not line.startswith("    ") and line.strip().endswith(":"):
                    service_name = line.strip()[:-1]
                    # Extract tech from service name (postgres, redis, guacd, etc.)
                    tech = [service_name] if service_name in ['postgres', 'redis', 'guacd'] else []
                    add_entity(f"Infrastructure.Service.{service_name}", "Container", ["Defined in docker-compose.yml"], tech)
                elif line.startswith("networks:") or line.startswith("volumes:"):
                    in_services = False

    except Exception as e:
        print(f"Error parsing docker-compose: {e}")

def generate_domain_summaries():
    """Generate domain summaries with tech stacks and entity counts."""
    summaries = []
    
    for domain_name, entity_names in sorted(domains.items()):
        # Get all entities in this domain
        domain_entities = [e for e in entities if e['name'] in entity_names]
        
        # Extract unique tech stack
        tech_stack = set()
        entity_types = defaultdict(int)
        
        for entity in domain_entities:
            tech_stack.update(entity.get('tech', []))
            entity_types[entity['entityType']] += 1
        
        # Create summary
        type_summary = ', '.join([f"{count} {etype}{'s' if count > 1 else ''}" 
                                  for etype, count in sorted(entity_types.items())])
        
        summaries.append({
            "type": "domain",
            "name": domain_name,
            "summary": f"{len(domain_entities)} entities: {type_summary}",
            "tech": sorted(list(tech_stack))[:10],  # Top 10 tech items
            "entities": len(entity_names),
            "entity_types": dict(entity_types)
        })
    
    return summaries


def main():
    print("--- AKIS Knowledge Graph Generator (Hierarchical) ---")
    
    # 1. Backup existing
    if OUTPUT_FILE.exists():
        print(f"Backing up to {BACKUP_FILE.name}...")
        with open(OUTPUT_FILE, "r") as f:
            with open(BACKUP_FILE, "w") as b:
                b.write(f.read())

    # 2. Scan codebase
    scan_python_backend()
    scan_react_frontend()
    scan_docker_infrastructure()
    
    print(f"Scanned: {len(entities)} entities, {len(relations)} relations, {len(codegraph)} files")
    
    # 3. Generate hierarchical structure
    domain_summaries = generate_domain_summaries()
    
    # Calculate line numbers
    summary_end_line = 1 + len(domain_summaries)
    details_start_line = summary_end_line + 1
    
    # Build domain map with line pointers
    domain_map = {}
    current_detail_line = details_start_line
    
    for idx, domain in enumerate(sorted(domains.keys())):
        domain_entities_count = len(domains[domain])
        domain_map[domain] = {
            "summary_line": 2 + idx,
            "details_lines": f"{current_detail_line}-{current_detail_line + domain_entities_count - 1}",
            "count": domain_entities_count
        }
        current_detail_line += domain_entities_count
    
    # Create navigation map (Line 1)
    nav_map = {
        "type": "map",
        "version": "2.0-hierarchical",
        "purpose": f"Read lines 1-{summary_end_line} for overview, then load specific domain details on-demand",
        "structure": {
            "line_1": "This navigation map",
            "lines_2_to_{}".format(summary_end_line): "Domain summaries (tech, entities, line pointers)",
            "lines_{}_onwards".format(details_start_line): "Detailed entities (load on-demand)"
        },
        "domains": domain_map,
        "updated": datetime.now().strftime('%Y-%m-%d')
    }
    
    # 4. Write hierarchical output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        # Line 1: Navigation map
        f.write(json.dumps(nav_map) + "\n")
        
        # Lines 2-N: Domain summaries
        for summary in domain_summaries:
            f.write(json.dumps(summary) + "\n")
        
        # Lines N+1 onwards: Detailed entities (grouped by domain)
        for domain_name in sorted(domains.keys()):
            domain_entity_names = domains[domain_name]
            for entity in entities:
                if entity['name'] in domain_entity_names:
                    f.write(json.dumps(entity) + "\n")
    
    print(f"\n✅ Generated hierarchical knowledge:")
    print(f"   Line 1: Navigation map")
    print(f"   Lines 2-{summary_end_line}: {len(domain_summaries)} domain summaries")
    print(f"   Lines {details_start_line}+: {len(entities)} detailed entities")
    print(f"   Total: {1 + len(domain_summaries) + len(entities)} lines")
    print(f"\n📁 Output: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
