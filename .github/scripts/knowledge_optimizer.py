#!/usr/bin/env python3
"""
AKIS Knowledge Optimization Simulator v3.0

Simulates 100k sessions to analyze and optimize:
1. Knowledge retrieval patterns
2. Redundant file reads/analysis
3. Cache hit/miss rates
4. Optimal knowledge schema design
5. Historical gotchas and solutions (v3.0)
6. Session patterns for predictive loading (v3.0)
7. Code interconnections for dependency tracking (v3.0)

Goal: Store critical info so it's available without re-reading/re-analyzing files.
Use session history to continuously improve cache effectiveness.
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
    "find_component": 0.15,           # "Where is X component?"
    "find_service": 0.12,             # "Which service handles Y?"
    "find_model": 0.10,               # "What's the schema for Z?"
    "find_endpoint": 0.08,            # "What API endpoint for W?"
    "find_dependency": 0.08,          # "What imports X?"
    "find_usage": 0.08,               # "What uses Y?"
    "check_pattern": 0.06,            # "How is Z pattern done here?"
    "find_config": 0.05,              # "Where is config for W?"
    "check_technology": 0.05,         # "Does project use X?"
    "find_related": 0.04,             # "What's related to Y?"
    # v3.0: New query types for gotchas and history
    "debug_error": 0.08,              # "Why does X fail?" - check gotchas
    "find_gotcha": 0.05,              # "Known issues with Y?"
    "find_historical": 0.03,          # "How was Z solved before?"
    "predict_next": 0.03,             # "What files will I need?" - predictive
}

# v3.0: Gotchas database - historical issues and solutions
GOTCHAS_DATABASE = [
    {
        "id": "sniffer-cap",
        "keywords": ["sniffer", "permission", "cap_net_raw", "raw socket"],
        "solution": "Add --cap-add=NET_RAW to docker-compose for SnifferService",
        "files": ["backend/app/services/SnifferService.py", "docker-compose.yml"],
    },
    {
        "id": "websocket-cors",
        "keywords": ["websocket", "cors", "connection refused", "origin"],
        "solution": "Check allow_origins=['*'] in backend/app/main.py for dev",
        "files": ["backend/app/main.py"],
    },
    {
        "id": "alembic-import",
        "keywords": ["alembic", "migration", "model not found", "import"],
        "solution": "Import model in backend/app/models/__init__.py before migration",
        "files": ["backend/app/models/__init__.py"],
    },
    {
        "id": "pov-context",
        "keywords": ["pov", "context", "user", "asset visibility", "multi-tenant"],
        "solution": "Check POVMiddleware in backend/app/core/pov_middleware.py",
        "files": ["backend/app/core/pov_middleware.py"],
    },
    {
        "id": "agent-connect",
        "keywords": ["agent", "connection", "websocket", "backend url"],
        "solution": "Verify agent config points to correct backend URL:8000",
        "files": ["scripts/agent.py", "backend/app/api/websockets/router.py"],
    },
    {
        "id": "docker-network",
        "keywords": ["docker", "network", "connection refused", "container"],
        "solution": "Use service names (backend, frontend) not localhost between containers",
        "files": ["docker-compose.yml"],
    },
    {
        "id": "async-session",
        "keywords": ["sqlalchemy", "async", "session", "greenlet", "awaited"],
        "solution": "Use AsyncSession and 'async with session.begin()'",
        "files": ["backend/app/core/database.py"],
    },
    {
        "id": "zustand-persist",
        "keywords": ["zustand", "state", "persist", "refresh", "lost"],
        "solution": "Add persist middleware to zustand store",
        "files": ["frontend/src/store/"],
    },
]

# v3.0: Session patterns for predictive loading
SESSION_PATTERNS = {
    "add_endpoint": {
        "trigger": ["endpoint", "api", "route"],
        "predicted_files": ["backend/app/api/v1/", "backend/app/services/", "backend/app/schemas/"],
        "predicted_queries": ["find_service", "find_model", "check_pattern"],
    },
    "add_page": {
        "trigger": ["page", "frontend", "ui"],
        "predicted_files": ["frontend/src/pages/", "frontend/src/components/", "frontend/src/App.tsx"],
        "predicted_queries": ["find_component", "find_usage"],
    },
    "debug_backend": {
        "trigger": ["error", "exception", "traceback", "backend"],
        "predicted_files": ["backend/app/services/", "backend/app/api/"],
        "predicted_queries": ["debug_error", "find_gotcha", "find_dependency"],
    },
    "docker_issue": {
        "trigger": ["docker", "container", "compose", "build"],
        "predicted_files": ["docker-compose.yml", "docker/", "Dockerfile"],
        "predicted_queries": ["find_config", "find_gotcha"],
    },
}

# v3.0: Code interconnections for instant dependency lookup
CODE_INTERCONNECTIONS = {
    "services_to_models": {
        "SnifferService": ["Flow"],
        "AgentService": ["Agent"],
        "AssetService": ["Asset"],
        "DiscoveryService": ["Asset", "Scan"],
        "UserService": ["User"],
        "CVELookupService": ["CVECache", "Vulnerability"],
    },
    "endpoints_to_services": {
        "traffic.py": ["SnifferService", "PingService"],
        "agents.py": ["AgentService", "AgentDataService"],
        "assets.py": ["AssetService", "DiscoveryService"],
        "auth.py": ["UserService"],
        "vulnerabilities.py": ["CVELookupService", "ExploitMatchService"],
    },
    "pages_to_stores": {
        "Dashboard": ["authStore"],
        "Assets": ["authStore"],
        "Traffic": ["authStore"],
        "Agents": ["authStore"],
    },
}

# Domain-specific queries (v3.0 enhanced with debug and predictive)
DOMAIN_QUERIES = {
    "frontend_only": ["find_component", "find_usage", "check_pattern", "debug_error"],
    "backend_only": ["find_service", "find_model", "find_endpoint", "debug_error", "find_gotcha"],
    "fullstack": ["find_component", "find_service", "find_endpoint", "find_dependency", "predict_next"],
    "docker_heavy": ["find_config", "check_technology", "find_gotcha", "debug_error"],
    "framework": ["check_pattern", "find_usage", "find_historical"],
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
    """Simulates optimized knowledge retrieval with v3.0 caching."""
    
    def __init__(self, seed: int):
        random.seed(seed)
        self.total_tokens = 0
        self.total_reads = 0
        self.hot_cache_hits = 0
        self.domain_index_hits = 0
        self.gotcha_hits = 0  # v3.0
        self.predictive_hits = 0  # v3.0
        self.interconnection_hits = 0  # v3.0
        self.full_scan_needed = 0
        self.file_reads = 0
        self.queries: List[KnowledgeQuery] = []
        self.query_results: Dict[str, int] = Counter()
        
        # v3.0: Enhanced cache coverage with new layers
        self.hot_cache_coverage = 0.55  # Standard hot cache
        self.gotcha_coverage = 0.12  # Gotchas answer 12% of debug queries
        self.predictive_coverage = 0.08  # Predictive preload helps 8%
        self.interconnection_coverage = 0.10  # Interconnections help 10%
        self.domain_index_coverage = 0.10  # Domain index catches remaining
        # Total: 95% cache hit rate possible
        
    def _choose(self, dist: dict):
        r = random.random()
        cumulative = 0
        for val, prob in dist.items():
            cumulative += prob
            if r < cumulative:
                return val
        return list(dist.keys())[-1]
    
    def simulate_session(self) -> Dict:
        """Simulate session with v3.0 optimized schema."""
        session_type = self._choose(SESSION_TYPES)
        task_count = self._choose(TASK_COUNTS)
        
        # START: Hot cache is always in context (attachment)
        # v3.0: Also preload gotchas and session patterns
        self.total_tokens += 30  # Even more minimal with smart preload
        
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
            "gotcha_hits": self.gotcha_hits,
            "predictive_hits": self.predictive_hits,
            "interconnection_hits": self.interconnection_hits,
            "domain_index_hits": self.domain_index_hits,
            "file_reads": self.file_reads,
        }
    
    def _execute_query_optimized(self, query_type: str, domain: str) -> QueryResult:
        """Execute query with v3.0 optimized schema."""
        self.queries.append(KnowledgeQuery(query_type, "", domain))
        
        r = random.random()
        
        # v3.0: Check gotchas first for debug queries (75% hit rate)
        if query_type in ["debug_error", "find_gotcha"]:
            if r < 0.75:
                self.gotcha_hits += 1
                tokens = 8
                return QueryResult(True, "gotcha_cache", tokens, 0)
            # Else fall through to other caches
        
        # v3.0: Check interconnections for dependency queries (70% hit rate)
        if query_type in ["find_dependency", "find_usage", "find_related"]:
            if r < 0.70:
                self.interconnection_hits += 1
                tokens = 12
                return QueryResult(True, "interconnection", tokens, 0)
        
        # v3.0: Check predictive cache for sequence queries (80% hit rate)
        if query_type == "predict_next":
            if r < 0.80:
                self.predictive_hits += 1
                tokens = 5
                return QueryResult(True, "predictive", tokens, 0)
        
        # Layer 1: Hot Cache - answers 55% of general queries
        if r < 0.55:
            self.hot_cache_hits += 1
            tokens = 10
            return QueryResult(True, "hot_cache", tokens, 0)
        
        # Layer 2: Domain Index - answers 30% more with minimal read
        elif r < 0.85:
            self.domain_index_hits += 1
            self.total_tokens += TOKEN_COSTS["read_knowledge_entity"]
            self.total_reads += 1
            return QueryResult(True, "domain_index", TOKEN_COSTS["read_knowledge_entity"], 1)
        
        # Layer 3: Fall through (15% of queries) - reduced file read cost
        else:
            self.full_scan_needed += 1
            if query_type in ["find_dependency", "find_usage"]:
                self.total_tokens += TOKEN_COSTS["list_usages"] * 0.5  # v3.0: 50% cheaper
                return QueryResult(True, "tool_call", TOKEN_COSTS["list_usages"] * 0.5, 0)
            else:
                # v3.0: File reads are 60% cheaper due to targeted knowledge
                self.total_tokens += TOKEN_COSTS["read_source_file"] * 0.4
                self.total_reads += 1
                self.file_reads += 1
                return QueryResult(True, "file_read", TOKEN_COSTS["read_source_file"] * 0.4, 1)


# ============================================================================
# Batch Simulation
# ============================================================================

def run_comparison(count: int = 100000, seed: int = 42) -> Tuple[Dict, Dict]:
    """Run current vs v3.0 optimized simulation."""
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
        "gotcha_hits": 0,  # v3.0
        "predictive_hits": 0,  # v3.0
        "interconnection_hits": 0,  # v3.0
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
        
        # v3.0 Optimized schema
        sim_opt = OptimizedSchemaSimulator(seed + i)
        result = sim_opt.simulate_session()
        optimized_results["total_tokens"] += result["tokens"]
        optimized_results["total_reads"] += result["reads"]
        optimized_results["total_file_reads"] += result["file_reads"]
        optimized_results["total_queries"] += result["queries"]
        optimized_results["hot_cache_hits"] += result["hot_cache_hits"]
        optimized_results["gotcha_hits"] += result.get("gotcha_hits", 0)
        optimized_results["predictive_hits"] += result.get("predictive_hits", 0)
        optimized_results["interconnection_hits"] += result.get("interconnection_hits", 0)
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
    
    # v3.0: Combined cache hit rate
    total_cache_hits = (
        optimized_results["hot_cache_hits"] + 
        optimized_results["gotcha_hits"] +
        optimized_results["predictive_hits"] +
        optimized_results["interconnection_hits"] +
        optimized_results["domain_index_hits"]
    )
    optimized_results["cache_hit_rate"] = total_cache_hits / optimized_results["total_queries"] * 100
    optimized_results["hot_cache_rate"] = optimized_results["hot_cache_hits"] / optimized_results["total_queries"] * 100
    optimized_results["gotcha_rate"] = optimized_results["gotcha_hits"] / optimized_results["total_queries"] * 100
    optimized_results["predictive_rate"] = optimized_results["predictive_hits"] / optimized_results["total_queries"] * 100
    optimized_results["interconnection_rate"] = optimized_results["interconnection_hits"] / optimized_results["total_queries"] * 100
    
    return current_results, optimized_results


def print_comparison(current: Dict, optimized: Dict):
    """Print v3.0 comparison results."""
    print("\n" + "=" * 80)
    print("KNOWLEDGE RETRIEVAL OPTIMIZATION ANALYSIS v3.0")
    print("=" * 80)
    print(f"\n📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"🔢 Sessions Simulated: {current['total_sessions']:,}")
    print(f"📊 Total Queries: {current['total_queries']:,}")
    
    token_savings = (1 - optimized["total_tokens"] / current["total_tokens"]) * 100
    read_savings = (1 - optimized["total_reads"] / current["total_reads"]) * 100
    file_read_savings = (1 - optimized["total_file_reads"] / current["total_file_reads"]) * 100
    
    print(f"""
┌───────────────────────────────┬─────────────┬─────────────┬─────────────┐
│ Metric                        │ Current     │ v3.0 Opt    │ Savings     │
├───────────────────────────────┼─────────────┼─────────────┼─────────────┤
│ Total Tokens                  │ {current['total_tokens']:>9,}  │ {optimized['total_tokens']:>9,.0f}  │ {token_savings:>8.1f}%   │
│ Avg Tokens/Session            │ {current['avg_tokens_per_session']:>9.0f}  │ {optimized['avg_tokens_per_session']:>9.0f}  │ {current['avg_tokens_per_session']-optimized['avg_tokens_per_session']:>+8.0f}    │
│ Total Knowledge Reads         │ {current['total_reads']:>9,}  │ {optimized['total_reads']:>9,}  │ {read_savings:>8.1f}%   │
│ Avg Reads/Session             │ {current['avg_reads_per_session']:>9.1f}  │ {optimized['avg_reads_per_session']:>9.1f}  │ {current['avg_reads_per_session']-optimized['avg_reads_per_session']:>+8.1f}    │
│ Total Source File Reads       │ {current['total_file_reads']:>9,}  │ {optimized['total_file_reads']:>9,}  │ {file_read_savings:>8.1f}%   │
│ Avg File Reads/Session        │ {current['avg_file_reads_per_session']:>9.1f}  │ {optimized['avg_file_reads_per_session']:>9.1f}  │ {current['avg_file_reads_per_session']-optimized['avg_file_reads_per_session']:>+8.1f}    │
└───────────────────────────────┴─────────────┴─────────────┴─────────────┘
""")
    
    # v3.0: Cache breakdown
    print("📊 v3.0 Cache Hit Breakdown:")
    print(f"   ├─ Hot Cache:      {optimized['hot_cache_rate']:>6.1f}% ({optimized['hot_cache_hits']:>8,} hits)")
    print(f"   ├─ Gotcha Cache:   {optimized['gotcha_rate']:>6.1f}% ({optimized['gotcha_hits']:>8,} hits)")
    print(f"   ├─ Predictive:     {optimized['predictive_rate']:>6.1f}% ({optimized['predictive_hits']:>8,} hits)")
    print(f"   ├─ Interconnect:   {optimized['interconnection_rate']:>6.1f}% ({optimized['interconnection_hits']:>8,} hits)")
    print(f"   ├─ Domain Index:   {optimized['domain_index_hits']/optimized['total_queries']*100:>6.1f}% ({optimized['domain_index_hits']:>8,} hits)")
    print(f"   └─ TOTAL CACHE:    {optimized['cache_hit_rate']:>6.1f}%")
    
    print("\n📊 Query Resolution Source (Current Schema):")
    for source, count in sorted(current["source_distribution"].items(), key=lambda x: -x[1]):
        pct = count / current["total_queries"] * 100
        print(f"   {source:<20} {count:>8,} ({pct:>5.1f}%)")
    
    print("\n📊 Query Resolution Source (v3.0 Optimized):")
    for source, count in sorted(optimized["source_distribution"].items(), key=lambda x: -x[1]):
        pct = count / optimized["total_queries"] * 100
        print(f"   {source:<20} {count:>8,} ({pct:>5.1f}%)")


def generate_schema_recommendations() -> List[Dict]:
    """Generate specific v3.0 recommendations for knowledge schema."""
    return [
        {
            "id": 1,
            "priority": "HIGH",
            "category": "Hot Cache Layer v3.0",
            "problem": "Every session reads full knowledge file (800 tokens)",
            "solution": "Add enhanced HOT_CACHE with top 30 entities + expanded answers",
            "implementation": """
Add to project_knowledge.json line 1:
{
  "type": "hot_cache",
  "version": "3.0",
  "top_entities": {...30 frecency-ranked entities...},
  "common_answers": {
    "where_is_X": "...", "how_to_X": "...",
    "what_is_pov": "Point of View - user context for asset isolation",
    "what_is_agent": "Remote execution agent deployed on hosts"
  },
  "quick_facts": {
    "tech_stack": {"backend": "FastAPI+SQLAlchemy", "frontend": "React+Zustand"},
    "ports": {"frontend": 3000, "backend": 8000, "postgres": 5432}
  }
}
""",
            "savings": "~55% of queries answered with zero file reads",
        },
        {
            "id": 2,
            "priority": "HIGH",
            "category": "Gotchas Cache (NEW v3.0)",
            "problem": "Debug queries need investigation each time",
            "solution": "Store historical issues + solutions for instant lookup",
            "implementation": """
Add GOTCHAS section:
{
  "type": "gotchas",
  "entries": [
    {
      "id": "sniffer-cap",
      "keywords": ["sniffer", "permission", "cap_net_raw"],
      "solution": "Add --cap-add=NET_RAW to docker-compose",
      "files": ["SnifferService.py", "docker-compose.yml"]
    },
    {
      "id": "websocket-cors",
      "keywords": ["websocket", "cors", "refused"],
      "solution": "Check allow_origins=['*'] in main.py",
      "files": ["backend/app/main.py"]
    },
    ...8+ more gotchas...
  ]
}
""",
            "savings": "~75% of debug queries answered instantly",
        },
        {
            "id": 3,
            "priority": "HIGH",
            "category": "Session Patterns (NEW v3.0)",
            "problem": "Can't predict what files user will need next",
            "solution": "Store common session patterns for predictive loading",
            "implementation": """
Add SESSION_PATTERNS section:
{
  "type": "session_patterns",
  "patterns": {
    "add_endpoint": {
      "trigger": ["endpoint", "api", "route"],
      "preload": ["backend/app/api/v1/", "backend/app/services/"]
    },
    "add_page": {
      "trigger": ["page", "frontend"],
      "preload": ["frontend/src/pages/", "frontend/src/App.tsx"]
    },
    "debug_backend": {
      "trigger": ["error", "exception", "traceback"],
      "preload": ["gotchas", "backend/app/services/"]
    }
  }
}
""",
            "savings": "8% queries pre-answered via pattern prediction",
        },
        {
            "id": 4,
            "priority": "HIGH",
            "category": "Code Interconnections (NEW v3.0)",
            "problem": "Dependency lookups need tool calls or file scans",
            "solution": "Pre-compute service→model→endpoint mappings",
            "implementation": """
Add INTERCONNECTIONS section:
{
  "type": "interconnections",
  "service_to_models": {
    "SnifferService": ["Flow"],
    "AgentService": ["Agent"],
    "AssetService": ["Asset"],
    "DiscoveryService": ["Asset", "Scan"]
  },
  "endpoint_to_services": {
    "traffic.py": ["SnifferService", "PingService"],
    "agents.py": ["AgentService", "AgentDataService"]
  },
  "page_to_stores": {
    "Dashboard": ["authStore"],
    "Assets": ["authStore"]
  }
}
""",
            "savings": "~70% of dependency queries answered instantly",
        },
        {
            "id": 5,
            "priority": "MEDIUM",
            "category": "Frecency Ranking",
            "problem": "No tracking of what's frequently accessed/modified",
            "solution": "Track access frequency + recency for cache prioritization",
            "implementation": """
Add frecency scores to entities:
{
  "name": "SnifferService",
  "frecency": 1.6,  // Computed from frequency + recency
  ...
}

Update on each session:
1. Track which entities were queried
2. Score = 0.7 * frequency + 0.3 * recency
3. Rebuild hot_cache from top 30 by score
""",
            "savings": "Hot cache always contains most-needed entities",
        },
        {
            "id": 6,
            "priority": "MEDIUM",
            "category": "Change Tracking",
            "problem": "No way to know if cached info is stale",
            "solution": "Track file hashes and invalidate on change",
            "implementation": """
Add change_tracking section:
{
  "type": "change_tracking",
  "file_hashes": {
    "frontend/src/App.tsx": {"hash": "b6882e20", "analyzed": "2026-01-08"}
  },
  "invalidation_rules": {
    "App.tsx": "pages, routes",
    "main.py": "endpoints"
  }
}
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
    print("SUMMARY v3.0")
    print("=" * 80)
    print(f"""
📊 Optimization Impact (v3.0):
   Token Usage Reduced: {token_savings:.1f}%
   Knowledge Reads Reduced: {read_savings:.1f}%
   Combined Cache Hit Rate: {optimized['cache_hit_rate']:.1f}%
   Source File Reads Reduced: {(1 - optimized['total_file_reads'] / current['total_file_reads']) * 100:.1f}%

📈 v3.0 Cache Layer Performance:
   Hot Cache:      {optimized['hot_cache_rate']:.1f}% of queries
   Gotcha Cache:   {optimized['gotcha_rate']:.1f}% of queries (debug acceleration)
   Predictive:     {optimized['predictive_rate']:.1f}% of queries (session pattern)
   Interconnect:   {optimized['interconnection_rate']:.1f}% of queries (dependency map)

🎯 Key v3.0 Schema Changes:
   1. HOT_CACHE layer (top 30 entities + expanded answers)
   2. GOTCHAS layer (historical issues + solutions)
   3. SESSION_PATTERNS (predictive file loading)
   4. INTERCONNECTIONS (service→model→endpoint mapping)
   5. DOMAIN_INDEX layer (per-domain entity lookup)
   6. FRECENCY tracking (prioritize by access patterns)
   7. CHANGE_TRACKING (invalidate stale sections)

⚡ Implementation:
   Run: python .github/scripts/generate_knowledge.py --v3
   To generate the new v3.0 knowledge schema
""")
    
    return 0


if __name__ == "__main__":
    exit(main())
