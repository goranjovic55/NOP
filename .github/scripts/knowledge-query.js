#!/usr/bin/env node
/**
 * AKIS Knowledge Query
 * 
 * Search and query project_knowledge.json efficiently.
 * 
 * Usage:
 *   node knowledge-query.js "search term"
 *   node knowledge-query.js "term" --type entity
 *   node knowledge-query.js "term" --type relation
 *   node knowledge-query.js "term" --name "Module.Component"
 *   node knowledge-query.js --stats
 *   node knowledge-query.js --recent 7  # entries updated in last 7 days
 */

const fs = require('fs');
const path = require('path');

class KnowledgeQuery {
    constructor(knowledgePath = null) {
        // Use path relative to script location as default, or custom path
        if (knowledgePath) {
            this.knowledgePath = path.join(process.cwd(), knowledgePath);
        } else {
            this.knowledgePath = path.resolve(__dirname, '../../project_knowledge.json');
        }
        this.entries = [];
        this.loaded = false;
    }

    load() {
        if (this.loaded) return;
        
        if (!fs.existsSync(this.knowledgePath)) {
            console.error(`Knowledge file not found: ${this.knowledgePath}`);
            return;
        }

        const content = fs.readFileSync(this.knowledgePath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                this.entries.push(JSON.parse(line));
            } catch (e) {
                // Skip invalid lines
            }
        }
        
        this.loaded = true;
    }

    /**
     * Search by text in any field
     */
    search(query, options = {}) {
        this.load();
        
        const { type, name, limit = 50 } = options;
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const entry of this.entries) {
            // Filter by type
            if (type && entry.type !== type) continue;
            
            // Filter by name
            if (name && !entry.name?.toLowerCase().includes(name.toLowerCase())) continue;
            
            // Search in all fields
            const searchable = JSON.stringify(entry).toLowerCase();
            if (searchable.includes(queryLower)) {
                results.push(entry);
                if (results.length >= limit) break;
            }
        }
        
        return results;
    }

    /**
     * Get entries by exact name
     */
    getByName(name) {
        this.load();
        return this.entries.filter(e => e.name === name);
    }

    /**
     * Get entries by type
     */
    getByType(type) {
        this.load();
        return this.entries.filter(e => e.type === type);
    }

    /**
     * Get related entries (relations where from or to matches)
     */
    getRelated(name) {
        this.load();
        return this.entries.filter(e => 
            e.type === 'relation' && (e.from === name || e.to === name)
        );
    }

    /**
     * Get recent entries (updated within N days)
     */
    getRecent(days = 7) {
        this.load();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        return this.entries.filter(entry => {
            if (!entry.observations) return false;
            
            for (const obs of entry.observations) {
                const match = obs.match(/upd:(\d{4}-\d{2}-\d{2})/);
                if (match && match[1] >= cutoffStr) {
                    return true;
                }
            }
            return false;
        });
    }

    /**
     * Get statistics about knowledge base
     */
    getStats() {
        this.load();
        
        const stats = {
            total: this.entries.length,
            byType: {},
            byEntityType: {},
            relations: 0,
            recentUpdates: 0
        };
        
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        
        for (const entry of this.entries) {
            // Count by type
            stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
            
            // Count by entity type
            if (entry.entityType) {
                stats.byEntityType[entry.entityType] = (stats.byEntityType[entry.entityType] || 0) + 1;
            }
            
            // Count relations
            if (entry.type === 'relation') {
                stats.relations++;
            }
            
            // Count recent updates
            if (entry.observations) {
                for (const obs of entry.observations) {
                    const match = obs.match(/upd:(\d{4}-\d{2}-\d{2})/);
                    if (match && match[1] >= weekAgoStr) {
                        stats.recentUpdates++;
                        break;
                    }
                }
            }
        }
        
        return stats;
    }

    /**
     * Find stale entries (not updated in N days)
     * Returns entries where ALL observations are older than cutoff
     */
    getStale(days = 30) {
        this.load();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        
        return this.entries.filter(entry => {
            if (!entry.observations || entry.type === 'relation') return false;
            
            // Check if entry has ANY recent update
            let hasRecentUpdate = false;
            for (const obs of entry.observations) {
                const match = obs.match(/upd:(\d{4}-\d{2}-\d{2})/);
                if (match && match[1] >= cutoffStr) {
                    hasRecentUpdate = true;
                    break;
                }
            }
            // Return true (stale) only if no recent updates found
            return !hasRecentUpdate;
        });
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const query = new KnowledgeQuery();
    
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
AKIS Knowledge Query

Usage:
  node knowledge-query.js "search term"      # Full-text search
  node knowledge-query.js "term" --type entity|relation|codegraph
  node knowledge-query.js --name "Module.Component"
  node knowledge-query.js --related "Module.Component"
  node knowledge-query.js --stats            # Show statistics
  node knowledge-query.js --recent 7         # Entries updated in last N days
  node knowledge-query.js --stale 30         # Entries not updated in N days

Examples:
  node knowledge-query.js "Frontend"
  node knowledge-query.js "API" --type entity
  node knowledge-query.js --stats
  node knowledge-query.js --related "Backend.Services.AuthService"
        `);
        process.exit(0);
    }
    
    if (args[0] === '--stats') {
        const stats = query.getStats();
        console.log('Knowledge Base Statistics:');
        console.log('==========================');
        console.log(`Total entries: ${stats.total}`);
        console.log(`\nBy type:`);
        for (const [type, count] of Object.entries(stats.byType)) {
            console.log(`  ${type}: ${count}`);
        }
        console.log(`\nBy entity type:`);
        for (const [type, count] of Object.entries(stats.byEntityType).slice(0, 10)) {
            console.log(`  ${type}: ${count}`);
        }
        console.log(`\nRecent updates (7 days): ${stats.recentUpdates}`);
        process.exit(0);
    }
    
    if (args[0] === '--recent') {
        const days = parseInt(args[1]) || 7;
        const results = query.getRecent(days);
        console.log(`Entries updated in last ${days} days: ${results.length}`);
        for (const entry of results.slice(0, 20)) {
            console.log(`  - ${entry.name} (${entry.type})`);
        }
        process.exit(0);
    }
    
    if (args[0] === '--stale') {
        const days = parseInt(args[1]) || 30;
        const results = query.getStale(days);
        console.log(`Stale entries (not updated in ${days} days): ${results.length}`);
        for (const entry of results.slice(0, 20)) {
            console.log(`  - ${entry.name}`);
        }
        process.exit(0);
    }
    
    if (args[0] === '--name') {
        const results = query.getByName(args[1]);
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    }
    
    if (args[0] === '--related') {
        const results = query.getRelated(args[1]);
        console.log(`Relations for ${args[1]}:`);
        for (const r of results) {
            const direction = r.from === args[1] ? '→' : '←';
            const other = r.from === args[1] ? r.to : r.from;
            console.log(`  ${direction} ${r.relationType} ${other}`);
        }
        process.exit(0);
    }
    
    // Default: full-text search
    const searchTerm = args[0];
    const options = {};
    
    for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--type' && args[i + 1]) options.type = args[i + 1];
        if (args[i] === '--limit' && args[i + 1]) options.limit = parseInt(args[i + 1]);
    }
    
    const results = query.search(searchTerm, options);
    console.log(`Found ${results.length} results for "${searchTerm}":`);
    
    for (const entry of results) {
        if (entry.type === 'entity') {
            console.log(`\n[${entry.type}] ${entry.name} (${entry.entityType})`);
            if (entry.observations) {
                for (const obs of entry.observations.slice(0, 2)) {
                    console.log(`  - ${obs.substring(0, 80)}${obs.length > 80 ? '...' : ''}`);
                }
            }
        } else if (entry.type === 'relation') {
            console.log(`\n[${entry.type}] ${entry.from} --${entry.relationType}--> ${entry.to}`);
        } else {
            console.log(`\n[${entry.type}] ${entry.name}`);
        }
    }
}

module.exports = KnowledgeQuery;
