import * as fs from 'fs';
import { KnowledgeEntity } from '../types';

export class KnowledgeParser {
    static parseKnowledgeFile(filePath: string): KnowledgeEntity[] {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.trim().split('\n');
            const entities: KnowledgeEntity[] = [];

            for (const line of lines) {
                try {
                    const entity = JSON.parse(line);
                    if (entity.type === 'entity') {
                        entities.push(entity);
                    }
                } catch (error) {
                    // Skip invalid lines
                    continue;
                }
            }

            return entities;
        } catch (error) {
            console.error(`Error parsing knowledge file ${filePath}:`, error);
            return [];
        }
    }

    static groupEntitiesByType(entities: KnowledgeEntity[]): Map<string, KnowledgeEntity[]> {
        const grouped = new Map<string, KnowledgeEntity[]>();
        
        for (const entity of entities) {
            const type = entity.entityType || 'Other';
            if (!grouped.has(type)) {
                grouped.set(type, []);
            }
            grouped.get(type)!.push(entity);
        }

        return grouped;
    }

    static extractRelationships(entities: KnowledgeEntity[]): Array<{source: string, target: string, type: string}> {
        const relationships: Array<{source: string, target: string, type: string}> = [];
        
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
