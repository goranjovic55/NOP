#!/usr/bin/env python3
import os
import json
import re
import ast
from pathlib import Path
from datetime import datetime

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_FILE = PROJECT_ROOT / "project_knowledge.json"
BACKUP_FILE = PROJECT_ROOT / f"project_knowledge_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

# Knowledge Graph Storage
entities = []
relations = []
codegraph = []

def add_entity(name, entity_type, observations=None):
    if observations is None:
        observations = []
    
    # Check if exists
    for e in entities:
        if e["name"] == name and e["type"] == "entity":
            return
            
    entities.append({
        "type": "entity",
        "name": name,
        "entityType": entity_type,
        "observations": observations + [f"auto-generated:{datetime.now().strftime('%Y-%m-%d')}"]
    })

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
            
            # Analyze Imports
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        file_deps.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        file_deps.append(node.module)

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
                        
                    add_entity(full_name, entity_type, [f"Defined in {rel_path}"])
                    
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
            
            for dep in deps:
                # Resolve relative paths roughly
                if dep.startswith("."):
                    clean_deps.append(dep)
                else:
                    clean_deps.append(dep) # NPM package or alias

            # Heuristic for Component vs Hook
            node_type = "file"
            if filename.endswith(".tsx"):
                node_type = "component"
                component_name = filename.replace(".tsx", "")
                add_entity(f"Frontend.Component.{component_name}", "Component", [f"Defined in {rel_path}"])
            elif filename.startswith("use"):
                node_type = "hook"
                hook_name = filename.replace(".ts", "")
                add_entity(f"Frontend.Hook.{hook_name}", "Hook", [f"Defined in {rel_path}"])
            
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
                    add_entity(f"Infrastructure.Service.{service_name}", "Container", ["Defined in docker-compose.yml"])
                elif line.startswith("networks:") or line.startswith("volumes:"):
                    in_services = False

    except Exception as e:
        print(f"Error parsing docker-compose: {e}")

def main():
    print("--- AKIS Knowledge Graph Generator ---")
    
    # 1. Backup existing
    if OUTPUT_FILE.exists():
        print(f"Backing up to {BACKUP_FILE.name}...")
        with open(OUTPUT_FILE, "r") as f:
            with open(BACKUP_FILE, "w") as b:
                b.write(f.read())

    # 2. Scan
    scan_python_backend()
    scan_react_frontend()
    scan_docker_infrastructure()
    
    # 3. Merge/Write
    # We overwrite completely to ensure freshness, but we could merge observations if needed.
    # For now, fresh generation is safer to avoid stale data.
    
    final_output = []
    final_output.extend(entities)
    final_output.extend(relations)
    final_output.extend(codegraph)
    
    print(f"Generated {len(entities)} entities, {len(relations)} relations, {len(codegraph)} file nodes.")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        # Write as JSONL (Line delimited) as per original format seems to be JSONL based on read_file output
        # Wait, the read_file output showed: {"type":"entity"...} \n {"type":"entity"...}
        # Yes, it is JSONL.
        
        for item in final_output:
            f.write(json.dumps(item) + "\n")
            
    print(f"Successfully wrote to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
