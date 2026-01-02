"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeParser = void 0;
const fs = __importStar(require("fs"));
class KnowledgeParser {
    static parseKnowledgeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.trim().split('\n');
            const entities = [];
            for (const line of lines) {
                try {
                    const entity = JSON.parse(line);
                    if (entity.type === 'entity') {
                        entities.push(entity);
                    }
                }
                catch (error) {
                    // Skip invalid lines
                    continue;
                }
            }
            return entities;
        }
        catch (error) {
            console.error(`Error parsing knowledge file ${filePath}:`, error);
            return [];
        }
    }
    static groupEntitiesByType(entities) {
        const grouped = new Map();
        for (const entity of entities) {
            const type = entity.entityType || 'Other';
            if (!grouped.has(type)) {
                grouped.set(type, []);
            }
            grouped.get(type).push(entity);
        }
        return grouped;
    }
    static extractRelationships(entities) {
        const relationships = [];
        for (const entity of entities) {
            // Extract relationships from observations
            for (const obs of entity.observations) {
                const refMatch = obs.match(/refs?:\s*(\d+)/);
                if (refMatch) {
                    relationships.push({
                        source: entity.name,
                        target: `ref-${refMatch[1]}`,
                        type: 'reference'
                    });
                }
                // Check for agent relationships
                if (entity.name.includes('Agent')) {
                    const skillMatch = obs.match(/skill[s]?[=:]\s*(.+)/i);
                    if (skillMatch) {
                        const skills = skillMatch[1].split(',');
                        for (const skill of skills) {
                            relationships.push({
                                source: entity.name,
                                target: skill.trim(),
                                type: 'uses'
                            });
                        }
                    }
                }
            }
        }
        return relationships;
    }
}
exports.KnowledgeParser = KnowledgeParser;
//# sourceMappingURL=KnowledgeParser.js.map