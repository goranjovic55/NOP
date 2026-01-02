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
exports.LiveSessionParser = void 0;
const fs = __importStar(require("fs"));
class LiveSessionParser {
    /**
     * Parse all sessions from .akis-sessions.json (multi-session support)
     * Includes JSON validation and backup recovery for corrupted files
     */
    static parseAllSessions(workspaceFolder) {
        const defaultData = {
            sessions: [],
            currentSessionId: null,
            lastUpdate: new Date()
        };
        try {
            // Primary: Check for .akis-sessions.json (multi-session file)
            const multiSessionFilePath = `${workspaceFolder.uri.fsPath}/.akis-sessions.json`;
            if (fs.existsSync(multiSessionFilePath)) {
                const content = fs.readFileSync(multiSessionFilePath, 'utf-8');
                // Validate JSON structure before parsing
                let data;
                try {
                    data = JSON.parse(content);
                }
                catch (parseError) {
                    console.error('Corrupted session file, attempting backup recovery');
                    return this.recoverFromBackup(workspaceFolder);
                }
                // Validate required structure
                if (!data.sessions || !Array.isArray(data.sessions)) {
                    console.error('Invalid session structure, using default');
                    return defaultData;
                }
                return this.parseMultiSessionFile(data);
            }
            // Fallback: Check for .akis-session.json (single session, backwards compatible)
            const sessionFilePath = `${workspaceFolder.uri.fsPath}/.akis-session.json`;
            if (fs.existsSync(sessionFilePath)) {
                const content = fs.readFileSync(sessionFilePath, 'utf-8');
                let sessionData;
                try {
                    sessionData = JSON.parse(content);
                }
                catch (parseError) {
                    console.error('Corrupted single session file');
                    return defaultData;
                }
                const session = this.parseSessionFile(sessionData);
                return {
                    sessions: [session],
                    currentSessionId: session.id,
                    lastUpdate: new Date()
                };
            }
        }
        catch (error) {
            console.error('Error parsing sessions:', error);
        }
        return defaultData;
    }
    /**
     * Attempt to recover from backup file if main file is corrupted
     * Made public for testability and external recovery scenarios
     */
    static recoverFromBackup(workspaceFolder) {
        const backupPath = `${workspaceFolder.uri.fsPath}/.akis-sessions.json.backup`;
        const defaultData = {
            sessions: [],
            currentSessionId: null,
            lastUpdate: new Date()
        };
        try {
            if (fs.existsSync(backupPath)) {
                const content = fs.readFileSync(backupPath, 'utf-8');
                // Validate backup JSON structure
                let backup;
                try {
                    backup = JSON.parse(content);
                }
                catch (parseError) {
                    console.error('Backup file also corrupted');
                    return defaultData;
                }
                // Validate required structure
                if (!backup.sessions || !Array.isArray(backup.sessions)) {
                    console.error('Invalid backup structure');
                    return defaultData;
                }
                console.log('Recovered session from backup');
                return this.parseMultiSessionFile(backup);
            }
        }
        catch (error) {
            console.error('Backup recovery failed:', error);
        }
        return defaultData;
    }
    /**
     * Parse live session data from .akis-session.json (single session, for backwards compat)
     */
    static parseCurrentSession(workspaceFolder) {
        const allSessions = this.parseAllSessions(workspaceFolder);
        // Return current/active session or first session
        if (allSessions.currentSessionId) {
            const current = allSessions.sessions.find(s => s.id === allSessions.currentSessionId);
            if (current)
                return current;
        }
        if (allSessions.sessions.length > 0) {
            return allSessions.sessions[0];
        }
        return this.getDefaultSession();
    }
    /**
     * Parse multi-session file structure
     */
    static parseMultiSessionFile(data) {
        const sessions = (data.sessions || []).map((s) => this.parseSessionFile(s));
        return {
            sessions,
            currentSessionId: data.currentSessionId || null,
            lastUpdate: new Date(data.lastUpdate || Date.now())
        };
    }
    /**
     * Parse session data from session object
     */
    static parseSessionFile(data) {
        const decisions = (data.decisions || []).map((d) => typeof d === 'string' ? d : d.description);
        const emissions = (data.emissions || []).map((e) => ({
            timestamp: new Date(e.timestamp),
            type: e.type || 'SESSION',
            content: e.content || ''
        }));
        const skills = data.skills || [];
        const delegations = (data.delegations || []).map((d) => ({
            agent: d.agent || 'Unknown',
            task: d.task || '',
            timestamp: new Date(d.timestamp || Date.now())
        }));
        // Parse actions (new format)
        const actions = (data.actions || []).map((a) => ({
            id: a.id || `action-${Date.now()}`,
            timestamp: new Date(a.timestamp),
            type: a.type || 'DETAIL',
            description: a.description || '',
            reason: a.reason,
            details: a.details
        }));
        // Parse context (SSOT data)
        const context = data.context ? {
            entities: data.context.entities || 0,
            skills: data.context.skills || [],
            patterns: data.context.patterns || [],
            files: data.context.files || [],
            changes: data.context.changes || []
        } : undefined;
        return {
            id: data.id || `session-${Date.now()}`,
            isActive: data.status === 'active',
            status: data.status || 'active',
            task: data.task || data.name || 'Unknown task',
            phase: data.phase || 'UNKNOWN',
            progress: data.progress || '0/0',
            agent: data.agent || 'Unknown',
            decisions,
            emissions,
            skills,
            delegations,
            startTime: new Date(data.startTime || Date.now()),
            lastUpdate: new Date(data.lastUpdate || Date.now()),
            actions,
            context,
            // Session hierarchy fields
            parentSessionId: data.parentSessionId || null,
            isMainSession: data.isMainSession ?? (data.depth === 0 || !data.parentSessionId),
            depth: data.depth ?? 0
        };
    }
    static getDefaultSession() {
        return {
            id: 'default',
            isActive: false,
            status: 'idle',
            task: 'No active session',
            phase: 'IDLE',
            progress: '0/0',
            agent: 'None',
            decisions: [],
            emissions: [],
            skills: [],
            delegations: [],
            startTime: new Date(),
            lastUpdate: new Date(),
            actions: [],
            context: undefined
        };
    }
    /**
     * Parse a workflow log that's potentially still being written
     */
    static parsePartialWorkflowLog(filePath, mtime) {
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
            const decisions = [];
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
                id: `workflow-${filename}`,
                isActive: status.toLowerCase().includes('progress') || status.toLowerCase() === 'unknown',
                status: status.toLowerCase().includes('complete') ? 'completed' : 'active',
                task,
                phase,
                progress,
                agent,
                decisions,
                emissions,
                skills: [],
                delegations: [],
                startTime: new Date(mtime.getTime() - 60000),
                lastUpdate: mtime,
                actions: [],
                context: undefined
            };
        }
        catch (error) {
            console.error('Error parsing partial workflow log:', error);
            return this.getDefaultSession();
        }
    }
    /**
     * Extract all emissions from workflow content for timeline
     */
    static extractEmissions(content) {
        const emissions = [];
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
exports.LiveSessionParser = LiveSessionParser;
//# sourceMappingURL=LiveSessionParser.js.map