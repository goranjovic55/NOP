# Knowledge Schema v2.0 Optimization | 2026-01-08 | ~15min

## Summary
Simulated 100k sessions to analyze knowledge retrieval patterns, then implemented 
optimized project_knowledge.json schema with 3-layer caching architecture achieving 
87.4% token reduction and 60% hot cache hit rate.

## Session Metrics
| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Tasks | 6 completed / 6 total |
| Files Modified | 4 |
| Skills Loaded | 1 |
| Complexity | Medium |

## Workflow Tree
```
<MAIN> Optimize project_knowledge.json for reduced redundant reads
├─ <WORK> Create knowledge optimizer script       ✓
├─ <WORK> Run 100k session simulation            ✓
├─ <WORK> Analyze results & recommendations      ✓
├─ <WORK> Implement optimized knowledge schema   ✓
├─ <WORK> Resimulate with improvements           ✓
└─ <END> Finalize & document changes             ✓
```

## Files Modified
| File | Changes |
|------|---------|
| .github/scripts/knowledge_optimizer.py | NEW - 100k session simulator for knowledge patterns |
| .github/scripts/generate_codemap.py | Added v2.0 schema: hot_cache, domain_index, change_tracking |
| .github/skills/knowledge/SKILL.md | Updated to v2.0 with new reading patterns |
| .github/skills/backend-api/SKILL.md | Added WebSocket lifecycle, debugging workflow, checklist |
| .github/skills/docker/SKILL.md | Added network/subnet management, infrastructure checklist |
| .github/copilot-instructions.md | Updated to v6.1 with Knowledge v2.0 section |
| project_knowledge.json | Regenerated with 3-layer structure |

## Skills Used
- .github/skills/knowledge/SKILL.md (for knowledge schema patterns)
- .github/skills/akis-development/SKILL.md (for skill updates)

## Skill Suggestions
2 suggestions from suggest_skill.py:
1. **backend-development-patterns** - FastAPI WebSocket lifecycle, SQLAlchemy patterns
2. **infrastructure-development** - Docker Compose, networking, containerization

## Simulation Results

### Before (v1.0 Schema)
| Metric | Value |
|--------|-------|
| Avg Tokens/Session | 1,463 |
| Avg Reads/Session | 4.9 |
| File Reads/Session | 1.5 |
| Cache Hit Rate | N/A |

### After (v2.0 Schema)
| Metric | Value |
|--------|-------|
| Avg Tokens/Session | 185 |
| Avg Reads/Session | 2.7 |
| File Reads/Session | 0.6 |
| Cache Hit Rate | 60% |

### Improvement
- **87.4% token reduction**
- **44.2% knowledge reads reduction**
- **63.1% source file reads reduction**
- **60% hot cache hit rate**

## Knowledge Schema v2.0 Structure

```
project_knowledge.json:
├─ Line 1: HOT_CACHE
│   ├─ top_entities (20 frecency-ranked)
│   ├─ common_answers (pre-computed)
│   └─ hot_paths (frequent directories)
├─ Line 2: DOMAIN_INDEX
│   ├─ frontend (pages, components, stores)
│   ├─ backend (models, schemas, services)
│   └─ by_technology (zustand, fastapi, etc.)
├─ Line 3: CHANGE_TRACKING
│   └─ file_hashes (staleness detection)
├─ Line 4: MAP (legacy navigation)
├─ Lines 5-126: ENTITIES (122 entries)
└─ Lines 127-282: CODEGRAPH (156 entries)
```

## Key Improvements
1. **HOT_CACHE layer** - 60% of queries answered with zero file reads
2. **DOMAIN_INDEX layer** - 30% of queries via O(1) lookup
3. **Frecency ranking** - Top entities prioritized by access frequency + recency
4. **Common answers** - Pre-computed answers for frequent questions
5. **Change tracking** - File hashes to skip re-analysis of unchanged files

## Verification
```bash
# Verified structure
head -3 project_knowledge.json | jq '.type'
# Output: "hot_cache", "domain_index", "change_tracking"

# Verified 100k simulation
python .github/scripts/knowledge_optimizer.py --count 100000
# Output: 87.4% token reduction, 60% cache hit rate
```

## Notes
- AKIS v6.1 now includes Knowledge v2.0 guidance in WORK section
- generate_codemap.py defaults to --optimize (v2.0 schema)
- Hot cache contains top 20 entities + 10 common answers
