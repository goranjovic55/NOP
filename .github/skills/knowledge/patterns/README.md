# Knowledge Patterns

Reusable patterns for project knowledge graph management.

## Pattern Files

| Pattern | Description | Usage |
|---------|-------------|-------|
| `entity_template.json` | Entity definition | Add new entities |
| `relation_template.json` | Relation definition | Link entities |
| `query_pattern.py` | Graph query | Search knowledge |
| `cache_update.py` | Cache management | Update hot cache |

## Entity Template
```json
{
  "entity": "entity_name",
  "type": "component",
  "domain": "frontend",
  "path": "frontend/src/components/Entity.tsx",
  "description": "Brief description of entity",
  "relations": []
}
```

## Relation Template
```json
{
  "source": "entity_a",
  "type": "depends_on",
  "target": "entity_b",
  "description": "Why A depends on B"
}
```

## Graph Query Pattern
```python
def query_knowledge(entity_name: str, knowledge: dict) -> dict:
    """Query knowledge graph for entity info."""
    hot_cache = knowledge.get('hot_cache', [])
    
    # Check hot cache first (O(1) lookup)
    for entity in hot_cache:
        if entity.get('name') == entity_name:
            return entity
    
    # Fall back to full search
    domain_index = knowledge.get('domain_index', {})
    for domain, entities in domain_index.items():
        if entity_name in entities:
            return {'domain': domain, 'name': entity_name}
    
    return None
```

## Cache Update Pattern
```python
def update_hot_cache(knowledge: dict, new_entity: dict) -> dict:
    """Add entity to hot cache, maintain size limit."""
    hot_cache = knowledge.get('hot_cache', [])
    
    # Add to front (most recently used)
    hot_cache.insert(0, new_entity)
    
    # Keep only top 30
    knowledge['hot_cache'] = hot_cache[:30]
    
    return knowledge
```

## Pattern Selection

| Task | Pattern |
|------|---------|
| Add entity | entity_template.json |
| Link entities | relation_template.json |
| Search graph | query_pattern.py |
| Update cache | cache_update.py |
