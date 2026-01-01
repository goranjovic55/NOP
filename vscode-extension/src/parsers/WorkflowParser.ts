import * as fs from 'fs';
import * as path from 'path';
import { WorkflowLog, Decision, ToolUsage, Delegation } from '../types';

export class WorkflowParser {
    static parseWorkflowLog(filePath: string): WorkflowLog | null {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const filename = path.basename(filePath);
            
            // Parse filename for timestamp and task
            const filenameMatch = filename.match(/^(\d{4}-\d{2}-\d{2}_\d{6})_(.+)\.md$/);
            const timestamp = filenameMatch?.[1] || '';
            const task = filenameMatch?.[2]?.replace(/-/g, ' ') || '';

            // Extract metadata
            const agentMatch = content.match(/\*\*Agent\*\*:\s*(.+)/);
            const statusMatch = content.match(/\*\*Status\*\*:\s*(.+)/);
            const summaryMatch = content.match(/##\s+Summary\s+([\s\S]+?)(?=##|$)/);

            // Extract decisions
            const decisions = this.extractDecisions(content);
            
            // Extract tools
            const tools = this.extractTools(content);
            
            // Extract delegations
            const delegations = this.extractDelegations(content);
            
            // Extract modified files
            const files = this.extractFiles(content);

            return {
                filename,
                timestamp,
                task,
                agent: agentMatch?.[1]?.trim() || 'Unknown',
                status: statusMatch?.[1]?.trim() || 'Unknown',
                summary: summaryMatch?.[1]?.trim() || '',
                decisions,
                tools,
                delegations,
                files
            };
        } catch (error) {
            console.error(`Error parsing workflow log ${filePath}:`, error);
            return null;
        }
    }

    private static extractDecisions(content: string): Decision[] {
        const decisions: Decision[] = [];
        const decisionsSection = content.match(/\[DECISIONS\]([\s\S]+?)(?=\[|##|$)/);
        
        if (decisionsSection) {
            const lines = decisionsSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                    decisions.push({
                        description: line.replace(/^[-*]\s*/, '').trim(),
                        rationale: ''
                    });
                }
            });
        }

        return decisions;
    }

    private static extractTools(content: string): ToolUsage[] {
        const tools: ToolUsage[] = [];
        const toolsSection = content.match(/\[TOOLS_USED\]([\s\S]+?)(?=\[|##|$)/);
        
        if (toolsSection) {
            const lines = toolsSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                const match = line.match(/[-*]\s*(.+?):\s*(.+)/);
                if (match) {
                    tools.push({
                        tool: match[1].trim(),
                        calls: 1,
                        purpose: match[2].trim()
                    });
                }
            });
        }

        return tools;
    }

    private static extractDelegations(content: string): Delegation[] {
        const delegations: Delegation[] = [];
        const delegationsSection = content.match(/\[DELEGATIONS\]([\s\S]+?)(?=\[|##|$)/);
        
        if (delegationsSection) {
            const lines = delegationsSection[1].split('\n').filter(line => line.trim());
            let currentDelegation: Partial<Delegation> = {};
            
            lines.forEach(line => {
                const agentMatch = line.match(/agent[=:]\s*(.+)/i);
                const taskMatch = line.match(/task[=:]\s*(.+)/i);
                const resultMatch = line.match(/result[=:]\s*(.+)/i);
                
                if (agentMatch) {
                    currentDelegation.agent = agentMatch[1].trim();
                }
                if (taskMatch) {
                    currentDelegation.task = taskMatch[1].trim();
                }
                if (resultMatch) {
                    currentDelegation.result = resultMatch[1].trim();
                    if (currentDelegation.agent && currentDelegation.task) {
                        delegations.push(currentDelegation as Delegation);
                        currentDelegation = {};
                    }
                }
            });
        }

        return delegations;
    }

    private static extractFiles(content: string): string[] {
        const files: string[] = [];
        const filesSection = content.match(/##\s+Files?\s+Modified([\s\S]+?)(?=##|$)/i);
        
        if (filesSection) {
            const matches = filesSection[1].matchAll(/`([^`]+)`/g);
            for (const match of matches) {
                if (match[1].includes('/')) {
                    files.push(match[1]);
                }
            }
        }

        return [...new Set(files)]; // Remove duplicates
    }

    static parseAllWorkflowLogs(workflowDir: string): WorkflowLog[] {
        const logs: WorkflowLog[] = [];
        
        try {
            const files = fs.readdirSync(workflowDir)
                .filter(f => f.endsWith('.md') && f !== 'README.md')
                .sort()
                .reverse(); // Most recent first

            for (const file of files) {
                const log = this.parseWorkflowLog(path.join(workflowDir, file));
                if (log) {
                    logs.push(log);
                }
            }
        } catch (error) {
            console.error(`Error reading workflow directory ${workflowDir}:`, error);
        }

        return logs;
    }
}
