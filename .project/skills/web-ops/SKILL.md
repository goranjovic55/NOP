---
name: web-ops
description: Web research and content retrieval using SearXNG, Firecrawl, and ArchiveBox on CT107. Use when searching for information, scraping web content, archiving pages, or researching topics. Provides unified interface to CT107 web stack.
---

# Web Operations Skill

Interface with web research stack on CT107 (res container) for search, scraping, and archiving.

## Services Overview

| Service | URL | Purpose | Status |
|---------|-----|---------|--------|
| **SearXNG** | http://10.10.10.107:8080 | Meta-search engine | ✅ |
| **Firecrawl** | http://10.10.10.107:3002 | Web scraping API | ✅ |
| **ArchiveBox** | http://10.10.10.107:8000 | Web archiving | ✅ |

## SearXNG (Search)

### Basic Search
```bash
# Simple query
curl -s 'http://10.10.10.107:8080/search?q=minimax+api+documentation&format=json' | jq '.results[:5]'
```

### JSON API
```bash
# Search with JSON output
curl -s 'http://10.10.10.107:8080/search?q=fastapi+routing+best+practices&format=json' | python3 -c '
import sys, json
data = json.load(sys.stdin)
for r in data.get("results", [])[:5]:
    print(f"{r.get(\x27title\x27, \x27N/A\x27)[:50]}...")
    print(f"  {r.get(\x27url\x27, \x27N/A\x27)[:60]}")
    print(f"  {r.get(\x27content\x27, \x27N/A\x27)[:100]}...")
    print()
'
```

### Search Categories
```bash
# General search
curl -s 'http://10.10.10.107:8080/search?q=python+programming&category_general=on'

# News search
curl -s 'http://10.10.10.107:8080/search?q=ai+security&category_news=on'

# IT/Technical search
curl -s 'http://10.10.10.107:8080/search?q=docker+networking&category_it=on'
```

### Advanced Parameters
```bash
# Language filter
curl -s 'http://10.10.10.107:8080/search?q=minimax&language=en'

# Time filter (day, week, month, year)
curl -s 'http://10.10.10.107:8080/search?q=claude+code&time_range=week'

# Safe search
curl -s 'http://10.10.10.107:8080/search?q=tutorial&safesearch=0'
```

## Firecrawl (Scraping)

### Health Check
```bash
curl -s http://10.10.10.107:3002/health
```

### Basic Scrape
```bash
# Scrape single page
curl -s -X POST http://10.10.10.107:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.minimaxi.com", "formats": ["markdown"]}' | jq '.data.markdown[:500]'
```

### Scrape with Options
```bash
# Scrape with specific options
curl -s -X POST http://10.10.10.107:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "html"],
    "onlyMainContent": true,
    "includeTags": ["h1", "h2", "p", "code"],
    "excludeTags": ["nav", "footer", "ads"]
  }' | jq '.'
```

### Crawl Website
```bash
# Crawl entire website (limited depth)
curl -s -X POST http://10.10.10.107:3002/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.minimaxi.com",
    "limit": 10,
    "scrapeOptions": {
      "formats": ["markdown"]
    }
  }' | jq '.id'

# Check crawl status
# (Use ID from previous response)
```

### Map Website Structure
```bash
# Get all links from a website
curl -s -X POST http://10.10.10.107:3002/v1/map \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.minimaxi.com"}' | jq '.links[:20]'
```

## ArchiveBox (Archiving)

### Health Check
```bash
curl -s http://10.10.10.107:8000/admin/login/ | head -1
```

### Add URL to Archive
```bash
# Archive a page via API (if API enabled)
curl -s -X POST http://10.10.10.107:8000/api/v1/archive \
  -H "Content-Type: application/json" \
  -d '{"url": "https://important-docs.example.com", "tags": ["reference", "api"]}' 2>/dev/null || echo 'Check ArchiveBox API settings'
```

### View Archive
```bash
# List recent snapshots
curl -s http://10.10.10.107:8000/archive/ | grep -o 'href="[^"]*"' | head -20
```

## Combined Workflows

### Research Pipeline
```bash
# 1. Search for information
SEARCH_RESULTS=$(curl -s 'http://10.10.10.107:8080/search?q=fastapi+best+practices&format=json')

# 2. Extract top URLs
URLS=$(echo $SEARCH_RESULTS | jq -r '.results[:3] | .[].url')

# 3. Scrape each URL for content
for url in $URLS; do
  echo "Scraping: $url"
  curl -s -X POST http://10.10.10.107:3002/v1/scrape \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$url\", \"formats\": [\"markdown\"]}" | \
    jq -r '.data.markdown[:1000]'
  echo "---"
done
```

### Documentation Scraping
```bash
# Scrape documentation site
curl -s -X POST http://10.10.10.107:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.minimaxi.com/api-reference",
    "formats": ["markdown"],
    "onlyMainContent": true
  }' | jq -r '.data.markdown' > /tmp/minimax-docs.md

echo "Documentation saved to /tmp/minimax-docs.md"
```

### News Monitoring
```bash
# Search for recent news
curl -s 'http://10.10.10.107:8080/search?q=cybersecurity+threats&time_range=day&category_news=on&format=json' | \
  jq '.results[:5] | .[] | {title: .title, url: .url, publishedDate: .publishedDate}'
```

## Research Patterns

### API Documentation Lookup
```bash
# Search for API docs
QUERY="minimax anthropic api authentication"
RESULTS=$(curl -s "http://10.10.10.107:8080/search?q=$QUERY&format=json")

# Get first result and scrape
FIRST_URL=$(echo $RESULTS | jq -r '.results[0].url')
echo "Scraping: $FIRST_URL"
curl -s -X POST http://10.10.10.107:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$FIRST_URL\", \"formats\": [\"markdown\"]}" | \
  jq -r '.data.markdown[:2000]'
```

### Error Research
```bash
# Search for error solutions
ERROR="invalid api key minimax"
curl -s "http://10.10.10.107:8080/search?q=$ERROR&format=json" | \
  jq '.results[:5] | .[] | {title: .title, url: .url}'
```

### Competitor Analysis
```bash
# Compare solutions
curl -s 'http://10.10.10.107:8080/search?q=openclaw+alternative+tools&format=json' | \
  jq '.results[:5] | .[] | {title, url, content: .content[:200]}'
```

## Python Integration

### SearXNG Python Helper
```python
import requests
import json

def search_searxng(query, limit=5):
    url = f"http://10.10.10.107:8080/search?q={query}&format=json"
    response = requests.get(url)
    data = response.json()
    return data.get('results', [])[:limit]

# Usage
results = search_searxng("fastapi routing", 3)
for r in results:
    print(f"{r['title']}: {r['url']}")
```

### Firecrawl Python Helper
```python
import requests

def scrape_page(url):
    response = requests.post(
        "http://10.10.10.107:3002/v1/scrape",
        json={"url": url, "formats": ["markdown"]}
    )
    return response.json().get('data', {}).get('markdown', '')

# Usage
content = scrape_page("https://docs.minimaxi.com")
print(content[:1000])
```

## Safety & Ethics

- Respect robots.txt
- Don't overload servers (rate limit requests)
- Cache results when possible
- Don't scrape sensitive/personal data
- Follow terms of service

## Troubleshooting

### SearXNG Not Responding
```bash
# Check service
curl -s http://10.10.10.107:8080/health

# Restart if needed (on CT107)
# docker restart searxng
```

### Firecrawl Errors
```bash
# Check health
curl -s http://10.10.10.107:3002/health

# Common issues:
# - URL unreachable (check network)
# - Rate limited (wait and retry)
# - Content blocked (try different user-agent)
```

### ArchiveBox Access
```bash
# Default admin credentials may be needed
# Check CT107 configuration
```

## References

- SearXNG Docs: https://docs.searxng.org/
- Firecrawl Docs: https://docs.firecrawl.dev/
- ArchiveBox Docs: https://docs.archivebox.io/
