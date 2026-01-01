import * as vscode from 'vscode';
import * as fs from 'fs';

export interface LiveSession {
    isActive: boolean;
    task: string;
    phase: string;
    progress: string;
    agent: string;
    decisions: string[];
    emissions: SessionEmission[];
    skills: string[];
    delegations: Delegation[];
    startTime: Date;
    lastUpdate: Date;
}

export interface Delegation {
    agent: string;
    task: string;
    timestamp: Date;
}

export interface SessionEmission {
    timestamp: Date;
    type: 'PHASE' | 'DECISION' | 'DELEGATE' | 'TOOL' | 'SKILL' | 'SESSION' | 'COMPLETE';
    content: string;
}

export class LiveSessionParser {
    /**
     * Parse live session data from .akis-session.json
     * This file is updated in real-time by agents during execution
     */
    static parseCurrentSession(workspaceFolder: vscode.WorkspaceFolder): LiveSession {
        const defaultSession: LiveSession = {
            isActive: false,
            task: 'No active session',
            phase: 'IDLE',
            progress: '0/0',
            agent: 'None',
            decisions: [],
            emissions: [],
            skills: [],
            delegations: [],
            startTime: new Date(),
            lastUpdate: new Date()
        };

        try {
            // Primary strategy: Check for .akis-session.json (written by agents)
            const sessionFilePath = `${workspaceFolder.uri.fsPath}/.akis-session.json`;
            
            if (fs.existsSync(sessionFilePath)) {
                const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf-8'));
                return this.parseSessionFile(sessionData);
            }

            // Fallback: Check for most recently modified workflow log (old behavior)
            const workflowPath = vscode.workspace.getConfiguration('akisMonitor')
                .get<string>('workflowLogsPath', 'log/workflow');
            const fullPath = `${workspaceFolder.uri.fsPath}/${workflowPath}`;
            
            if (fs.existsSync(fullPath)) {
                const files = fs.readdirSync(fullPath)
                    .filter(f => f.endsWith('.md') && f !== 'README.md')
                    .map(f => ({
                        name: f,
                        path: `${fullPath}/${f}`,
                        mtime: fs.statSync(`${fullPath}/${f}`).mtime
                    }))
                    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

                if (files.length > 0) {
                    const recentFile = files[0];
                    const ageMinutes = (Date.now() - recentFile.mtime.getTime()) / 1000 / 60;
                    
                    // Consider a file "live" if modified in the last 5 minutes
                    if (ageMinutes < 5) {
                        return this.parsePartialWorkflowLog(recentFile.path, recentFile.mtime);
                    }
                }
            }

        } catch (error) {
            console.error('Error parsing live session:', error);
        }

        return defaultSession;
    }

    /**
     * Parse session data from .akis-session.json
     */
    private static parseSessionFile(data: any): LiveSession {
        const decisions = (data.decisions || []).map((d: any) => 
            typeof d === 'string' ? d : d.description
        );

        const emissions = (data.emissions || []).map((e: any) => ({
            timestamp: new Date(e.timestamp),
            type: e.type || 'SESSION',
            content: e.content || ''
        }));

        const skills = data.skills || [];

        const delegations = (data.delegations || []).map((d: any) => ({
            agent: d.agent || 'Unknown',
            task: d.task || '',
            timestamp: new Date(d.timestamp || Date.now())
        }));

        return {
            isActive: data.status === 'active',
            task: data.task || 'Unknown task',
            phase: data.phase || 'UNKNOWN',
            progress: data.progress || '0/0',
            agent: data.agent || 'Unknown',
            decisions,
            emissions,
            skills,
            delegations,
            startTime: new Date(data.startTime || Date.now()),
            lastUpdate: new Date(data.lastUpdate || Date.now())
        };
    }

    /**
     * Parse a workflow log that's potentially still being written
     */
    private static parsePartialWorkflowLog(filePath: string, mtime: Date): LiveSession {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const filename = filePath.split('/').pop() || '';
            
            // Extract task from filename
            const taskMatch = filename.match(/^\d{4}-\d{2}-\d{2}_\d{6}_(.+)\.md$/);
            const task = taskMatch?.[1]?.replace(/-/g, ' ') || 'Unknown task';

            // Extract agent
            const agentMatch = content.match(/\*\*Agent\*\*:\s*(.+)/);
            const agent = agentMatch?.[1]?.trim() || 'Unknown';

            // Extract status
            const statusMatch = content.match(/\*\*Status\*\*:\s*(.+)/);
            const status = statusMatch?.[1]?.trim() || 'In Progress';

            // Extract current phase from emissions
            const phaseMatches = content.matchAll(/\[PHASE:\s*([A-Z]+)\s*\|?\s*progress=(\d+\/\d+)?\]/g);
            const phases = Array.from(phaseMatches);
            const currentPhase = phases.length > 0 ? phases[phases.length - 1] : null;
            
            const phase = currentPhase?.[1] || 'UNKNOWN';
            const progress = currentPhase?.[2] || '0/0';

            // Extract decisions
            const decisions: string[] = [];
            const decisionsSection = content.match(/\[DECISIONS\]([\s\S]+?)(?=\[|##|$)/);
            if (decisionsSection) {
                const lines = decisionsSection[1].split('\n').filter(line => line.trim());
                lines.forEach(line => {
                    if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                        decisions.push(line.replace(/^[-*]\s*/, '').trim());
                    }
                });
            }

            // Extract all emissions for timeline
            const emissions = this.extractEmissions(content);

            return {
                isActive: status.toLowerCase().includes('progress') || status.toLowerCase() === 'unknown',
                task,
                phase,
                progress,
                agent,
                decisions,
                emissions,
                skills: [],
                delegations: [],
                startTime: new Date(mtime.getTime() - 60000), // Estimate start time
                lastUpdate: mtime
            };
        } catch (error) {
            console.error('Error parsing partial workflow log:', error);
            return {
                isActive: false,
                task: 'Error parsing session',
                phase: 'ERROR',
                progress: '0/0',
                agent: 'Unknown',
                decisions: [],
                emissions: [],
                skills: [],
                delegations: [],
                startTime: new Date(),
                lastUpdate: new Date()
            };
        }
    }

    /**
     * Extract all emissions from workflow content for timeline
     */
    private static extractEmissions(content: string): SessionEmission[] {
        const emissions: SessionEmission[] = [];
        const now = new Date();

        // Extract PHASE emissions
        const phaseMatches = content.matchAll(/\[PHASE:\s*([^\]]+)\]/g);
        for (const match of phaseMatches) {
            emissions.push({
                timestamp: now,
                type: 'PHASE',
                content: match[1]
            });
        }

        // Extract DECISION emissions
        const decisionMatches = content.matchAll(/\[DECISION[S]?:?\s*([^\]]+)\]/g);
        for (const match of decisionMatches) {
            emissions.push({
                timestamp: now,
                type: 'DECISION',
                content: match[1]
            });
        }

        // Extract DELEGATE emissions
        const delegateMatches = content.matchAll(/\[DELEGATE:\s*([^\]]+)\]/g);
        for (const match of delegateMatches) {
            emissions.push({
                timestamp: now,
                type: 'DELEGATE',
                content: match[1]
            });
        }

        // Extract SKILL emissions
        const skillMatches = content.matchAll(/\[SKILL[S]?[_USED]?:\s*([^\]]+)\]/g);
        for (const match of skillMatches) {
            emissions.push({
                timestamp: now,
                type: 'SKILL',
                content: match[1]
            });
        }

        return emissions;
    }
}
