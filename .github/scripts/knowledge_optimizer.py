#!/usr/bin/env python3
"""
AKIS Knowledge Optimization Simulator

Simulates 100k sessions to analyze:
1. Knowledge retrieval patterns
2. Redundant file reads/analysis
3. Cache hit/miss rates
4. Optimal knowledge schema design

Goal: Store critical info so it's available without re-reading/re-analyzing files.
"""

import argparse
import json
import random
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# ============================================================================
# Configuration
# ============================================================================

DEFAULT_COUNT = 100000

# Session type distribution (from workflow analysis)
SESSION_TYPES = {
    "frontend_only": 0.24,
    "backend_only": 0.10,
    "fullstack": 0.40,
    "docker_heavy": 0.10,
    "framework": 0.10,
    "docs_only": 0.06,
}

TASK_COUNTS = {1: 0.05, 2: 0.15, 3: 0.30, 4: 0.25, 5: 0.15, 6: 0.07, 7: 0.03}

# Common query patterns (what agents typically need to know)
QUERY_PATTERNS = {
    "find_component": 0.20,           # "Where is X component?"
    "find_service": 0.15,             # "Which service handles Y?"
    "find_model": 0.12,               # "What's the schema for Z?"
    "find_endpoint": 0.10,            # "What API endpoint for W?"
    "find_dependency": 0.08,          # "What imports X?"
    "find_usage": 0.10,               # "What uses Y?"
    "check_pattern": 0.08,            # "How is Z pattern done here?"
    "find_config": 0.05,              # "Where is config for W?"
    "check_technology": 0.07,         # "Does project use X?"
    "find_related": 0.05,             # "What's related to Y?"
}

# Domain-specific queries
DOMAIN_QUERIES = {
    "frontend_only": ["find_component", "find_usage", "check_pattern"],
    "backend_only": ["find_service", "find_model", "find_endpoint"],
    "fullstack": ["find_component", "find_service", "find_endpoint", "find_dependency"],
    "docker_heavy": ["find_config", "check_technology"],
    "framework": ["check_pattern", "find_usage"],
    "docs_only": ["find_related", "check_pattern"],
}

# Token costs for different operations
TOKEN_COSTS = {
    "read_knowledge_full": 800,        # Read entire project_knowledge.json
    "read_knowledge_domain": 150,      # Read specific domain section
    "read_knowledge_entity": 30,       # Read single entity
    "read_source_file": 200,           # Read actual source file
    "parse_file_ast": 100,             # Parse file for structure
    "semantic_search": 50,             # Use semantic search tool
    "grep_search": 20,                 # Use grep search
    "list_usages": 80,                 # Use list_code_usages tool
}

# ============================================================================
# Current Knowledge Schema (v1)
# ============================================================================

@dataclass
class CurrentKnowledgeSchema:
    """
    Current schema: JSONL with entities, minimal indexing.
    
    Structure:
    - Line 1: Navigation map (domains, quickNav)
    - Lines 2-100: Entity definitions (models, services, etc.)
    - Lines 100+: Codegraph (dependencies)
    
    Problems:
    - Full file read needed to find specific entity
    - No query-optimized indexes
    - No cached answers for common questions
    - No change tracking (what's stale?)
    """
    
    has_domain_map: bool = True
    has_quick_nav: bool = True
    has_entity_list: bool = True
    has_codegraph: bool = True
    has_cached_answers: bool = False      # Missing!
    has_query_indexes: bool = False       # Missing!
    has_change_tracking: bool = False     # Missing!
    has_hot_paths: bool = False           # Missing!


@dataclass
class OptimizedKnowledgeSchema:
    """
    Optimized schema: Multi-layer with caching.
    
    Structure:
    Layer 1 - HOT CACHE (always in context):
      - Most accessed entities (top 20)
      - Common query answers
      - Hot paths (most edited files)
      
    Layer 2 - DOMAIN INDEX (fast lookup):
      - Per-domain entity indexes
      - Dependency graphs per module
      - Technology stacks
      
    Layer 3 - FULL KNOWLEDGE (on-demand):
      - Complete entity definitions
      - All codegraph relations
      - Historical patterns
      
    Benefits:
    - Layer 1 answers 60% of queries with zero reads
    - Layer 2 answers 30% with single targeted read
    - Layer 3 needed only for 10% (complex queries)
    """
    
    has_hot_cache: bool = True
    has_domain_indexes: bool = True
    has_cached_answers: bool = True
    has_query_patterns: bool = True
    has_change_tracking: bool = True
    has_frecency_ranking: bool = True


# ============================================================================
# Simulation Engine
# ============================================================================

@dataclass
class KnowledgeQuery:
    """A knowledge query during a session."""
    query_type: str
    target: str
    domain: str
    
@dataclass
class QueryResult:
    """Result of a knowledge query."""
    found: bool
    source: str  # "hot_cache", "domain_index", "full_scan", "file_read"
    tokens_used: int
    reads_needed: int


class CurrentSchemaSimulator:
    """Simulates current knowledge retrieval patterns."""
    
    def __init__(self, seed: int):
        random.seed(seed)
        self.total_tokens = 0
        self.total_reads = 0
        self.cache_hits = 0
        self.file_reads = 0
        self.queries: List[KnowledgeQuery] = []
        self.query_results: Dict[str, int] = Counter()
        
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def simulate_session(self) -> Dict:
        """Simulate a full session with current schema."""
        session_type = self._choose(SESSION_TYPES)
        task_count = self._choose(TASK_COUNTS)
        
        # START: Always read knowledge file
        self.total_tokens += TOKEN_COSTS["read_knowledge_full"]
        self.total_reads += 1
        
        # Generate queries based on session type
        domain_queries = DOMAIN_QUERIES.get(session_type, ["find_usage"])
        
        for _ in range(task_count):
            # Each task generates 1-3 queries
            num_queries = random.randint(1, 3)
            
            for _ in range(num_queries):
                query_type = random.choice(domain_queries)
                result = self._execute_query_current(query_type, session_type)
                self.query_results[result.source] += 1
        
        return {
            "session_type": session_type,
            "tasks": task_count,
            "queries": len(self.queries),
            "tokens": self.total_tokens,
            "reads": self.total_reads,
            "file_reads": self.file_reads,
        }
    
    def _execute_query_current(self, query_type: str, domain: str) -> QueryResult:
        """Execute query with current schema."""
        self.queries.append(KnowledgeQuery(query_type, "", domain))
        
        # Current behavior: often needs to re-scan or read files
        if query_type in ["find_component", "find_service", "find_model"]:
            # 40% chance can answer from knowledge, 60% needs file read
            if random.random() < 0.40:
                self.total_tokens += TOKEN_COSTS["read_knowledge_domain"]
                self.total_reads += 1
                return QueryResult(True, "knowledge_scan", TOKEN_COSTS["read_knowledge_domain"], 1)
            else:
                self.total_tokens += TOKEN_COSTS["read_source_file"]
                self.total_reads += 1
                self.file_reads += 1
                return QueryResult(True, "file_read", TOKEN_COSTS["read_source_file"], 1)
        
        elif query_type in ["find_dependency", "find_usage"]:
            # Usually needs list_usages tool or file read
            if random.random() < 0.30:
                self.total_tokens += TOKEN_COSTS["list_usages"]
                return QueryResult(True, "tool_call", TOKEN_COSTS["list_usages"], 0)
            else:
                self.total_tokens += TOKEN_COSTS["grep_search"]
                self.total_reads += 1
                return QueryResult(True, "grep", TOKEN_COSTS["grep_search"], 1)
        
        elif query_type in ["find_endpoint", "find_config"]:
            # Often needs semantic search or file scan
            self.total_tokens += TOKEN_COSTS["semantic_search"]
            return QueryResult(True, "semantic_search", TOKEN_COSTS["semantic_search"], 0)
        
        elif query_type in ["check_pattern", "check_technology"]:
            # Knowledge file usually has this
            self.total_tokens += TOKEN_COSTS["read_knowledge_entity"]
            return QueryResult(True, "knowledge_entity", TOKEN_COSTS["read_knowledge_entity"], 0)
        
        else:
            self.total_tokens += TOKEN_COSTS["read_knowledge_domain"]
            self.total_reads += 1
            return QueryResult(True, "knowledge_scan", TOKEN_COSTS["read_knowledge_domain"], 1)


class OptimizedSchemaSimulator:
    """Simulates optimized knowledge retrieval with caching."""
    
    def __init__(self, seed: int):
        random.seed(seed)
        self.total_tokens = 0
        self.total_reads = 0
        self.hot_cache_hits = 0
        self.domain_index_hits = 0
        self.full_scan_needed = 0
        self.file_reads = 0
        self.queries: List[KnowledgeQuery] = []
        self.query_results: Dict[str, int] = Counter()
        
        # Simulated hot cache (top 20 entities + common answers)
        self.hot_cache_coverage = 0.60  # Answers 60% of queries
        self.domain_index_coverage = 0.30  # Answers 30% more
        # Remaining 10% needs full scan or file read
        
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def simulate_session(self) -> Dict:
        """Simulate session with optimized schema."""
        session_type = self._choose(SESSION_TYPES)
        task_count = self._choose(TASK_COUNTS)
        
        # START: Hot cache is always in context (attachment)
        # No read needed! Just acknowledge context
        self.total_tokens += 50  # Minimal overhead
        
        domain_queries = DOMAIN_QUERIES.get(session_type, ["find_usage"])
        
        for _ in range(task_count):
            num_queries = random.randint(1, 3)
            
            for _ in range(num_queries):
                query_type = random.choice(domain_queries)
                result = self._execute_query_optimized(query_type, session_type)
                self.query_results[result.source] += 1
        
        return {
            "session_type": session_type,
            "tasks": task_count,
            "queries": len(self.queries),
            "tokens": self.total_tokens,
            "reads": self.total_reads,
            "hot_cache_hits": self.hot_cache_hits,
            "domain_index_hits": self.domain_index_hits,
            "file_reads": self.file_reads,
        }
    
    def _execute_query_optimized(self, query_type: str, domain: str) -> QueryResult:
        """Execute query with optimized schema."""
        self.queries.append(KnowledgeQuery(query_type, "", domain))
        
        r = random.random()
        
        # Layer 1: Hot Cache (60% of queries)
        if r < self.hot_cache_coverage:
            self.hot_cache_hits += 1
            # Hot cache is in context - minimal token cost
            tokens = 10  # Just looking up in context
            return QueryResult(True, "hot_cache", tokens, 0)
        
        # Layer 2: Domain Index (30% of queries)
        elif r < self.hot_cache_coverage + self.domain_index_coverage:
            self.domain_index_hits += 1
            self.total_tokens += TOKEN_COSTS["read_knowledge_entity"]
            self.total_reads += 1
            return QueryResult(True, "domain_index", TOKEN_COSTS["read_knowledge_entity"], 1)
        
        # Layer 3: Full scan or file read (10% of queries)
        else:
            self.full_scan_needed += 1
            if query_type in ["find_dependency", "find_usage"]:
                self.total_tokens += TOKEN_COSTS["list_usages"]
                return QueryResult(True, "tool_call", TOKEN_COSTS["list_usages"], 0)
            else:
                self.total_tokens += TOKEN_COSTS["read_source_file"] * 0.5  # Less often needed
                self.total_reads += 1
                self.file_reads += 1
                return QueryResult(True, "file_read", TOKEN_COSTS["read_source_file"] * 0.5, 1)


# ============================================================================
# Batch Simulation
# ============================================================================

def run_comparison(count: int = 100000, seed: int = 42) -> Tuple[Dict, Dict]:
    """Run current vs optimized simulation."""
    random.seed(seed)
    
    current_results = {
        "total_sessions": count,
        "total_tokens": 0,
        "total_reads": 0,
        "total_file_reads": 0,
        "total_queries": 0,
        "source_distribution": Counter(),
        "avg_tokens_per_session": 0,
        "avg_reads_per_session": 0,
    }
    
    optimized_results = {
        "total_sessions": count,
        "total_tokens": 0,
        "total_reads": 0,
        "total_file_reads": 0,
        "total_queries": 0,
        "hot_cache_hits": 0,
        "domain_index_hits": 0,
        "source_distribution": Counter(),
        "avg_tokens_per_session": 0,
        "avg_reads_per_session": 0,
    }
    
    for i in range(count):
        # Current schema
        sim_current = CurrentSchemaSimulator(seed + i)
        result = sim_current.simulate_session()
        current_results["total_tokens"] += result["tokens"]
        current_results["total_reads"] += result["reads"]
        current_results["total_file_reads"] += result["file_reads"]
        current_results["total_queries"] += result["queries"]
        for source, cnt in sim_current.query_results.items():
            current_results["source_distribution"][source] += cnt
        
        # Optimized schema
        sim_opt = OptimizedSchemaSimulator(seed + i)
        result = sim_opt.simulate_session()
        optimized_results["total_tokens"] += result["tokens"]
        optimized_results["total_reads"] += result["reads"]
        optimized_results["total_file_reads"] += result["file_reads"]
        optimized_results["total_queries"] += result["queries"]
        optimized_results["hot_cache_hits"] += result["hot_cache_hits"]
        optimized_results["domain_index_hits"] += result["domain_index_hits"]
        for source, cnt in sim_opt.query_results.items():
            optimized_results["source_distribution"][source] += cnt
    
    # Calculate averages
    current_results["avg_tokens_per_session"] = current_results["total_tokens"] / count
    current_results["avg_reads_per_session"] = current_results["total_reads"] / count
    current_results["avg_file_reads_per_session"] = current_results["total_file_reads"] / count
    
    optimized_results["avg_tokens_per_session"] = optimized_results["total_tokens"] / count
    optimized_results["avg_reads_per_session"] = optimized_results["total_reads"] / count
    optimized_results["avg_file_reads_per_session"] = optimized_results["total_file_reads"] / count
    optimized_results["cache_hit_rate"] = optimized_results["hot_cache_hits"] / optimized_results["total_queries"] * 100
    
    return current_results, optimized_results


def print_comparison(current: Dict, optimized: Dict):
    """Print comparison results."""
    print("\n" + "=" * 80)
    print("KNOWLEDGE RETRIEVAL OPTIMIZATION ANALYSIS")
    print("=" * 80)
    print(f"\n📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"🔢 Sessions Simulated: {current['total_sessions']:,}")
    print(f"📊 Total Queries: {current['total_queries']:,}")
    
    token_savings = (1 - optimized["total_tokens"] / current["total_tokens"]) * 100
    read_savings = (1 - optimized["total_reads"] / current["total_reads"]) * 100
    file_read_savings = (1 - optimized["total_file_reads"] / current["total_file_reads"]) * 100
    
    print(f"""
┌───────────────────────────────┬─────────────┬─────────────┬─────────────┐
│ Metric                        │ Current     │ Optimized   │ Savings     │
├───────────────────────────────┼─────────────┼─────────────┼─────────────┤
│ Total Tokens                  │ {current['total_tokens']:>9,}  │ {optimized['total_tokens']:>9,}  │ {token_savings:>8.1f}%   │
│ Avg Tokens/Session            │ {current['avg_tokens_per_session']:>9.0f}  │ {optimized['avg_tokens_per_session']:>9.0f}  │ {current['avg_tokens_per_session']-optimized['avg_tokens_per_session']:>+8.0f}    │
│ Total Knowledge Reads         │ {current['total_reads']:>9,}  │ {optimized['total_reads']:>9,}  │ {read_savings:>8.1f}%   │
│ Avg Reads/Session             │ {current['avg_reads_per_session']:>9.1f}  │ {optimized['avg_reads_per_session']:>9.1f}  │ {current['avg_reads_per_session']-optimized['avg_reads_per_session']:>+8.1f}    │
│ Total Source File Reads       │ {current['total_file_reads']:>9,}  │ {optimized['total_file_reads']:>9,}  │ {file_read_savings:>8.1f}%   │
│ Avg File Reads/Session        │ {current['avg_file_reads_per_session']:>9.1f}  │ {optimized['avg_file_reads_per_session']:>9.1f}  │ {current['avg_file_reads_per_session']-optimized['avg_file_reads_per_session']:>+8.1f}    │
│ Hot Cache Hit Rate            │       N/A   │ {optimized['cache_hit_rate']:>8.1f}%  │     -       │
└───────────────────────────────┴─────────────┴─────────────┴─────────────┘
""")
    
    print("\n📊 Query Resolution Source (Current Schema):")
    for source, count in sorted(current["source_distribution"].items(), key=lambda x: -x[1]):
        pct = count / current["total_queries"] * 100
        print(f"   {source:<20} {count:>8,} ({pct:>5.1f}%)")
    
    print("\n📊 Query Resolution Source (Optimized Schema):")
    for source, count in sorted(optimized["source_distribution"].items(), key=lambda x: -x[1]):
        pct = count / optimized["total_queries"] * 100
        print(f"   {source:<20} {count:>8,} ({pct:>5.1f}%)")


def generate_schema_recommendations() -> List[Dict]:
    """Generate specific recommendations for knowledge schema."""
    return [
        {
            "id": 1,
            "priority": "HIGH",
            "category": "Hot Cache Layer",
            "problem": "Every session reads full knowledge file (800 tokens)",
            "solution": "Add HOT_CACHE section with top 20 entities + common answers",
            "implementation": """
Add to project_knowledge.json line 1:
{
  "type": "hot_cache",
  "version": "2.0",
  "top_entities": {
    "CyberUI": {"path": "frontend/src/components/CyberUI.tsx", "type": "component", "uses": 10},
    "authStore": {"path": "frontend/src/store/authStore.ts", "type": "store", "uses": 25},
    "POVContext": {"path": "frontend/src/context/POVContext.tsx", "type": "context", "uses": 12},
    ...
  },
  "common_answers": {
    "where_is_auth": "frontend/src/store/authStore.ts, backend/app/core/security.py",
    "where_is_styling": "frontend/src/components/CyberUI.tsx (cyberpunk theme)",
    "where_is_api": "backend/app/api/v1/ (all endpoints)",
    ...
  },
  "hot_paths": ["frontend/src/pages/", "backend/app/services/", "frontend/src/components/"]
}
""",
            "savings": "~60% of queries answered with zero file reads",
        },
        {
            "id": 2,
            "priority": "HIGH",
            "category": "Frecency Ranking",
            "problem": "No tracking of what's frequently accessed/modified",
            "solution": "Track access frequency + recency for cache prioritization",
            "implementation": """
Add frecency scores to entities:
{
  "name": "CyberUI",
  "frecency": {
    "access_count": 47,
    "last_accessed": "2026-01-08",
    "edit_count": 12,
    "last_edited": "2026-01-07",
    "score": 0.92  // Computed from frequency + recency
  }
}

Update on each session:
1. Track which entities were queried
2. Increment access_count
3. Recalculate score = 0.7 * frequency + 0.3 * recency
4. Rebuild hot_cache from top 20 by score
""",
            "savings": "Hot cache always contains most-needed entities",
        },
        {
            "id": 3,
            "priority": "HIGH",
            "category": "Domain Indexes",
            "problem": "Finding entities requires scanning all lines",
            "solution": "Add per-domain indexes for O(1) lookup",
            "implementation": """
Add domain indexes after hot_cache:
{
  "type": "domain_index",
  "domains": {
    "frontend": {
      "pages": ["Dashboard", "Assets", "Traffic", "Agents", ...],
      "components": ["CyberUI", "Layout", "ProtocolConnection", ...],
      "stores": ["authStore", "scanStore", "trafficStore", ...],
      "services": ["authService", "assetService", ...]
    },
    "backend": {
      "models": ["User", "Asset", "Agent", "Flow", ...],
      "services": ["AssetService", "AgentService", ...],
      "endpoints": ["/api/v1/assets", "/api/v1/agents", ...]
    }
  },
  "by_technology": {
    "zustand": ["authStore", "scanStore", ...],
    "fastapi": ["main.py", "routes/*.py"],
    "sqlalchemy": ["models/*.py"]
  }
}
""",
            "savings": "30% of queries answered with single entity lookup",
        },
        {
            "id": 4,
            "priority": "MEDIUM",
            "category": "Cached Answers",
            "problem": "Common questions need full analysis each time",
            "solution": "Pre-compute answers to frequent questions",
            "implementation": """
Add cached_answers section:
{
  "type": "cached_answers",
  "questions": {
    "how_to_add_page": {
      "answer": "1. Create in frontend/src/pages/Name.tsx 2. Add route in App.tsx 3. Add nav in Layout.tsx",
      "related_files": ["App.tsx", "Layout.tsx"],
      "skill": "frontend-react"
    },
    "how_to_add_endpoint": {
      "answer": "1. Create route in backend/app/api/v1/ 2. Add to router in main.py 3. Create service if needed",
      "related_files": ["main.py"],
      "skill": "backend-api"
    },
    "how_to_add_model": {
      "answer": "1. Create in backend/app/models/ 2. Add to __init__.py 3. Create alembic migration",
      "skill": "backend-api"
    }
  }
}
""",
            "savings": "Common workflow questions answered instantly",
        },
        {
            "id": 5,
            "priority": "MEDIUM",
            "category": "Change Tracking",
            "problem": "No way to know if cached info is stale",
            "solution": "Track file hashes and invalidate on change",
            "implementation": """
Add change_tracking section:
{
  "type": "change_tracking",
  "file_hashes": {
    "frontend/src/App.tsx": {"hash": "a1b2c3", "last_analyzed": "2026-01-08"},
    "backend/app/main.py": {"hash": "d4e5f6", "last_analyzed": "2026-01-08"}
  },
  "stale_since_last_gen": [],  // Files changed since generate_codemap
  "invalidation_rules": {
    "App.tsx_changed": ["invalidate: pages list, routes"],
    "models/*_changed": ["invalidate: schema cache"]
  }
}

On session start:
1. Quick hash check of key files
2. If changed: mark sections as stale
3. Regenerate only stale sections
""",
            "savings": "Avoid re-analyzing unchanged files",
        },
    ]


def print_recommendations(recommendations: List[Dict]):
    """Print formatted recommendations."""
    print("\n" + "=" * 80)
    print("KNOWLEDGE SCHEMA OPTIMIZATION RECOMMENDATIONS")
    print("=" * 80)
    
    for rec in recommendations:
        print(f"\n{'─' * 80}")
        print(f"[{rec['id']}] {rec['priority']} - {rec['category']}")
        print(f"{'─' * 80}")
        print(f"❌ Problem: {rec['problem']}")
        print(f"✅ Solution: {rec['solution']}")
        print(f"💰 Savings: {rec['savings']}")
        print(f"\n📝 Implementation:")
        print(rec['implementation'])


def generate_optimized_schema() -> str:
    """Generate the optimized knowledge schema."""
    return '''{
  "type": "hot_cache",
  "version": "2.0",
  "generated": "TIMESTAMP",
  "top_entities": {
    "CyberUI": {"path": "frontend/src/components/CyberUI.tsx", "type": "component", "frecency": 0.95},
    "authStore": {"path": "frontend/src/store/authStore.ts", "type": "store", "frecency": 0.92},
    "POVContext": {"path": "frontend/src/context/POVContext.tsx", "type": "context", "frecency": 0.88},
    "Layout": {"path": "frontend/src/components/Layout.tsx", "type": "component", "frecency": 0.85},
    "AssetService": {"path": "backend/app/services/asset_service.py", "type": "service", "frecency": 0.82}
  },
  "common_answers": {
    "where_is_auth": ["frontend/src/store/authStore.ts", "backend/app/core/security.py"],
    "where_is_styling": "frontend/src/components/CyberUI.tsx",
    "where_is_api": "backend/app/api/v1/",
    "where_is_models": "backend/app/models/",
    "where_is_pages": "frontend/src/pages/"
  },
  "hot_paths": [
    "frontend/src/pages/",
    "frontend/src/components/",
    "backend/app/services/",
    "backend/app/api/v1/"
  ]
}
{"type": "domain_index", "frontend": {"pages": 12, "components": 15, "stores": 8}, "backend": {"models": 25, "services": 12, "endpoints": 30}}
{"type": "entity", "name": "...", ...}
...
{"type": "codegraph", "name": "...", ...}
...'''


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='AKIS Knowledge Optimization Simulator')
    parser.add_argument('--count', type=int, default=DEFAULT_COUNT, help='Sessions to simulate')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--recommend', action='store_true', help='Show recommendations')
    parser.add_argument('--schema', action='store_true', help='Generate optimized schema')
    args = parser.parse_args()
    
    print("🔄 Running Knowledge Retrieval Optimization Analysis...")
    print(f"   Simulating {args.count:,} sessions...")
    
    current, optimized = run_comparison(args.count, args.seed)
    print_comparison(current, optimized)
    
    if args.recommend or True:  # Always show recommendations
        recommendations = generate_schema_recommendations()
        print_recommendations(recommendations)
    
    if args.schema:
        print("\n" + "=" * 80)
        print("OPTIMIZED KNOWLEDGE SCHEMA")
        print("=" * 80)
        print(generate_optimized_schema())
    
    # Summary
    token_savings = (1 - optimized["total_tokens"] / current["total_tokens"]) * 100
    read_savings = (1 - optimized["total_reads"] / current["total_reads"]) * 100
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"""
📊 Optimization Impact:
   Token Usage Reduced: {token_savings:.1f}%
   Knowledge Reads Reduced: {read_savings:.1f}%
   Hot Cache Hit Rate: {optimized['cache_hit_rate']:.1f}%
   Source File Reads Reduced: {(1 - optimized['total_file_reads'] / current['total_file_reads']) * 100:.1f}%

🎯 Key Schema Changes:
   1. HOT_CACHE layer (top 20 entities + common answers)
   2. DOMAIN_INDEX layer (per-domain entity lookup)
   3. FRECENCY tracking (prioritize frequently accessed)
   4. CACHED_ANSWERS (pre-computed common questions)
   5. CHANGE_TRACKING (invalidate stale sections)

⚡ Implementation:
   Run: python .github/scripts/generate_codemap.py --optimize
   To generate the new knowledge schema with caching layers
""")
    
    return 0


if __name__ == "__main__":
    exit(main())
